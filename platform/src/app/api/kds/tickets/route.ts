import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { KdsStation } from '@prisma/client'

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
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const station = searchParams.get('station')
    const includeServed = searchParams.get('includeServed') === 'true'

    const tickets = await prisma.kdsTicket.findMany({
      where: {
        order: {
          table: {
            locationId,
          },
        },
        ...(!includeServed ? { status: { notIn: ['SERVED', 'VOIDED'] } } : {}),
        ...(station && station !== 'ALL' ? { station: station as KdsStation } : {}),
      },
      include: {
        items: {
          include: {
            menuItem: { select: { name: true } },
          },
        },
        order: {
          select: {
            id: true,
            createdAt: true,
            guestCount: true,
            notes: true,
            server: { select: { name: true } },
            table: { select: { name: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('[GET /api/kds/tickets]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
