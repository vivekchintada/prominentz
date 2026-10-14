import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PRICING } from '@/lib/pricing'
import { CASHFREE_PLAN_PRICING } from '@/lib/cashfree'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        planTier: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        settings: true,
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const settings = (restaurant.settings as Record<string, any>) || {}
    const activeGateway = settings.lastBillingGateway || (settings.cashfreeSubscriptionId ? 'CASHFREE' : 'STRIPE')
    const subscriptionStatus = settings.cashfreeSubscriptionStatus || (restaurant.stripeSubscriptionId ? 'ACTIVE' : 'INACTIVE')
    const subscriptionId = settings.cashfreeSubscriptionId || restaurant.stripeSubscriptionId || null

    const planInfo = PRICING[restaurant.planTier as keyof typeof PRICING] || PRICING.STARTER
    const cashfreePricing = CASHFREE_PLAN_PRICING[restaurant.planTier as keyof typeof CASHFREE_PLAN_PRICING] || CASHFREE_PLAN_PRICING.STARTER

    // Fetch billing event logs for receipts / audit history
    const billingLogs = await prisma.stripeEventLog.findMany({
      where: { orderId: restaurantId },
      orderBy: { processedAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      planTier: restaurant.planTier,
      planDetails: {
        label: planInfo.label,
        monthlyUSD: planInfo.monthly,
        monthlyINR: cashfreePricing.amountINR,
        tagline: planInfo.tagline,
      },
      gateway: activeGateway,
      subscriptionId,
      status: subscriptionStatus,
      lastBilledAt: settings.lastBilledAt || null,
      cancelledAt: settings.cashfreeCancelledAt || null,
      billingHistory: billingLogs.map((log) => ({
        id: log.id,
        eventId: log.eventId,
        eventType: log.eventType,
        date: log.processedAt,
      })),
    })
  } catch (error: any) {
    console.error('[GET /api/billing/subscription Error]', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch subscription' }, { status: 500 })
  }
}
