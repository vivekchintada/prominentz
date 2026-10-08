import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createSubscriptionCheckoutSession, isMockStripe } from '@/lib/stripe'
import { logAuditEvent } from '@/lib/audit'
import { PlanTier } from '@/lib/plans'
import { resolveUserLocation } from '@/lib/location-resolver'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planTier } = await req.json()
    if (!['STARTER', 'PRO', 'ENTERPRISE'].includes(planTier)) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 })
    }

    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant account not found for user' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant account not found' }, { status: 404 })
    }

    const origin = req.nextUrl.origin || 'http://localhost:3000'
    const returnUrl = `${origin}/dashboard/settings/billing`

    // In simulated/demo mode, update restaurant planTier directly
    if (isMockStripe()) {
      const prevTier = restaurant.planTier
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { planTier: planTier as any },
      })

      await logAuditEvent({
        restaurantId: restaurant.id,
        actorId: session.user.id || 'system',
        actorName: session.user.name || 'Admin',
        action: prevTier === 'STARTER' && planTier !== 'STARTER' ? 'PLAN_UPGRADED' : 'PLAN_DOWNGRADED',
        targetType: 'Restaurant',
        targetId: restaurant.id,
        before: { planTier: prevTier },
        after: { planTier },
      })
    }

    const checkout = await createSubscriptionCheckoutSession({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      userEmail: session.user.email || 'billing@resto.ai',
      planTier: planTier as PlanTier,
      returnUrl,
    })

    return NextResponse.json({
      url: checkout.url,
      sessionId: checkout.id,
      planTier,
    })
  } catch (error: unknown) {
    console.error('[POST /api/billing/checkout]', error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}
