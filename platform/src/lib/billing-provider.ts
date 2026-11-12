export type BillingProvider = 'dodo' | 'stripe'

/**
 * Which gateway bills the restaurant's Prominentz subscription.
 *  - 'dodo'   → Dodo Payments (merchant of record, USD + INR + everywhere else). Default.
 *  - 'stripe' → USD via Stripe Billing directly.
 * Override with BILLING_PROVIDER=dodo|stripe — only for local testing, never set in a real
 * deployment. Dodo is a merchant of record covering both US and India customers, so there's
 * no country-based routing needed here.
 */
export function billingProvider(): BillingProvider {
  const forced = process.env.BILLING_PROVIDER?.toLowerCase()
  if (forced === 'dodo' || forced === 'stripe') return forced
  return 'dodo'
}

export function billingProviderForCountry(_countryCode?: string | null): BillingProvider {
  return billingProvider()
}

/**
 * Best-effort country lookup for a checkout request: IP geolocation header from the host
 * (Vercel sets x-vercel-ip-country; Cloudflare sets cf-ipcountry), falling back to the
 * restaurant's phone country code. Used to pre-fill Dodo's billing_address.country.
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
