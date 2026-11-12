import { prisma } from '@/lib/prisma'
import { startOfDayInTimeZone } from '@/lib/dashboard-metrics'
import { localParts } from './time'

/** Data for the Store keeper · Inventory board, from real stock records. */

export type StockStatus = 'reorder' | 'near' | 'ok'

export interface IngredientRow {
  id: string
  name: string
  category: string | null
  unit: string
  onHand: number
  par: number
  min: number
  unitCost: number
  status: StockStatus
}

export interface InventoryOverview {
  timezone: string
  headline: string
  reorder: { id: string; name: string; left: string; days: string }[]
  reorderCount: number
  stockValue: number
  foodCostPct: number | null
  daysOfCover: number | null
  itemCount: number
  waste: { total: number; reasons: { label: string; amount: number }[] }
  usage: { itemName: string; unit: string; bars: { label: string; value: number; hi: boolean }[] } | null
  onOrder: { id: string; supplier: string; due: string; late: boolean; what: string }[]
  rows: IngredientRow[]
}

const DAY = 24 * 60 * 60 * 1000

const WASTE_LABEL: Record<string, string> = {
  SPOILED: 'Spoiled',
  EXPIRED: 'Expired',
  PREP_MISTAKE: 'Prep mistake',
  DROPPED: 'Dropped',
  CUSTOMER_COMPLAINT: 'Returned dish',
  OTHER: 'Other',
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0)
}

export function stockStatus(onHand: number, min: number, par: number): StockStatus {
  if (onHand <= min) return 'reorder'
  if (par > 0 && onHand < par) return 'near'
  return 'ok'
}

