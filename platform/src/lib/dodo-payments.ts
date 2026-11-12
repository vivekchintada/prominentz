import { Webhook } from 'standardwebhooks'
import { PlanTier } from './plans'
import { PRICING } from './pricing'

/**
 * Dodo Payments handles the restaurant's Prominentz subscription (what restaurants pay us),
 * as a merchant of record covering both US and India customers through one gateway.
 * Diner card payments (online orders, card readers) still run on Stripe Connect.
 *
 * Recurring billing lifecycle (see https://docs.dodopayments.com/developer-resources/subscription-integration-guide):
 *   checkout → subscription.active → subscription.renewed (each cycle)
 *   failed renewal → subscription.past_due / subscription.on_hold → renewed once recovered
 *   owner cancels → cancel_at_next_billing_date=true (stays active) → subscription.cancelled at period end
 */

const rawApiKey = process.env.DODO_PAYMENTS_API_KEY || ''
const rawWebhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY || ''
const dodoEnvironment = (process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode') as 'test_mode' | 'live_mode'

const isTestOrMockKey = !rawApiKey || rawApiKey.includes('mock') || rawApiKey.includes('REPLACE_ME')

/**
 * Local development without Dodo keys. Never true in production: there, a missing key
 * must make Dodo calls fail rather than pretend every subscription is active.
 */
export function isMockDodo(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return isTestOrMockKey
}

function getBaseUrl(): string {
  return dodoEnvironment === 'live_mode' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com'
}

export const DODO_PLAN_PRICING: Record<PlanTier, { name: string; amount: number; productId: string; description: string }> = {
  STARTER: {
    name: PRICING.STARTER.label,
    amount: PRICING.STARTER.monthly,
    productId: process.env.DODO_PAYMENTS_PRODUCT_STARTER || 'prod_starter_tier',
    description: 'Core POS & KDS, Table Floor Management, Digital Menu & QR Studio, Staff Accounts, End-of-Day Reports',
  },
  PRO: {
    name: PRICING.PRO.label,
    amount: PRICING.PRO.monthly,
    productId: process.env.DODO_PAYMENTS_PRODUCT_PRO || 'prod_pro_tier',
    description: 'Advanced AI Intelligence, Guest CRM & Loyalty Engine',
  },
  ENTERPRISE: {
    name: PRICING.ENTERPRISE.label,
    amount: PRICING.ENTERPRISE.monthly,
    productId: process.env.DODO_PAYMENTS_PRODUCT_ENTERPRISE || 'prod_enterprise_tier',
    description: 'Multi-Location Outlets, Dedicated Infrastructure and Custom SLA',
  },
}

/**
 * What is wrong with the Dodo setup, in plain words. Empty means ready. Only meaningful in
 * production, where a wrong value charges real customers or silently breaks checkout:
 *  - the environment defaults to test_mode, so a live key without DODO_PAYMENTS_ENVIRONMENT=live_mode
 *    would call the test API;
 *  - product IDs fall back to placeholders that Dodo does not know.
 */
export function dodoConfigProblems(): string[] {
  const problems: string[] = []
  if (isTestOrMockKey) problems.push('DODO_PAYMENTS_API_KEY is missing or a placeholder')
  if (!rawWebhookKey || rawWebhookKey.includes('mock') || rawWebhookKey.includes('REPLACE_ME')) {
    problems.push('DODO_PAYMENTS_WEBHOOK_KEY is missing or a placeholder')
  }
  const envValue = process.env.DODO_PAYMENTS_ENVIRONMENT
  if (envValue !== 'live_mode' && envValue !== 'test_mode') {
    problems.push('DODO_PAYMENTS_ENVIRONMENT must be set to live_mode or test_mode')
  } else if (process.env.NODE_ENV === 'production' && envValue !== 'live_mode') {
    problems.push('DODO_PAYMENTS_ENVIRONMENT is test_mode in production')
  }
  // Basic is the plan the billing page sells, so it must be set. Pro and Enterprise are optional
  // until they're offered; checkout refuses a plan whose product isn't configured.
  if (!isDodoProductConfigured('STARTER')) {
    problems.push('DODO_PAYMENTS_PRODUCT_STARTER is missing or still a placeholder')
  }
  for (const tier of ['PRO', 'ENTERPRISE'] as const) {
    const id = process.env[`DODO_PAYMENTS_PRODUCT_${tier}`]
    if (id && !isDodoProductConfigured(tier)) problems.push(`DODO_PAYMENTS_PRODUCT_${tier} is still a placeholder`)
  }
  return problems
}

/**
 * True when a real Dodo product ID is set for this plan. Dodo product IDs look like "pdt_…";
 * the "prod_<tier>_tier" defaults and "..." templates are placeholders.
 */
export function isDodoProductConfigured(tier: PlanTier): boolean {
  const id = process.env[`DODO_PAYMENTS_PRODUCT_${tier}`]?.trim()
  if (!id || id.includes('...') || id.includes('REPLACE_ME') || id === `prod_${tier.toLowerCase()}_tier`) return false
  return /^(pdt|prod)_[A-Za-z0-9]+$/.test(id)
}

/** Throws a clear, safe-to-show error in production when billing is misconfigured. */
function assertDodoReady() {
  if (process.env.NODE_ENV !== 'production') return
  const problems = dodoConfigProblems()
  if (problems.length > 0) {
    console.error('[Dodo] Billing is misconfigured:', problems.join('; '))
    throw new Error('Billing is not configured for production. Contact support.')
  }
}

const PLAN_TIERS: PlanTier[] = ['STARTER', 'PRO', 'ENTERPRISE']

export function parsePlanTier(value: unknown): PlanTier | null {
  const upper = String(value || '').toUpperCase()
  return (PLAN_TIERS as string[]).includes(upper) ? (upper as PlanTier) : null
}

/** Which plan a Dodo product ID bills for. Source of truth after a plan change. */
export function planTierForProductId(productId: string | null | undefined): PlanTier | null {
  if (!productId) return null
  return PLAN_TIERS.find((tier) => DODO_PLAN_PRICING[tier].productId === productId) || null
}

async function dodoFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${rawApiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  return res
}

async function dodoError(res: Response, action: string): Promise<Error> {
  const body = await res.text().catch(() => '')
  let detail = body
  try {
    const parsed = JSON.parse(body)
    detail = parsed.message || parsed.error || parsed.code || body
  } catch {}
  return new Error(`${action} failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`)
}

/**
 * Creates a Dodo Payments checkout session for a restaurant's recurring subscription.
 * The product's billing interval (monthly) is configured on the product in the Dodo dashboard.
 */
export async function createSubscriptionCheckoutSession({
  restaurantId,
  restaurantName,
  userEmail,
  planTier,
  returnUrl,
  countryCode,
  dodoCustomerId,
}: {
  restaurantId: string
  restaurantName: string
  userEmail: string
  planTier: PlanTier
  returnUrl: string
  countryCode?: string | null
  /** Reuse the restaurant's existing Dodo customer so saved cards and history carry over. */
  dodoCustomerId?: string | null
}): Promise<{ url: string; id: string }> {
  const planInfo = DODO_PLAN_PRICING[planTier] || DODO_PLAN_PRICING.STARTER

  assertDodoReady()

  if (isMockDodo()) {
    const mockId = `dodo_mock_${Math.random().toString(36).substring(2, 9)}`
    return {
      url: `${returnUrl}?subscription_id=${mockId}&plan=${planTier}&success=true&gateway=dodo`,
      id: mockId,
    }
  }

  const country = (countryCode || 'US').toUpperCase()
  const isIndia = country === 'IN'

  const res = await dodoFetch('/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      product_cart: [{ product_id: planInfo.productId, quantity: 1 }],
      customer: dodoCustomerId
        ? { customer_id: dodoCustomerId }
        : { email: userEmail, name: restaurantName || 'Restaurant Owner' },
      // Dodo appends subscription_id and status to this URL on return.
      return_url: `${returnUrl}?plan=${planTier}&success=true&gateway=dodo`,
      cancel_url: returnUrl,
      // Currency locks at the first successful charge, so set it explicitly. INR only takes
      // effect when Adaptive Currency (or an INR localized price) is enabled on the product.
      billing_currency: isIndia ? 'INR' : 'USD',
      billing_address: { country },
      ...(isIndia ? { allowed_payment_method_types: ['upi_intent', 'credit', 'debit'] } : {}),
      show_saved_payment_methods: true,
      metadata: { restaurantId, planTier },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.checkout_url) {
    throw new Error(`Dodo checkout session creation failed: ${data.message || data.error || `HTTP ${res.status}`}`)
  }

  return { url: data.checkout_url, id: data.session_id || data.checkout_url }
}

export type DodoSubscriptionStatus =
  | 'pending'
  | 'active'
  | 'on_hold'
  | 'paused'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'past_due'

export type DodoSubscription = {
  subscription_id: string
  status: DodoSubscriptionStatus
  product_id?: string
  currency?: string
  recurring_pre_tax_amount?: number
  next_billing_date?: string | null
  previous_billing_date?: string | null
  cancel_at_next_billing_date?: boolean
  cancelled_at?: string | null
  metadata?: Record<string, any>
  customer?: { customer_id?: string; email?: string; name?: string }
}

/** Fetch the current state of a Dodo subscription. */
export async function getDodoSubscription(subscriptionId: string): Promise<DodoSubscription> {
  if (isMockDodo()) {
    return { subscription_id: subscriptionId, status: 'active' }
  }

  const res = await dodoFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`)
  if (!res.ok) {
    throw await dodoError(res, 'Dodo subscription lookup')
  }
  return res.json()
}

async function patchDodoSubscription(subscriptionId: string, body: Record<string, unknown>, action: string) {
  if (isMockDodo()) {
    return
  }
  const res = await dodoFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await dodoError(res, action)
  }
}

/**
 * Cancels a Dodo subscription. By default it stays active until the end of the period the
 * restaurant already paid for, then Dodo sends subscription.cancelled.
 */
export async function cancelDodoSubscription(
  subscriptionId: string,
  { immediately = false }: { immediately?: boolean } = {}
): Promise<{ success: boolean }> {
  await patchDodoSubscription(
    subscriptionId,
    immediately
      ? { status: 'cancelled', cancel_reason: 'cancelled_by_customer' }
      : { cancel_at_next_billing_date: true },
    'Dodo subscription cancellation'
  )
  return { success: true }
}

/** Undo a pending end-of-period cancellation. */
export async function resumeDodoSubscription(subscriptionId: string): Promise<{ success: boolean }> {
  await patchDodoSubscription(subscriptionId, { cancel_at_next_billing_date: false }, 'Dodo subscription resume')
  return { success: true }
}

/**
 * Moves an existing subscription to another plan instead of opening a second subscription.
 * Prorated immediately; Dodo confirms with subscription.plan_changed.
 */
export async function changeDodoSubscriptionPlan({
  subscriptionId,
  planTier,
  restaurantId,
}: {
  subscriptionId: string
  planTier: PlanTier
  restaurantId: string
}): Promise<{ paymentLink: string | null }> {
  assertDodoReady()
  if (isMockDodo()) {
    return { paymentLink: null }
  }

  const res = await dodoFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}/change-plan`, {
    method: 'POST',
    body: JSON.stringify({
      product_id: DODO_PLAN_PRICING[planTier].productId,
      quantity: 1,
      proration_billing_mode: 'prorated_immediately',
      on_payment_failure: 'prevent_change',
      metadata: { restaurantId, planTier },
    }),
  })
  if (!res.ok) {
    throw await dodoError(res, 'Dodo plan change')
  }
  const data = await res.json().catch(() => ({}))
  return { paymentLink: data.payment_link || null }
}

