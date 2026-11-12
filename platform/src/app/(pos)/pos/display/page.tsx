import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { RestaurantCurrency } from '@/components/providers/RestaurantCurrency'
import { CounterDisplay } from '@/components/bento/pos/CounterDisplay'
import { getRestaurantBasics } from '@/lib/bento/request-cache'

export const metadata = {
  title: 'Counter display',
  description: 'Guest-facing screen that mirrors the POS check.',
}

/** Open from the POS on a guest-facing monitor. It only shows what the POS on this machine sends it. */
export default async function CounterDisplayPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'KITCHEN') redirect('/kds')

  const restaurant = await getRestaurantBasics(session.user.restaurantId)
  return (
    <RestaurantCurrency restaurantId={session.user.restaurantId}>
      <CounterDisplay restaurantName={restaurant?.name || 'our restaurant'} />
    </RestaurantCurrency>
  )
}
