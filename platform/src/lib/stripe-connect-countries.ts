/**
 * Countries a restaurant can open its own Stripe account in, so guests' card payments pay out
 * to a bank in that country. A Stripe account's country can't be changed after it's created,
 * so the owner picks it before onboarding.
 *
 * Stripe's coverage changes over time; if Stripe rejects a country, onboarding shows its error.
 */
export const CONNECT_COUNTRIES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'US', name: 'United States' },
]

const CODES = new Set(CONNECT_COUNTRIES.map((c) => c.code))

export function isConnectCountry(code: unknown): code is string {
  return typeof code === 'string' && CODES.has(code.toUpperCase())
}

/** Best guess from the restaurant's billing currency; null when the currency spans several countries (EUR). */
const COUNTRY_BY_CURRENCY: Record<string, string> = {
  USD: 'US', INR: 'IN', GBP: 'GB', AED: 'AE', CAD: 'CA', AUD: 'AU', NZD: 'NZ', SGD: 'SG',
  HKD: 'HK', JPY: 'JP', MYR: 'MY', THB: 'TH', MXN: 'MX', BRL: 'BR', CHF: 'CH', SEK: 'SE',
  NOK: 'NO', DKK: 'DK', PLN: 'PL', CZK: 'CZ', HUF: 'HU', RON: 'RO', BGN: 'BG',
}

export function suggestedConnectCountry(currency: string | null | undefined, geoCountry?: string | null): string | null {
  const geo = geoCountry?.toUpperCase()
  if (geo && CODES.has(geo)) return geo
  return COUNTRY_BY_CURRENCY[(currency || '').toUpperCase()] ?? null
}

/** Card-reader addresses need a state/province in the US, Canada and Australia; elsewhere it's optional. */
export function connectCountryNeedsState(code: string | null | undefined): boolean {
  return ['US', 'CA', 'AU'].includes((code || '').toUpperCase())
}
