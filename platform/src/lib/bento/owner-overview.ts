import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { startOfDayInTimeZone, getTodayFloorMetrics } from '@/lib/dashboard-metrics'
import { localParts, minutesBetween } from './time'
import type { OrderSource } from '@prisma/client'

/**
 * Everything the Owner / Manager overview shows, read from real records only.
 * Anything without data comes back empty or null, and the tile says so.
 */

export interface SalesBar {
  label: string
  value: number
  hi: boolean
}
export interface SalesRange {
  total: number
  /** Change against the previous period of the same length, in percent. Null when there is nothing to compare. */
  growthPct: number | null
  compareLabel: string
  bars: SalesBar[]
  best: string | null
}

export interface OwnerOverview {
  locationId: string | null
  timezone: string
  tables: { total: number; seated: number }
  sales: { today: SalesRange; week: SalesRange; month: SalesRange }
  rightNow: { newOrders: number; reservations: number; waitlist: number }
  /** The one thing on the floor that most needs a manager right now. */
  needsYou: { kind: 'bill' | 'ready'; title: string; detail: string; href: string; cta: string; total: number | null } | null
  topDishes: { id: string; name: string; sold: number; price: number; imageUrl: string | null }[]
  topDishesWindow: 'today' | 'week'
  today: { netSales: number; covers: number; avgTicket: number | null; paidOrders: number }
  comingUp: { id: string; time: Date; name: string; party: number; table: string | null; status: string }[]
  reservationsTonight: number
  channels: { pos: number; qr: number; online: number }
  liveOnline: { label: string; detail: string | null } | null
  onShift: { id: string; name: string; role: string; since: Date }[]
  laborPct: number | null
}

const QR_SOURCES: OrderSource[] = ['QR_TABLE', 'QR_DINE_IN']
const ONLINE_SOURCES: OrderSource[] = ['DELIVERY_DOORDASH', 'DELIVERY_UBEREATS', 'DELIVERY_OTHER', 'WEB_PICKUP', 'WEB_DELIVERY']

const ONLINE_STATUS_LABEL: Record<string, string> = {
  PENDING_ACCEPTANCE: 'waiting to be accepted',
  ACCEPTED: 'accepted',
  PREPARING: 'in the kitchen',
  READY: 'ready for pickup',
  OUT_FOR_DELIVERY: 'out for delivery',
}

const DAY = 24 * 60 * 60 * 1000

function emptyRange(compareLabel: string): SalesRange {
  return { total: 0, growthPct: null, compareLabel, bars: [], best: null }
}

function growth(curr: number, prev: number): number | null {
  if (prev <= 0) return null
  return ((curr - prev) / prev) * 100
}

function markBest(bars: SalesBar[]): string | null {
  let best: SalesBar | null = null
  for (const b of bars) if (b.value > 0 && (!best || b.value > best.value)) best = b
  if (best) best.hi = true
  return best?.label ?? null
}

/** The outlet this user works at, else the restaurant's first one. Memoised per request. */
export const resolveLocationId = cache(async (userId: string, restaurantId: string): Promise<string | null> => {
  const employee = await prisma.employee.findFirst({ where: { userId, isActive: true }, select: { locationId: true } })
  if (employee?.locationId) return employee.locationId
  const loc = await prisma.location.findFirst({ where: { restaurantId }, select: { id: true }, orderBy: { createdAt: 'asc' } })
  return loc?.id ?? null
})

