import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    let restaurantId = session?.user?.restaurantId

    if (!restaurantId) {
      const fallbackRestaurant = await prisma.restaurant.findFirst()
      restaurantId = fallbackRestaurant?.id
    }

    if (!restaurantId) {
      return NextResponse.json({ rewards: [] })
    }

    // Verify PRO tier access for Loyalty Program
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Loyalty Rewards is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const rewards = await prisma.loyaltyReward.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { pointsRequired: 'asc' },
    })

    return NextResponse.json({ rewards })
  } catch (error) {
    console.error('[GET /api/loyalty/rewards]', error)
    return NextResponse.json({ error: 'Failed to fetch loyalty rewards' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    let restaurantId = session?.user?.restaurantId

    if (!restaurantId) {
      const fallbackRestaurant = await prisma.restaurant.findFirst()
      restaurantId = fallbackRestaurant?.id
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'No active tenant found' }, { status: 400 })
    }

    // Verify PRO tier access
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Loyalty Rewards is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const { name, pointsRequired, discountType, discountAmount } = await req.json()

    if (!name || !pointsRequired || !discountAmount) {
      return NextResponse.json({ error: 'Reward name, points required, and discount amount are required' }, { status: 400 })
    }

    const reward = await prisma.loyaltyReward.create({
      data: {
        restaurantId,
        name,
        pointsRequired: Number(pointsRequired),
        discountType: discountType || 'FLAT',
        discountAmount: Number(discountAmount),
      },
    })

    return NextResponse.json({ reward }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/loyalty/rewards]', error)
    return NextResponse.json({ error: 'Failed to create loyalty reward' }, { status: 500 })
  }
}
