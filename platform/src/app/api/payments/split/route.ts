import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { splitPaymentSchema } from '@/lib/validations/payments'
import { verifyStripeIntent } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = splitPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { orderId, splits, couponCode, couponDiscount } = parsed.data

    const { resolveUserLocation } = await import('@/lib/location-resolver')
    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId

    // Verify order exists and strictly belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { table: { location: { restaurantId } } },
          { server: { restaurantId } },
        ],
      },
      include: {
        table: { select: { id: true, name: true, locationId: true } },
        items: {
          select: { id: true, priceAtOrder: true, quantity: true, status: true, modifiers: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found in restaurant records' }, { status: 404 })
    }
    if (order.status === 'PAID') {
      return NextResponse.json({ error: 'Order is already settled' }, { status: 409 })
    }

    // ── Server-Side Authoritative Total Calculation ─────────────────────────
    const activeItems = (order.items || []).filter((item: any) => item.status !== 'VOIDED')
    let serverCalculatedSubtotal = 0
    for (const item of activeItems) {
      let itemPrice = Number(item.priceAtOrder)
      if (Array.isArray(item.modifiers)) {
        for (const mod of (item.modifiers as any[])) {
          itemPrice += Number(mod?.priceDelta ?? mod?.priceAdjustment ?? 0)
        }
      }
      serverCalculatedSubtotal += itemPrice * item.quantity
    }

    // Use greater of item calculation or stored subtotal
    const orderAuthoritativeSubtotal = Math.max(serverCalculatedSubtotal, Number(order.subtotal || 0))

    // Verify coupon discount strictly on server (ignore client-submitted discount amounts)
    let serverCouponDiscount = 0
    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase()
      const now = new Date()
      const coupon = await prisma.coupon.findUnique({
        where: {
          restaurantId_code: {
            restaurantId,
            code: cleanCode,
          },
        },
      })

      if (coupon && coupon.status === 'ACTIVE') {
        const notStarted = coupon.startDate && now < new Date(coupon.startDate)
        const expired = coupon.endDate && now > new Date(coupon.endDate)
        const minSpendUnmet = coupon.minimumOrderAmount && orderAuthoritativeSubtotal < Number(coupon.minimumOrderAmount)
        const usageLimitReached = coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit

        if (!notStarted && !expired && !minSpendUnmet && !usageLimitReached) {
          if (coupon.discountType === 'PERCENTAGE') {
            serverCouponDiscount = Number(((orderAuthoritativeSubtotal * Number(coupon.discountAmount)) / 100).toFixed(2))
          } else {
            serverCouponDiscount = Math.min(orderAuthoritativeSubtotal, Number(coupon.discountAmount))
          }
        }
      }
    }
    // Client-submitted couponDiscount is explicitly ignored.
    // Manual discounts require the authorized manager comp flow (POST /api/orders/[id]/comp).

    const netSubtotal = Math.max(0, orderAuthoritativeSubtotal - serverCouponDiscount)
    const taxRate = orderAuthoritativeSubtotal > 0 ? (Number(order.tax) / orderAuthoritativeSubtotal) : 0.10
    const expectedTax = Number((netSubtotal * taxRate).toFixed(2))
    const requiredBalanceDue = Number((netSubtotal + expectedTax).toFixed(2))

    // Sum details from client splits
    const totalTipSubmitted = Number(splits.reduce((acc, s) => acc + s.tip, 0).toFixed(2))
    const totalPaymentSubmitted = Number(splits.reduce((acc, s) => acc + s.total, 0).toFixed(2))

    if (totalPaymentSubmitted <= 0) {
      return NextResponse.json(
        { error: 'Split payments total must be greater than zero' },
        { status: 400 }
      )
    }

    // Strict underpayment check against SERVER authoritative balance due
    // Allow maximum 10 cents rounding discrepancy
    const netPaymentSubmitted = totalPaymentSubmitted - totalTipSubmitted
    if (netPaymentSubmitted < requiredBalanceDue - 0.10) {
      return NextResponse.json(
        {
          error: `Underpayment rejected: Split payments net sum ($${netPaymentSubmitted.toFixed(2)}) is less than authoritative balance due ($${requiredBalanceDue.toFixed(2)})`,
        },
        { status: 400 }
      )
    }

    // ── Electronic Split Payment Gateway Verification ───────────────────────
    for (const s of splits) {
      const isElectronic = ['CARD', 'APPLE_PAY', 'GOOGLE_PAY'].includes(s.method)
      if (isElectronic && s.total > 0) {
        if (!s.stripePaymentIntentId) {
          return NextResponse.json(
            { error: `Electronic split payment (${s.method}) requires a verified PaymentIntent authorization token` },
            { status: 400 }
          )
        }

        if (s.stripePaymentIntentId === 'zero_balance_settlement') {
          return NextResponse.json(
            { error: `Cannot settle positive split balance ($${s.total.toFixed(2)}) with zero balance token` },
            { status: 400 }
          )
        }

        try {
          await verifyStripeIntent({
            intentId: s.stripePaymentIntentId,
            orderId,
            expectedAmount: s.total,
          })
        } catch (stripeErr: any) {
          console.error('[Split Payment] Gateway verification failed:', stripeErr)
          return NextResponse.json(
            { error: `Gateway verification failed for split: ${stripeErr.message || 'Invalid PaymentIntent'}` },
            { status: 400 }
          )
        }
      }
    }

    // Derive primary method for parent record
    const uniqueMethods = [...new Set(splits.map((s) => s.method))]
    const primaryMethod = uniqueMethods.length === 1 ? uniqueMethods[0] : 'CARD'
    const authoritativeTotal = Number((netSubtotal + expectedTax + totalTipSubmitted).toFixed(2))

    // ── Atomic Settlement Transaction ───────────────────────────────────────
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create parent Payment record with authoritative server amounts
      const parentPayment = await tx.payment.create({
        data: {
          orderId,
          processedBy: session.user.id,
          method:      primaryMethod,
          status:      'COMPLETED',
          subtotal:    netSubtotal,
          tax:         expectedTax,
          tip:         totalTipSubmitted,
          total:       authoritativeTotal,
        },
      })

      // 2. Create individual payment splits
      await tx.paymentSplit.createMany({
        data: splits.map((s) => ({
          paymentId:             parentPayment.id,
          guestRef:              s.guestRef,
          method:                s.method,
          subtotal:              s.subtotal,
          tip:                   s.tip,
          total:                 s.total,
          stripePaymentIntentId: s.stripePaymentIntentId ?? null,
        })),
      })

      // 3. Update order status to PAID atomically with server-calculated amounts
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentStatus: 'PAID',
          subtotal: netSubtotal,
          tax: expectedTax,
          total: authoritativeTotal,
          tip: totalTipSubmitted,
          discount: serverCouponDiscount,
        },
      })

      // 4. Free the dining table
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data:  { status: 'EMPTY' },
        })
      }

      return parentPayment
    })

    // Coupon increment & loyalty deductions
    if (couponCode) {
      try {
        const cleanCode = couponCode.trim().toUpperCase()
        await prisma.coupon.updateMany({
          where: { restaurantId, code: cleanCode },
          data: { usageCount: { increment: 1 } },
        })

        const coupon = await prisma.coupon.findFirst({
          where: { restaurantId, code: cleanCode },
        })
        if (coupon?.pointsCost && coupon.pointsCost > 0 && order.customerId) {
          await prisma.customer.update({
            where: { id: order.customerId },
            data: { pointsBalance: { decrement: coupon.pointsCost } },
          })
        }
      } catch (couponErr) {
        console.error('[Split Payment] Coupon accounting error:', couponErr)
      }
    }

    // Auto-accumulate Loyalty Points
    if (order.customerId) {
      try {
        const { awardOrderPoints } = await import('@/lib/customer-crm')
        await awardOrderPoints(orderId)
      } catch (pointsErr) {
        console.error('[Split Payment] Points award error:', pointsErr)
      }
    }

    // Log audit event
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'payment.split_processed',
        actorId:   session.user.id,
        metadata:  {
          paymentId:  payment.id,
          splitCount: splits.length,
          total:      totalPaymentSubmitted,
          tip:        totalTipSubmitted,
          couponCode: couponCode || null,
        },
      },
    })

    // Realtime events
    await Promise.all([
      publishEvent(EVENTS.PAYMENT_PROCESSED, {
        paymentId:   payment.id,
        orderId,
        total:       totalPaymentSubmitted,
        method:      'SPLIT',
        processedBy: session.user.name,
      }, order.table?.locationId),
      publishEvent(EVENTS.ORDER_MODIFIED, {
        orderId,
        status:      'PAID',
        tableName:   order.table?.name || 'Order',
        locationId:  order.table?.locationId,
        actorId:     session.user.id,
      }, order.table?.locationId),
      publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: order.tableId,
        status:  'EMPTY',
        actorId: session.user.id,
      }, order.table?.locationId),
    ])

    return NextResponse.json(payment, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/payments/split]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
