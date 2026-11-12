import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageBilling, getAuthContext } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getDodoSubscription, isMockDodo } from '@/lib/dodo-payments'
import { applyDodoSubscriptionState, lockRestaurantForBilling } from '@/lib/dodo-subscription-sync'

export const dynamic = 'force-dynamic'

/**
 * Re-checks the restaurant's subscription with Dodo right away.
 * Called when the owner returns from checkout, so they don't wait for the webhook.
 *
 * Body (optional): { subscriptionId } — the subscription_id Dodo appends to the return URL.
 * A subscription is only bound if its checkout metadata names this restaurant.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  const restaurantId = session?.user?.restaurantId
  if (!restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const authCtx = await getAuthContext(session.user)
  if (!authCtx || !canManageBilling(authCtx)) {
    return NextResponse.json({ error: 'Only the restaurant owner can manage billing' }, { status: 403 })
  }

  const limited = await rateLimit(`billing-sync:${restaurantId}`, 10, 60)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec)
  }

  const body = await req.json().catch(() => ({}))
  const returnedId = typeof body?.subscriptionId === 'string' ? body.subscriptionId.trim() : ''

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, planTier: true, settings: true },
  })
  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  const settings = (restaurant.settings as Record<string, any>) || {}
  const subscriptionId: string | undefined = returnedId || settings.dodoSubscriptionId
  if (!subscriptionId) {
    return NextResponse.json({ synced: false })
  }

  try {
    // The fetched state is only as new as the moment we asked for it. Stamping the write with that
    // time (not when it lands) means a webhook created after the fetch still wins, and is never
    // dropped as stale afterwards.
    const fetchedAt = new Date().toISOString()
    const subscription = await getDodoSubscription(subscriptionId)

    const isKnown = subscriptionId === settings.dodoSubscriptionId
    const isOurs = subscription.metadata?.restaurantId === restaurantId || isMockDodo()
    if (!isKnown && !isOurs) {
      return NextResponse.json({ error: 'Subscription does not belong to this restaurant' }, { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const fresh = await lockRestaurantForBilling(tx, restaurantId)
      if (!fresh) return null
      return applyDodoSubscriptionState(tx, fresh, subscription, { eventType: 'sync', eventTimestamp: fetchedAt })
    })
    if (!result) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }
    if (!result.applied) {
      return NextResponse.json({ synced: false, reason: result.reason })
    }

    return NextResponse.json({ synced: true, planTier: result.planTier, status: subscription.status })
  } catch (err: any) {
    console.error('[POST /api/billing/sync]', err?.message || err)
    return NextResponse.json({ error: 'Could not reach Dodo Payments' }, { status: 502 })
  }
}
