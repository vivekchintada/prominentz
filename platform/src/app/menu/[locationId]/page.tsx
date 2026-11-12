import { RestaurantCurrency } from '@/components/providers/RestaurantCurrency'
import { restaurantIdForLocation } from '@/lib/location-restaurant'
import { UniversalMenuClient } from '@/components/table/UniversalMenuClient'

interface MenuPageProps {
  params: Promise<{
    locationId: string
  }>
}

export const metadata = {
  title: 'Digital Dine-In Menu & Table Ordering | Prominentz',
}

export default async function UniversalMenuPage({ params }: MenuPageProps) {
  const { locationId } = await params
  // Diners see prices in the restaurant's own currency.
  const restaurantId = await restaurantIdForLocation(locationId)
  return (
    <RestaurantCurrency restaurantId={restaurantId ?? undefined} anonymous>
      <UniversalMenuClient locationId={locationId} />
    </RestaurantCurrency>
  )
}
