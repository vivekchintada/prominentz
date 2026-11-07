import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe, isMockStripe, createPaymentIntent } from '@/lib/stripe'
import { requireConnectedAccount, findConnectedAccount, paymentErrorStatus } from '@/lib/stripe-connect'
import { resolveUserLocation } from '@/lib/location-resolver'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * In-person card payments via Stripe Terminal (server-driven).
 *
 *   POST   → creates a card_present PaymentIntent on the restaurant's account and
 *            pushes it to the location's paired reader. Guest taps/dips/swipes.
 *   GET    → POS polls the PaymentIntent status until it succeeds or fails.
 *   DELETE → cancels the pending action on the reader.
 *
 * The resulting PaymentIntent id is then passed to /api/payments, which verifies it.
 */

const startSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().min(0.5, 'Minimum card charge is $0.50'),
  /** Distinguishes split-check shares so each gets its own PaymentIntent. */
  attempt: z.string().max(40).optional(),
})

async function context() {
  const session = await auth()
  if (!session?.user) return null
  const resolved = await resolveUserLocation(session.user)
  const restaurantId = resolved?.restaurantId || session.user.restaurantId
  if (!restaurantId) return null
  return { session, restaurantId, locationId: resolved?.locationId }
}

export async function POST(req: NextRequest) {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await rateLimit(`terminal:${ctx.restaurantId}`, 120, 60)
  if (!limited.allowed) return rateLimitResponse(limited.retryAfterSec)

  const parsed = startSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { orderId, amount, attempt } = parsed.data

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [{ table: { location: { restaurantId: ctx.restaurantId } } }, { server: { restaurantId: ctx.restaurantId } }],
    },
    select: { id: true, status: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (['PAID', 'VOIDED'].includes(order.status)) {
    return NextResponse.json({ error: 'Order is already settled or voided' }, { status: 409 })
  }

  try {
    if (isMockStripe()) {
      // Local development: behave like an instant approved tap.
      const intent = await createPaymentIntent(Math.round(amount * 100), orderId)
      return NextResponse.json({ paymentIntentId: intent.id, status: 'succeeded', mock: true })
    }

    const stripeAccount = await requireConnectedAccount(ctx.restaurantId)
    const location = ctx.locationId
      ? await prisma.location.findFirst({
          where: { id: ctx.locationId, restaurantId: ctx.restaurantId },
          select: { stripeReaderId: true },
        })
      : null
    if (!location?.stripeReaderId) {
      return NextResponse.json(
        { error: 'No card reader is paired with this location. Pair one in Settings → Payments.' },
        { status: 409 },
      )
    }

    const intent = await createPaymentIntent(Math.round(amount * 100), orderId, {
      stripeAccount,
      paymentMethodTypes: ['card_present'],
      idempotencySuffix: attempt || `${Date.now()}`,
    })

    await stripe.terminal.readers.processPaymentIntent(
      location.stripeReaderId,
      { payment_intent: intent.id },
      { stripeAccount },
    )

    return NextResponse.json({ paymentIntentId: intent.id, status: 'waiting_for_card' })
  } catch (error: any) {
    console.error('[POST /api/payments/terminal/process]', error)
    return NextResponse.json({ error: error.message || 'Card reader error' }, { status: paymentErrorStatus(error) })
  }
}

export async function GET(req: NextRequest) {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const paymentIntentId = req.nextUrl.searchParams.get('paymentIntentId')
  if (!paymentIntentId) return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 })

  if (isMockStripe() || paymentIntentId.startsWith('pi_mock_')) {
    return NextResponse.json({ status: 'succeeded' })
  }

  try {
    const stripeAccount = await findConnectedAccount(ctx.restaurantId)
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {}, stripeAccount ? { stripeAccount } : undefined)
    return NextResponse.json({
      status: intent.status,
      error: intent.last_payment_error?.message ?? null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isMockStripe()) return NextResponse.json({ ok: true })

  try {
    const stripeAccount = await requireConnectedAccount(ctx.restaurantId)
    const location = ctx.locationId
      ? await prisma.location.findFirst({
          where: { id: ctx.locationId, restaurantId: ctx.restaurantId },
          select: { stripeReaderId: true },
        })
      : null
    if (location?.stripeReaderId) {
      await stripe.terminal.readers.cancelAction(location.stripeReaderId, {}, { stripeAccount })
    }
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: paymentErrorStatus(error) })
  }
}
