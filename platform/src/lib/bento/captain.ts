import { prisma } from '@/lib/prisma'
import { startOfDayInTimeZone } from '@/lib/dashboard-metrics'
import { durationLabel, minutesBetween } from './time'

/** Data for the Captain / Server phone board. */

export type TableState = 'bill' | 'ready' | 'kitchen' | 'eating' | 'seated' | 'free'

export interface CaptainTable {
  id: string
  name: string
  state: TableState
  orderId: string | null
}

export interface CaptainData {
  locationId: string
  locationName: string
  shiftStartedAt: Date | null
  tables: CaptainTable[]
  /** True when the tiles show only this server's tables. */
  mineOnly: boolean
  totalTables: number
  needsYou: { kind: 'bill' | 'ready'; title: string; tableName: string; href: string; secondaryHref: string; secondaryLabel: string } | null
  ready: { count: number; detail: string }
  sales: number
  tips: number
  /** Payments I took today. */
  paidCount: number
}

export async function getCaptainData(userId: string, locationId: string): Promise<CaptainData> {
  const [location, employee] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId }, select: { name: true, timezone: true } }),
    prisma.employee.findFirst({ where: { userId, isActive: true }, select: { id: true } }),
  ])
  const tz = location?.timezone || 'UTC'
  const todayStart = startOfDayInTimeZone(tz)
  const now = new Date()

  const [tables, payments, shift] = await Promise.all([
    prisma.table.findMany({
      where: { locationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        orders: {
          where: { status: { notIn: ['PAID', 'VOIDED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, serverId: true, updatedAt: true, items: { select: { status: true, quantity: true } } },
        },
      },
    }),
    prisma.payment.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: todayStart }, order: { serverId: userId, table: { locationId } } },
      select: { total: true, tip: true },
    }),
    employee
      ? prisma.timeEntry.findFirst({ where: { employeeId: employee.id, clockOut: null }, orderBy: { clockIn: 'desc' }, select: { clockIn: true } })
      : Promise.resolve(null),
  ])

  const stateOf = (t: (typeof tables)[number]): TableState => {
    const o = t.orders[0]
    if (t.status === 'PAYING') return 'bill'
    if (!o) return t.status === 'ACTIVE' ? 'seated' : 'free'
    const live = o.items.filter((i) => i.status !== 'VOIDED')
    if (live.some((i) => i.status === 'READY')) return 'ready'
    if (live.some((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS')) return live.every((i) => i.status === 'PENDING') && o.status === 'OPEN' ? 'seated' : 'kitchen'
    if (live.length > 0) return 'eating'
    return 'seated'
  }

  const all = tables.map((t) => ({ raw: t, view: { id: t.id, name: t.name, state: stateOf(t), orderId: t.orders[0]?.id ?? null } }))
  const mine = all.filter((x) => x.raw.orders[0]?.serverId === userId)
  const mineOnly = mine.length > 0
  const shown = mineOnly ? mine : all

  // Oldest bill request on my tables, else food waiting at the pass
  const bills = shown.filter((x) => x.view.state === 'bill').sort((a, b) => (a.raw.orders[0]?.updatedAt.getTime() ?? 0) - (b.raw.orders[0]?.updatedAt.getTime() ?? 0))
  const readies = shown.filter((x) => x.view.state === 'ready')
  let needsYou: CaptainData['needsYou'] = null
  if (bills[0]) {
    const b = bills[0]
    const since = b.raw.orders[0]?.updatedAt
    const q = b.view.orderId ? `?tableId=${b.view.id}&orderId=${b.view.orderId}` : `?tableId=${b.view.id}`
    needsYou = {
      kind: 'bill',
      title: since ? `${b.view.name} asked for the bill ${minutesBetween(since, now)} min ago` : `${b.view.name} asked for the bill`,
      tableName: b.view.name,
      href: `/pos${q}&pay=1`,
      secondaryHref: `/pos${q}`,
      secondaryLabel: 'Open check',
    }
  } else if (readies[0]) {
    const r = readies[0]
    const q = r.view.orderId ? `?tableId=${r.view.id}&orderId=${r.view.orderId}` : `?tableId=${r.view.id}`
    needsYou = { kind: 'ready', title: `${r.view.name}: food is ready at the pass`, tableName: r.view.name, href: `/pos${q}`, secondaryHref: '/kds', secondaryLabel: 'Kitchen' }
  }

  return {
    locationId,
    locationName: location?.name ?? 'Floor',
    shiftStartedAt: shift?.clockIn ?? null,
    tables: shown.map((x) => x.view),
    mineOnly,
    totalTables: tables.length,
    needsYou,
    ready: { count: readies.length, detail: readies.slice(0, 3).map((x) => x.view.name).join(' · ') },
    sales: payments.reduce((s, p) => s + Number(p.total), 0),
    tips: payments.reduce((s, p) => s + Number(p.tip), 0),
    paidCount: payments.length,
  }
}

/* ── Captain · Orders tab ──────────────────────────────────────────────── */

export type CaptainOrderState = 'bill' | 'ready' | 'new' | 'kitchen' | 'eating'
export type CaptainOrderFilter = 'mine' | 'all' | 'ready'

export interface CaptainOrderRow {
  id: string
  tableId: string
  tableName: string
  mine: boolean
  state: CaptainOrderState
  detail: string
  total: number
}

export interface CaptainOrders {
  rows: CaptainOrderRow[]
  counts: Record<CaptainOrderFilter, number>
  filter: CaptainOrderFilter
}

const ORDER_RANK: Record<CaptainOrderState, number> = { bill: 0, ready: 1, new: 2, kitchen: 3, eating: 4 }

function itemsLabel(n: number): string {
  return `${n} item${n === 1 ? '' : 's'}`
}

function agoLabel(mins: number): string {
  return mins < 1 ? 'just now' : `${durationLabel(mins)} ago`
}

/** Open orders on the floor, with what each one needs next. Bills and ready food first. */
export async function getCaptainOrders(userId: string, locationId: string, wanted: string | undefined): Promise<CaptainOrders> {
  const now = new Date()
  const orders = await prisma.order.findMany({
    where: { table: { locationId }, status: { notIn: ['PAID', 'VOIDED'] } },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      status: true,
      serverId: true,
      total: true,
      updatedAt: true,
      table: { select: { id: true, name: true, status: true } },
      items: { select: { status: true, quantity: true, station: true, firedAt: true } },
    },
  })

  const rows: CaptainOrderRow[] = []
  for (const o of orders) {
    const live = o.items.filter((i) => i.status !== 'VOIDED')
    if (live.length === 0 && o.table.status !== 'PAYING') continue
    const qty = live.reduce((s, i) => s + i.quantity, 0)
    const ready = live.filter((i) => i.status === 'READY')
    const cooking = live.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS')

    let state: CaptainOrderState
    let detail: string
    if (o.table.status === 'PAYING') {
      state = 'bill'
      detail = `bill asked ${agoLabel(minutesBetween(o.updatedAt, now))}`
    } else if (ready.length > 0) {
      state = 'ready'
      detail = ready.every((i) => i.station === 'BAR') ? 'drinks ready at the bar' : `${itemsLabel(qty)} · food ready`
    } else if (cooking.length > 0 && cooking.every((i) => i.status === 'PENDING')) {
      state = 'new'
      const fired = cooking
        .map((i) => i.firedAt)
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime())[0]
      detail = o.status === 'OPEN' && !fired ? `${itemsLabel(qty)} · not sent yet` : `sent ${agoLabel(minutesBetween(fired ?? o.updatedAt, now))}`
    } else if (cooking.length > 0) {
      state = 'kitchen'
      detail = `${itemsLabel(qty)} · in kitchen`
    } else {
      state = 'eating'
      detail = `${itemsLabel(qty)} · served`
    }

    rows.push({ id: o.id, tableId: o.table.id, tableName: o.table.name, mine: o.serverId === userId, state, detail, total: Number(o.total) })
  }

  rows.sort((a, b) => ORDER_RANK[a.state] - ORDER_RANK[b.state])
  const counts: Record<CaptainOrderFilter, number> = {
    mine: rows.filter((r) => r.mine).length,
    all: rows.length,
    ready: rows.filter((r) => r.state === 'ready').length,
  }
  const filter: CaptainOrderFilter =
    wanted === 'all' || wanted === 'ready' || wanted === 'mine' ? wanted : counts.mine > 0 ? 'mine' : 'all'
  const shown = filter === 'mine' ? rows.filter((r) => r.mine) : filter === 'ready' ? rows.filter((r) => r.state === 'ready') : rows
  return { rows: shown, counts, filter }
}

