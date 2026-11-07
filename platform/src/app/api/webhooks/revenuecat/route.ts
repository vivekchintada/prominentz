import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidRevenueCatWebhookAuth, syncRestaurantFromRevenueCat } from '@/lib/revenuecat'

export const dynamic = 'force-dynamic'

type RcEvent = {
  id: string
  type: string
  environment?: 'SANDBOX' | 'PRODUCTION'
  app_user_id?: string
  original_app_user_id?: string
  aliases?: string[]
  transferred_from?: string[]
  transferred_to?: string[]
}

/**
 * RevenueCat webhook: Dashboard → Project → Integrations → Webhooks.
 * URL: https://<your-domain>/api/webhooks/revenuecat
 * Authorization header: the value of REVENUECAT_WEBHOOK_AUTH.
 */
export async function POST(req: NextRequest) {
  if (!isValidRevenueCatWebhookAuth(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let event: RcEvent
  try {
    const body = await req.json()
    event = body?.event
    if (!event?.id || !event?.type) throw new Error('missing event')
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event.type === 'TEST') {
    return NextResponse.json({ received: true, test: true })
  }

  // Test purchases must not unlock paid plans on the live site.
  if (
    process.env.NODE_ENV === 'production' &&
    event.environment === 'SANDBOX' &&
    process.env.REVENUECAT_ALLOW_SANDBOX !== 'true'
  ) {
    return NextResponse.json({ received: true, ignored: 'sandbox' })
  }

  const eventId = `rc_${event.id}`
  const already = await prisma.stripeEventLog.findUnique({ where: { eventId } })
  if (already) return NextResponse.json({ received: true, duplicate: true })

  // Our app user ID is the restaurant ID; anonymous RevenueCat IDs are skipped.
  const ids = new Set(
    [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases || []),
      ...(event.transferred_from || []),
      ...(event.transferred_to || []),
    ].filter((id): id is string => Boolean(id) && !id!.startsWith('$RCAnonymousID'))
  )

  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true },
  })

  if (restaurants.length === 0) {
    console.warn(`[RevenueCat Webhook] ${event.type} ${event.id}: no matching restaurant for ${[...ids].join(', ')}`)
    return NextResponse.json({ received: true, matched: 0 })
  }

  try {
    for (const r of restaurants) {
      const result = await syncRestaurantFromRevenueCat(r.id)
      console.info(`[RevenueCat Webhook] ${event.type} => ${r.id} plan=${result?.planTier} status=${result?.state.status}`)
    }
  } catch (err: any) {
    // Non-2xx makes RevenueCat retry the webhook later.
    console.error('[RevenueCat Webhook] Sync failed:', err?.message || err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }

  await prisma.stripeEventLog
    .create({ data: { eventId, eventType: `revenuecat.${event.type}`, orderId: restaurants[0].id } })
    .catch(() => {}) // a concurrent retry may have logged it first

  return NextResponse.json({ received: true, matched: restaurants.length })
}
