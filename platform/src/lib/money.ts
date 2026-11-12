/**
 * Money formatting in the restaurant's own currency (Settings → Store → Currency).
 * Safe on server and client. Each currency formats with its home locale so an
 * Indian restaurant sees ₹1,23,456.00 and a US one sees $123,456.00.
 */

export const DEFAULT_CURRENCY = 'USD'

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: 'en-US',
  INR: 'en-IN',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  CAD: 'en-CA',
  AED: 'en-AE',
  SGD: 'en-SG',
  NZD: 'en-NZ',
}

const formatterCache = new Map<string, Intl.NumberFormat>()

/** Returns a valid ISO 4217 code, falling back to USD for anything unknown. */
export function normalizeCurrency(currency: unknown): string {
  const code = typeof currency === 'string' ? currency.trim().toUpperCase() : ''
  if (!/^[A-Z]{3}$/.test(code)) return DEFAULT_CURRENCY
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code })
    return code
  } catch {
    return DEFAULT_CURRENCY
  }
}

export function localeForCurrency(currency: string): string {
  return LOCALE_BY_CURRENCY[normalizeCurrency(currency)] ?? 'en-US'
}

function formatter(currency: string, decimals: number): Intl.NumberFormat {
  const code = normalizeCurrency(currency)
  const key = `${code}:${decimals}`
  let f = formatterCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(localeForCurrency(code), {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    formatterCache.set(key, f)
  }
  return f
}

/** formatMoney(1234.5, 'INR') → "₹1,234.50"; decimals defaults to 2. */
export function formatMoney(amount: number | string | null | undefined, currency: string = DEFAULT_CURRENCY, decimals = 2): string {
  const n = Number(amount)
  return formatter(currency, decimals).format(Number.isFinite(n) ? n : 0)
}

/** The currency's symbol on its own, e.g. "₹" or "$". */
export function currencySymbol(currency: string = DEFAULT_CURRENCY): string {
  return formatter(currency, 0).formatToParts(0).find((p) => p.type === 'currency')?.value ?? '$'
}

const compactCache = new Map<string, Intl.NumberFormat>()

/** Short money for chart labels: formatMoneyCompact(38200, 'INR') → "₹38.2K". */
export function formatMoneyCompact(amount: number | string | null | undefined, currency: string = DEFAULT_CURRENCY): string {
  const code = normalizeCurrency(currency)
  let f = compactCache.get(code)
  if (!f) {
    f = new Intl.NumberFormat(localeForCurrency(code), {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    compactCache.set(code, f)
  }
  const n = Number(amount)
  return f.format(Number.isFinite(n) ? n : 0)
}

/** Decimal places a currency uses on cards (2 for INR/USD, 0 for JPY/KRW…). */
export function minorUnitDigits(currency: string = DEFAULT_CURRENCY): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: normalizeCurrency(currency) }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

/** 1050.5 INR → 105050 (paise). The integer amount card gateways expect. */
export function toMinorUnits(amount: number, currency: string = DEFAULT_CURRENCY): number {
  return Math.round(amount * 10 ** minorUnitDigits(currency))
}

/** 105050 paise → 1050.5 INR. */
export function fromMinorUnits(minor: number, currency: string = DEFAULT_CURRENCY): number {
  return minor / 10 ** minorUnitDigits(currency)
}

/**
 * Amount for a thermal printer. Most ESC/POS code pages cannot print ₹ or €, so
 * this uses plain ASCII: "$12.50", "Rs 1,050.00", "EUR 9.90".
 */
export function printerMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const code = normalizeCurrency(currency)
  const digits = minorUnitDigits(code)
  const n = Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  if (code === 'USD' || code === 'CAD' || code === 'AUD' || code === 'NZD' || code === 'SGD') return `$${n}`
  if (code === 'INR') return `Rs ${n}`
  return `${code} ${n}`
}
