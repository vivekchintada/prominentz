import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createSubscriptionCheckoutSession } from '@/lib/stripe'
import { PlanTier } from '@/lib/plans'

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

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant account not found' }, { status: 404 })
    }

    const origin = req.nextUrl.origin || 'http://localhost:3000'
    const returnUrl = `${origin}/dashboard/settings/billing`

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
    })
  } catch (error: any) {
    console.error('[POST /api/billing/checkout]', error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}
