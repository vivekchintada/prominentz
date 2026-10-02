import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ locations: [] })
    }

    // Verify PRO tier access for Multi-Location
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Multi-Location is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const locations = await prisma.location.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: {
            tables: true,
            employees: true,
            categories: true,
          },
        },
      },
      orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ locations })
  } catch (error) {
    console.error('[GET /api/locations]', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role && !['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can create locations' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'No active restaurant tenant found for user' }, { status: 400 })
    }

    // Verify PRO tier access
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Multi-Location is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const { name, address, phone, timezone, region, isHeadquarters } = await req.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
    }

    // If making this HQ, reset previous HQ flag
    if (isHeadquarters) {
      await prisma.location.updateMany({
        where: { restaurantId },
        data: { isHeadquarters: false },
      })
    }

    const location = await prisma.location.create({
      data: {
        restaurantId,
        name,
        address: address || null,
        phone: phone || null,
        timezone: timezone || 'UTC',
        region: region || null,
        isHeadquarters: !!isHeadquarters,
      },
    })

    // Log audit event for location creation
    if (session?.user) {
      await logAuditEvent({
        restaurantId,
        actorId: session.user.id,
        actorName: session.user.name,
        action: 'CREATE_LOCATION',
        targetType: 'Location',
        targetId: location.id,
        after: { name: location.name, address: location.address, isHeadquarters: location.isHeadquarters },
      })
    }

    return NextResponse.json({ location }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/locations]', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}
