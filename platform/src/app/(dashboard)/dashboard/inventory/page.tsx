import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { InventoryOverviewView } from '@/components/bento/inventory/InventoryOverviewView'
import { getInventoryOverview } from '@/lib/bento/inventory-overview'
import { resolveLocationId } from '@/lib/bento/owner-overview'
import { getRestaurantMoneySettings } from '@/lib/settings-helpers'

export const metadata = { title: 'Inventory' }

export default async function InventoryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  const user = session.user
  const [locationId, money] = await Promise.all([
    resolveLocationId(user.id!, user.restaurantId).catch(() => null),
    getRestaurantMoneySettings(user.restaurantId),
  ])
  const data = await getInventoryOverview(locationId).catch((err) => {
    console.error('Failed to load inventory overview', err)
    return getInventoryOverview(null)
  })

  return (
    <InventoryOverviewView
      data={data}
      currency={money.currency}
      roleLabel={user.role === 'OWNER' ? 'Owner · Stock' : 'Manager · Stock'}
    />
  )
}
