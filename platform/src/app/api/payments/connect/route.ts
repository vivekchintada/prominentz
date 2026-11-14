import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sealSecret, openSecret, secretBoxReady } from '@/lib/secret-box'
import {
  stripeClientForKey,
  stripeKeyMode,
  forgetRestaurantStripe,
  paymentsSimulationAllowed,
} from '@/lib/restaurant-stripe'

export const dynamic = 'force-dynamic'

/**
 * Card payments run on the restaurant's OWN Stripe account. The owner pastes their Stripe secret
 * key (or a restricted key); we check it, create a webhook endpoint in their account for online
 * order payments, and store both secrets encrypted. Payouts go straight from Stripe to the
 * restaurant's bank; Prominentz never touches diner money.
 */

/** Events the online-ordering webhook handles (lib/diner-payment-webhook). */
const WEBHOOK_EVENTS = ['payment_intent.succeeded', 'payment_intent.payment_failed'] as const

function publicBaseUrl(req: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')
}

function stripeErrorMessage(err: any): string {
  if (err?.type === 'StripeAuthenticationError') return 'Stripe did not accept this key. Copy it again from your Stripe dashboard.'
  if (err?.type === 'StripePermissionError') {
    return 'This restricted key is missing a permission. It needs write access to PaymentIntents, Checkout Sessions, Refunds, Terminal and Webhook Endpoints.'
  }
  return err?.message || 'Could not reach Stripe'
}

// ─── GET: is this restaurant ready to take cards? ─────────────────────────────
export async function GET() {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const keys = await prisma.restaurantStripeKeys.findUnique({
    where: { restaurantId: session.user.restaurantId },
    select: { mode: true, keyLast4: true, accountName: true, country: true, webhookSecretEnc: true, updatedAt: true },
  })
  if (!keys) {
    return NextResponse.json({ connected: false, chargesEnabled: false, simulated: paymentsSimulationAllowed() })
  }
  return NextResponse.json({
    connected: true,
    chargesEnabled: true,
    mode: keys.mode,
    keyLast4: keys.keyLast4,
    accountName: keys.accountName,
    country: keys.country,
    onlineOrdersReady: Boolean(keys.webhookSecretEnc),
    updatedAt: keys.updatedAt,
  })
}

const saveSchema = z.object({
  secretKey: z.string().trim().min(20).max(300),
})

