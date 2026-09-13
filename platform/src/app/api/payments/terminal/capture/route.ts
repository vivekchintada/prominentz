import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// ─── POST /api/payments/terminal/capture ──────────────────────────────────────
// Captures a Terminal PaymentIntent after the card has been collected.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentIntentId, orderId } = await req.json()

    if (!paymentIntentId || !orderId) {
      return NextResponse.json({ error: 'paymentIntentId and orderId are required' }, { status: 400 })
    }

    // Verify the order belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: { id: orderId, table: { location: { restaurantId: session.user.restaurantId } } },
      include: { table: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Capture the payment
    const intent = await stripe.paymentIntents.capture(paymentIntentId)

    if (intent.status !== 'succeeded') {
      return NextResponse.json({ error: `Payment not succeeded. Status: ${intent.status}` }, { status: 402 })
    }

    const amountDollars = intent.amount_received / 100
    const subtotal      = Number(order.subtotal)
    const tax           = Number(order.tax)
    const tip           = Math.max(0, Number((amountDollars - subtotal - tax).toFixed(2)))

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        processedBy: session.user.id,
        method: 'CARD',
        status: 'COMPLETED',
        subtotal,
        tax,
        tip,
        total: amountDollars,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: (intent.latest_charge as string) ?? null,
      },
    })

    // Close order and reset table
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } }),
      prisma.table.update({ where: { id: order.tableId }, data: { status: 'EMPTY' } }),
    ])

    // Auto-accumulate Loyalty Points if customer linked (1 Point / $1 spent)
    if (order.customerId) {
      const pointsEarned = Math.floor(subtotal)
      if (pointsEarned > 0) {
        await prisma.customer.update({
          where: { id: order.customerId },
          data: {
            pointsBalance: { increment: pointsEarned },
            lifetimeSpend: { increment: amountDollars },
            totalVisits: { increment: 1 },
          },
        }).catch((err) => console.error('[Terminal Capture] Loyalty update error:', err))
      }
    }

    // Log operational event
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'payment.processed',
        actorId: session.user.id,
        metadata: {
          paymentId: payment.id,
          method: 'CARD',
          total: amountDollars,
          tip,
          via: 'stripe_terminal',
        },
      },
    }).catch((err) => console.error('[Terminal Capture] OrderEvent error:', err))

    // Publish real-time events
    await Promise.all([
      publishEvent(EVENTS.PAYMENT_PROCESSED, {
        orderId,
        paymentId: payment.id,
        method: 'CARD',
        total: amountDollars,
        tip,
        via: 'stripe_terminal',
      }),
      publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: order.tableId,
        status: 'EMPTY',
        actorId: session.user.id,
      }),
    ])

    return NextResponse.json({ success: true, paymentId: payment.id, total: amountDollars, tip })
  } catch (error) {
    console.error('[POST /api/payments/terminal/capture]', error)
    return NextResponse.json({ error: 'Failed to capture payment' }, { status: 500 })
  }
}
