'use client'

import NumberFlow, { type Format } from '@number-flow/react'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { localeForCurrency } from '@/lib/money'

// Direction C signage numbers: digits roll in place like a departures board when
// a value changes. Fixed-width digits keep the figure from shifting as it rolls.
// NumberFlow already honours prefers-reduced-motion (the value then just swaps).

const ROLL = { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
const FADE = { duration: 280, easing: 'ease-out' }

type AnimatedNumberProps = {
  value: number
  /** Intl.NumberFormat options, e.g. { maximumFractionDigits: 1 } */
  format?: Format
  /** Defaults to the browser locale, matching Number#toLocaleString() */
  locales?: Intl.LocalesArgument
  /**
   * Format as money in the restaurant's currency and home locale
   * (₹1,23,456.00 / $123,456.00). Pass a number to set the decimals (default 2).
   */
  money?: boolean | number
  prefix?: string
  suffix?: string
  className?: string
  style?: React.CSSProperties
}

export function AnimatedNumber({ value, format, locales, money, prefix, suffix, className, style }: AnimatedNumberProps) {
  const { currency } = useMoney()
  const safe = Number.isFinite(value) ? value : 0

  let resolvedFormat = format
  let resolvedLocales = locales
  if (money !== undefined && money !== false) {
    const decimals = typeof money === 'number' ? money : 2
    resolvedFormat = {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...format,
    }
    resolvedLocales = locales ?? localeForCurrency(currency)
  }

  return (
    <NumberFlow
      value={safe}
      format={resolvedFormat}
      locales={resolvedLocales}
      prefix={prefix}
      suffix={suffix}
      className={className}
      transformTiming={ROLL}
      spinTiming={ROLL}
      opacityTiming={FADE}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
    />
  )
}
