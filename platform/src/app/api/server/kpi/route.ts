import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    // 1. Fetch active shift for current employee
    const employee = await prisma.employee.findFirst({
      where: { userId },
      include: {
        shifts: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    })

    const activeShift = employee?.shifts[0] ?? null

    let activeShiftMinutes = 0
    if (activeShift?.clockIn) {
      const startTime = new Date(activeShift.clockIn).getTime()
      const nowTime = Date.now()
      activeShiftMinutes = Math.max(0, Math.floor((nowTime - startTime) / (1000 * 60)))
    }

    // 2. Fetch server's orders created today
    const ordersToday = await prisma.order.findMany({
      where: {
        serverId: userId,
        createdAt: { gte: startOfDay },
      },
      include: {
        items: true,
      },
    })

    const openChecks = ordersToday.filter((o) =>
      ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'READY', 'HOLD'].includes(o.status)
    )
    const paidChecks = ordersToday.filter((o) => o.status === 'PAID')

    const openChecksCount = openChecks.length
    const paidChecksCount = paidChecks.length

    // Sales calculations
    const salesToday = ordersToday
      .filter((o) => o.status !== 'VOIDED')
      .reduce((sum, o) => sum + Number(o.total || 0), 0)

    // Tips calculations (estimated 18% of non-voided sales)
    const tipsAccrued = salesToday * 0.18

    // Average table turn calculation (minutes)
    let avgTableTurnMins = 42 // Default default benchmark
    if (paidChecks.length > 0) {
      const totalTurnMins = paidChecks.reduce((acc, o) => {
        const duration = Math.max(
          1,
          Math.floor((new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60))
        )
        return acc + duration
      }, 0)
      avgTableTurnMins = Math.round(totalTurnMins / paidChecks.length)
    }

    return NextResponse.json({
      openChecksCount,
      paidChecksCount,
      salesToday,
      tipsAccrued,
      activeShiftMinutes,
      avgTableTurnMins,
      isClockedIn: !!activeShift,
      shiftStartTime: activeShift?.clockIn ?? null,
    })
  } catch (error) {
    console.error('[GET /api/server/kpi]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
