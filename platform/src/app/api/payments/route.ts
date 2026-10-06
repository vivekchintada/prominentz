import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { processPaymentSchema } from '@/lib/validations/payments'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getAllowedPaymentMethods } from '@/lib/settings-helpers'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 30 payment attempts per minute per user
    const rl = await rateLimit(`payments:${session.user.id}`, 30)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec)

    const body = await req.json()
    const parsed = processPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const {
      orderId,
      method,
      subtotal,
      tax,
      tip,
      total,
      cashReceived,
      cashChange,
      stripePaymentIntentId,
      stripeChargeId,
      couponCode,
      couponDiscount,
    } = parsed.data

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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status === 'PAID') {
      return NextResponse.json({ error: 'Order is already settled' }, { status: 409 })
    }

    // ── Enforce payment type settings ─────────────────────────────────────
    const targetRestaurantId = restaurantId || session.user.restaurantId
    if (targetRestaurantId) {
      const allowedMethods = await getAllowedPaymentMethods(targetRestaurantId)
      if (allowedMethods && !allowedMethods.has(method)) {
        return NextResponse.json(
          { error: `Payment method '${method}' is not enabled for this restaurant. Please use a different payment method.` },
          { status: 403 },
        )
      }
    }

    // ── Enforce payment amount integrity & security ────────────────────────
    if (total < 0) {
      return NextResponse.json(
        { error: 'Payment total cannot be negative' },
        { status: 400 }
      )
    }

    // Cash tender verification & server-side change calculation
    let serverCashChange: number | null = null
    if (method === 'CASH') {
      const effectiveCash = (cashReceived !== undefined && cashReceived !== null) ? cashReceived : total
      if (effectiveCash < total - 0.05) {
        return NextResponse.json(
          { error: `Cash tendered ($${effectiveCash.toFixed(2)}) is less than the balance due ($${total.toFixed(2)})` },
          { status: 400 }
        )
      }
      serverCashChange = Number(Math.max(0, effectiveCash - total).toFixed(2))
    }

    // Card transaction token check
    if (method === 'CARD' && !stripePaymentIntentId && total > 0) {
      return NextResponse.json(
        { error: 'Card transaction missing authorization token / PaymentIntent' },
        { status: 400 }
      )
    }

    // Process checkout transaction
    const [payment] = await prisma.$transaction([
      // 1. Create payment record
      prisma.payment.create({
        data: {
          orderId,
          processedBy: session.user.id,
          method,
          status: 'COMPLETED',
          subtotal,
          tax,
          tip,
          total,
          cashReceived: cashReceived ?? null,
          cashChange: serverCashChange ?? cashChange ?? null,
          stripePaymentIntentId: stripePaymentIntentId ?? null,
          stripeChargeId: stripeChargeId ?? null,
        },
      }),
      // 2. Update order status and record final billing amounts
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentStatus: 'PAID',
          subtotal,
          tax,
          total,
          tip,
          discount: couponDiscount ?? 0,
        },
      }),
      // 3. Reset table status
      prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'EMPTY' },
      }),
    ])

    // 4. Handle Coupon usage count & loyalty points redemption
    if (couponCode) {
      try {
        const cleanCode = couponCode.trim().toUpperCase()
        // Increment coupon usage count
        await prisma.coupon.updateMany({
          where: {
            restaurantId: session.user.restaurantId,
            code: cleanCode,
          },
          data: { usageCount: { increment: 1 } },
        })

        // If coupon has pointsCost and customer is attached, deduct loyalty points
        const coupon = await prisma.coupon.findFirst({
          where: { restaurantId: session.user.restaurantId, code: cleanCode },
        })
        if (coupon?.pointsCost && coupon.pointsCost > 0 && order.customerId) {
          await prisma.customer.update({
            where: { id: order.customerId },
            data: { pointsBalance: { decrement: coupon.pointsCost } },
          })
        }

        // Ensure coupon is recorded on order notes
        const couponNote = `Coupon: ${cleanCode} (-$${Number(couponDiscount || 0).toFixed(2)})`
        if (!order.notes?.includes(cleanCode)) {
          const newNotes = order.notes ? `${order.notes} | ${couponNote}` : couponNote
          await prisma.order.update({
            where: { id: orderId },
            data: { notes: newNotes },
          })
        }
      } catch (couponErr) {
        console.error('[Payment] Coupon redemption processing error:', couponErr)
      }
    }

    // 5. Auto-accumulate Loyalty Points if customer linked (configurable rate + tier multiplier + idempotency + ledger)
    if (order.customerId) {
      try {
        const { awardOrderPoints } = await import('@/lib/customer-crm')
        await awardOrderPoints(orderId)
      } catch (pointsErr) {
        console.error('[Payment] Points award error:', pointsErr)
      }
    }

    // Log operational events
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'payment.processed',
        actorId: session.user.id,
        metadata: {
          paymentId: payment.id,
          method,
          total,
          tip,
          couponCode: couponCode || null,
          couponDiscount: couponDiscount || 0,
        },
      },
    })

    // Realtime events
    await Promise.all([
      publishEvent(EVENTS.PAYMENT_PROCESSED, {
        paymentId: payment.id,
        orderId,
        total,
        method,
        processedBy: session.user.name,
      }, order.table?.locationId),
      publishEvent(EVENTS.ORDER_MODIFIED, {
        orderId,
        status: 'PAID',
        tableName: order.table?.name || 'Order',
        locationId: order.table?.locationId,
        actorId: session.user.id,
      }, order.table?.locationId),
      publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: order.tableId,
        status: 'EMPTY',
        actorId: session.user.id,
      }, order.table?.locationId),
    ])

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('[POST /api/payments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
