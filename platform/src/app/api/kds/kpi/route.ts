import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { startOfDayInTimeZone } from '@/lib/dashboard-metrics'
import { localParts } from '@/lib/bento/time'

export const dynamic = 'force-dynamic'

/** Tickets older than this many minutes count as late. */
const TARGET_MINS = 12

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Every figure below is limited to the signed-in user's own location.
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
      select: { locationId: true },
    })
    const location = employee?.locationId
      ? await prisma.location.findFirst({
          where: { id: employee.locationId, restaurantId: session.user.restaurantId },
          select: { id: true, timezone: true },
        })
      : await prisma.location.findFirst({
          where: { restaurantId: session.user.restaurantId },
          select: { id: true, timezone: true },
          orderBy: { createdAt: 'asc' },
        })
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const locationId = location.id
    const tz = location.timezone || 'UTC'
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const startOfDay = startOfDayInTimeZone(tz, now)
    const atLocation = { order: { table: { locationId } } }

    const [ordersLastHour, completedTicketsToday, activeTickets, overdueTickets, activeKitchenStaff, todayPayments] = await Promise.all([
      prisma.order.count({
        where: { table: { locationId }, createdAt: { gte: oneHourAgo } },
      }),
      prisma.kdsTicket.findMany({
        where: { ...atLocation, status: { in: ['READY', 'SERVED'] }, readyAt: { not: null }, createdAt: { gte: startOfDay } },
        select: { createdAt: true, readyAt: true },
      }),
      prisma.kdsTicket.count({
        where: { ...atLocation, status: { in: ['NEW', 'IN_PROGRESS'] } },
      }),
      prisma.kdsTicket.count({
        where: { ...atLocation, status: { in: ['NEW', 'IN_PROGRESS'] }, createdAt: { lt: new Date(now.getTime() - TARGET_MINS * 60 * 1000) } },
      }),
      prisma.timeEntry.count({
        where: { locationId, clockOut: null },
      }),
      prisma.payment.aggregate({
        _sum: { total: true },
        where: { ...atLocation, status: 'COMPLETED', createdAt: { gte: startOfDay } },
      }),
    ])

    // Average ticket time, overall and per local hour (for the pace chart)
    let totalMs = 0
    const perHour = new Map<number, { ms: number; n: number }>()
    for (const t of completedTicketsToday) {
      const ms = Math.max(0, (t.readyAt ?? now).getTime() - t.createdAt.getTime())
      totalMs += ms
      const h = localParts(t.createdAt, tz).hour
      const slot = perHour.get(h) ?? { ms: 0, n: 0 }
      slot.ms += ms
      slot.n += 1
      perHour.set(h, slot)
    }
    const avgTicketTimeMins = completedTicketsToday.length > 0 ? Number((totalMs / completedTicketsToday.length / 60000).toFixed(1)) : 0
    const pace = [...perHour.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-6)
      .map(([hour, s]) => ({ hour, avgMins: Number((s.ms / s.n / 60000).toFixed(1)), tickets: s.n }))

    return NextResponse.json({
      ordersPerHour: ordersLastHour,
      avgTicketTimeMins,
      activeTickets,
      overdueTickets,
      activeKitchenStaff,
      todayRevenue: Number(todayPayments._sum.total || 0),
      completedTicketsToday: completedTicketsToday.length,
      targetMins: TARGET_MINS,
      pace,
    })
  } catch (error) {
    console.error('[GET /api/kds/kpi]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
