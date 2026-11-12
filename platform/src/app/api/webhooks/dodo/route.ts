import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DodoSubscription, verifyDodoWebhookSignature } from '@/lib/dodo-payments'
import { applyDodoSubscriptionState, findRestaurantForDodoSubscription } from '@/lib/dodo-subscription-sync'
import { AuditAction, logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * Dodo Payments webhook for restaurant subscriptions.
 * Register in Dodo dashboard → Developer → Webhooks: <app-origin>/api/webhooks/dodo
 *
 * Every subscription.* event carries the full subscription object, so we treat it as a state
 * snapshot rather than branching per event. payment.* events are only logged for billing history
 * (subscription.renewed / past_due / on_hold already fire alongside them).
 */

const AUDITED: Record<string, AuditAction> = {
  'subscription.active': 'BILLING_PAYMENT_SUCCESS',
  'subscription.renewed': 'BILLING_PAYMENT_SUCCESS',
  'subscription.plan_changed': 'PLAN_CHANGED',
  'subscription.past_due': 'BILLING_PAYMENT_FAILED',
  'subscription.on_hold': 'BILLING_PAYMENT_FAILED',
  'subscription.cancelled': 'BILLING_SUBSCRIPTION_CANCELLED',
  'subscription.expired': 'BILLING_SUBSCRIPTION_CANCELLED',
  'subscription.failed': 'BILLING_PAYMENT_FAILED',
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const webhookId = req.headers.get('webhook-id')
  const signature = req.headers.get('webhook-signature')
  const timestamp = req.headers.get('webhook-timestamp')

  if (!verifyDodoWebhookSignature({ rawBody, webhookId, signature, timestamp })) {
    console.error('[Dodo Webhook] Rejecting unsigned or invalid webhook payload')
    return NextResponse.json({ error: 'Invalid or missing webhook signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err: any) {
    console.error('[Dodo Webhook] JSON parse error:', err.message)
    return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 })
  }

  const eventType = String(event.type || '')
  const data = event.data || {}
  const eventUniqueId = `dodo_${webhookId}`

  const isSubscriptionEvent = eventType.startsWith('subscription.') && Boolean(data.subscription_id)
  const isPaymentEvent = eventType.startsWith('payment.') || eventType.startsWith('refund.')
  if (!isSubscriptionEvent && !isPaymentEvent) {
    return NextResponse.json({ received: true, status: 'IGNORED' })
  }

  try {
    const already = await prisma.stripeEventLog.findUnique({ where: { eventId: eventUniqueId } })
    if (already) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    const restaurant = await findRestaurantForDodoSubscription(prisma, {
      subscription_id: data.subscription_id,
      metadata: data.metadata,
    })
    if (!restaurant) {
      console.warn(`[Dodo Webhook] ${eventType} (${eventUniqueId}): no matching restaurant, ignoring`)
      return NextResponse.json({ received: true, matched: 0 })
    }

    if (isPaymentEvent) {
      await prisma.stripeEventLog.create({ data: { eventId: eventUniqueId, eventType, orderId: restaurant.id } })
      return NextResponse.json({ received: true, status: 'LOGGED' })
    }

    const sub = data as DodoSubscription
    const result = await prisma.$transaction(async (tx) => {
      await tx.stripeEventLog.create({ data: { eventId: eventUniqueId, eventType, orderId: restaurant.id } })
      // Re-read inside the transaction so concurrent deliveries don't clobber each other's settings.
      const fresh = await tx.restaurant.findUnique({ where: { id: restaurant.id } })
      if (!fresh) return null
      return applyDodoSubscriptionState(tx, fresh, sub, { eventType, eventTimestamp: event.timestamp })
    })

    if (result?.applied && AUDITED[eventType]) {
      await logAuditEvent({
        restaurantId: restaurant.id,
        actorId: 'dodo_webhook',
        actorName: 'Dodo Payments',
        action: AUDITED[eventType],
        targetType: 'Restaurant',
        targetId: eventUniqueId,
        before: { planTier: restaurant.planTier },
        after: { subscriptionId: sub.subscription_id, planTier: result.planTier, status: result.status, eventType },
      })
    }

    console.info(
      `[Dodo Webhook] ${eventType} → ${result?.applied ? result.status : result ? `skipped (${result.reason})` : 'restaurant gone'}`
    )
    return NextResponse.json({ received: true, status: result?.applied ? result.status : 'SKIPPED' })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error('[Dodo Webhook Handler Error]', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
