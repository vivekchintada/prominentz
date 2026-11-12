'use client'

import { createContext, useContext, useMemo } from 'react'
import { DEFAULT_CURRENCY, currencySymbol, formatMoney } from '@/lib/money'

interface MoneyContextValue {
  currency: string
  /** Fallback tax rate (decimal) for items without their own rate. */
  taxRate: number
}

const MoneyContext = createContext<MoneyContextValue>({ currency: DEFAULT_CURRENCY, taxRate: 0.08 })

export function CurrencyProvider({ currency, taxRate, children }: MoneyContextValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ currency, taxRate }), [currency, taxRate])
  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>
}

/**
 * The restaurant's currency and tax fallback.
 * money(12.5) → "₹12.50" for an INR restaurant; money(12.5, 0) → "₹13".
 * Outside a provider it falls back to USD, matching the app's old behaviour.
 */
export function useMoney() {
  const { currency, taxRate } = useContext(MoneyContext)
  return useMemo(
    () => ({
      currency,
      taxRate,
      symbol: currencySymbol(currency),
      money: (amount: number | string | null | undefined, decimals = 2) => formatMoney(amount, currency, decimals),
    }),
    [currency, taxRate],
  )
}
