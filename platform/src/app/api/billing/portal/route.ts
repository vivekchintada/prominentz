import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageBilling, getAuthContext } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createDodoCustomerPortalSession } from '@/lib/dodo-payments'

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

    // USD-direct Stripe subscribers (local-testing override only) manage cards/invoices
    // in Stripe's hosted billing portal.
    if (restaurant.stripeCustomerId && !settings.dodoSubscriptionId) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: restaurant.stripeCustomerId,
        return_url: returnUrl,
      })
      return NextResponse.json({ url: portal.url })
    }

    // Dodo subscribers update their card, download invoices, and cancel on Dodo's hosted portal.
    if (settings.dodoCustomerId) {
      const link = await createDodoCustomerPortalSession(settings.dodoCustomerId, returnUrl)
      return NextResponse.json({ url: link })
    }

    // No subscription yet (still on trial) — nothing to manage externally.
    return NextResponse.json({ url: returnUrl })
  } catch (error: any) {
    console.error('[POST /api/billing/portal]', error)
    return NextResponse.json({ error: error.message || 'Failed to open customer portal' }, { status: 500 })
  }
}
