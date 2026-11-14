import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fireOnlineOrder } from '@/lib/online-order-orchestration'
import { sendOrderConfirmationNotification } from '@/lib/order-notifications'
import { toMinorUnits } from '@/lib/money'
import { getRestaurantMoneySettings } from '@/lib/settings-helpers'

/**
 * Handles a diner-payment event from a restaurant's own Stripe account.
 *
 * `restaurantId` is the restaurant whose webhook endpoint received the event, already proven by
 * its signing secret (see app/api/ordering/payments/webhook/[restaurantId]). An event only ever
 * settles orders of that same restaurant, so one restaurant's Stripe account can't mark another
 * restaurant's order paid. `null` is the unsigned development path, which trusts the payload.
 */
export async function handleDinerPaymentEvent(event: any, restaurantId: string | null, origin: string) {
  try {
    const simulated = restaurantId === null
    if (simulated && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook signature verification required in production.' }, { status: 400 })
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

      // POS/Terminal charges also carry an orderId; only online orders (with a tracking token) are handled here.
      // The payment must come from this restaurant's own Stripe account (the signed endpoint it arrived
      // on), in its currency, for the full total. Metadata alone proves nothing.
      let genuine = false
      // A retry of the same intent is let through (the kitchen fire below is idempotent), so a step that
      // failed after the order was marked paid is not skipped forever.
      if (order && order.trackingToken && (order.paymentStatus !== 'PAID' || order.stripePaymentIntentId === pi.id)) {
        const rid = order.table?.location?.restaurantId
        const { currency } = rid ? await getRestaurantMoneySettings(rid) : { currency: 'USD' }
        const accountOk = simulated || (!!rid && rid === restaurantId)
        const currencyOk = String(pi.currency ?? '').toLowerCase() === currency.toLowerCase()
        const amountOk = Number(pi.amount_received ?? pi.amount ?? 0) >= toMinorUnits(Number(order.total), currency) - 1
        genuine = simulated ? true : accountOk && currencyOk && amountOk
        if (!genuine) {
          console.error('[Online payment webhook] Rejected payment that does not match the order', {
            orderId: order.id,
            endpointRestaurantId: restaurantId,
            accountOk,
            currencyOk,
            amountOk,
          })
          await prisma.orderEvent.create({
            data: { orderId: order.id, eventType: 'online_order.payment_rejected', metadata: { paymentIntentId: pi.id, accountOk, currencyOk, amountOk } },
          })
        }
      }
      if (order && genuine) {
        const auto = order.table?.location?.onlineOrderingConfig?.acceptanceMode === 'AUTOMATIC'
        const restaurantId = order.table?.location?.restaurantId || order.table?.location?.restaurant?.id

        // Claim the payment: only one delivery moves the order from unpaid to paid.
        const claimed = await prisma.order.updateMany({
          where: { id: order.id, paymentStatus: { not: 'PAID' } },
          data: {
            paymentStatus: 'PAID',
            stripePaymentIntentId: pi.id,
            onlineStatus: auto ? 'ACCEPTED' : 'PENDING_ACCEPTANCE',
            acceptedAt: auto ? new Date() : undefined,
          },
        })
        const firstDelivery = claimed.count === 1

        if (firstDelivery) {
          await prisma.orderEvent.create({
            data: {
              orderId: order.id,
              eventType: 'online_order.payment_completed',
              metadata: { paymentIntentId: pi.id, restaurantId },
            },
          })

          // Award loyalty points to customer
          try {
            const { awardOrderPoints } = await import('@/lib/customer-crm')
            await awardOrderPoints(order.id)
          } catch (ptsErr) {
            console.error('[Stripe Webhook] Points award error:', ptsErr)
          }
        }

        // Fire to kitchen if auto-accepted and not scheduled for the future
        if (auto && !order.scheduledFor) {
          await fireOnlineOrder(order.id, 'STRIPE_WEBHOOK_AUTO')
        }

        // Dispatch customer confirmation notification (once, and never allowed to fail the webhook)
        if (firstDelivery) try { await sendOrderConfirmationNotification({
          restaurantId: order.table?.location?.restaurantId ?? null,
          orderNumber: order.publicOrderNumber || order.id.slice(-6),
          customerName: order.customerName || 'Customer',
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          fulfilmentType: order.fulfilmentType || 'PICKUP',
          items: order.items.map((i) => ({
            name: i.menuItem?.name || 'Item',
            quantity: i.quantity,
            lineTotal:
              (Number(i.priceAtOrder) +
                (Array.isArray(i.modifiers) ? (i.modifiers as Array<{ priceDelta?: number }>).reduce((sum, m) => sum + Number(m?.priceDelta ?? 0), 0) : 0)) *
              i.quantity,
          })),
          total: Number(order.total),
          trackingUrl: `${origin}/order/track/${order.trackingToken}`,
          restaurantName: order.table?.location?.restaurant?.name || 'Our Restaurant',
        }) } catch (notifyErr) {
          console.error('[Stripe Webhook] Confirmation notification error:', notifyErr)
        }
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

      if (orderId && pi.metadata?.channel === 'online') {
        // Same trust rule as success: the event must come from this restaurant's own Stripe account,
        // and a failure can never overwrite an order that has already been paid.
        const target = await prisma.order.findUnique({
          where: { id: orderId },
          select: { trackingToken: true, table: { select: { location: { select: { restaurantId: true } } } } },
        })
        const accountOk = simulated || target?.table?.location?.restaurantId === restaurantId
        if (target?.trackingToken && accountOk) {
          const marked = await prisma.order.updateMany({
            where: { id: orderId, paymentStatus: { not: 'PAID' } },
            data: {
              paymentStatus: 'FAILED',
              onlineStatus: 'PAYMENT_FAILED',
            },
          })

          if (marked.count === 1) {
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
        }
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
