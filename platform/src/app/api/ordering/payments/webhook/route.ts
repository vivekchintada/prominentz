import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe, isMockStripe } from '@/lib/stripe'
import { fireOnlineOrder } from '@/lib/online-order-orchestration'
import { sendOrderConfirmationNotification } from '@/lib/order-notifications'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    const sig = req.headers.get('stripe-signature')
    const secret = process.env.STRIPE_WEBHOOK_SECRET

    let event: any
    if (isMockStripe()) {
      try {
        event = JSON.parse(raw)
      } catch {
        event = { id: `evt_mock_${Date.now()}`, type: 'payment_intent.succeeded', data: { object: {} } }
      }
    } else {
      if (!sig || !secret) {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
      }
      event = stripe.webhooks.constructEvent(raw, sig, secret)
    }

    // 1. Replay Protection: Check if event was already handled
    const existingLog = await prisma.stripeEventLog.findUnique({
      where: { eventId: event.id },
    })
    if (existingLog) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    // 2. Handle Payment Success
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      const orderId = pi.metadata?.orderId

      const order = orderId
        ? await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              items: { include: { menuItem: true } },
              table: {
                include: {
                  location: {
                    include: {
                      onlineOrderingConfig: true,
                      restaurant: true,
                    },
                  },
                },
              },
            },
          })
        : null

      if (order) {
        const auto = order.table.location.onlineOrderingConfig?.acceptanceMode === 'AUTOMATIC'

        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            onlineStatus: auto ? 'ACCEPTED' : 'PENDING_ACCEPTANCE',
            acceptedAt: auto ? new Date() : undefined,
          },
        })

        await prisma.orderEvent.create({
          data: {
            orderId: order.id,
            eventType: 'online_order.payment_completed',
            metadata: { paymentIntentId: pi.id },
          },
        })

        // Award loyalty points to customer
        try {
          const { awardOrderPoints } = await import('@/lib/customer-crm')
          await awardOrderPoints(order.id)
        } catch (ptsErr) {
          console.error('[Stripe Webhook] Points award error:', ptsErr)
        }

        // Fire to kitchen if auto-accepted and not scheduled for the future
        if (auto && !order.scheduledFor) {
          await fireOnlineOrder(order.id, 'STRIPE_WEBHOOK_AUTO')
        }

        // Dispatch customer confirmation notification
        const origin = req.nextUrl.origin || 'http://localhost:3000'
        await sendOrderConfirmationNotification({
          orderNumber: order.publicOrderNumber || order.id.slice(-6),
          customerName: order.customerName || 'Customer',
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          fulfilmentType: order.fulfilmentType || 'PICKUP',
          items: order.items.map((i) => ({
            name: i.menuItem?.name || 'Item',
            quantity: i.quantity,
            lineTotal: Number(i.priceAtOrder) * i.quantity,
          })),
          total: Number(order.total),
          trackingUrl: `${origin}/order/track/${order.trackingToken}`,
          restaurantName: order.table.location.restaurant.name || 'Our Restaurant',
        })
      }

      // Record event ID to prevent replay
      await prisma.stripeEventLog.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          orderId: orderId || null,
        },
      })
    }

    // 3. Handle Payment Failure
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object
      const orderId = pi.metadata?.orderId

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'FAILED',
            onlineStatus: 'PAYMENT_FAILED',
          },
        })

        await prisma.orderEvent.create({
          data: {
            orderId,
            eventType: 'online_order.payment_failed',
            metadata: {
              paymentIntentId: pi.id,
              lastPaymentError: pi.last_payment_error?.message || 'Payment failed',
            },
          },
        })
      }

      await prisma.stripeEventLog.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          orderId: orderId || null,
        },
      })
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[Stripe Webhook Error]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook failed' },
      { status: 400 }
    )
  }
}
