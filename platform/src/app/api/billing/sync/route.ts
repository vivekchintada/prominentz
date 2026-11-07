import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { isRevenueCatConfigured, syncRestaurantFromRevenueCat } from '@/lib/revenuecat'

export const dynamic = 'force-dynamic'

/**
 * Re-checks the restaurant's subscription with RevenueCat right away.
 * Called when the owner returns from checkout, so they don't wait for the webhook.
 */
export async function POST() {
  const session = await auth()
  const restaurantId = session?.user?.restaurantId
  if (!restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isRevenueCatConfigured()) {
    return NextResponse.json({ synced: false })
  }

  const limited = await rateLimit(`billing-sync:${restaurantId}`, 10, 60)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec)
  }

  try {
    const result = await syncRestaurantFromRevenueCat(restaurantId, {
      id: session.user.id || 'owner',
      name: session.user.name || 'Owner',
    })
    return NextResponse.json({
      synced: true,
      planTier: result?.planTier ?? null,
      status: result?.state.status ?? null,
    })
  } catch (err: any) {
    console.error('[POST /api/billing/sync]', err?.message || err)
    return NextResponse.json({ error: 'Could not reach RevenueCat' }, { status: 502 })
  }
}
