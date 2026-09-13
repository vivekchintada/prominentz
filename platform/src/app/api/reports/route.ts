import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve employee location ID
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })

    let locationId = employee?.locationId

    if (!locationId) {
      const fallbackLocation = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = fallbackLocation?.id
    }

    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    
    // Default date range: last 30 days
    const defaultStart = new Date()
    defaultStart.setDate(defaultStart.getDate() - 30)
    defaultStart.setHours(0, 0, 0, 0)
    
    const defaultEnd = new Date()
    defaultEnd.setHours(23, 59, 59, 999)

    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let start: Date
    let end: Date

    if (startDateParam) {
      // If YYYY-MM-DD string is passed, parse start of day
      const [y, m, d] = startDateParam.split('T')[0].split('-').map(Number)
      start = new Date(y, m - 1, d, 0, 0, 0, 0)
    } else {
      start = defaultStart
    }

    if (endDateParam) {
      // If YYYY-MM-DD string is passed, parse end of day (23:59:59.999)
      const [y, m, d] = endDateParam.split('T')[0].split('-').map(Number)
      end = new Date(y, m - 1, d, 23, 59, 59, 999)
    } else {
      end = defaultEnd
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameter provided' }, { status: 400 })
    }

    // Check Redis cache (skip if today's live data or nocache requested)
    const isLiveToday = end.getTime() >= new Date().setHours(0, 0, 0, 0)
    const noCache = searchParams.get('nocache') === 'true'
    const cacheKey = `resto:reports:${locationId}:${start.toISOString().split('T')[0]}:${end.toISOString().split('T')[0]}`

    if (!isLiveToday && !noCache) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          return NextResponse.json(JSON.parse(cached))
        }
      } catch {
        // Ignore cache read failures and proceed to DB
      }
    }

    // Execute all report aggregations concurrently in parallel
    const [
      revenueAgg,
      paymentsGroup,
      ticketsList,
      payments,
      shifts
    ] = await Promise.all([
      // 1. Overall Revenue Aggregates
      prisma.payment.aggregate({
        _sum: {
          subtotal: true,
          tax: true,
          tip: true,
          total: true,
        },
        _count: { id: true },
        _avg: { total: true },
        where: {
          order: { table: { locationId } },
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
      }),

      // 2. Sales by Payment Method
      prisma.payment.groupBy({
        by: ['method'],
        _sum: { total: true },
        _count: { id: true },
        where: {
          order: { table: { locationId } },
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
      }),

      // 3. KDS Ticket Prep Duration by Station
      prisma.kdsTicket.findMany({
        where: {
          order: { table: { locationId } },
          status: { in: ['READY', 'SERVED'] },
          readyAt: { not: null, gte: start, lte: end },
        },
        select: { station: true, createdAt: true, readyAt: true },
      }),

      // 4. Detailed Payments list with relations
      prisma.payment.findMany({
        where: {
          order: { table: { locationId } },
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
        include: {
          order: {
            select: {
              guestCount: true,
              server: { select: { name: true } },
              table: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 5. Labor Cost & Overtime Aggregation
      prisma.shift.findMany({
        where: {
          locationId,
          scheduledStart: { gte: start, lte: end },
        },
        include: {
          employee: { select: { hourlyRate: true, userId: true } },
        },
      }),
    ])

    // Hourly Sales Distribution
    const hourlySales = Array(24).fill(0)
    payments.forEach((p) => {
      const hr = new Date(p.createdAt).getHours()
      hourlySales[hr] += Number(p.total)
    })

    // KDS Ticket Prep Duration by Station
    const stationTimes: Record<string, { count: number; totalMs: number }> = {}
    ticketsList.forEach((t) => {
      const durationMs = new Date(t.readyAt!).getTime() - new Date(t.createdAt).getTime()
      if (!stationTimes[t.station]) {
        stationTimes[t.station] = { count: 0, totalMs: 0 }
      }
      stationTimes[t.station].count++
      stationTimes[t.station].totalMs += durationMs
    })

    const stationPerformance = Object.entries(stationTimes).map(([station, info]) => ({
      station,
      avgMinutes: Number((info.totalMs / info.count / 60000).toFixed(1)),
      count: info.count,
    }))

    let totalLaborCost = 0
    let totalWorkedMinutes = 0

    shifts.forEach((s) => {
      const rate = Number(s.employee?.hourlyRate || 0)
      const mins = s.clockIn && s.clockOut
        ? Math.max(0, Math.round((new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000) - (s.breakMinutes ?? 0))
        : s.scheduledStart && s.scheduledEnd
        ? Math.max(0, Math.round((new Date(s.scheduledEnd).getTime() - new Date(s.scheduledStart).getTime()) / 60000))
        : 0

      totalWorkedMinutes += mins
      totalLaborCost += (mins / 60) * rate
    })

    const totalRevenue = Number(revenueAgg._sum.total || 0)
    const laborPercentage = totalRevenue > 0 ? Number(((totalLaborCost / totalRevenue) * 100).toFixed(1)) : 0

    // 7. Per-Server Performance Leaderboard
    const serverMap: Record<string, { name: string; count: number; totalRevenue: number; totalTips: number }> = {}
    payments.forEach((p) => {
      const sName = p.order.server?.name || 'Unassigned'
      if (!serverMap[sName]) {
        serverMap[sName] = { name: sName, count: 0, totalRevenue: 0, totalTips: 0 }
      }
      serverMap[sName].count++
      serverMap[sName].totalRevenue += Number(p.total)
      serverMap[sName].totalTips += Number(p.tip)
    })

    const serverPerformance = Object.values(serverMap).map((sp) => ({
      name: sp.name,
      ordersClosed: sp.count,
      totalRevenue: Number(sp.totalRevenue.toFixed(2)),
      averageCheck: Number((sp.totalRevenue / sp.count).toFixed(2)),
      totalTips: Number(sp.totalTips.toFixed(2)),
    }))

    const payload = {
      summary: {
        subtotal: Number(revenueAgg._sum.subtotal || 0),
        tax: Number(revenueAgg._sum.tax || 0),
        tip: Number(revenueAgg._sum.tip || 0),
        total: totalRevenue,
        count: revenueAgg._count.id,
        averageCheckSize: Number(revenueAgg._avg.total || 0),
        laborCost: Number(totalLaborCost.toFixed(2)),
        laborPercentage,
        totalWorkedHours: Number((totalWorkedMinutes / 60).toFixed(1)),
      },
      paymentMethods: paymentsGroup.map((g) => ({
        method: g.method,
        total: Number(g._sum.total || 0),
        count: g._count.id,
      })),
      hourlySales,
      stationPerformance,
      serverPerformance,
      payments: payments.map((p) => ({
        id: p.id,
        createdAt: p.createdAt,
        tableName: p.order.table.name,
        serverName: p.order.server?.name || 'N/A',
        guestCount: p.order.guestCount,
        subtotal: Number(p.subtotal),
        tax: Number(p.tax),
        tip: Number(p.tip),
        total: Number(p.total),
        method: p.method,
      })),
      range: {
        start,
        end,
      },
    }

    try {
      await redis.setex(cacheKey, 30, JSON.stringify(payload))
    } catch {
      // Ignore cache write errors
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[GET /api/reports]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