// ─── POST: save (or replace) the restaurant's Stripe key ──────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only the owner can set up card payments' }, { status: 403 })
  }
  if (!secretBoxReady()) {
    return NextResponse.json({ error: 'Card payment setup is not available yet. Contact support.' }, { status: 503 })
  }

  const parsed = saveSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paste your Stripe secret key (it starts with sk_ or rk_).' }, { status: 400 })
  }
  const secretKey = parsed.data.secretKey
  if (secretKey.startsWith('pk_')) {
    return NextResponse.json({ error: 'That is the publishable key. Paste the secret key (sk_…) or a restricted key (rk_…).' }, { status: 400 })
  }
  const mode = stripeKeyMode(secretKey)
  if (!mode) {
    return NextResponse.json({ error: 'That does not look like a Stripe secret key. It starts with sk_live_, sk_test_, rk_live_ or rk_test_.' }, { status: 400 })
  }

  const restaurantId = session.user.restaurantId
  const client = stripeClientForKey(secretKey)

  // 1. Check the key works, and learn the account's name and country (the card reader needs it).
  //    A restricted key may not be allowed to read the account; that's fine, we only need it to charge.
  let accountId: string | null = null
  let accountName: string | null = null
  let country: string | null = null
  try {
    const account = await client.accounts.retrieveCurrent()
    accountId = account.id
    accountName = account.business_profile?.name || account.settings?.dashboard?.display_name || null
    country = account.country ?? null
    if (mode === 'live' && account.charges_enabled === false) {
      return NextResponse.json(
        { error: 'Stripe has not enabled payments on this account yet. Finish activating it in your Stripe dashboard, then try again.' },
        { status: 409 },
      )
    }
  } catch (err: any) {
    if (err?.type !== 'StripePermissionError') {
      return NextResponse.json({ error: stripeErrorMessage(err) }, { status: 400 })
    }
  }

  const existing = await prisma.restaurantStripeKeys.findUnique({
    where: { restaurantId },
    select: { secretKeyEnc: true, webhookEndpointId: true, accountId: true },
  })

  // 2. Create the webhook endpoint in the restaurant's account, for online order payments.
  //    Stripe only reveals the signing secret on creation, so a fresh endpoint is made each save.
  let webhookEndpointId: string | null = null
  let webhookSecret: string | null = null
  try {
    const endpoint = await client.webhookEndpoints.create({
      url: `${publicBaseUrl(req)}/api/ordering/payments/webhook/${restaurantId}`,
      enabled_events: [...WEBHOOK_EVENTS],
      description: 'Prominentz online orders',
      metadata: { restaurantId, source: 'prominentz' },
    })
    webhookEndpointId = endpoint.id
    webhookSecret = endpoint.secret ?? null
  } catch (err: any) {
    // Local development: Stripe can't call localhost, so carry on without online-order webhooks.
    if (!paymentsSimulationAllowed()) {
      return NextResponse.json({ error: stripeErrorMessage(err) }, { status: 400 })
    }
    console.warn('[payments/connect] Webhook endpoint not created (development):', err?.message)
  }

  // 3. Remove the endpoint from the previous save, using the key that created it.
  if (existing?.webhookEndpointId) {
    try {
      await stripeClientForKey(openSecret(existing.secretKeyEnc)).webhookEndpoints.del(existing.webhookEndpointId)
    } catch {
      // The old key may be revoked already; the old endpoint then simply stops verifying.
    }
  }

  // A reader paired under another Stripe account (or the old Stripe Connect setup) can't be used with this key.
  const accountChanged = !existing || !accountId || existing.accountId !== accountId

  const data = {
    secretKeyEnc: sealSecret(secretKey),
    keyLast4: secretKey.slice(-4),
    mode,
    accountId,
    accountName,
    country,
    webhookEndpointId,
    webhookSecretEnc: webhookSecret ? sealSecret(webhookSecret) : null,
  }
  await prisma.$transaction([
    prisma.restaurantStripeKeys.upsert({ where: { restaurantId }, create: { restaurantId, ...data }, update: data }),
    prisma.restaurant.update({ where: { id: restaurantId }, data: { stripeChargesEnabled: true } }),
    ...(accountChanged
      ? [prisma.location.updateMany({ where: { restaurantId }, data: { stripeReaderId: null, stripeTerminalLocationId: null } })]
      : []),
  ])
  forgetRestaurantStripe(restaurantId)

  return NextResponse.json({
    connected: true,
    chargesEnabled: true,
    mode,
    keyLast4: data.keyLast4,
    accountName,
    country,
    onlineOrdersReady: Boolean(webhookSecret),
  })
}

// ─── DELETE: stop taking cards and forget the key ─────────────────────────────
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only the owner can change card payments' }, { status: 403 })
  }
  const restaurantId = session.user.restaurantId

  const existing = await prisma.restaurantStripeKeys.findUnique({
    where: { restaurantId },
    select: { secretKeyEnc: true, webhookEndpointId: true },
  })
  if (existing?.webhookEndpointId) {
    try {
      await stripeClientForKey(openSecret(existing.secretKeyEnc)).webhookEndpoints.del(existing.webhookEndpointId)
    } catch {
      // Best effort: without the stored secret the endpoint can no longer be verified anyway.
    }
  }

  await prisma.$transaction([
    prisma.restaurantStripeKeys.deleteMany({ where: { restaurantId } }),
    prisma.restaurant.update({ where: { id: restaurantId }, data: { stripeChargesEnabled: false } }),
    prisma.location.updateMany({ where: { restaurantId }, data: { stripeReaderId: null, stripeTerminalLocationId: null } }),
  ])
  forgetRestaurantStripe(restaurantId)

  return NextResponse.json({ connected: false, chargesEnabled: false })
}
