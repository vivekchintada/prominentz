import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe, isMockStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// ─── GET /api/payments/connect ────────────────────────────────────────────────
// Returns whether this restaurant can accept card payments, refreshing from Stripe.
export async function GET() {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isMockStripe()) {
    return NextResponse.json({ connected: true, chargesEnabled: true, mock: true })
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: { id: true, stripeConnectAccountId: true, stripeChargesEnabled: true },
  })
  if (!restaurant?.stripeConnectAccountId) {
    return NextResponse.json({ connected: false, chargesEnabled: false })
  }

  try {
    const account = await stripe.accounts.retrieve(restaurant.stripeConnectAccountId)
    const chargesEnabled = Boolean(account.charges_enabled)
    if (chargesEnabled !== restaurant.stripeChargesEnabled) {
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { stripeChargesEnabled: chargesEnabled },
      })
    }
    return NextResponse.json({
      connected: true,
      chargesEnabled,
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
    })
  } catch (error) {
    console.error('[GET /api/payments/connect]', error)
    return NextResponse.json({
      connected: true,
      chargesEnabled: restaurant.stripeChargesEnabled,
    })
  }
}

// ─── POST /api/payments/connect ───────────────────────────────────────────────
// Owner only. Creates (or resumes) the restaurant's own Stripe account and returns
// a Stripe-hosted onboarding link. Payouts go straight to the restaurant's bank.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only the owner can connect payments' }, { status: 403 })
  }
  if (isMockStripe()) {
    return NextResponse.json({ error: 'Stripe keys are not configured in this environment.' }, { status: 400 })
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { id: true, name: true, stripeConnectAccountId: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    let accountId = restaurant.stripeConnectAccountId
    if (!accountId) {
      // Standard account: the restaurant owns its Stripe account and dashboard,
      // is the merchant of record, and pays Stripe's normal processing fees.
      const account = await stripe.accounts.create(
        {
          type: 'standard',
          country: 'US',
          email: session.user.email || undefined,
          business_profile: { name: restaurant.name, mcc: '5812' },
          metadata: { restaurantId: restaurant.id },
        },
        { idempotencyKey: `connect_account_${restaurant.id}` },
      )
      accountId = account.id
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { stripeConnectAccountId: accountId, stripeChargesEnabled: Boolean(account.charges_enabled) },
      })
    }

    const returnUrl = `${req.nextUrl.origin}/dashboard/settings/billing?payments=connected`
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${req.nextUrl.origin}/dashboard/settings/billing?payments=retry`,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: link.url })
  } catch (error: any) {
    console.error('[POST /api/payments/connect]', error)
    return NextResponse.json({ error: error?.message || 'Could not start Stripe onboarding' }, { status: 500 })
  }
}
