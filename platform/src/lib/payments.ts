// lib/payments.ts

/**
 * Verify a Stripe PaymentIntent against order expectations.
 * Throws an error (with message) if validation fails.
 */
export async function verifyStripeIntent({
  intentId,
  orderId,
  expectedAmount,
  stripeAccount,
  currency = 'USD',
}: {
  intentId: string
  orderId: string
  expectedAmount: number
  /** Restaurant's connected Stripe account the charge was made on. */
  stripeAccount?: string
  /** Restaurant's currency; the card charge must be in the same one. */
  currency?: string
}) {
  const { stripe, isMockStripe } = await import('@/lib/stripe')
  const { formatMoney, fromMinorUnits, toMinorUnits } = await import('@/lib/money')
  // In non‑mock environments we enforce real Stripe verification.
  if (!isMockStripe() || process.env.NODE_ENV === 'production') {
    const intent = await stripe.paymentIntents.retrieve(intentId, {}, stripeAccount ? { stripeAccount } : undefined)

    if (intent.status !== 'succeeded') {
      throw new Error(`PaymentIntent has not succeeded (status: ${intent.status})`)
    }
    if (intent.currency?.toLowerCase() !== currency.toLowerCase()) {
      throw new Error(`The card was charged in ${intent.currency?.toUpperCase()}, but this restaurant bills in ${currency.toUpperCase()}`)
    }
    if (intent.metadata?.orderId && intent.metadata.orderId !== orderId) {
      throw new Error('PaymentIntent metadata orderId mismatch')
    }
    // Within one smallest unit (a paisa or a cent) for float rounding; nothing that could hide an underpayment.
    if (Math.abs(intent.amount - toMinorUnits(expectedAmount, currency)) > 1) {
      throw new Error(`The card was charged ${formatMoney(fromMinorUnits(intent.amount, currency), currency)}, but ${formatMoney(expectedAmount, currency)} is due`)
    }
  }
}
