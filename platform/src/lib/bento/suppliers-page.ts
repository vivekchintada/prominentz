import { prisma } from '@/lib/prisma'
import type { PurchaseOrderStatus } from '@prisma/client'
import { DAY_MS, localParts } from './time'
import type { BadgeTone } from './channels'

/** Everything the Suppliers · purchase orders board shows, from real records only. */
export interface SuppliersBoard {
  open: { count: number; value: number; arrivingToday: number }
  lowItems: number
  nextUp: { id: string; poNumber: string; supplier: string; expectedAt: Date | null; summary: string } | null
  month: { name: string; spent: number; deliveries: number; purchasesPct: number | null }
  pos: { id: string; poNumber: string; supplier: string; summary: string; value: number; status: { label: string; tone: BadgeTone } }[]
  suppliers: { id: string; name: string; note: string; openCount: number }[]
  supplierCount: number
  priceWatch: { id: string; item: string; unit: string; nowCost: number; prevCost: number; changePct: number }[]
}

export const EMPTY_SUPPLIERS_BOARD: SuppliersBoard = {
  open: { count: 0, value: 0, arrivingToday: 0 },
  lowItems: 0,
  nextUp: null,
  month: { name: '', spent: 0, deliveries: 0, purchasesPct: null },
  pos: [],
  suppliers: [],
  supplierCount: 0,
  priceWatch: [],
}

const OPEN: PurchaseOrderStatus[] = ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function expectedArrival(orderedAt: Date | null, leadTimeDays: number): Date | null {
  return orderedAt ? new Date(orderedAt.getTime() + leadTimeDays * DAY_MS) : null
}

function poStatus(status: PurchaseOrderStatus, expectedAt: Date | null, todayStart: Date, timezone: string): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'RECEIVED':
      return { label: 'Received', tone: 'ink' }
    case 'PARTIALLY_RECEIVED':
      return { label: 'Part received', tone: 'ink' }
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'quiet' }
    case 'DRAFT':
      return { label: 'Draft', tone: 'quiet' }
    default: {
      if (expectedAt && expectedAt.getTime() < todayStart.getTime() + DAY_MS) {
        const day = localParts(expectedAt, timezone).day
        const today = localParts(todayStart, timezone).day
        return { label: day <= today ? 'Arriving today' : 'Arriving', tone: 'accent' }
      }
      return { label: 'Sent', tone: 'outline' }
    }
  }
}

function summarise(items: { quantity: number; inventoryItem: { name: string; unit: string } }[]): string {
  if (items.length === 0) return 'No lines yet'
  const first = items.slice(0, 2).map((i) => `${i.inventoryItem.name} ${i.quantity} ${i.inventoryItem.unit}`)
  return items.length > 2 ? `${first.join(', ')} · ${items.length} lines` : first.join(', ')
}

