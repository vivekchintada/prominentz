import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageBilling, getAuthContext } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'
import { changeDodoSubscriptionPlan, createSubscriptionCheckoutSession } from '@/lib/dodo-payments'
import { PlanTier } from '@/lib/plans'
import { resolveUserLocation } from '@/lib/location-resolver'
import { billingProviderForCountry, resolveCountryFromRequest } from '@/lib/billing-provider'
import { createSubscriptionCheckoutSession as createStripeSubscriptionCheckout } from '@/lib/stripe'

/** Dodo statuses where a live recurring subscription already exists for this restaurant. */
const LIVE_DODO_STATUSES = new Set(['ACTIVE', 'BILLING_ISSUE', 'PAUSED'])

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const authCtx = await getAuthContext(session.user)
    if (!authCtx || !canManageBilling(authCtx)) {
      return NextResponse.json({ error: 'Only the restaurant owner can manage billing' }, { status: 403 })
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
    const settings = (restaurant.settings as Record<string, any>) || {}

    // A restaurant must only ever have one recurring subscription. If one is live, change
    // its plan in place rather than opening a second checkout that would double-bill.
    if (settings.dodoSubscriptionId && LIVE_DODO_STATUSES.has(settings.dodoSubscriptionStatus)) {
      if (restaurant.planTier === planTier) {
        return NextResponse.json({ error: 'You are already subscribed to this plan.' }, { status: 409 })
      }
      const change = await changeDodoSubscriptionPlan({
        subscriptionId: settings.dodoSubscriptionId,
        planTier: planTier as PlanTier,
        restaurantId: restaurant.id,
      })
      return NextResponse.json({
        url: change.paymentLink || `${returnUrl}?plan=${planTier}&success=true&gateway=dodo&changed=true`,
        sessionId: settings.dodoSubscriptionId,
        planTier,
        planChanged: true,
      })
    }

    const countryCode = resolveCountryFromRequest(req)
    const provider = billingProviderForCountry(countryCode)

    const checkout =
      provider === 'stripe'
        ? await createStripeSubscriptionCheckout({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            userEmail: session.user.email || '',
            planTier: planTier as PlanTier,
            returnUrl,
          })
        : await createSubscriptionCheckoutSession({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            userEmail: session.user.email || '',
            planTier: planTier as PlanTier,
            returnUrl,
            countryCode,
            dodoCustomerId: settings.dodoCustomerId || null,
          })

    return NextResponse.json({
      url: checkout.url,
      sessionId: checkout.id,
      planTier,
    })
  } catch (error: any) {
    console.error('[POST /api/billing/checkout]', error)
    // Gateway errors can carry API detail; log it, return a plain message.
    return NextResponse.json({ error: 'Failed to create checkout session. Please try again.' }, { status: 500 })
  }
}
