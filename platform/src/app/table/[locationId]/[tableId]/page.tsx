import { notFound } from 'next/navigation'
import { RestaurantCurrency } from '@/components/providers/RestaurantCurrency'
import { GuestTableOrder } from '@/components/bento/guest/GuestTableOrder'
import { prisma } from '@/lib/prisma'

interface TableOrderPageProps {
  params: Promise<{
    locationId: string
    tableId: string
  }>
}

export const metadata = {
  title: 'Menu and ordering | Prominentz',
}

export default async function TableOrderPage({ params }: TableOrderPageProps) {
  const { locationId, tableId } = await params
  const table = await prisma.table
    .findFirst({
      where: { id: tableId, locationId },
      select: { name: true, location: { select: { name: true, restaurantId: true, restaurant: { select: { name: true } } } } },
    })
    .catch(() => null)
  if (!table) notFound()

  const restaurantName = table.location.restaurant?.name || table.location.name
  const outletName = table.location.restaurant?.name && table.location.name !== table.location.restaurant.name ? table.location.name : null

  // Diners see prices in the restaurant's own currency.
  return (
    <RestaurantCurrency restaurantId={table.location.restaurantId} anonymous>
      <GuestTableOrder locationId={locationId} tableId={tableId} tableName={table.name} restaurantName={restaurantName} outletName={outletName} />
    </RestaurantCurrency>
  )
}