export async function getSuppliersBoard(locationId: string | null, todayStart: Date, timezone: string): Promise<SuppliersBoard> {
  if (!locationId) return EMPTY_SUPPLIERS_BOARD
  const [, mo, d] = localParts(new Date(), timezone).day.split('-').map(Number)
  const monthStart = new Date(todayStart.getTime() - (d - 1) * DAY_MS)
  const twoMonthsBack = new Date(monthStart.getTime() - 31 * DAY_MS)

  const [recent, openPos, stock, received, sales, suppliers, openBySupplier, lines] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        poNumber: true,
        status: true,
        totalCost: true,
        orderedAt: true,
        supplier: { select: { name: true, leadTimeDays: true } },
        items: { select: { quantity: true, inventoryItem: { select: { name: true, unit: true } } } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { locationId, status: { in: OPEN } },
      select: { id: true, poNumber: true, status: true, totalCost: true, orderedAt: true, supplier: { select: { name: true, leadTimeDays: true } }, items: { select: { quantity: true, inventoryItem: { select: { name: true, unit: true } } } } },
    }),
    prisma.inventoryItem.findMany({ where: { locationId }, select: { currentStock: true, minStock: true } }),
    prisma.purchaseOrder.findMany({
      where: { locationId, status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] }, receivedAt: { gte: monthStart } },
      select: { totalCost: true },
    }),
    prisma.payment.aggregate({ _sum: { total: true }, where: { order: { table: { locationId } }, status: 'COMPLETED', createdAt: { gte: monthStart } } }),
    prisma.supplier.findMany({
      where: { locationId },
      orderBy: { purchaseOrders: { _count: 'desc' } },
      take: 4,
      select: { id: true, name: true, leadTimeDays: true, contactName: true, _count: { select: { purchaseOrders: true } } },
    }),
    prisma.purchaseOrder.groupBy({ by: ['supplierId'], where: { locationId, status: { in: OPEN } }, _count: { _all: true } }),
    prisma.purchaseOrderItem.findMany({
      where: { purchaseOrder: { locationId, createdAt: { gte: twoMonthsBack }, status: { not: 'CANCELLED' } } },
      select: { inventoryItemId: true, unitCost: true, purchaseOrder: { select: { createdAt: true } }, inventoryItem: { select: { name: true, unit: true } } },
    }),
  ])

  // Open POs and what arrives today
  const arrivingToday = openPos.filter((p) => {
    const exp = expectedArrival(p.orderedAt, p.supplier.leadTimeDays)
    return exp && exp >= todayStart && exp.getTime() < todayStart.getTime() + DAY_MS
  })
  const nextCandidates = openPos
    .filter((p) => p.status !== 'DRAFT')
    .map((p) => ({ p, exp: expectedArrival(p.orderedAt, p.supplier.leadTimeDays) }))
    .sort((a, b) => (a.exp?.getTime() ?? Infinity) - (b.exp?.getTime() ?? Infinity))
  const next = nextCandidates[0]

  // Price watch: average unit cost this month against last month, per ingredient
  const costs = new Map<string, { name: string; unit: string; now: number[]; prev: number[] }>()
  for (const l of lines) {
    const cur = costs.get(l.inventoryItemId) ?? { name: l.inventoryItem.name, unit: l.inventoryItem.unit, now: [], prev: [] }
    ;(l.purchaseOrder.createdAt >= monthStart ? cur.now : cur.prev).push(Number(l.unitCost))
    costs.set(l.inventoryItemId, cur)
  }
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const priceWatch = [...costs.entries()]
    .filter(([, c]) => c.now.length > 0 && c.prev.length > 0)
    .map(([id, c]) => {
      const nowCost = avg(c.now)
      const prevCost = avg(c.prev)
      return { id, item: c.name, unit: c.unit, nowCost, prevCost, changePct: prevCost > 0 ? ((nowCost - prevCost) / prevCost) * 100 : 0 }
    })
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 3)

  const spent = received.reduce((s, p) => s + Number(p.totalCost), 0)
  const monthSales = Number(sales._sum.total ?? 0)
  const openCount = new Map(openBySupplier.map((g) => [g.supplierId, g._count._all]))

  return {
    open: { count: openPos.length, value: openPos.reduce((s, p) => s + Number(p.totalCost), 0), arrivingToday: arrivingToday.length },
    lowItems: stock.filter((i) => i.currentStock <= i.minStock).length,
    nextUp: next ? { id: next.p.id, poNumber: next.p.poNumber, supplier: next.p.supplier.name, expectedAt: next.exp, summary: summarise(next.p.items) } : null,
    month: { name: MONTHS_LONG[mo - 1], spent, deliveries: received.length, purchasesPct: monthSales > 0 && spent > 0 ? (spent / monthSales) * 100 : null },
    pos: recent.map((p) => ({
      id: p.id,
      poNumber: p.poNumber,
      supplier: p.supplier.name,
      summary: summarise(p.items),
      value: Number(p.totalCost),
      status: poStatus(p.status, expectedArrival(p.orderedAt, p.supplier.leadTimeDays), todayStart, timezone),
    })),
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      note: [s.contactName, `${s.leadTimeDays}-day lead time`].filter(Boolean).join(' · '),
      openCount: openCount.get(s.id) ?? 0,
    })),
    supplierCount: suppliers.length,
    priceWatch,
  }
}
