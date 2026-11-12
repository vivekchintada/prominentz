import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PlanTier } from '@/lib/plans'
import {
  DodoInternalStatus,
  DodoSubscription,
  mapDodoStatus,
  parsePlanTier,
  planTierForProductId,
} from '@/lib/dodo-payments'

type Db = Prisma.TransactionClient | typeof prisma

/** Statuses where the restaurant keeps its paid plan (access is still decided by subscription-status.ts). */
const PLAN_RETAINING: DodoInternalStatus[] = ['ACTIVE', 'BILLING_ISSUE', 'PAUSED']

/**
 * Find which restaurant a Dodo subscription belongs to: checkout metadata first, then the
 * subscription ID we stored on the restaurant (covers renewals if metadata ever goes missing).
 */
export async function findRestaurantForDodoSubscription(db: Db, sub: Pick<DodoSubscription, 'subscription_id' | 'metadata'>) {
  const metaId = typeof sub.metadata?.restaurantId === 'string' ? sub.metadata.restaurantId : null
  if (metaId) {
    const byMeta = await db.restaurant.findUnique({ where: { id: metaId } })
    if (byMeta) return byMeta
  }
  if (!sub.subscription_id) return null
  return db.restaurant.findFirst({
    where: { settings: { path: ['dodoSubscriptionId'], equals: sub.subscription_id } },
  })
}

export type ApplyResult =
  | { applied: true; status: DodoInternalStatus; planTier: PlanTier }
  | { applied: false; reason: 'stale_event' | 'superseded_subscription' }

/**
 * Write a Dodo subscription's state onto the restaurant. Shared by the webhook and the
 * post-checkout sync so both follow the same rules.
 */
export async function applyDodoSubscriptionState(
  db: Db,
  restaurant: { id: string; planTier: string; settings: unknown },
  sub: DodoSubscription,
  { eventType, eventTimestamp }: { eventType: string; eventTimestamp?: string | null }
): Promise<ApplyResult> {
  const settings = (restaurant.settings as Record<string, any>) || {}
  const status = mapDodoStatus(sub.status)

  // Webhooks can arrive out of order (retries up to 8x with backoff); never let an older
  // event overwrite newer state.
  const eventAt = eventTimestamp ? new Date(eventTimestamp) : new Date()
  const lastAt = settings.dodoLastEventAt ? new Date(settings.dodoLastEventAt) : null
  if (lastAt && !Number.isNaN(eventAt.getTime()) && eventAt < lastAt) {
    return { applied: false, reason: 'stale_event' }
  }

  // A cancelled/expired *old* subscription must not knock out the restaurant's current one.
  const currentId: string | undefined = settings.dodoSubscriptionId
  const isDifferentSub = currentId && currentId !== sub.subscription_id
  if (isDifferentSub && status !== 'ACTIVE' && PLAN_RETAINING.includes(settings.dodoSubscriptionStatus)) {
    return { applied: false, reason: 'superseded_subscription' }
  }

  const paidTier =
    planTierForProductId(sub.product_id) || parsePlanTier(sub.metadata?.planTier) || (restaurant.planTier as PlanTier)
  const planTier: PlanTier = PLAN_RETAINING.includes(status) ? paidTier : 'STARTER'

  const isPayment = eventType === 'subscription.active' || eventType === 'subscription.renewed'

  await db.restaurant.update({
    where: { id: restaurant.id },
    data: {
      planTier: planTier as any,
      settings: {
        ...settings,
        lastBillingGateway: 'DODO',
        dodoSubscriptionId: sub.subscription_id,
        dodoCustomerId: sub.customer?.customer_id || settings.dodoCustomerId,
        dodoSubscriptionStatus: status,
        dodoProductId: sub.product_id || settings.dodoProductId,
        dodoCurrency: sub.currency || settings.dodoCurrency,
        dodoNextBillingDate: sub.next_billing_date ?? settings.dodoNextBillingDate ?? null,
        dodoCancelAtPeriodEnd: Boolean(sub.cancel_at_next_billing_date),
        dodoCancelledAt:
          status === 'CANCELLED' || status === 'EXPIRED'
            ? sub.cancelled_at || settings.dodoCancelledAt || new Date().toISOString()
            : null,
        dodoLastEventAt: (Number.isNaN(eventAt.getTime()) ? new Date() : eventAt).toISOString(),
        ...(isPayment ? { lastBilledAt: new Date().toISOString() } : {}),
      },
    },
  })

  return { applied: true, status, planTier }
}
