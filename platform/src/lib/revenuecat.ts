import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/lib/audit'
import type { PlanTier } from '@/lib/plans'

/**
 * RevenueCat handles the restaurant's Prominentz subscription (what restaurants pay us).
 * Diner card payments (online orders, card readers) still run on Stripe Connect.
 *
 * The RevenueCat "app user ID" is always the restaurant ID, so every location and
 * staff login of a restaurant shares one subscription.
 */

const RC_API = 'https://api.revenuecat.com/v1'

const TIERS: PlanTier[] = ['STARTER', 'PRO', 'ENTERPRISE']
// Higher index wins when several entitlements are active.
const TIER_RANK: Record<PlanTier, number> = { STARTER: 0, PRO: 1, ENTERPRISE: 2 }

/** Entitlement identifier in the RevenueCat dashboard for each plan. */
function entitlementFor(tier: PlanTier): string {
  const defaults: Record<PlanTier, string> = { STARTER: 'basic', PRO: 'pro', ENTERPRISE: 'enterprise' }
  return process.env[`REVENUECAT_ENTITLEMENT_${tier}`] || defaults[tier]
}

/** Web Purchase Link (from RevenueCat → Web → Purchase links) for each plan. */
function purchaseLinkFor(tier: PlanTier): string | undefined {
  return process.env[`REVENUECAT_PURCHASE_LINK_${tier}`]?.trim() || undefined
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_API_KEY)
}

/**
 * Web Purchase Links need RevenueCat Web Billing (which runs on a Stripe account).
 * Without them, restaurants subscribe in the mobile app through the App Store / Google Play.
 */
export function hasRevenueCatWebCheckout(tier: PlanTier): boolean {
  return Boolean(purchaseLinkFor(tier))
}

export const MOBILE_SUBSCRIBE_MESSAGE =
  'Subscriptions are purchased in the Prominentz mobile app (App Store or Google Play). Sign in as the owner and open Subscription.'

/** Hosted RevenueCat checkout URL for this restaurant and plan. */
export function revenueCatPurchaseUrl(tier: PlanTier, restaurantId: string, email?: string | null): string {
  const base = purchaseLinkFor(tier)
  if (!base) throw new Error(MOBILE_SUBSCRIBE_MESSAGE)
  const url = new URL(`${base.replace(/\/+$/, '')}/${encodeURIComponent(restaurantId)}`)
  if (email) url.searchParams.set('email', email)
  return url.toString()
}

type RcEntitlement = {
  expires_date: string | null
  grace_period_expires_date?: string | null
  product_identifier: string
}

type RcSubscription = {
  expires_date: string | null
  period_type?: string
  unsubscribe_detected_at?: string | null
  billing_issues_detected_at?: string | null
  store?: string
  management_url?: string | null
}

export type RcSubscriber = {
  original_app_user_id: string
  management_url?: string | null
  entitlements: Record<string, RcEntitlement>
  subscriptions: Record<string, RcSubscription>
}

