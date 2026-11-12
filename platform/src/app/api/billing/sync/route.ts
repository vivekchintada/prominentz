import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getDodoSubscription, isMockDodo } from '@/lib/dodo-payments'
import { applyDodoSubscriptionState } from '@/lib/dodo-subscription-sync'

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
    const subscription = await getDodoSubscription(subscriptionId)

    const isKnown = subscriptionId === settings.dodoSubscriptionId
    const isOurs = subscription.metadata?.restaurantId === restaurantId || isMockDodo()
    if (!isKnown && !isOurs) {
      return NextResponse.json({ error: 'Subscription does not belong to this restaurant' }, { status: 403 })
    }

    const result = await applyDodoSubscriptionState(prisma, restaurant, subscription, { eventType: 'sync' })
    if (!result.applied) {
      return NextResponse.json({ synced: false, reason: result.reason })
    }

    return NextResponse.json({ synced: true, planTier: result.planTier, status: subscription.status })
  } catch (err: any) {
    console.error('[POST /api/billing/sync]', err?.message || err)
    return NextResponse.json({ error: 'Could not reach Dodo Payments' }, { status: 502 })
  }
}
