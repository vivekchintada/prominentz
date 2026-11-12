import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe, isMockStripe } from '@/lib/stripe'
import { getRestaurantMoneySettings } from '@/lib/settings-helpers'
import { CONNECT_COUNTRIES, isConnectCountry, suggestedConnectCountry } from '@/lib/stripe-connect-countries'

export const dynamic = 'force-dynamic'

// ─── GET /api/payments/connect ────────────────────────────────────────────────
// Returns whether this restaurant can accept card payments, refreshing from Stripe.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Lets the owner pick the country their bank is in before a Stripe account is opened.
  const { currency } = await getRestaurantMoneySettings(session.user.restaurantId)
  const geo = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry')
  const countryInfo = { countries: CONNECT_COUNTRIES, suggestedCountry: suggestedConnectCountry(currency, geo) }

  if (isMockStripe()) {
    return NextResponse.json({ connected: true, chargesEnabled: true, mock: true, ...countryInfo })
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: { id: true, stripeConnectAccountId: true, stripeChargesEnabled: true },
  })
  if (!restaurant?.stripeConnectAccountId) {
    return NextResponse.json({ connected: false, chargesEnabled: false, ...countryInfo })
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
      country: account.country ?? null,
      ...countryInfo,
    })
  } catch (error) {
    console.error('[GET /api/payments/connect]', error)
    return NextResponse.json({
      connected: true,
      chargesEnabled: restaurant.stripeChargesEnabled,
      ...countryInfo,
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

  const body = await req.json().catch(() => ({}))
  const country = typeof body?.country === 'string' ? body.country.toUpperCase() : ''

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { id: true, name: true, stripeConnectAccountId: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    let accountId = restaurant.stripeConnectAccountId

    // A Stripe account's country is fixed at creation. If the owner started onboarding in the wrong
    // country and never finished, open a fresh account in the right one. A live account is kept.
    if (accountId && country) {
      const existing = await stripe.accounts.retrieve(accountId)
      if (existing.country && existing.country !== country) {
        if (existing.charges_enabled || existing.details_submitted) {
          return NextResponse.json(
            { error: `Your Stripe account is already set up in ${existing.country}. To use a bank in another country, contact support.` },
            { status: 409 },
          )
        }
        accountId = null
      }
    }

    if (!accountId) {
      if (!isConnectCountry(country)) {
        return NextResponse.json({ error: 'Choose the country your bank account is in.' }, { status: 400 })
      }
      // Standard account: the restaurant owns its Stripe account and dashboard,
      // is the merchant of record, and pays Stripe's normal processing fees.
      const account = await stripe.accounts.create(
        {
          type: 'standard',
          country,
          email: session.user.email || undefined,
          business_profile: { name: restaurant.name, mcc: '5812' },
          metadata: { restaurantId: restaurant.id },
        },
        { idempotencyKey: `connect_account_${restaurant.id}_${country}` },
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
    // Stripe's message explains country-specific limits (e.g. a country Stripe doesn't support for this platform).
    const message = error?.type === 'StripeInvalidRequestError' && error?.message ? error.message : 'Could not start Stripe onboarding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