/** Fetch (or create) the RevenueCat customer for a restaurant. */
export async function getRevenueCatSubscriber(appUserId: string): Promise<RcSubscriber> {
  const key = process.env.REVENUECAT_SECRET_API_KEY
  if (!key) throw new Error('REVENUECAT_SECRET_API_KEY is not set')

  const res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`RevenueCat API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = (await res.json()) as { subscriber: RcSubscriber }
  return data.subscriber
}

function isActive(expires: string | null | undefined, grace?: string | null): boolean {
  const now = Date.now()
  if (!expires) return true // lifetime / non-expiring
  if (new Date(expires).getTime() > now) return true
  return Boolean(grace && new Date(grace).getTime() > now)
}

export type RcStatus = 'ACTIVE' | 'TRIAL' | 'CANCELLING' | 'BILLING_ISSUE' | 'EXPIRED' | 'INACTIVE'

export type RcPlanState = {
  tier: PlanTier | null
  status: RcStatus
  productId: string | null
  expiresAt: string | null
  managementUrl: string | null
  hasHistory: boolean
}

/** Work out which plan a RevenueCat customer is entitled to right now. */
export function planStateFromSubscriber(sub: RcSubscriber): RcPlanState {
  let best: { tier: PlanTier; ent: RcEntitlement } | null = null
  for (const tier of TIERS) {
    const ent = sub.entitlements?.[entitlementFor(tier)]
    if (!ent || !isActive(ent.expires_date, ent.grace_period_expires_date)) continue
    if (!best || TIER_RANK[tier] > TIER_RANK[best.tier]) best = { tier, ent }
  }

  const hasHistory = Object.keys(sub.subscriptions || {}).length > 0
  const managementUrl =
    sub.management_url ||
    Object.values(sub.subscriptions || {}).find((s) => s.management_url)?.management_url ||
    null

  if (!best) {
    return { tier: null, status: hasHistory ? 'EXPIRED' : 'INACTIVE', productId: null, expiresAt: null, managementUrl, hasHistory }
  }

  const s = sub.subscriptions?.[best.ent.product_identifier]
  let status: RcStatus = 'ACTIVE'
  if (s?.billing_issues_detected_at) status = 'BILLING_ISSUE'
  else if (s?.unsubscribe_detected_at) status = 'CANCELLING'
  else if (s?.period_type === 'trial') status = 'TRIAL'

  return {
    tier: best.tier,
    status,
    productId: best.ent.product_identifier,
    expiresAt: best.ent.expires_date,
    managementUrl,
    hasHistory,
  }
}

/**
 * Pull the latest subscription state from RevenueCat and save it on the restaurant.
 * RevenueCat is the source of truth; webhooks just tell us when to re-check.
 */
export async function syncRestaurantFromRevenueCat(
  restaurantId: string,
  actor: { id: string; name: string } = { id: 'revenuecat', name: 'RevenueCat' }
): Promise<{ planTier: PlanTier; state: RcPlanState } | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, planTier: true, settings: true },
  })
  if (!restaurant) return null

  const subscriber = await getRevenueCatSubscriber(restaurantId)
  const state = planStateFromSubscriber(subscriber)
  const settings = (restaurant.settings as Record<string, any>) || {}

  // Never purchased through RevenueCat: leave restaurants billed by another gateway alone.
  if (!state.hasHistory && settings.lastBillingGateway !== 'REVENUECAT') {
    return { planTier: restaurant.planTier as PlanTier, state }
  }

  // No active plan falls back to STARTER, matching the Stripe and Cashfree behaviour.
  const nextTier: PlanTier = state.tier ?? 'STARTER'
  const previousTier = restaurant.planTier as PlanTier

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      planTier: nextTier,
      settings: {
        ...settings,
        lastBillingGateway: 'REVENUECAT',
        revenuecatStatus: state.status,
        revenuecatProductId: state.productId,
        revenuecatExpiresAt: state.expiresAt,
        revenuecatManagementUrl: state.managementUrl,
        revenuecatSyncedAt: new Date().toISOString(),
      },
    },
  })

  if (previousTier !== nextTier) {
    await logAuditEvent({
      restaurantId,
      actorId: actor.id,
      actorName: actor.name,
      action: TIER_RANK[nextTier] > TIER_RANK[previousTier] ? 'PLAN_UPGRADED' : 'PLAN_DOWNGRADED',
      targetType: 'Restaurant',
      targetId: restaurantId,
      before: { planTier: previousTier },
      after: { planTier: nextTier, status: state.status },
    })
  }

  return { planTier: nextTier, state }
}

/** Constant-time check of the Authorization header RevenueCat sends with each webhook. */
export function isValidRevenueCatWebhookAuth(header: string | null): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH
  if (!expected || !header) return false
  const candidates = [header, header.replace(/^Bearer\s+/i, '')]
  const exp = Buffer.from(expected)
  return candidates.some((c) => {
    const got = Buffer.from(c)
    return got.length === exp.length && crypto.timingSafeEqual(got, exp)
  })
}
