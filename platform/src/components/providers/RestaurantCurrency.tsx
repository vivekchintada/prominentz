import { auth } from '@/auth'
import { getRestaurantMoneySettings } from '@/lib/settings-helpers'
import { DEFAULT_CURRENCY } from '@/lib/money'
import { CurrencyProvider } from './CurrencyProvider'

/**
 * Server wrapper: reads a restaurant's currency and tax fallback once and hands
 * them to every client screen below via useMoney().
 *
 * - Staff screens: omit restaurantId to use the signed-in user's restaurant.
 * - Diner screens: pass the restaurant resolved from the URL and `anonymous`,
 *   so a signed-in staff member's own restaurant is never used by mistake.
 */
export async function RestaurantCurrency({
  children,
  restaurantId,
  anonymous = false,
}: {
  children: React.ReactNode
  restaurantId?: string | null
  anonymous?: boolean
}) {
  let id = restaurantId ?? null
  if (!id && !anonymous) {
    const session = await auth()
    id = (session?.user as { restaurantId?: string } | undefined)?.restaurantId ?? null
  }
  const { currency, taxRate } = id
    ? await getRestaurantMoneySettings(id)
    : { currency: DEFAULT_CURRENCY, taxRate: 0.08 }
  return (
    <CurrencyProvider currency={currency} taxRate={taxRate}>
      {children}
    </CurrencyProvider>
  )
}
