import { prisma } from '@/lib/prisma'

/**
 * Today's floor metrics for one location, computed from real records.
 * Either value is null when there isn't enough data to state it honestly
 * (no completed dine-in orders yet, no sales yet, or no hourly rates set).
 */
export interface FloorMetrics {
  /** Average minutes from order opened to order completed, dine-in, today. */
  avgTurnTimeMinutes: number | null
  /** Labor cost as a percentage of today's completed sales. */
  laborCostPct: number | null
}

/** Midnight "today" in the given IANA time zone, as a UTC Date. */
export function startOfDayInTimeZone(timeZone: string, now = new Date()): Date {
  let tz = timeZone
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
  } catch {
    tz = 'UTC'
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  // Wall-clock time in the zone, read back as if it were UTC, gives the zone's offset.
  const wallAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  const offsetMs = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000
  const localMidnightAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day)
  return new Date(localMidnightAsUtc - offsetMs)
}

export async function getTodayFloorMetrics(locationId: string): Promise<FloorMetrics> {
  const location = await prisma.location.findUnique({ where: { id: locationId }, select: { timezone: true } })
  const now = new Date()
  const since = startOfDayInTimeZone(location?.timezone || 'UTC', now)

  const [completedOrders, salesAgg, timeEntries] = await Promise.all([
    prisma.order.findMany({
      where: { table: { locationId }, completedAt: { gte: since } },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.payment.aggregate({
      _sum: { total: true },
      where: { order: { table: { locationId } }, status: 'COMPLETED', createdAt: { gte: since } },
    }),
    // Shifts that overlap today: started today, or still open from earlier.
    prisma.timeEntry.findMany({
      where: { locationId, OR: [{ clockIn: { gte: since } }, { clockOut: null }, { clockOut: { gte: since } }] },
      select: { clockIn: true, clockOut: true, breakMinutes: true, employee: { select: { hourlyRate: true } } },
    }),
  ])

  // Turn time
  const turnMinutes = completedOrders
    .filter((o) => o.completedAt)
    .map((o) => (o.completedAt!.getTime() - o.createdAt.getTime()) / 60000)
    .filter((m) => m > 0 && m < 24 * 60)
  const avgTurnTimeMinutes = turnMinutes.length
    ? Math.round(turnMinutes.reduce((a, b) => a + b, 0) / turnMinutes.length)
    : null

  // Labor cost: only the part of each shift that falls inside today, minus breaks.
  let laborCost = 0
  let pricedEntries = 0
  for (const t of timeEntries) {
    const rate = t.employee?.hourlyRate == null ? null : Number(t.employee.hourlyRate)
    if (rate == null || !(rate > 0)) continue
    const start = Math.max(t.clockIn.getTime(), since.getTime())
    const end = (t.clockOut ?? now).getTime()
    const hours = Math.max(0, (end - start) / 3_600_000 - (t.breakMinutes || 0) / 60)
    laborCost += hours * rate
    pricedEntries++
  }
  const sales = Number(salesAgg._sum.total || 0)
  const laborCostPct = sales > 0 && pricedEntries > 0 ? Math.round((laborCost / sales) * 1000) / 10 : null

  return { avgTurnTimeMinutes, laborCostPct }
}