export async function getInventoryOverview(locationId: string | null): Promise<InventoryOverview> {
  const blank: InventoryOverview = {
    timezone: 'UTC',
    headline: 'Add your first ingredients to start tracking stock.',
    reorder: [],
    reorderCount: 0,
    stockValue: 0,
    foodCostPct: null,
    daysOfCover: null,
    itemCount: 0,
    waste: { total: 0, reasons: [] },
    usage: null,
    onOrder: [],
    rows: [],
  }
  if (!locationId) return blank

  const location = await prisma.location.findUnique({ where: { id: locationId }, select: { timezone: true } })
  const tz = location?.timezone || 'UTC'
  const now = new Date()
  const todayStart = startOfDayInTimeZone(tz, now)
  const since30 = new Date(todayStart.getTime() - 29 * DAY)
  const since14 = new Date(todayStart.getTime() - 13 * DAY)
  const since7 = new Date(todayStart.getTime() - 6 * DAY)

  const [items, depletions, wasteLogs, openPOs, sales30] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { locationId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, unit: true, category: true, unitCost: true, parStock: true, currentStock: true, minStock: true },
    }),
    prisma.inventoryTransaction.findMany({
      where: { type: 'DEPLETION_ORDER', createdAt: { gte: since30 }, inventoryItem: { locationId } },
      select: { inventoryItemId: true, quantity: true, createdAt: true },
    }),
    prisma.wasteLog.findMany({
      where: { locationId, status: { not: 'REJECTED' }, createdAt: { gte: since7 } },
      select: { reason: true, totalCost: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { locationId, status: { in: ['ORDERED', 'PARTIALLY_RECEIVED'] } },
      orderBy: { orderedAt: 'asc' },
      take: 3,
      select: {
        id: true,
        orderedAt: true,
        createdAt: true,
        supplier: { select: { name: true, leadTimeDays: true } },
        items: { select: { quantity: true, inventoryItem: { select: { name: true, unit: true } } } },
      },
    }),
    prisma.payment.aggregate({
      _sum: { total: true },
      where: { status: 'COMPLETED', createdAt: { gte: since30 }, order: { table: { locationId } } },
    }),
  ])

  if (items.length === 0) return { ...blank, timezone: tz }

  const costOf = new Map(items.map((i) => [i.id, Number(i.unitCost)]))

  // Usage per item over 14 days (depletions are stored as negative quantities)
  const used14 = new Map<string, number>()
  let usedValue30 = 0
  for (const d of depletions) {
    const q = Math.abs(d.quantity)
    usedValue30 += q * (costOf.get(d.inventoryItemId) ?? 0)
    if (d.createdAt >= since14) used14.set(d.inventoryItemId, (used14.get(d.inventoryItemId) ?? 0) + q)
  }

  const rows: IngredientRow[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    unit: i.unit,
    onHand: i.currentStock,
    par: i.parStock,
    min: i.minStock,
    unitCost: Number(i.unitCost),
    status: stockStatus(i.currentStock, i.minStock, i.parStock),
  }))

  const daysLeftOf = (r: IngredientRow): number | null => {
    const perDay = (used14.get(r.id) ?? 0) / 14
    if (perDay <= 0) return null
    return r.onHand / perDay
  }

  const reorderRows = rows
    .filter((r) => r.status === 'reorder')
    .map((r) => ({ r, days: daysLeftOf(r) }))
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity) || a.r.onHand - b.r.onHand)

  const runningOutSoon = rows.filter((r) => {
    const d = daysLeftOf(r)
    return d !== null && d <= 3
  }).length

  const headline =
    runningOutSoon > 0
      ? `${runningOutSoon} item${runningOutSoon === 1 ? '' : 's'} will run out in the next 3 days.`
      : reorderRows.length > 0
        ? `${reorderRows.length} item${reorderRows.length === 1 ? ' is' : 's are'} below the reorder point.`
        : 'Stock looks healthy today.'

  const stockValue = rows.reduce((s, r) => s + Math.max(0, r.onHand) * r.unitCost, 0)
  const sales = Number(sales30._sum.total ?? 0)
  const foodCostPct = sales > 0 && usedValue30 > 0 ? (usedValue30 / sales) * 100 : null
  const dailyUseValue = usedValue30 / 30
  const daysOfCover = dailyUseValue > 0 ? stockValue / dailyUseValue : null

  // Wastage this week, biggest reasons first
  const byReason = new Map<string, number>()
  let wasteTotal = 0
  for (const w of wasteLogs) {
    const v = Number(w.totalCost)
    wasteTotal += v
    byReason.set(w.reason, (byReason.get(w.reason) ?? 0) + v)
  }
  const reasons = [...byReason.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => ({ label: WASTE_LABEL[k] ?? k, amount: v }))

  // Daily use of the most-used ingredient (by value) over the last 7 days
  let usage: InventoryOverview['usage'] = null
  const value7 = new Map<string, number>()
  for (const d of depletions) {
    if (d.createdAt < since7) continue
    value7.set(d.inventoryItemId, (value7.get(d.inventoryItemId) ?? 0) + Math.abs(d.quantity) * (costOf.get(d.inventoryItemId) ?? 0))
  }
  const topId = [...value7.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (topId) {
    const item = rows.find((r) => r.id === topId)!
    const dayKeys: { key: string; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const lp = localParts(new Date(now.getTime() - i * DAY), tz)
      dayKeys.push({ key: lp.day, label: lp.weekday.slice(0, 1) })
    }
    const perDay = new Map<string, number>()
    for (const d of depletions) {
      if (d.inventoryItemId !== topId || d.createdAt < since7) continue
      const k = localParts(d.createdAt, tz).day
      perDay.set(k, (perDay.get(k) ?? 0) + Math.abs(d.quantity))
    }
    const values = dayKeys.map((d) => perDay.get(d.key) ?? 0)
    const avg = values.reduce((a, b) => a + b, 0) / 7
    usage = {
      itemName: item.name,
      unit: item.unit,
      bars: dayKeys.map((d, i) => ({ label: d.label, value: values[i], hi: values[i] > 0 && values[i] >= avg * 1.25 })),
    }
  }

  // Purchase orders still to arrive, due date = ordered + supplier lead time
  const todayKey = localParts(now, tz).day
  const onOrder = openPOs.map((po) => {
    const placed = po.orderedAt ?? po.createdAt
    const due = new Date(placed.getTime() + (po.supplier.leadTimeDays || 0) * DAY)
    const dueKey = localParts(due, tz).day
    const late = dueKey < todayKey
    const dueLabel = dueKey === todayKey ? 'today' : late ? 'late' : localParts(due, tz).weekday
    const lines = po.items.slice(0, 2).map((l) => `${l.inventoryItem.name} ${fmtQty(l.quantity)} ${l.inventoryItem.unit}`)
    const more = po.items.length > 2 ? ` · ${po.items.length} lines` : ''
    return { id: po.id, supplier: po.supplier.name, due: dueLabel, late, what: lines.join(', ') + more }
  })

  return {
    timezone: tz,
    headline,
    reorder: reorderRows.slice(0, 5).map(({ r, days }) => ({
      id: r.id,
      name: r.name,
      left: `${fmtQty(Math.max(0, r.onHand))} ${r.unit} left`,
      days: days === null ? 'no recent use' : days < 1 ? 'today' : `${Math.floor(days)} day${Math.floor(days) === 1 ? '' : 's'}`,
    })),
    reorderCount: reorderRows.length,
    stockValue,
    foodCostPct,
    daysOfCover,
    itemCount: rows.length,
    waste: { total: wasteTotal, reasons },
    usage,
    onOrder,
    rows,
  }
}
