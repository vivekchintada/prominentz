import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [
      ordersLastHour,
      completedTicketsToday,
      activeTickets,
      activeKitchenStaff,
      todayPayments,
    ] = await Promise.all([
      // 1. Orders placed in the last hour
      prisma.order.count({
        where: { createdAt: { gte: oneHourAgo } },
      }),

      // 2. Completed KDS tickets today (for avg ticket time)
      prisma.kdsTicket.findMany({
        where: {
          status: { in: ['READY', 'SERVED'] },
          readyAt: { not: null },
          createdAt: { gte: startOfDay },
        },
        select: { createdAt: true, readyAt: true },
      }),

      // 3. Active (non-served) tickets
      prisma.kdsTicket.count({
        where: { status: { in: ['NEW', 'IN_PROGRESS'] } },
      }),

      // 4. Kitchen staff currently clocked in
      prisma.employee.count({
        where: {
          isActive: true,
          shifts: { some: { status: 'ACTIVE' } },
        },
      }),

      // 5. Today's revenue from completed payments
      prisma.payment.aggregate({
        _sum: { total: true },
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfDay },
        },
      }),
    ])

    // Compute avg ticket time in minutes
    let avgTicketTimeMins = 0
    if (completedTicketsToday.length > 0) {
      const totalMs = completedTicketsToday.reduce((sum, t) => {
        const end = t.readyAt ? new Date(t.readyAt).getTime() : now.getTime()
        const start = new Date(t.createdAt).getTime()
        return sum + Math.max(0, end - start)
      }, 0)
      avgTicketTimeMins = Number((totalMs / completedTicketsToday.length / 60000).toFixed(1))
    }

    // Count overdue tickets (>12 min old and still active)
    const overdueTickets = await prisma.kdsTicket.count({
      where: {
        status: { in: ['NEW', 'IN_PROGRESS'] },
        createdAt: { lt: new Date(now.getTime() - 12 * 60 * 1000) },
      },
    })

    return NextResponse.json({
      ordersPerHour: ordersLastHour,
      avgTicketTimeMins,
      activeTickets,
      overdueTickets,
      activeKitchenStaff,
      todayRevenue: Number(todayPayments._sum.total || 0),
      completedTicketsToday: completedTicketsToday.length,
    })
  } catch (error) {
    console.error('[GET /api/kds/kpi]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
