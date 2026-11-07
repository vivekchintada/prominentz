import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cancelCashfreeSubscription } from '@/lib/cashfree'
import { stripe, isMockStripe } from '@/lib/stripe'
import { logAuditEvent } from '@/lib/audit'
import { getRevenueCatSubscriber, planStateFromSubscriber } from '@/lib/revenuecat'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found for user' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const currentSettings = (restaurant.settings as Record<string, any>) || {}

    // RevenueCat subscriptions are cancelled on RevenueCat's hosted page; the plan stays
    // active until the paid period ends and the webhook then downgrades it.
    if (currentSettings.lastBillingGateway === 'REVENUECAT') {
      const { managementUrl } = planStateFromSubscriber(await getRevenueCatSubscriber(restaurant.id))
      return NextResponse.json({
        success: false,
        url: managementUrl,
        message: 'Open the subscription page to cancel. Your plan stays active until the end of the paid period.',
      })
    }

    const subscriptionId = currentSettings.cashfreeSubscriptionId || restaurant.stripeSubscriptionId

    if (subscriptionId) {
      try {
        if (!currentSettings.cashfreeSubscriptionId && subscriptionId.startsWith('sub_') && !isMockStripe()) {
          await stripe.subscriptions.cancel(subscriptionId)
        } else {
          await cancelCashfreeSubscription(subscriptionId)
        }
      } catch (err: any) {
        console.warn('[POST /api/billing/cancel] Gateway cancellation warning:', err.message)
      }
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        planTier: 'STARTER',
        settings: {
          ...currentSettings,
          cashfreeSubscriptionStatus: 'CANCELLED',
          cashfreeCancelledAt: new Date().toISOString(),
          lastCashfreeEventTime: new Date().toISOString(),
        },
      },
    })

    await logAuditEvent({
      restaurantId,
      actorId: session.user.id || 'owner',
      actorName: session.user.name || 'Owner',
      action: 'BILLING_SUBSCRIPTION_CANCELLED',
      targetType: 'Restaurant',
      targetId: restaurantId,
      before: { planTier: restaurant.planTier, subscriptionId },
      after: { planTier: 'STARTER', status: 'CANCELLED' },
    })

    return NextResponse.json({
      success: true,
      planTier: updatedRestaurant.planTier,
      message: 'Subscription successfully cancelled. Your account has returned to the Basic Plan.',
    })
  } catch (error: any) {
    console.error('[POST /api/billing/cancel Error]', error)
    return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 })
  }
}
