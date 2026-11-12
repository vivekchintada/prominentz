import { prisma } from '@/lib/prisma'
import { localParts } from './time'
import { DAY_MS } from './time'
import { CHANNELS, channelOf, type Channel } from './channels'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Everything the Reports · sales and costs board shows. */
export interface ReportsBoard {
  monthName: string
  monthSales: number
  /** This month so far against the same days of last month. */
  growthPct: number | null
  months: { key: string; label: string; value: number; current: boolean }[]
  prime: { foodPct: number | null; labourPct: number | null }
  channels: { channel: Channel; share: number }[]
  avgTicket: number | null
  covers: number
  best: { id: string; name: string; sold: number }[]
  hours: { hour: number; orders: number }[]
  exports: { label: string; detail: string; href: string }[]
}

export const EMPTY_REPORTS_BOARD: ReportsBoard = {
  monthName: '',
  monthSales: 0,
  growthPct: null,
  months: [],
  prime: { foodPct: null, labourPct: null },
  channels: [],
  avgTicket: null,
  covers: 0,
  best: [],
  hours: [],
  exports: [],
}

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`
}

export async function getReportsBoard(locationId: string | null, todayStart: Date, timezone: string): Promise<ReportsBoard> {
  const now = new Date()
  const today = localParts(now, timezone).day // "2026-11-11"
  const [y, mo, d] = today.split('-').map(Number)
  const monthStart = new Date(todayStart.getTime() - (d - 1) * DAY_MS)

  // The last six calendar months, oldest first
  const keys: { key: string; label: string; y: number; m: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const idx = y * 12 + (mo - 1) - i
    const yy = Math.floor(idx / 12)
    const mm = (idx % 12) + 1
    keys.push({ key: monthKey(yy, mm), label: MONTHS[mm - 1], y: yy, m: mm })
  }
  const prev = keys[4]
  const prevStartIso = `${prev.key}-01`
  const prevEndIso = `${prev.key}-${String(new Date(Date.UTC(prev.y, prev.m, 0)).getUTCDate()).padStart(2, '0')}`

  const exports: ReportsBoard['exports'] = [
    { label: 'Sales this month', detail: `CSV · 1 ${MONTHS[mo - 1]} to today`, href: `/api/reports/export?startDate=${keys[5].key}-01&endDate=${today}` },
    { label: `Sales · ${MONTHS_LONG[prev.m - 1]}`, detail: 'CSV · whole month', href: `/api/reports/export?startDate=${prevStartIso}&endDate=${prevEndIso}` },
  ]

  const base: ReportsBoard = {
    ...EMPTY_REPORTS_BOARD,
    monthName: MONTHS_LONG[mo - 1],
    months: keys.map((k, i) => ({ key: k.key, label: k.label, value: 0, current: i === 5 })),
    exports,
  }
  if (!locationId) return base

  const since = new Date(monthStart.getTime() - 160 * DAY_MS)
  const atLocation = { table: { locationId } }

  const [payments, monthOrders, sold, entries] = await Promise.all([
    prisma.payment.findMany({
      where: { order: atLocation, status: 'COMPLETED', createdAt: { gte: since } },
      select: { total: true, createdAt: true, orderId: true },
    }),
    prisma.order.findMany({
      where: { ...atLocation, status: { not: 'VOIDED' }, createdAt: { gte: monthStart } },
      select: { orderSource: true, fulfilmentType: true, guestCount: true, createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      where: { status: { not: 'VOIDED' }, order: { ...atLocation, status: { not: 'VOIDED' }, createdAt: { gte: monthStart } } },
      orderBy: { _sum: { quantity: 'desc' } },
    }),
    prisma.timeEntry.findMany({
      where: { locationId, OR: [{ clockIn: { gte: monthStart } }, { clockOut: null }, { clockOut: { gte: monthStart } }] },
      select: { clockIn: true, clockOut: true, breakMinutes: true, employee: { select: { hourlyRate: true } } },
    }),
  ])

  // Sales by month, and this month against the same days of last month
  const byMonth = new Map<string, number>()
  let prevToDate = 0
  const paidThisMonth = new Set<string>()
  for (const p of payments) {
    const day = localParts(p.createdAt, timezone).day
    const key = day.slice(0, 7)
    const amt = Number(p.total)
    byMonth.set(key, (byMonth.get(key) ?? 0) + amt)
    if (key === prev.key && Number(day.slice(8, 10)) <= d) prevToDate += amt
    if (key === keys[5].key) paidThisMonth.add(p.orderId)
  }
  const monthSales = byMonth.get(keys[5].key) ?? 0

  // Food cost from recipes of what sold this month
  const soldIds = sold.map((s) => s.menuItemId)
  const items = soldIds.length
    ? await prisma.menuItem.findMany({
        where: { id: { in: soldIds } },
        select: { id: true, name: true, recipeItems: { select: { quantityRequired: true, inventoryItem: { select: { unitCost: true } } } } },
      })
    : []
  let foodCost = 0
  let costed = 0
  for (const s of sold) {
    const it = items.find((x) => x.id === s.menuItemId)
    if (!it || it.recipeItems.length === 0) continue
    const unit = it.recipeItems.reduce((sum, r) => sum + r.quantityRequired * Number(r.inventoryItem.unitCost), 0)
    foodCost += unit * (s._sum.quantity ?? 0)
    costed++
  }

  // Labour this month
  let labour = 0
  let priced = 0
  for (const e of entries) {
    const rate = e.employee?.hourlyRate == null ? 0 : Number(e.employee.hourlyRate)
    if (!(rate > 0)) continue
    const start = Math.max(e.clockIn.getTime(), monthStart.getTime())
    const end = (e.clockOut ?? now).getTime()
    if (end <= start) continue
    labour += Math.max(0, (end - start) / 3600000 - (e.breakMinutes || 0) / 60) * rate
    priced++
  }

  // Channel share, covers and busy hours this month
  const chCount = new Map<Channel, number>(CHANNELS.map((c) => [c, 0]))
  const hourCount = new Array<number>(24).fill(0)
  let covers = 0
  for (const o of monthOrders) {
    const c = channelOf(o.orderSource, o.fulfilmentType)
    chCount.set(c, (chCount.get(c) ?? 0) + 1)
    hourCount[localParts(o.createdAt, timezone).hour]++
    covers += o.guestCount || 0
  }
  const orderTotal = monthOrders.length

  // Hour window: from the first to the last busy hour, at most 12 bars around the peak
  let hours: ReportsBoard['hours'] = []
  const busy = hourCount.map((n, h) => ({ h, n })).filter((x) => x.n > 0)
  if (busy.length > 0) {
    let from = busy[0].h
    let to = busy[busy.length - 1].h
    if (to - from + 1 > 12) {
      const peak = busy.reduce((a, b) => (b.n > a.n ? b : a)).h
      from = Math.max(0, Math.min(peak - 6, 12))
      to = from + 11
    }
    for (let h = from; h <= to; h++) hours.push({ hour: h, orders: hourCount[h] })
  } else {
    hours = []
  }

  return {
    monthName: MONTHS_LONG[mo - 1],
    monthSales,
    growthPct: prevToDate > 0 ? ((monthSales - prevToDate) / prevToDate) * 100 : null,
    months: keys.map((k, i) => ({ key: k.key, label: k.label, value: byMonth.get(k.key) ?? 0, current: i === 5 })),
    prime: {
      foodPct: costed > 0 && monthSales > 0 ? (foodCost / monthSales) * 100 : null,
      labourPct: priced > 0 && monthSales > 0 ? (labour / monthSales) * 100 : null,
    },
    channels: orderTotal > 0 ? CHANNELS.map((c) => ({ channel: c, share: Math.round(((chCount.get(c) ?? 0) / orderTotal) * 100) })) : [],
    avgTicket: paidThisMonth.size > 0 ? monthSales / paidThisMonth.size : null,
    covers,
    best: sold.slice(0, 4).map((s) => ({ id: s.menuItemId, name: items.find((x) => x.id === s.menuItemId)?.name ?? 'Dish', sold: s._sum.quantity ?? 0 })),
    hours,
    exports,
  }
}
