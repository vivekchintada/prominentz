import { NextRequest, NextResponse } from 'next/server'
import { handleDinerPaymentEvent } from '@/lib/diner-payment-webhook'

export const dynamic = 'force-dynamic'

/**
 * Development only: post an unsigned Stripe-shaped event to simulate a diner payment.
 * Real events arrive per restaurant at /api/ordering/payments/webhook/<restaurantId>.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint has moved. Each restaurant now has its own webhook, created when its Stripe key is saved.' },
      { status: 410 },
    )
  }
  let event: any
  try {
    event = JSON.parse(await req.text())
  } catch {
    return NextResponse.json({ error: 'Body must be a JSON Stripe event' }, { status: 400 })
  }
  return handleDinerPaymentEvent(event, null, req.nextUrl.origin)
}
