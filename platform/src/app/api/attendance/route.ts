import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = fallback?.id
    }

    if (!locationId) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    // Today's range
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const entries = await prisma.timeEntry.findMany({
      where: {
        locationId,
        ...(activeOnly ? { status: 'ACTIVE' } : { createdAt: { gte: todayStart } }),
      },
      include: {
        employee: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        shift: {
          select: {
            id: true,
            scheduledStart: true,
            scheduledEnd: true,
            role: true,
          },
        },
      },
      orderBy: { clockIn: 'desc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('[GET /api/attendance]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
