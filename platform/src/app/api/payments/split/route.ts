import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { splitPaymentSchema } from '@/lib/validations/payments'

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

    // Verify order exists and belongs to this restaurant
    const initialOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(restaurantId ? {
          OR: [
            { table: { location: { restaurantId } } },
            { server: { restaurantId } },
          ],
        } : {}),
      },
      include: { table: { select: { id: true, name: true, locationId: true } } },
    })

    const fallbackOrder = !initialOrder ? await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: { select: { id: true, name: true, locationId: true } } },
    }) : null

    const order = initialOrder || fallbackOrder

    if (!order) {
      return NextResponse.json({ error: 'Order not found in restaurant records' }, { status: 404 })
    }
    if (order.status === 'PAID') {
      return NextResponse.json({ error: 'Order is already settled' }, { status: 409 })
    }

    // Sum details from splits
    const totalSubtotal = Number(splits.reduce((acc, s) => acc + s.subtotal, 0).toFixed(2))
    const totalTip = Number(splits.reduce((acc, s) => acc + s.tip, 0).toFixed(2))
    const totalPayment = Number(splits.reduce((acc, s) => acc + s.total, 0).toFixed(2))
    
    // Security verification: ensure splits total covers the order balance due
    const orderRawSubtotal = Number(order.subtotal)
    const effectiveDiscount = couponDiscount ? Math.min(orderRawSubtotal > 0 ? orderRawSubtotal : totalSubtotal, Number(couponDiscount)) : 0
    const effectiveBase = orderRawSubtotal > 0 ? Math.min(orderRawSubtotal, totalSubtotal) : totalSubtotal
    const expectedNetSubtotal = Math.max(0, effectiveBase - effectiveDiscount)
    const taxRate = orderRawSubtotal > 0 ? (Number(order.tax) / orderRawSubtotal) : 0.10
    const expectedTax = Number((expectedNetSubtotal * taxRate).toFixed(2))
    
    // Total payment must be greater than zero and cover the net bill
    if (totalPayment <= 0) {
      return NextResponse.json(
        { error: 'Split payments total must be greater than zero' },
        { status: 400 }
      )
    }

    const minRequiredPayment = Number(Math.max(0, expectedNetSubtotal + expectedTax - 0.75).toFixed(2))
    if (totalPayment < minRequiredPayment) {
      return NextResponse.json(
        { error: `Split payments total ($${totalPayment.toFixed(2)}) is less than the required balance due ($${minRequiredPayment.toFixed(2)})` },
        { status: 400 }
      )
    }

    // Derive the primary method: if all splits use the same method, use that;
    // otherwise default to CARD as the transaction anchor for the parent record
    const uniqueMethods = [...new Set(splits.map((s) => s.method))]
    const primaryMethod = uniqueMethods.length === 1 ? uniqueMethods[0] : 'CARD'

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create a parent Payment record representing the full checkout transaction
      const parentPayment = await tx.payment.create({
        data: {
          orderId,
          processedBy: session.user.id,
          method:      primaryMethod,
          status:      'COMPLETED',
          subtotal:    totalSubtotal,
          tax:         expectedTax,
          tip:         totalTip,
          total:       totalPayment,
        },
      })

      // 2. Create the individual splits linked to it
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

      // 3. Set order status to paid and sync totals to match settled split payment
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          subtotal: totalSubtotal,
          tax: expectedTax,
          total: totalPayment,
        },
      })

      // 4. Free the table if tableId exists
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data:  { status: 'EMPTY' },
        })
      }

      return parentPayment
    })

    // Handle Coupon usage count & loyalty points redemption for split payment
    if (couponCode) {
      try {
        const cleanCode = couponCode.trim().toUpperCase()
        await prisma.coupon.updateMany({
          where: {
            restaurantId: session.user.restaurantId,
            code: cleanCode,
          },
          data: { usageCount: { increment: 1 } },
        })

        const coupon = await prisma.coupon.findFirst({
          where: { restaurantId: session.user.restaurantId, code: cleanCode },
        })
        if (coupon?.pointsCost && coupon.pointsCost > 0 && order.customerId) {
          await prisma.customer.update({
            where: { id: order.customerId },
            data: { pointsBalance: { decrement: coupon.pointsCost } },
          })
        }

        const couponNote = `Coupon: ${cleanCode} (-$${Number(couponDiscount || 0).toFixed(2)})`
        if (!order.notes?.includes(cleanCode)) {
          const newNotes = order.notes ? `${order.notes} | ${couponNote}` : couponNote
          await prisma.order.update({
            where: { id: orderId },
            data: { notes: newNotes },
          })
        }
      } catch (couponErr) {
        console.error('[Split Payment] Coupon redemption error:', couponErr)
      }
    }

    // Auto-accumulate Loyalty Points if customer linked
    if (order.customerId) {
      try {
        const { awardOrderPoints } = await import('@/lib/customer-crm')
        await awardOrderPoints(orderId)
      } catch (pointsErr) {
        console.error('[Split Payment] Points award error:', pointsErr)
      }
    }

    // Log event
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'payment.split_processed',
        actorId:   session.user.id,
        metadata:  {
          paymentId:  payment.id,
          splitCount: splits.length,
          total:      totalPayment,
          tip:        totalTip,
          couponCode: couponCode || null,
        },
      },
    })

    // Realtime notifications
    await Promise.all([
      publishEvent(EVENTS.PAYMENT_PROCESSED, {
        paymentId:   payment.id,
        orderId,
        total:       totalPayment,
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
  } catch (error) {
    console.error('[POST /api/payments/split]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
