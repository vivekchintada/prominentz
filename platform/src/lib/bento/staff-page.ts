import { prisma } from '@/lib/prisma'
import { localParts, minutesBetween } from './time'
import { DAY_MS } from './time'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Everything the Staff · shifts and rota board shows. */
export interface StaffBoard {
  labour: { cost: number | null; pct: number | null; hours: number; onShift: number; sales: number }
  week: { start: Date; todayIndex: number }
  rota: { id: string; name: string; role: string; days: ({ start: Date; end: Date | null } | null)[] }[]
  rotaMore: number
  swaps: { id: string; who: string; to: string | null; when: Date | null; reason: string | null; waitingOn: 'peer' | 'manager' }[]
  clockedIn: { id: string; name: string; role: string; since: Date; mins: number }[]
  hoursByGroup: { label: string; hours: number }[]
  tips: { total: number; byServer: { name: string; amount: number }[] }
}

export const EMPTY_STAFF_BOARD: StaffBoard = {
  labour: { cost: null, pct: null, hours: 0, onShift: 0, sales: 0 },
  week: { start: new Date(0), todayIndex: 0 },
  rota: [],
  rotaMore: 0,
  swaps: [],
  clockedIn: [],
  hoursByGroup: [],
  tips: { total: 0, byServer: [] },
}

function roleGroup(role: string | null | undefined): string {
  if (role === 'KITCHEN') return 'Kitchen'
  if (role === 'SERVER') return 'Front of house'
  return 'Managers'
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

/** Worked hours of a time entry that fall inside [from, to), minus breaks. */
function workedHours(e: { clockIn: Date; clockOut: Date | null; breakMinutes: number }, from: Date, to: Date): number {
  const start = Math.max(e.clockIn.getTime(), from.getTime())
  const end = Math.min((e.clockOut ?? to).getTime(), to.getTime())
  if (end <= start) return 0
  return Math.max(0, (end - start) / 3600000 - (e.breakMinutes || 0) / 60)
}

export async function getStaffBoard(locationId: string | null, todayStart: Date, timezone: string): Promise<StaffBoard> {
  if (!locationId) return EMPTY_STAFF_BOARD
  const now = new Date()
  const todayIndex = Math.max(0, WEEKDAYS.indexOf(localParts(now, timezone).weekday))
  const weekStart = new Date(todayStart.getTime() - todayIndex * DAY_MS)
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS)

  const [entries, shifts, swaps, payments] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { locationId, OR: [{ clockIn: { gte: weekStart } }, { clockOut: null }, { clockOut: { gte: weekStart } }] },
      orderBy: { clockIn: 'asc' },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        breakMinutes: true,
        employee: { select: { hourlyRate: true, jobTitle: true, user: { select: { name: true, role: true } } } },
      },
    }),
    prisma.shift.findMany({
      where: { locationId, status: { not: 'CANCELLED' }, scheduledStart: { gte: weekStart, lt: weekEnd } },
      orderBy: { scheduledStart: 'asc' },
      select: {
        id: true,
        employeeId: true,
        scheduledStart: true,
        scheduledEnd: true,
        role: true,
        employee: { select: { jobTitle: true, user: { select: { name: true } } } },
      },
    }),
    prisma.shiftTradeRequest.findMany({
      where: { status: { in: ['PENDING_PEER', 'PENDING_MANAGER'] }, shift: { locationId } },
      orderBy: { createdAt: 'asc' },
      take: 3,
      select: {
        id: true,
        status: true,
        reason: true,
        requester: { select: { user: { select: { name: true } } } },
        targetEmployee: { select: { user: { select: { name: true } } } },
        shift: { select: { scheduledStart: true } },
      },
    }),
    prisma.payment.findMany({
      where: { order: { table: { locationId } }, status: 'COMPLETED', createdAt: { gte: todayStart } },
      select: { total: true, tip: true, order: { select: { server: { select: { name: true } } } } },
    }),
  ])

  // Labour today
  let cost = 0
  let priced = 0
  let hoursToday = 0
  for (const e of entries) {
    const h = workedHours(e, todayStart, now)
    if (h <= 0) continue
    hoursToday += h
    const rate = e.employee?.hourlyRate == null ? null : Number(e.employee.hourlyRate)
    if (rate && rate > 0) {
      cost += h * rate
      priced++
    }
  }
  const sales = payments.reduce((s, p) => s + Number(p.total), 0)
  const labourCost = priced > 0 ? cost : null

  // Rota: one row per person with a shift this week
  const people = new Map<string, StaffBoard['rota'][number]>()
  for (const s of shifts) {
    if (!s.scheduledStart) continue
    let row = people.get(s.employeeId)
    if (!row) {
      row = {
        id: s.employeeId,
        name: s.employee?.user?.name ?? 'Team member',
        role: s.employee?.jobTitle || prettyRole(s.role),
        days: new Array(7).fill(null),
      }
      people.set(s.employeeId, row)
    }
    const idx = Math.floor((s.scheduledStart.getTime() - weekStart.getTime()) / DAY_MS)
    if (idx >= 0 && idx < 7 && !row.days[idx]) row.days[idx] = { start: s.scheduledStart, end: s.scheduledEnd }
  }
  const rota = [...people.values()]

  // Hours this week by group
  const groups = new Map<string, number>()
  for (const e of entries) {
    const h = workedHours(e, weekStart, now)
    if (h <= 0) continue
    const g = roleGroup(e.employee?.user?.role)
    groups.set(g, (groups.get(g) ?? 0) + h)
  }

  // Tips today by server
  const tipBy = new Map<string, number>()
  let tipTotal = 0
  for (const p of payments) {
    const t = Number(p.tip)
    if (!(t > 0)) continue
    tipTotal += t
    const name = p.order.server?.name ?? 'No server'
    tipBy.set(name, (tipBy.get(name) ?? 0) + t)
  }

  const open = entries.filter((e) => e.clockOut === null)

  return {
    labour: {
      cost: labourCost,
      pct: labourCost !== null && sales > 0 ? (labourCost / sales) * 100 : null,
      hours: hoursToday,
      onShift: open.length,
      sales,
    },
    week: { start: weekStart, todayIndex },
    rota: rota.slice(0, 8),
    rotaMore: Math.max(0, rota.length - 8),
    swaps: swaps.map((s) => ({
      id: s.id,
      who: s.requester?.user?.name ?? 'Someone',
      to: s.targetEmployee?.user?.name ?? null,
      when: s.shift?.scheduledStart ?? null,
      reason: s.reason,
      waitingOn: s.status === 'PENDING_PEER' ? 'peer' : 'manager',
    })),
    clockedIn: open.slice(0, 5).map((e) => ({
      id: e.id,
      name: e.employee?.user?.name ?? 'Team member',
      role: e.employee?.jobTitle || prettyRole(e.employee?.user?.role),
      since: e.clockIn,
      mins: minutesBetween(e.clockIn, now),
    })),
    hoursByGroup: ['Front of house', 'Kitchen', 'Managers']
      .map((label) => ({ label, hours: groups.get(label) ?? 0 }))
      .filter((g) => g.hours > 0),
    tips: {
      total: tipTotal,
      byServer: [...tipBy.entries()]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3),
    },
  }
}
