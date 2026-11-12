// lib/payments.ts

/**
 * Throws if any of these PaymentIntents is already on a recorded payment or split, so one card
 * charge can never settle two payments (or two splits of the same bill).
 */
export async function assertIntentsUnused(intentIds: string[]) {
  const ids = intentIds.filter((id) => id && !id.startsWith('zero_balance'))
  if (ids.length === 0) return
  if (new Set(ids).size !== ids.length) {
    throw new Error('The same card payment was submitted for more than one split')
  }
  const { prisma } = await import('@/lib/prisma')
  const [onPayment, onSplit] = await Promise.all([
    prisma.payment.findFirst({ where: { stripePaymentIntentId: { in: ids } }, select: { id: true } }),
    prisma.paymentSplit.findFirst({ where: { stripePaymentIntentId: { in: ids } }, select: { id: true } }),
  ])
  if (onPayment || onSplit) throw new Error('This card payment has already been applied to a bill')
}

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
  const { formatMoney, fromMinorUnits, toMinorUnits, minorUnitTolerance } = await import('@/lib/money')
  // In non‑mock environments we enforce real Stripe verification.
  if (!isMockStripe() || process.env.NODE_ENV === 'production') {
    const intent = await stripe.paymentIntents.retrieve(intentId, {}, stripeAccount ? { stripeAccount } : undefined)

    if (intent.status !== 'succeeded') {
      throw new Error(`PaymentIntent has not succeeded (status: ${intent.status})`)
    }
    if (intent.currency?.toLowerCase() !== currency.toLowerCase()) {
      throw new Error(`The card was charged in ${intent.currency?.toUpperCase()}, but this restaurant bills in ${currency.toUpperCase()}`)
    }
    // Every intent we create is tagged with its order. An untagged one can't be tied to this bill.
    if (!intent.metadata?.orderId || intent.metadata.orderId !== orderId) {
      throw new Error('PaymentIntent metadata orderId mismatch')
    }
    // Within one smallest unit (a paisa or a cent) for float rounding; nothing that could hide an underpayment.
    if (Math.abs(intent.amount - toMinorUnits(expectedAmount, currency)) > minorUnitTolerance(currency)) {
      throw new Error(`The card was charged ${formatMoney(fromMinorUnits(intent.amount, currency), currency)}, but ${formatMoney(expectedAmount, currency)} is due`)
    }
  }
}
