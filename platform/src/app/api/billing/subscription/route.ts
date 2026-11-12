import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PRICING } from '@/lib/pricing'

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
    const activeGateway = settings.lastBillingGateway || (settings.dodoSubscriptionId ? 'DODO' : 'STRIPE')
    const isDodo = activeGateway === 'DODO'
    const subscriptionStatus = isDodo
      ? settings.dodoSubscriptionStatus || 'INACTIVE'
      : restaurant.stripeSubscriptionId ? 'ACTIVE' : 'INACTIVE'
    const subscriptionId = isDodo
      ? settings.dodoSubscriptionId || null
      : restaurant.stripeSubscriptionId || null

    const planInfo = PRICING[restaurant.planTier as keyof typeof PRICING] || PRICING.STARTER

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
        tagline: planInfo.tagline,
      },
      gateway: activeGateway,
      subscriptionId,
      status: subscriptionStatus,
      lastBilledAt: settings.lastBilledAt || null,
      cancelledAt: settings.dodoCancelledAt || null,
      currentPeriodEnd: isDodo ? settings.dodoNextBillingDate || null : null,
      cancelAtPeriodEnd: isDodo ? Boolean(settings.dodoCancelAtPeriodEnd) : false,
      currency: isDodo ? settings.dodoCurrency || null : 'USD',
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
