import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MobileTablesClient, MobileTable } from '@/components/mobile/MobileTablesClient'

export const metadata = { title: 'Tables | Resto AI Manager' }

export default async function MobileTablesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const employee = await prisma.employee.findFirst({ where: { userId: session.user.id, isActive: true } })
  let locationId = employee?.locationId
  if (!locationId) {
    const loc = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
    locationId = loc?.id
  }

  const rawTables = locationId
    ? await prisma.table.findMany({
        where: { locationId },
        include: {
          orders: {
            where: { status: { notIn: ['PAID', 'VOIDED'] } },
            take: 1,
            select: { id: true, guestCount: true, total: true, subtotal: true, tax: true, notes: true, createdAt: true },
          },
        },
        orderBy: { name: 'asc' },
      })
    : []

  const formattedTables: MobileTable[] = rawTables.map((t) => ({
    id: t.id,
    name: t.name,
    capacity: t.capacity,
    status: t.status as any,
    orders: t.orders.map((o) => ({
      id: o.id,
      guestCount: o.guestCount,
      total: Number(o.total || 0),
      subtotal: Number(o.subtotal || 0),
      tax: Number(o.tax || 0),
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
    })),
  }))

  return (
    <MobileTablesClient
      initialTables={formattedTables}
      locationId={locationId || ''}
      userName={session.user.name || 'Server'}
    />
  )
}

