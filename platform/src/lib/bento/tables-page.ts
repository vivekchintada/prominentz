import { prisma } from '@/lib/prisma'
import { getTodayFloorMetrics } from '@/lib/dashboard-metrics'
import { minutesBetween } from './time'
import { DAY_MS } from './time'

export type TableState = 'free' | 'reserved' | 'seated' | 'eating' | 'ready' | 'bill'

export const TABLE_STATE_LABEL: Record<TableState, string> = {
  free: 'Free',
  reserved: 'Reserved',
  seated: 'Seated',
  eating: 'Ordered',
  ready: 'Food ready',
  bill: 'Bill asked',
}

export interface FloorTable {
  id: string
  name: string
  capacity: number
  floor: string
  state: TableState
  guests: number | null
  href: string
}

/** Everything the Tables · floor plan board shows. */
export interface TablesBoard {
  total: number
  seated: number
  floors: { name: string; tables: FloorTable[] }[]
  spotlight: {
    name: string
    server: string | null
    guests: number
    seatedMin: number
    total: number
    state: TableState
    waitMin: number | null
    href: string
  } | null
  waitlist: { id: string; name: string; party: number; quoted: number; waited: number }[]
  waitlistCount: number
  sections: { server: string; tables: number; guests: number }[]
  turn: { avgMin: number | null; turnedToday: number }
  nextBookings: { id: string; time: Date; name: string; party: number; table: string | null }[]
}

export const EMPTY_TABLES_BOARD: TablesBoard = {
  total: 0,
  seated: 0,
  floors: [],
  spotlight: null,
  waitlist: [],
  waitlistCount: 0,
  sections: [],
  turn: { avgMin: null, turnedToday: 0 },
  nextBookings: [],
}

const STATE_RANK: Record<TableState, number> = { bill: 0, ready: 1, eating: 2, seated: 3, reserved: 4, free: 5 }

export async function getTablesBoard(locationId: string | null, todayStart: Date): Promise<TablesBoard> {
  if (!locationId) return EMPTY_TABLES_BOARD
  const now = new Date()

  const [tables, waitlist, bookings, turnedToday, floor] = await Promise.all([
    prisma.table.findMany({
      where: { locationId },
      orderBy: [{ floor: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        capacity: true,
        floor: true,
        status: true,
        orders: {
          where: { status: { notIn: ['PAID', 'VOIDED'] } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, status: true, guestCount: true, total: true, createdAt: true, updatedAt: true, server: { select: { name: true } } },
        },
      },
    }),
    prisma.waitlistEntry.findMany({
      where: { locationId, status: 'WAITING' },
      orderBy: { arrivedAt: 'asc' },
      select: { id: true, guestName: true, partySize: true, quotedWaitMins: true, arrivedAt: true },
    }),
    prisma.reservation.findMany({
      where: {
        locationId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: new Date(now.getTime() - 15 * 60000), lt: new Date(todayStart.getTime() + DAY_MS) },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 3,
      select: { id: true, scheduledAt: true, guestName: true, partySize: true, table: { select: { name: true } } },
    }),
    prisma.order.count({
      where: { table: { locationId }, status: 'PAID', orderSource: { in: ['POS', 'QR_TABLE', 'QR_DINE_IN'] }, updatedAt: { gte: todayStart } },
    }),
    getTodayFloorMetrics(locationId).catch(() => ({ avgTurnTimeMinutes: null, laborCostPct: null })),
  ])

  const rows = tables.map((t) => {
    const statuses = t.orders.map((o) => o.status)
    let state: TableState = 'free'
    if (t.status === 'PAYING') state = 'bill'
    else if (statuses.some((s) => s === 'READY' || s === 'PARTIALLY_READY')) state = 'ready'
    else if (statuses.some((s) => s === 'SENT_TO_KITCHEN' || s === 'HOLD')) state = 'eating'
    else if (t.status === 'ACTIVE' || t.orders.length > 0) state = 'seated'
    else if (t.status === 'RESERVED') state = 'reserved'
    const first = t.orders[0]
    const guests = t.orders.length ? t.orders.reduce((s, o) => s + (o.guestCount || 0), 0) : null
    return {
      table: t,
      first,
      floorTable: {
        id: t.id,
        name: t.name,
        capacity: t.capacity,
        floor: t.floor || 'Floor',
        state,
        guests,
        href: first ? `/pos?tableId=${t.id}&orderId=${first.id}` : `/pos?tableId=${t.id}`,
      } satisfies FloorTable,
    }
  })

  // Group by floor, keeping the order tables came back in
  const floorMap = new Map<string, FloorTable[]>()
  for (const r of rows) {
    const list = floorMap.get(r.floorTable.floor) ?? []
    list.push(r.floorTable)
    floorMap.set(r.floorTable.floor, list)
  }
  for (const list of floorMap.values()) list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  // The table that needs the floor most: longest-waiting bill, then food at the pass, then longest seated
  const busy = rows
    .filter((r) => r.first && ['bill', 'ready', 'eating', 'seated'].includes(r.floorTable.state))
    .sort(
      (a, b) =>
        STATE_RANK[a.floorTable.state] - STATE_RANK[b.floorTable.state] ||
        (a.floorTable.state === 'bill' ? a.first!.updatedAt.getTime() - b.first!.updatedAt.getTime() : a.first!.createdAt.getTime() - b.first!.createdAt.getTime()),
    )
  const top = busy[0]
  const spotlight: TablesBoard['spotlight'] = top
    ? {
        name: top.table.name,
        server: top.first!.server?.name ?? null,
        guests: top.floorTable.guests ?? 0,
        seatedMin: minutesBetween(top.first!.createdAt, now),
        total: top.table.orders.reduce((s, o) => s + Number(o.total), 0),
        state: top.floorTable.state,
        waitMin: top.floorTable.state === 'bill' ? minutesBetween(top.first!.updatedAt, now) : null,
        href: top.floorTable.href,
      }
    : null

  // Sections: open tables per server
  const bySection = new Map<string, { tables: Set<string>; guests: number }>()
  for (const r of rows) {
    for (const o of r.table.orders) {
      const server = o.server?.name ?? 'No server'
      const s = bySection.get(server) ?? { tables: new Set<string>(), guests: 0 }
      s.tables.add(r.table.id)
      s.guests += o.guestCount || 0
      bySection.set(server, s)
    }
  }

  const seated = rows.filter((r) => ['seated', 'eating', 'ready', 'bill'].includes(r.floorTable.state)).length

  return {
    total: tables.length,
    seated,
    floors: [...floorMap.entries()].map(([name, list]) => ({ name, tables: list })),
    spotlight,
    waitlist: waitlist.slice(0, 3).map((w) => ({
      id: w.id,
      name: w.guestName,
      party: w.partySize,
      quoted: w.quotedWaitMins,
      waited: minutesBetween(w.arrivedAt, now),
    })),
    waitlistCount: waitlist.length,
    sections: [...bySection.entries()]
      .map(([server, s]) => ({ server, tables: s.tables.size, guests: s.guests }))
      .sort((a, b) => b.tables - a.tables)
      .slice(0, 4),
    turn: { avgMin: floor.avgTurnTimeMinutes, turnedToday },
    nextBookings: bookings.map((b) => ({ id: b.id, time: b.scheduledAt, name: b.guestName, party: b.partySize, table: b.table?.name ?? null })),
  }
}
