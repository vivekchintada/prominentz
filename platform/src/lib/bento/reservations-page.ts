import { prisma } from '@/lib/prisma'
import type { ReservationStatus } from '@prisma/client'
import { clockTime, localParts, minutesBetween } from './time'
import { DAY_MS } from './time'

export type BookingState = 'booked' | 'next' | 'seated' | 'gone'

/** Everything the Reservations board shows. */
export interface ReservationsBoard {
  weekday: string
  bookings: number
  covers: number
  slots: { time: string; list: { id: string; name: string; party: number; table: string | null; state: BookingState; note: string | null }[] }[]
  next: { id: string; name: string; party: number; time: Date; table: string | null; phone: string; note: string | null; inMin: number } | null
  waitlist: { id: string; name: string; party: number; quoted: number; waited: number }[]
  waitlistCount: number
  coversByHour: { hour: number; covers: number }[]
  requests: { id: string; who: string; note: string }[]
  month: { total: number; noShowPct: number | null; cancelPct: number | null; nextWeek: number }
}

export const EMPTY_RESERVATIONS_BOARD: ReservationsBoard = {
  weekday: '',
  bookings: 0,
  covers: 0,
  slots: [],
  next: null,
  waitlist: [],
  waitlistCount: 0,
  coversByHour: [],
  requests: [],
  month: { total: 0, noShowPct: null, cancelPct: null, nextWeek: 0 },
}

const LIVE: ReservationStatus[] = ['PENDING', 'CONFIRMED']

export async function getReservationsBoard(locationId: string | null, todayStart: Date, timezone: string): Promise<ReservationsBoard> {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday: 'long' }).format(now)
  if (!locationId) return { ...EMPTY_RESERVATIONS_BOARD, weekday }
  const tomorrow = new Date(todayStart.getTime() + DAY_MS)

  const [today, waitlist, last30, nextWeek] = await Promise.all([
    prisma.reservation.findMany({
      where: { locationId, scheduledAt: { gte: todayStart, lt: tomorrow } },
      orderBy: { scheduledAt: 'asc' },
      select: { id: true, guestName: true, guestPhone: true, partySize: true, scheduledAt: true, status: true, notes: true, table: { select: { name: true } } },
    }),
    prisma.waitlistEntry.findMany({
      where: { locationId, status: 'WAITING' },
      orderBy: { arrivedAt: 'asc' },
      select: { id: true, guestName: true, partySize: true, quotedWaitMins: true, arrivedAt: true },
    }),
    prisma.reservation.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { locationId, scheduledAt: { gte: new Date(todayStart.getTime() - 30 * DAY_MS), lt: todayStart } },
    }),
    prisma.reservation.count({
      where: { locationId, status: { in: LIVE }, scheduledAt: { gte: tomorrow, lt: new Date(tomorrow.getTime() + 7 * DAY_MS) } },
    }),
  ])

  const kept = today.filter((r) => r.status !== 'CANCELLED')
  const upcoming = today.filter((r) => LIVE.includes(r.status) && r.scheduledAt.getTime() >= now.getTime() - 15 * 60000)
  const nextR = upcoming[0] ?? null

  // Group by half-hour slot in local time
  const slotMap = new Map<string, ReservationsBoard['slots'][number]['list']>()
  for (const r of today) {
    const t = clockTime(r.scheduledAt, timezone)
    const slot = `${t.slice(0, 2)}:${Number(t.slice(3, 5)) < 30 ? '00' : '30'}`
    const state: BookingState =
      r.status === 'SEATED' ? 'seated' : r.status === 'CANCELLED' || r.status === 'NO_SHOW' ? 'gone' : r.id === nextR?.id ? 'next' : 'booked'
    const list = slotMap.get(slot) ?? []
    list.push({ id: r.id, name: r.guestName, party: r.partySize, table: r.table?.name ?? null, state, note: r.notes })
    slotMap.set(slot, list)
  }

  const byHour = new Map<number, number>()
  for (const r of kept) {
    if (r.status === 'NO_SHOW') continue
    const h = localParts(r.scheduledAt, timezone).hour
    byHour.set(h, (byHour.get(h) ?? 0) + r.partySize)
  }
  const hours = [...byHour.keys()].sort((a, b) => a - b)
  const coversByHour = hours.length ? Array.from({ length: hours[hours.length - 1] - hours[0] + 1 }, (_, i) => ({ hour: hours[0] + i, covers: byHour.get(hours[0] + i) ?? 0 })) : []

  const count = (s: ReservationStatus) => last30.find((g) => g.status === s)?._count._all ?? 0
  const total30 = last30.reduce((s, g) => s + g._count._all, 0)

  return {
    weekday,
    bookings: kept.length,
    covers: kept.reduce((s, r) => s + r.partySize, 0),
    slots: [...slotMap.entries()].map(([time, list]) => ({ time, list })),
    next: nextR
      ? {
          id: nextR.id,
          name: nextR.guestName,
          party: nextR.partySize,
          time: nextR.scheduledAt,
          table: nextR.table?.name ?? null,
          phone: nextR.guestPhone,
          note: nextR.notes,
          inMin: Math.max(0, Math.round((nextR.scheduledAt.getTime() - now.getTime()) / 60000)),
        }
      : null,
    waitlist: waitlist.slice(0, 3).map((w) => ({ id: w.id, name: w.guestName, party: w.partySize, quoted: w.quotedWaitMins, waited: minutesBetween(w.arrivedAt, now) })),
    waitlistCount: waitlist.length,
    coversByHour: coversByHour.slice(0, 12),
    requests: kept
      .filter((r) => r.notes && r.notes.trim() && r.status !== 'NO_SHOW')
      .slice(0, 4)
      .map((r) => ({ id: r.id, who: `${r.guestName} · ${r.partySize}`, note: r.notes!.trim() })),
    month: {
      total: total30,
      noShowPct: total30 > 0 ? Math.round((count('NO_SHOW') / total30) * 100) : null,
      cancelPct: total30 > 0 ? Math.round((count('CANCELLED') / total30) * 100) : null,
      nextWeek,
    },
  }
}
