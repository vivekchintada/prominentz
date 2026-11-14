import { NextRequest, NextResponse } from 'next/server'
import { findRestaurantStripe, restaurantWebhookSecret } from '@/lib/restaurant-stripe'
import { handleDinerPaymentEvent } from '@/lib/diner-payment-webhook'

export const dynamic = 'force-dynamic'

/**
 * Stripe webhook for one restaurant's own Stripe account. Prominentz creates this endpoint in the
 * restaurant's Stripe account when the owner saves their key (POST /api/payments/connect), and
 * keeps its signing secret, so a valid signature proves the event came from that account.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const raw = await req.text()
  const sig = req.headers.get('stripe-signature')

  const [secret, client] = await Promise.all([restaurantWebhookSecret(restaurantId), findRestaurantStripe(restaurantId)])
  if (!secret || !client || !sig) {
    return NextResponse.json({ error: 'Unknown webhook endpoint or missing signature' }, { status: 400 })
  }

  let event
  try {
    event = client.webhooks.constructEvent(raw, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  return handleDinerPaymentEvent(event, restaurantId, req.nextUrl.origin)
}
