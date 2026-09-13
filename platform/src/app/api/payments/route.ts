import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { processPaymentSchema } from '@/lib/validations/payments'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

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

    // Verify order exists and belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: { id: orderId, table: { location: { restaurantId: session.user.restaurantId } } },
      include: { table: { select: { id: true, name: true, locationId: true } } },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status === 'PAID') {
      return NextResponse.json({ error: 'Order is already settled' }, { status: 409 })
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
          cashChange: cashChange ?? null,
          stripePaymentIntentId: stripePaymentIntentId ?? null,
          stripeChargeId: stripeChargeId ?? null,
        },
      }),
      // 2. Update order status
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
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

    // 5. Auto-accumulate Loyalty Points if customer linked (1 Point / $1 spent)
    if (order.customerId) {
      const pointsEarned = Math.floor(Number(subtotal))
      if (pointsEarned > 0) {
        await prisma.customer.update({
          where: { id: order.customerId },
          data: {
            pointsBalance: { increment: pointsEarned },
            lifetimeSpend: { increment: total },
            totalVisits: { increment: 1 },
          },
        })
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
