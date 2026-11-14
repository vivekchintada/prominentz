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
    description: 'Advanced AI Intelligence and Multi-Location (Coming Soon)',
  },
  ENTERPRISE: {
    name: 'Enterprise',
    amount: 299,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_tier',
    description: 'Multi-Location Outlets, Dedicated Infrastructure and Custom SLA',
  },
}

/**
 * Creates a PaymentIntent on the restaurant's own Stripe account (see lib/restaurant-stripe).
 * `client` null means simulated payments, which only development allows.
 */
export async function createPaymentIntent(
  client: Stripe | null,
  amountInCents: number,
  orderId: string,
  options?: {
    confirm?: boolean
    paymentMethod?: string
    idempotencySuffix?: string
    /** e.g. ['card_present'] for Stripe Terminal readers. */
    paymentMethodTypes?: string[]
    /** ISO currency of the restaurant (amount is already in its minor units). Defaults to USD. */
    currency?: string
  }
) {
  try {
    if (!client) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Card payments are not set up for this restaurant.')
      }
      return {
        id: `pi_mock_${Math.random().toString(36).substr(2, 9)}`,
        client_secret: `pi_mock_secret_${Math.random().toString(36).substr(2, 9)}`,
        status: 'succeeded',
      }
    }

    const shouldConfirm = options?.confirm ?? true

    // Server-side confirmation needs a real payment method from a guest or a reader. Test cards
    // like pm_card_visa only work with a test key, and Stripe rejects them on a live key anyway.
    if (shouldConfirm && !options?.paymentMethod && !options?.paymentMethodTypes) {
      throw new Error('A customer or card-reader payment method is required to confirm a card payment.')
    }

    const paymentMethod = options?.paymentMethod

    const createParams: Stripe.PaymentIntentCreateParams = options?.paymentMethodTypes
      ? {
          amount: amountInCents,
          currency: (options?.currency || 'usd').toLowerCase(),
          metadata: { orderId },
          payment_method_types: options.paymentMethodTypes,
          capture_method: 'automatic',
        }
      : {
          amount: amountInCents,
          currency: (options?.currency || 'usd').toLowerCase(),
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

    const intent = await client.paymentIntents.create(createParams, { idempotencyKey })

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
 * Refunds a PaymentIntent on the restaurant's own Stripe account.
 * Simulated (pi_mock_) payments refund instantly; a real one needs the restaurant's client.
 */
export async function refundPayment(client: Stripe | null, paymentIntentId: string, amountInCents?: number) {
  try {
    if (paymentIntentId.startsWith('pi_mock_')) {
      return {
        id: `re_mock_${Math.random().toString(36).substr(2, 9)}`,
        amount: amountInCents ?? 0,
      }
    }
    if (!client) {
      throw new Error('This restaurant has no Stripe key saved, so the card payment cannot be refunded here.')
    }

    const refund = await client.refunds.create({
      payment_intent: paymentIntentId,
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
    customer_email: userEmail || undefined,
    // Matches the 14-day free trial promised on the marketing site.
    subscription_data: {
      trial_period_days: 14,
      metadata: { restaurantId, planTier },
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    },
    // 'No credit card required' for the trial; Stripe asks for a card before it ends.
    payment_method_collection: 'if_required',
    allow_promotion_codes: true,
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