/**
 * Hosted Dodo page where the owner updates their card, downloads invoices, or cancels.
 */
export async function createDodoCustomerPortalSession(customerId: string, returnUrl: string): Promise<string> {
  if (isMockDodo()) {
    return returnUrl
  }
  const query = new URLSearchParams({ return_url: returnUrl })
  const res = await dodoFetch(`/customers/${encodeURIComponent(customerId)}/customer-portal/session?${query}`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw await dodoError(res, 'Dodo customer portal session')
  }
  const data = await res.json()
  if (!data.link) throw new Error('Dodo customer portal session returned no link')
  return data.link
}

/** Internal status stored in restaurant.settings.dodoSubscriptionStatus. */
export type DodoInternalStatus = 'ACTIVE' | 'BILLING_ISSUE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'PENDING'

export function mapDodoStatus(status: string | null | undefined): DodoInternalStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE'
    case 'past_due':
    case 'on_hold':
      return 'BILLING_ISSUE'
    case 'paused':
      return 'PAUSED'
    case 'cancelled':
      return 'CANCELLED'
    case 'expired':
      return 'EXPIRED'
    case 'failed':
      return 'FAILED'
    default:
      return 'PENDING'
  }
}

/**
 * Verifies a Dodo Payments webhook using the Standard Webhooks signature scheme.
 * Rejects missing/empty/malformed signatures and all mock-signature values strictly —
 * no bypass, in any environment.
 */
export function verifyDodoWebhookSignature({
  rawBody,
  webhookId,
  signature,
  timestamp,
}: {
  rawBody: string
  webhookId: string | null
  signature: string | null
  timestamp: string | null
}): boolean {
  if (!signature || typeof signature !== 'string' || signature.trim() === '') return false
  if (!webhookId || !timestamp) return false
  if (signature.includes('mock_') || signature === 'mock_valid_signature') return false
  if (!rawWebhookKey || rawWebhookKey.includes('mock') || rawWebhookKey.includes('REPLACE_ME')) return false

  try {
    const webhook = new Webhook(rawWebhookKey)
    webhook.verify(rawBody, {
      'webhook-id': webhookId,
      'webhook-signature': signature,
      'webhook-timestamp': timestamp,
    })
    return true
  } catch (err) {
    console.error('[Dodo Webhook Signature Error]', err)
    return false
  }
}