/* ── Captain · Alerts tab ──────────────────────────────────────────────── */

export interface PassTicket {
  id: string
  tableName: string
  station: string
  itemCount: number
  readyAt: Date | null
}

export interface TeamNotice {
  id: string
  kind: '86' | 'note'
  text: string
  by: string
  at: Date
}

export interface CaptainAlerts {
  pass: PassTicket[]
  team: TeamNotice[]
}

const STATION_NAME: Record<string, string> = { HOT: 'grill', COLD: 'cold section', BAR: 'bar', EXPO: 'expo' }

/** Plates waiting at the pass, and today's notices from the kitchen and managers. */
export async function getCaptainAlerts(locationId: string): Promise<CaptainAlerts> {
  const location = await prisma.location.findUnique({ where: { id: locationId }, select: { restaurantId: true, timezone: true } })
  if (!location) return { pass: [], team: [] }
  const todayStart = startOfDayInTimeZone(location.timezone || 'UTC')

  const [tickets, outs, notes] = await Promise.all([
    prisma.kdsTicket.findMany({
      where: { status: 'READY', order: { table: { locationId }, status: { notIn: ['PAID', 'VOIDED'] } } },
      orderBy: [{ readyAt: 'asc' }, { createdAt: 'asc' }],
      take: 12,
      select: { id: true, station: true, readyAt: true, items: { select: { id: true } }, order: { select: { table: { select: { name: true } } } } },
    }),
    prisma.availabilityLog.findMany({
      where: { action: '86D', createdAt: { gte: todayStart }, menuItem: { is86d: true, category: { restaurantId: location.restaurantId } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, reason: true, changedBy: true, createdAt: true, menuItem: { select: { id: true, name: true } } },
    }),
    prisma.shiftNote.findMany({
      where: { createdAt: { gte: todayStart }, shift: { locationId } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, note: true, createdBy: true, createdAt: true },
    }),
  ])

  // One line per item that is out, even if it was 86'd more than once today
  const seen = new Set<string>()
  const outsOnce = outs.filter((o) => {
    if (seen.has(o.menuItem.id)) return false
    seen.add(o.menuItem.id)
    return true
  })

  const authorIds = [...new Set([...outsOnce.map((o) => o.changedBy), ...notes.map((n) => n.createdBy)])]
  const authors = authorIds.length
    ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, role: true } })
    : []
  const byId = new Map(authors.map((a) => [a.id, a]))
  const who = (id: string, fallback: string) => {
    const a = byId.get(id)
    if (!a) return fallback
    const first = (a.name ?? '').split(' ')[0] || 'Team'
    if (a.role === 'KITCHEN') return `${first} · kitchen`
    if (a.role === 'MANAGER' || a.role === 'OWNER') return `${first} · manager`
    return first
  }

  const team: TeamNotice[] = [
    ...outsOnce.map((o) => ({
      id: `86-${o.id}`,
      kind: '86' as const,
      text: `86: ${o.menuItem.name} is out${o.reason ? ` (${o.reason})` : ''}`,
      by: who(o.changedBy, 'Kitchen'),
      at: o.createdAt,
    })),
    ...notes.map((n) => ({ id: `note-${n.id}`, kind: 'note' as const, text: n.note, by: who(n.createdBy, 'Manager'), at: n.createdAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6)

  return {
    pass: tickets.map((t) => ({
      id: t.id,
      tableName: t.order.table.name,
      station: STATION_NAME[t.station] ?? t.station.toLowerCase(),
      itemCount: t.items.length,
      readyAt: t.readyAt,
    })),
    team,
  }
}
