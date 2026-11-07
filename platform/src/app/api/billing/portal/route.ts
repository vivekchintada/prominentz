import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createBillingPortalSession } from '@/lib/cashfree'
import { stripe } from '@/lib/stripe'
import { billingProvider } from '@/lib/billing-provider'
import { getRevenueCatSubscriber, planStateFromSubscriber } from '@/lib/revenuecat'

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

    const origin = req.nextUrl.origin || 'http://localhost:3000'
    const returnUrl = `${origin}/dashboard/settings/billing`

    const settings = (restaurant.settings as Record<string, any>) || {}

    // RevenueCat subscribers manage card, plan and cancellation on RevenueCat's hosted page.
    if (
      settings.lastBillingGateway === 'REVENUECAT' ||
      (billingProvider() === 'revenuecat' && !settings.cashfreeSubscriptionId)
    ) {
      const subscriber = await getRevenueCatSubscriber(restaurant.id)
      const { managementUrl } = planStateFromSubscriber(subscriber)
      if (!managementUrl) {
        return NextResponse.json(
          { error: 'No active subscription to manage yet. Choose a plan first.' },
          { status: 404 }
        )
      }
      return NextResponse.json({ url: managementUrl })
    }

    // USD subscribers manage cards and invoices in Stripe's hosted billing portal.
    if (billingProvider() === 'stripe' && restaurant.stripeCustomerId && !settings.cashfreeSubscriptionId) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: restaurant.stripeCustomerId,
        return_url: returnUrl,
      })
      return NextResponse.json({ url: portal.url })
    }

    const subscriptionId = settings.cashfreeSubscriptionId || restaurant.stripeSubscriptionId || `sub_mock_${restaurant.id.substring(0, 8)}`

    const portal = await createBillingPortalSession({
      subscriptionId,
      customerId: restaurant.stripeCustomerId || `cus_mock_${restaurant.id.substring(0, 8)}`,
      returnUrl,
    })

    return NextResponse.json({
      url: portal.url,
    })
  } catch (error: any) {
    console.error('[POST /api/billing/portal]', error)
    return NextResponse.json({ error: error.message || 'Failed to open customer portal' }, { status: 500 })
  }
}
