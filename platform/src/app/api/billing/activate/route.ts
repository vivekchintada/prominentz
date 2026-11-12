import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/lib/audit'
import { PlanTier } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const TIER_RANK: Record<string, number> = { STARTER: 0, PRO: 1, ENTERPRISE: 2 }

function planChangeAction(from: string, to: string): 'PLAN_UPGRADED' | 'PLAN_DOWNGRADED' | 'PLAN_CHANGED' {
  const delta = (TIER_RANK[to] ?? 0) - (TIER_RANK[from] ?? 0)
  return delta > 0 ? 'PLAN_UPGRADED' : delta < 0 ? 'PLAN_DOWNGRADED' : 'PLAN_CHANGED'
}

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

    // Require explicit admin authorization in all environments; clients cannot self-activate
    const adminSecret = Buffer.from(req.headers.get('x-admin-secret') || '', 'utf8')
    const expectedSecret = Buffer.from(process.env.INTERNAL_ADMIN_SECRET || '', 'utf8')
    const secretOk =
      expectedSecret.length > 0 && adminSecret.length === expectedSecret.length && timingSafeEqual(adminSecret, expectedSecret)
    if (!secretOk) {
      return NextResponse.json(
        { error: 'Forbidden: Plan activation must be completed through the Dodo Payments checkout webhook' },
        { status: 403 }
      )
    }

    const { resolveUserLocation } = await import('@/lib/location-resolver')
    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found for user' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })

    if (!restaurant) {
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
      action: planChangeAction(previousTier, planTier),
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
      { error: 'Failed to activate plan tier' },
      { status: 500 }
    )
  }
}
