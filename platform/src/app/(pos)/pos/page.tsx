import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { RestaurantCurrency } from '@/components/providers/RestaurantCurrency'
import { BentoPos, type PosMenuItem, type PosTable, type PosTab } from '@/components/bento/pos/BentoPos'
import { resolveLocationId } from '@/lib/bento/owner-overview'
import { startOfDayInTimeZone } from '@/lib/dashboard-metrics'
import { initials } from '@/lib/bento/time'

export const metadata = {
  title: 'POS',
  description: 'Take orders, send them to the kitchen and take payment.',
}

export default async function PosPage({ searchParams }: { searchParams?: Promise<{ tableId?: string; orderId?: string; pay?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user
  if (user.role === 'KITCHEN') redirect('/kds')

  const sp = searchParams ? await searchParams : {}
  const locationId = await resolveLocationId(user.id!, user.restaurantId).catch(() => null)
  if (!locationId) {
    return (
      <div className="bz">
        <div className="bz-wrap">
          <div className="bz-tile" style={{ maxWidth: 520, margin: '80px auto' }}>
            <h1 className="bz-title bz-title--lg">No location set up yet</h1>
            <p className="bz-sub">Add a location in the dashboard settings, then open the POS again.</p>
          </div>
        </div>
      </div>
    )
  }

  const location = await prisma.location.findUnique({ where: { id: locationId }, select: { name: true, timezone: true } })
  const todayStart = startOfDayInTimeZone(location?.timezone || 'UTC')

  const [categories, items, tables, openOrders, topToday] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: user.restaurantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.menuItem.findMany({
      where: { category: { restaurantId: user.restaurantId, isActive: true }, isAvailable: true, is86d: false },
      include: { modifiers: { include: { options: true } } },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.table.findMany({
      where: { locationId },
      select: { id: true, name: true, capacity: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.order.findMany({
      where: { table: { locationId }, status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'READY', 'HOLD'] } },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { id: true, total: true, createdAt: true, notes: true, orderSource: true, customerName: true, table: { select: { id: true, name: true } } },
    }),
    prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      where: { status: { not: 'VOIDED' }, order: { table: { locationId }, createdAt: { gte: todayStart } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1,
    }),
  ])

  const menu: PosMenuItem[] = items.map((m) => ({
    id: m.id,
    categoryId: m.categoryId,
    name: m.name,
    description: m.description,
    price: Number(m.price),
    taxRate: Number(m.taxRate ?? 0),
    imageUrl: m.imageUrl,
    modifiers: m.modifiers.map((mod) => ({
      id: mod.id,
      name: mod.name,
      isRequired: mod.isRequired,
      minSelect: mod.minSelect,
      maxSelect: mod.maxSelect,
      options: mod.options.map((o) => ({ id: o.id, name: o.name, priceAdjustment: Number(o.priceAdjustment || 0) })),
    })),
  }))

  const tableList: PosTable[] = tables.map((t) => ({ id: t.id, name: t.name, capacity: t.capacity, status: t.status }))

  const tabs: PosTab[] = openOrders.map((o) => {
    const n = (o.notes || '').toLowerCase()
    const kind = n.includes('take') ? 'Takeaway' : n.includes('delivery') || o.orderSource.startsWith('DELIVERY') || o.orderSource.startsWith('WEB') ? 'Delivery' : o.orderSource.startsWith('QR') ? 'QR' : 'Dine-in'
    const who = o.customerName || o.table?.name || 'Walk-in'
    return { id: o.id, tableId: o.table?.id ?? null, label: kind === 'Dine-in' ? who : `${o.table?.name ?? 'Order'} · ${kind}${o.customerName ? ` · ${o.customerName}` : ''}`, createdAt: o.createdAt.toISOString(), total: Number(o.total) }
  })

  const specialId = topToday[0]?.menuItemId ?? menu.find((m) => m.imageUrl)?.id ?? menu[0]?.id ?? null

  return (
    <RestaurantCurrency restaurantId={user.restaurantId}>
      <BentoPos
        categories={categories}
        menu={menu}
        tables={tableList}
        tabs={tabs}
        specialId={specialId}
        specialIsTopSeller={Boolean(topToday[0])}
        locationId={locationId}
        locationName={location?.name ?? 'Counter'}
        user={{ name: user.name ?? '', initials: initials(user.name), role: user.role }}
        initialTableId={sp.tableId}
        initialOrderId={sp.orderId}
        initialPay={sp.pay === '1'}
      />
    </RestaurantCurrency>
  )
}
