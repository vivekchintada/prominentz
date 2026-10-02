import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/lib/audit'
import { PlanTier } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { planTier } = body

    if (!['STARTER', 'PRO', 'ENTERPRISE'].includes(planTier)) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 })
    }

    let restaurantId = session.user.restaurantId
    let restaurant = null

    if (restaurantId) {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
      })
    }

    if (!restaurant) {
      restaurant = await prisma.restaurant.findFirst()
      restaurantId = restaurant?.id || ''
    }

    if (!restaurant || !restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const previousTier = restaurant.planTier

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        planTier: planTier as any,
      },
      select: {
        id: true,
        name: true,
        planTier: true,
      },
    })

    // Log audit event
    await logAuditEvent({
      restaurantId,
      actorId: session.user.id || 'system',
      actorName: session.user.name || 'Admin',
      action: previousTier === 'STARTER' && planTier !== 'STARTER' ? 'PLAN_UPGRADED' : 'PLAN_DOWNGRADED',
      targetType: 'Restaurant',
      targetId: restaurantId,
      before: { planTier: previousTier },
      after: { planTier: updated.planTier },
    })

    return NextResponse.json({
      success: true,
      restaurantId: updated.id,
      planTier: updated.planTier,
      message: `Plan successfully updated to ${updated.planTier}`,
    })
  } catch (error: any) {
    console.error('[POST /api/billing/activate]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to activate plan tier' },
      { status: 500 }
    )
  }
}
