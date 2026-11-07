import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createSubscriptionCheckoutSession, isMockCashfree } from '@/lib/cashfree'
import { logAuditEvent } from '@/lib/audit'
import { PlanTier } from '@/lib/plans'
import { resolveUserLocation } from '@/lib/location-resolver'
import { billingProviderForCountry, resolveCountryFromRequest } from '@/lib/billing-provider'
import { createSubscriptionCheckoutSession as createStripeSubscriptionCheckout } from '@/lib/stripe'
import { hasRevenueCatWebCheckout, MOBILE_SUBSCRIBE_MESSAGE, revenueCatPurchaseUrl } from '@/lib/revenuecat'

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

    // Pick the gateway by the customer's own country, not a single global setting — Cashfree
    // only settles in INR, so a US/international customer must never land on it.
    const countryCode = resolveCountryFromRequest(req, restaurant.phone)
    const provider = billingProviderForCountry(countryCode)
    if (provider !== 'revenuecat' && isMockCashfree() && process.env.NODE_ENV !== 'production') {
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

    // RevenueCat: hosted Web Purchase Link if set up, otherwise subscribe in the mobile app.
    if (provider === 'revenuecat') {
      if (!hasRevenueCatWebCheckout(planTier as PlanTier)) {
        return NextResponse.json({ error: MOBILE_SUBSCRIBE_MESSAGE, mobileOnly: true }, { status: 409 })
      }
      return NextResponse.json({
        url: revenueCatPurchaseUrl(planTier as PlanTier, restaurant.id, session.user.email),
        sessionId: null,
        planTier,
      })
    }

    const createCheckout =
      provider === 'stripe' ? createStripeSubscriptionCheckout : createSubscriptionCheckoutSession
    const checkout = await createCheckout({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      userEmail: session.user.email || '',
      planTier: planTier as PlanTier,
      returnUrl,
    })

    return NextResponse.json({
      url: checkout.url,
      sessionId: checkout.id,
      planTier,
    })
  } catch (error: any) {
    console.error('[POST /api/billing/checkout]', error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}
