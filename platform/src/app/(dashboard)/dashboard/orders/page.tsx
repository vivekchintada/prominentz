import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import OrdersView from '@/components/dashboard/OrdersView'

export const metadata = { title: 'Orders | Prominentz' }

export default async function OrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const restaurantId = session.user.restaurantId

  // Fetch today's orders (last 24h) for initial load
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const orders = await prisma.order.findMany({
    where: {
      table: { location: { restaurantId } },
      createdAt: { gte: since },
    },
    include: {
      table:  { select: { id: true, name: true } },
      server: { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: { select: { id: true, name: true, imageUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      payments: { select: { id: true, status: true, total: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Serialize Decimal → number and Date → ISO string
  const serialized = orders.map((o: any) => ({
    id: o.id,
    status: o.status,
    notes: o.notes,
    guestCount: o.guestCount,
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
    table: o.table || { id: 't-none', name: 'Takeout / Direct' },
    server: o.server,
    _count: o._count,
    items: o.items.map((i: any) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      status: i.status,
      specialNote: i.specialNote,
      menuItem: {
        id: i.menuItem?.id || '',
        name: i.menuItem?.name || 'Dish',
        imageUrl: i.menuItem?.imageUrl || null,
        isVeg: i.menuItem?.name?.toLowerCase().includes('bruschetta') || i.menuItem?.name?.toLowerCase().includes('fondant') || false,
      },
    })),
    payments: o.payments.map((p: any) => ({
      id: p.id,
      status: p.status,
      amount: Number(p.total),
    })),
  }))

  return <OrdersView initialOrders={serialized} />
}
