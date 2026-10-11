import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return NextResponse.json({ tiers: [] })

    const restaurantId = session.user.restaurantId

    const tiers = await prisma.loyaltyTier.findMany({
      where: { restaurantId },
      orderBy: { minimumSpend: 'asc' },
      include: {
        _count: { select: { customers: true } },
      },
    })

    return NextResponse.json({ tiers })
  } catch (err) {
    console.error('[GET /api/loyalty/tiers]', err)
    return NextResponse.json({ error: 'Failed to fetch loyalty tiers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role && !['OWNER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { name, minimumSpend, pointsMultiplier, perks, badgeColor } = await req.json()
    if (!name || minimumSpend === undefined) {
      return NextResponse.json({ error: 'Name and minimum spend are required' }, { status: 400 })
    }

    const tier = await prisma.loyaltyTier.create({
      data: {
        restaurantId: session.user.restaurantId,
        name: name.trim(),
        minimumSpend: Number(minimumSpend),
        pointsMultiplier: Number(pointsMultiplier || 1.0),
        perks: Array.isArray(perks) ? perks : [],
        badgeColor: badgeColor || '#6366f1',
      },
    })

    return NextResponse.json({ tier }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/loyalty/tiers]', err)
    return NextResponse.json({ error: err?.message || 'Failed to create tier' }, { status: 500 })
  }
}