export async function getOwnerOverview(locationId: string | null): Promise<OwnerOverview> {
  const empty: OwnerOverview = {
    locationId,
    timezone: 'UTC',
    tables: { total: 0, seated: 0 },
    sales: { today: emptyRange('yesterday'), week: emptyRange('last week'), month: emptyRange('the 4 weeks before') },
    rightNow: { newOrders: 0, reservations: 0, waitlist: 0 },
    needsYou: null,
    topDishes: [],
    topDishesWindow: 'today',
    today: { netSales: 0, covers: 0, avgTicket: null, paidOrders: 0 },
    comingUp: [],
    reservationsTonight: 0,
    channels: { pos: 0, qr: 0, online: 0 },
    liveOnline: null,
    onShift: [],
    laborPct: null,
  }
  if (!locationId) return empty

  const location = await prisma.location.findUnique({ where: { id: locationId }, select: { timezone: true } })
  const tz = location?.timezone || 'UTC'
  const now = new Date()
  const todayStart = startOfDayInTimeZone(tz, now)
  const tomorrowStart = new Date(todayStart.getTime() + DAY)
  const since56 = new Date(todayStart.getTime() - 55 * DAY)
  const atLocation = { table: { locationId } }

  const [
    tables,
    payments,
    newOrders,
    reservationsToday,
    waitlist,
    payingOrder,
    readyOrder,
    topToday,
    ordersToday,
    onlineLive,
    timeEntries,
    floor,
  ] = await Promise.all([
    prisma.table.findMany({ where: { locationId }, select: { id: true, status: true, orders: { where: { status: { notIn: ['PAID', 'VOIDED'] } }, select: { id: true }, take: 1 } } }),
    prisma.payment.findMany({
      where: { order: atLocation, status: 'COMPLETED', createdAt: { gte: since56 } },
      select: { total: true, createdAt: true, orderId: true },
    }),
    prisma.order.count({ where: { ...atLocation, status: { in: ['OPEN', 'SENT_TO_KITCHEN'] }, createdAt: { gte: todayStart } } }),
    prisma.reservation.findMany({
      where: { locationId, scheduledAt: { gte: todayStart, lt: tomorrowStart }, status: { in: ['PENDING', 'CONFIRMED'] } },
      orderBy: { scheduledAt: 'asc' },
      include: { table: { select: { name: true } } },
    }),
    prisma.waitlistEntry.count({ where: { locationId, status: 'WAITING' } }),
    // The bill that has waited longest
    prisma.order.findFirst({
      where: { ...atLocation, status: { notIn: ['PAID', 'VOIDED'] }, table: { locationId, status: 'PAYING' } },
      orderBy: { updatedAt: 'asc' },
      select: { id: true, total: true, guestCount: true, updatedAt: true, tableId: true, table: { select: { name: true } }, server: { select: { name: true } } },
    }),
    // Food that is ready and not yet served
    prisma.order.findFirst({
      where: { ...atLocation, status: 'READY', readyAt: { not: null } },
      orderBy: { readyAt: 'asc' },
      select: { id: true, readyAt: true, tableId: true, table: { select: { name: true } }, server: { select: { name: true } }, items: { select: { quantity: true } } },
    }),
    topSellers(locationId, todayStart),
    prisma.order.findMany({
      where: { ...atLocation, status: { not: 'VOIDED' }, createdAt: { gte: todayStart } },
      select: { orderSource: true, guestCount: true },
    }),
    prisma.order.findFirst({
      where: {
        ...atLocation,
        orderSource: { in: ONLINE_SOURCES },
        onlineStatus: { in: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, publicOrderNumber: true, onlineStatus: true, estimatedReadyAt: true },
    }),
    prisma.timeEntry.findMany({
      where: { locationId, clockOut: null },
      orderBy: { clockIn: 'asc' },
      take: 6,
      select: { id: true, clockIn: true, employee: { select: { jobTitle: true, user: { select: { name: true, role: true } } } } },
    }),
    getTodayFloorMetrics(locationId).catch(() => ({ avgTurnTimeMinutes: null, laborCostPct: null })),
  ])

  // ── Sales, bucketed by the location's own calendar ──
  const byDay = new Map<string, number>()
  const byHourToday = new Array<number>(24).fill(0)
  const todayKey = localParts(now, tz).day
  const paidToday = new Set<string>()
  for (const p of payments) {
    const amt = Number(p.total)
    const lp = localParts(p.createdAt, tz)
    byDay.set(lp.day, (byDay.get(lp.day) ?? 0) + amt)
    if (lp.day === todayKey) {
      byHourToday[lp.hour] += amt
      paidToday.add(p.orderId)
    }
  }
  // Calendar days, newest last: index 0 = 55 days ago, 55 = today
  const days: { key: string; weekday: string }[] = []
  for (let i = 55; i >= 0; i--) {
    const lp = localParts(new Date(now.getTime() - i * DAY), tz)
    days.push({ key: lp.day, weekday: lp.weekday })
  }
  const sumDays = (from: number, to: number) => days.slice(from, to).reduce((s, d) => s + (byDay.get(d.key) ?? 0), 0)

  const weekBars: SalesBar[] = days.slice(49).map((d) => ({ label: d.weekday, value: byDay.get(d.key) ?? 0, hi: false }))
  const weekTotal = sumDays(49, 56)
  const week: SalesRange = { total: weekTotal, growthPct: growth(weekTotal, sumDays(42, 49)), compareLabel: 'last week', bars: weekBars, best: markBest(weekBars) }

  const monthBars: SalesBar[] = [0, 1, 2, 3].map((w) => ({ label: w === 3 ? 'This wk' : `${3 - w} wk ago`, value: sumDays(28 + w * 7, 35 + w * 7), hi: false }))
  const monthTotal = sumDays(28, 56)
  const month: SalesRange = { total: monthTotal, growthPct: growth(monthTotal, sumDays(0, 28)), compareLabel: 'the 4 weeks before', bars: monthBars, best: markBest(monthBars) }

  const slots = [
    { label: '6am', from: 6, to: 10 },
    { label: '10am', from: 10, to: 13 },
    { label: '1pm', from: 13, to: 16 },
    { label: '4pm', from: 16, to: 19 },
    { label: '7pm', from: 19, to: 22 },
    { label: '10pm', from: 22, to: 24 },
  ]
  const todayBars: SalesBar[] = slots.map((s) => ({ label: s.label, value: byHourToday.slice(s.from, s.to).reduce((a, b) => a + b, 0), hi: false }))
  // Anything sold between midnight and 6am counts towards the first slot
  todayBars[0].value += byHourToday.slice(0, 6).reduce((a, b) => a + b, 0)
  const todayTotal = byDay.get(todayKey) ?? 0
  const today: SalesRange = { total: todayTotal, growthPct: growth(todayTotal, byDay.get(days[54].key) ?? 0), compareLabel: 'yesterday', bars: todayBars, best: markBest(todayBars) }

  // ── Needs you ──
  let needsYou: OwnerOverview['needsYou'] = null
  if (payingOrder) {
    const mins = minutesBetween(payingOrder.updatedAt, now)
    const tableName = payingOrder.table?.name ?? 'A table'
    needsYou = {
      kind: 'bill',
      title: `${tableName} has waited ${mins} min for the bill`,
      detail: [`${payingOrder.guestCount} guest${payingOrder.guestCount === 1 ? '' : 's'}`, payingOrder.server?.name ? `server ${payingOrder.server.name}` : null].filter(Boolean).join(' · '),
      href: `/pos?tableId=${payingOrder.tableId}&orderId=${payingOrder.id}`,
      cta: 'Take payment',
      total: Number(payingOrder.total),
    }
  } else if (readyOrder?.readyAt) {
    const mins = minutesBetween(readyOrder.readyAt, now)
    const count = readyOrder.items.reduce((s, i) => s + i.quantity, 0)
    needsYou = {
      kind: 'ready',
      title: `${readyOrder.table?.name ?? 'An order'}: food ready ${mins} min ago`,
      detail: [`${count} item${count === 1 ? '' : 's'} at the pass`, readyOrder.server?.name ? `server ${readyOrder.server.name}` : null].filter(Boolean).join(' · '),
      href: `/pos?tableId=${readyOrder.tableId}&orderId=${readyOrder.id}`,
      cta: 'Open order',
      total: null,
    }
  }

  // ── Top dishes: today, or the last 7 days when nothing has sold yet today ──
  let topWindow: 'today' | 'week' = 'today'
  let topGroups = topToday
  if (topGroups.length === 0) {
    topWindow = 'week'
    topGroups = await topSellers(locationId, new Date(todayStart.getTime() - 6 * DAY))
  }
  const menuItems = topGroups.length
    ? await prisma.menuItem.findMany({ where: { id: { in: topGroups.map((g) => g.menuItemId) } }, select: { id: true, name: true, price: true, imageUrl: true } })
    : []
  const topDishes = topGroups
    .map((g) => {
      const m = menuItems.find((x) => x.id === g.menuItemId)
      return m ? { id: m.id, name: m.name, sold: g.qty, price: Number(m.price), imageUrl: m.imageUrl ?? null } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // ── Today so far ──
  const covers = ordersToday.reduce((s, o) => s + (o.guestCount || 0), 0)
  const channels = { pos: 0, qr: 0, online: 0 }
  for (const o of ordersToday) {
    if (QR_SOURCES.includes(o.orderSource)) channels.qr++
    else if (ONLINE_SOURCES.includes(o.orderSource)) channels.online++
    else channels.pos++
  }

  const seated = tables.filter((t) => t.status === 'ACTIVE' || t.status === 'PAYING' || t.orders.length > 0).length

  const liveOnline = onlineLive
    ? {
        label: `#${onlineLive.publicOrderNumber ?? onlineLive.id.slice(-4).toUpperCase()} ${ONLINE_STATUS_LABEL[onlineLive.onlineStatus ?? ''] ?? 'in progress'}`,
        detail:
          onlineLive.estimatedReadyAt && onlineLive.estimatedReadyAt > now
            ? `ready in ${minutesBetween(now, onlineLive.estimatedReadyAt)} min`
            : null,
      }
    : null

  const upcoming = reservationsToday.filter((r) => r.scheduledAt.getTime() >= now.getTime() - 15 * 60000)

  return {
    locationId,
    timezone: tz,
    tables: { total: tables.length, seated },
    sales: { today, week, month },
    rightNow: { newOrders, reservations: upcoming.length, waitlist },
    needsYou,
    topDishes,
    topDishesWindow: topWindow,
    today: {
      netSales: todayTotal,
      covers,
      avgTicket: paidToday.size > 0 ? todayTotal / paidToday.size : null,
      paidOrders: paidToday.size,
    },
    comingUp: upcoming.slice(0, 3).map((r) => ({
      id: r.id,
      time: r.scheduledAt,
      name: r.guestName,
      party: r.partySize,
      table: r.table?.name ?? null,
      status: r.status,
    })),
    reservationsTonight: upcoming.length,
    channels,
    liveOnline,
    onShift: timeEntries.map((t) => ({
      id: t.id,
      name: t.employee?.user?.name ?? 'Team member',
      role: t.employee?.jobTitle || prettyRole(t.employee?.user?.role),
      since: t.clockIn,
    })),
    laborPct: floor.laborCostPct,
  }
}

/** Best sellers by quantity since a moment, voided lines and orders left out. */
async function topSellers(locationId: string, since: Date): Promise<{ menuItemId: string; qty: number }[]> {
  const rows = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    _sum: { quantity: true },
    where: { status: { not: 'VOIDED' }, order: { table: { locationId }, status: { not: 'VOIDED' }, createdAt: { gte: since } } },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 3,
  })
  return rows.map((r) => ({ menuItemId: r.menuItemId, qty: r._sum.quantity ?? 0 }))
}

function prettyRole(role: string | null | undefined): string {
  switch (role) {
    case 'OWNER':
      return 'Owner'
    case 'MANAGER':
      return 'Manager'
    case 'SERVER':
      return 'Floor'
    case 'KITCHEN':
      return 'Kitchen'
    default:
      return 'Team'
  }
}
