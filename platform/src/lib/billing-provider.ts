import { isMockStripe } from '@/lib/stripe'
import { isRevenueCatConfigured } from '@/lib/revenuecat'

export type BillingProvider = 'revenuecat' | 'stripe' | 'cashfree'

/**
 * Which gateway bills the restaurant's Prominentz subscription, with no location info.
 * Only used as a fallback (e.g. before a customer's country is known) and by routes that
 * manage an existing subscription, which key off the gateway recorded at checkout time instead.
 *  - 'revenuecat' → USD via RevenueCat Web Billing. Default when RevenueCat is configured.
 *  - 'stripe'     → USD via Stripe Billing directly.
 *  - 'cashfree'   → INR (India).
 * Override with BILLING_PROVIDER=revenuecat|stripe|cashfree (forces this gateway for everyone —
 * only for local testing, never set in a real deployment or US customers get billed in INR).
 */
export function billingProvider(): BillingProvider {
  const forced = process.env.BILLING_PROVIDER?.toLowerCase()
  if (forced === 'revenuecat' || forced === 'stripe' || forced === 'cashfree') return forced
  if (isRevenueCatConfigured()) return 'revenuecat'
  return isMockStripe() ? 'cashfree' : 'stripe'
}

/**
 * Which gateway bills a specific customer, based on their country.
 * Cashfree only settles in INR, so it must only be used for India; everyone else needs a
 * USD gateway (RevenueCat if configured, else Stripe directly).
 */
export function billingProviderForCountry(countryCode?: string | null): BillingProvider {
  const forced = process.env.BILLING_PROVIDER?.toLowerCase()
  if (forced === 'revenuecat' || forced === 'stripe' || forced === 'cashfree') return forced

  if (countryCode?.toUpperCase() === 'IN') {
    return 'cashfree'
  }
  return isRevenueCatConfigured() ? 'revenuecat' : 'stripe'
}

/**
 * Best-effort country lookup for a checkout request: IP geolocation header from the host
 * (Vercel sets x-vercel-ip-country; Cloudflare sets cf-ipcountry), falling back to the
 * restaurant's phone country code. Returns null if nothing is available — callers should
 * treat null as "not India" rather than block checkout.
 */
export function resolveCountryFromRequest(req: { headers: { get(name: string): string | null } }, phone?: string | null): string | null {
  const geoCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry')
  if (geoCountry) return geoCountry.toUpperCase()

  if (phone) {
    const digits = phone.replace(/[^\d+]/g, '')
    if (digits.startsWith('+91') || (digits.startsWith('91') && digits.length === 12)) {
      return 'IN'
    }
  }

  return null
}
