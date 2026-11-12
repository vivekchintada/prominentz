import { prisma } from '@/lib/prisma'
import { getTodayFloorMetrics, startOfDayInTimeZone } from '@/lib/dashboard-metrics'
import type { BadgeTone } from './channels'

const LATE_AFTER_MIN = 15

/** Everything the Owner · all branches board shows, from real records only. */
export interface BranchesBoard {
  today: { sales: number; orders: number }
  branches: {
    id: string
    name: string
    area: string
    isHq: boolean
    sales: number
    orders: number
    labourPct: number | null
    openTables: number
    totalTables: number
    lateTickets: number
    lowStock: number
    status: { label: string; tone: BadgeTone }
  }[]
  attention: { id: string; title: string; detail: string; href: string; cta: string }[]
  menu: { shared: number; branchOnly: number; branchesWithOwnMenu: number }
}

export const EMPTY_BRANCHES_BOARD: BranchesBoard = {
  today: { sales: 0, orders: 0 },
  branches: [],
  attention: [],
  menu: { shared: 0, branchOnly: 0, branchesWithOwnMenu: 0 },
}

export async function getBranchesBoard(restaurantId: string): Promise<BranchesBoard> {
  const now = new Date()
  const lateBefore = new Date(now.getTime() - LATE_AFTER_MIN * 60000)

  const [locations, categories] = await Promise.all([
    prisma.location.findMany({
      where: { restaurantId },
      orderBy: [{ isHeadquarters: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, address: true, region: true, timezone: true, isHeadquarters: true },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      select: { locationId: true, _count: { select: { items: true } } },
    }),
  ])

  const branches = await Promise.all(
    locations.map(async (loc) => {
      const todayStart = startOfDayInTimeZone(loc.timezone || 'UTC', now)
      const atLocation = { table: { locationId: loc.id } }
      const [sales, orders, tables, late, stock, metrics] = await Promise.all([
        prisma.payment.aggregate({ _sum: { total: true }, where: { order: atLocation, status: 'COMPLETED', createdAt: { gte: todayStart } } }),
        prisma.order.count({ where: { ...atLocation, createdAt: { gte: todayStart }, status: { not: 'VOIDED' } } }),
        prisma.table.findMany({ where: { locationId: loc.id }, select: { status: true } }),
        prisma.kdsTicket.count({ where: { order: atLocation, status: { in: ['NEW', 'IN_PROGRESS'] }, createdAt: { lt: lateBefore } } }),
        prisma.inventoryItem.findMany({ where: { locationId: loc.id }, select: { currentStock: true, minStock: true } }),
        getTodayFloorMetrics(loc.id).catch(() => ({ avgTurnTimeMinutes: null, laborCostPct: null })),
      ])
      const openTables = tables.filter((t) => t.status !== 'EMPTY').length
      const lowStock = stock.filter((i) => i.currentStock <= i.minStock).length
      const busy = tables.length > 0 && openTables / tables.length >= 0.5
      const status: { label: string; tone: BadgeTone } =
        late > 0 ? { label: 'Kitchen late', tone: 'accent' } : openTables > 0 ? { label: busy ? 'Open · busy' : 'Open', tone: 'ink' } : { label: 'Quiet', tone: 'quiet' }
      return {
        id: loc.id,
        name: loc.name,
        area: [loc.region, loc.address].filter(Boolean).join(' · '),
        isHq: loc.isHeadquarters,
        sales: Number(sales._sum.total ?? 0),
        orders,
        labourPct: metrics.laborCostPct,
        openTables,
        totalTables: tables.length,
        lateTickets: late,
        lowStock,
        status,
      }
    }),
  )

  const attention: BranchesBoard['attention'] = []
  for (const b of branches) {
    if (b.lateTickets > 0) {
      attention.push({ id: `late-${b.id}`, title: `${b.name} · kitchen ${b.lateTickets} ticket${b.lateTickets === 1 ? '' : 's'} behind`, detail: `older than ${LATE_AFTER_MIN} min`, href: '/kds', cta: 'Open kitchen' })
    }
  }
  for (const b of branches) {
    if (b.lowStock > 0) {
      attention.push({ id: `stock-${b.id}`, title: `${b.name} · ${b.lowStock} item${b.lowStock === 1 ? '' : 's'} below minimum`, detail: 'reorder today', href: '/dashboard/inventory', cta: 'Inventory' })
    }
  }

  const shared = categories.filter((c) => !c.locationId).reduce((s, c) => s + c._count.items, 0)
  const branchOnly = categories.filter((c) => c.locationId).reduce((s, c) => s + c._count.items, 0)

  return {
    today: { sales: branches.reduce((s, b) => s + b.sales, 0), orders: branches.reduce((s, b) => s + b.orders, 0) },
    branches,
    attention: attention.slice(0, 4),
    menu: { shared, branchOnly, branchesWithOwnMenu: new Set(categories.filter((c) => c.locationId).map((c) => c.locationId)).size },
  }
}
