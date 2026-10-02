import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
  if (!location) return NextResponse.json({ error: 'No active location found' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const targetDateStr = searchParams.get('date') || new Date().toISOString()
  const targetDate = new Date(targetDateStr)
  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 })
  }

  // Analyze past 4 weeks of order and reservation history
  const lookbackWeeks = 4
  const lookbackStart = new Date(targetDate)
  lookbackStart.setDate(lookbackStart.getDate() - (lookbackWeeks * 7))

  const [orders, reservations] = await Promise.all([
    prisma.order.findMany({
      where: {
        table: { locationId: location.id },
        createdAt: {
          gte: lookbackStart,
          lte: targetDate,
        },
        status: { not: 'VOIDED' },
      },
      select: {
        id: true,
        createdAt: true,
        guestCount: true,
        total: true,
      },
    }),
    prisma.reservation.findMany({
      where: {
        locationId: location.id,
        scheduledAt: {
          gte: lookbackStart,
          lte: targetDate,
        },
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        scheduledAt: true,
        partySize: true,
      },
    }),
  ])

  // Aggregate by day of week (0-6) and hour (0-23)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dailyBuckets = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    dayName: days[i],
    orderCounts: 0,
    guestCounts: 0,
    revenue: 0,
    hourly: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: 0,
      guests: 0,
    })),
  }))

  for (const order of orders) {
    const d = new Date(order.createdAt)
    const dow = d.getDay()
    const hour = d.getHours()
    dailyBuckets[dow].orderCounts += 1
    dailyBuckets[dow].guestCounts += (order.guestCount || 1)
    dailyBuckets[dow].revenue += Number(order.total || 0)
    dailyBuckets[dow].hourly[hour].orders += 1
    dailyBuckets[dow].hourly[hour].guests += (order.guestCount || 1)
  }

  for (const res of reservations) {
    const d = new Date(res.scheduledAt)
    const dow = d.getDay()
    const hour = d.getHours()
    dailyBuckets[dow].guestCounts += (res.partySize || 2)
    dailyBuckets[dow].hourly[hour].guests += (res.partySize || 2)
  }

  const forecast = dailyBuckets.map((bucket) => {
    const avgOrders = Math.round(bucket.orderCounts / lookbackWeeks)
    const avgGuests = Math.round(bucket.guestCounts / lookbackWeeks)
    const avgRevenue = Math.round(bucket.revenue / lookbackWeeks)

    // Staffing heuristics
    // 1 Server per 20 guests during regular operations, minimum 1
    // 1 Kitchen staff per 18 orders, minimum 1
    const recServers = Math.max(1, Math.ceil(avgGuests / 20))
    const recKitchen = Math.max(1, Math.ceil(avgOrders / 18))
    const recManagers = 1

    const hourlyForecast = bucket.hourly.map((h) => {
      const hOrders = Math.round(h.orders / lookbackWeeks)
      const hGuests = Math.round(h.guests / lookbackWeeks)
      const neededServers = Math.max(1, Math.ceil(hGuests / 15))
      const neededKitchen = Math.max(1, Math.ceil(hOrders / 12))
      return {
        hour: h.hour,
        timeLabel: `${h.hour % 12 === 0 ? 12 : h.hour % 12} ${h.hour < 12 ? 'AM' : 'PM'}`,
        projectedOrders: hOrders,
        projectedGuests: hGuests,
        recommendedServers: neededServers,
        recommendedKitchen: neededKitchen,
      }
    })

    return {
      dayOfWeek: bucket.dayOfWeek,
      dayName: bucket.dayName,
      projectedOrders: avgOrders,
      projectedGuests: avgGuests,
      projectedRevenue: avgRevenue,
      recommendedStaff: {
        SERVER: recServers,
        KITCHEN: recKitchen,
        MANAGER: recManagers,
        TOTAL: recServers + recKitchen + recManagers,
      },
      hourlyForecast: hourlyForecast.filter((h) => h.projectedOrders > 0 || h.projectedGuests > 0 || (h.hour >= 11 && h.hour <= 22)),
    }
  })

  return NextResponse.json({
    locationId: location.id,
    locationName: location.name,
    lookbackWeeks,
    forecast,
  })
}
