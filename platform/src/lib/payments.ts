// lib/payments.ts

/**
 * Verify a Stripe PaymentIntent against order expectations.
 * Throws an error (with message) if validation fails.
 */
export async function verifyStripeIntent({
  intentId,
  orderId,
  expectedAmount,
}: {
  intentId: string
  orderId: string
  expectedAmount: number
}) {
  const { stripe, isMockStripe } = await import('@/lib/stripe')
  // In non‑mock environments we enforce real Stripe verification.
  if (!isMockStripe() || process.env.NODE_ENV === 'production') {
    const intent = await stripe.paymentIntents.retrieve(intentId)

    if (intent.status !== 'succeeded') {
      throw new Error(`PaymentIntent has not succeeded (status: ${intent.status})`)
    }
    if (intent.currency?.toLowerCase() !== 'usd') {
      throw new Error(`PaymentIntent currency mismatch (${intent.currency} vs usd)`)
    }
    if (intent.metadata?.orderId && intent.metadata.orderId !== orderId) {
      throw new Error('PaymentIntent metadata orderId mismatch')
    }
    const intentDollars = intent.amount / 100
    if (Math.abs(intentDollars - expectedAmount) > 0.5) {
      throw new Error(`Authorized Stripe amount ($${intentDollars.toFixed(2)}) does not match expected amount ($${expectedAmount.toFixed(2)})`)
    }
  }
}
