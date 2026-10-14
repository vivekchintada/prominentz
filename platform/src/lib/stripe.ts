import Stripe from 'stripe'
import { PlanTier } from './plans'

const rawStripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_12345'
const isTestOrMockKey =
  !rawStripeSecret ||
  rawStripeSecret.includes('mock_key') ||
  rawStripeSecret.includes('REPLACE_ME') ||
  rawStripeSecret.startsWith('sk_test_REPLACE')

export function isMockStripe(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }
  return isTestOrMockKey
}

export const stripe = new Stripe(isTestOrMockKey ? 'sk_test_mock_dummy_key' : rawStripeSecret, {
  apiVersion: '2023-10-16' as any,
})

export const PLAN_PRICING: Record<PlanTier, { name: string; amount: number; priceId: string; description: string }> = {
  STARTER: {
    name: 'Basic Plan',
    amount: 50,
    priceId: process.env.STRIPE_PRICE_BASIC || process.env.STRIPE_PRICE_STARTER || 'price_basic_tier',
    description: 'Core POS & KDS, Table Floor Management, Digital Menu & QR Studio, Staff Accounts, End-of-Day Reports',
  },
  PRO: {
    name: 'Professional Plan (In Development)',
    amount: 129,
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_tier',
    description: 'Advanced AI Intelligence, Guest CRM & Loyalty Engine (Coming Soon)',
  },
  ENTERPRISE: {
    name: 'Enterprise',
    amount: 129,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_tier',
    description: 'Multi-Location Outlets, Dedicated Infrastructure and Custom SLA',
  },
}

/**
 * Creates a PaymentIntent in Stripe to initiate card checkout for dining checks.
 * Supports auto-confirm for POS terminal swipes / test cards.
 */
export async function createPaymentIntent(
  amountInCents: number,
  orderId: string,
  options?: {
    confirm?: boolean
    paymentMethod?: string
    idempotencySuffix?: string
  }
) {
  try {
    if (process.env.NODE_ENV === 'production' && isTestOrMockKey) {
      throw new Error('Stripe is not configured for production environment. Missing STRIPE_SECRET_KEY.')
    }
    if (isMockStripe()) {
      return {
        id: `pi_mock_${Math.random().toString(36).substr(2, 9)}`,
        client_secret: `pi_mock_secret_${Math.random().toString(36).substr(2, 9)}`,
        status: 'succeeded',
      }
    }

    const isLive = process.env.NODE_ENV === 'production' || (!isTestOrMockKey && rawStripeSecret.startsWith('sk_live_'))
    const shouldConfirm = options?.confirm ?? true

    if (shouldConfirm && !options?.paymentMethod && isLive) {
      throw new Error(
        'A genuine customer or terminal payment method is required to confirm card transactions in production. ' +
        'Mock/test tokens (pm_card_visa) are forbidden.'
      )
    }

    const paymentMethod = options?.paymentMethod || (isTestOrMockKey ? 'pm_card_visa' : undefined)

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: 'usd',
      metadata: { orderId },
      confirm: shouldConfirm && !!paymentMethod,
      payment_method: shouldConfirm && paymentMethod ? paymentMethod : undefined,
      automatic_payment_methods: (shouldConfirm && paymentMethod)
        ? undefined
        : { enabled: true, allow_redirects: 'never' },
    }

    // Stable idempotency key across retries:
    // If a custom suffix/attempt key is provided, use it; otherwise use the stable order+amount pair.
    // Avoid Date.now() so that network retries or repeated submissions don't double charge.
    const idempotencyKey = options?.idempotencySuffix
      ? `pi_${orderId}_${amountInCents}_${options.idempotencySuffix}`
      : `pi_${orderId}_${amountInCents}`

    const intent = await stripe.paymentIntents.create(
      createParams,
      {
        idempotencyKey,
      }
    )

    return {
      id: intent.id,
      client_secret: intent.client_secret,
      status: intent.status,
    }
  } catch (error: any) {
    console.error('[Stripe createPaymentIntent Error]', error)
    throw new Error(error.message || 'Failed to create payment intent with gateway')
  }
}

/**
 * Refunds a processed Stripe charge or PaymentIntent.
 */
export async function refundPayment(chargeIdOrPaymentIntentId: string, amountInCents?: number) {
  try {
    if (isMockStripe() || chargeIdOrPaymentIntentId.startsWith('pi_mock_')) {
      return {
        id: `re_mock_${Math.random().toString(36).substr(2, 9)}`,
        amount: amountInCents ?? 0,
      }
    }

    const refund = await stripe.refunds.create({
      payment_intent: chargeIdOrPaymentIntentId,
      ...(amountInCents ? { amount: amountInCents } : {}),
    })

    return {
      id: refund.id,
      amount: refund.amount,
    }
  } catch (error) {
    console.error('[Stripe refundPayment Error]', error)
    throw new Error('Failed to issue refund with Stripe gateway')
  }
}

/**
 * Creates a Stripe Checkout Session for SaaS Plan Subscription (Starter vs Professional).
 */
export async function createSubscriptionCheckoutSession({
  restaurantId,
  restaurantName,
  userEmail,
  planTier,
  returnUrl,
}: {
  restaurantId: string
  restaurantName: string
  userEmail: string
  planTier: PlanTier
  returnUrl: string
}) {
  const planInfo = PLAN_PRICING[planTier] || PLAN_PRICING.STARTER

  if (process.env.NODE_ENV === 'production' && isTestOrMockKey) {
    throw new Error('Stripe is not configured for production environment. Missing STRIPE_SECRET_KEY.')
  }

  if (isMockStripe()) {
    // Simulated Checkout Session URL for fast local development & demos
    return {
      url: `${returnUrl}?session_id=cs_mock_${Math.random().toString(36).substring(2, 9)}&plan=${planTier}&success=true`,
      id: `cs_mock_${Math.random().toString(36).substring(2, 9)}`,
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Prominentz — ${planInfo.name}`,
            description: planInfo.description,
          },
          unit_amount: planInfo.amount * 100,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      restaurantId,
      planTier,
      restaurantName,
    },
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planTier}&success=true`,
    cancel_url: `${returnUrl}?cancelled=true`,
  })

  return {
    url: session.url,
    id: session.id,
  }
}

/**
 * Creates a Stripe Customer Portal Session for managing cards and downloading invoices.
 */
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  if (isMockStripe() || !customerId || customerId.startsWith('cus_mock_')) {
    return {
      url: `${returnUrl}?portal_simulated=true`,
    }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return {
    url: session.url,
  }
}
