import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const PRICE_PLAN_MAP: Record<string, 'STARTER' | 'PRO' | 'ENTERPRISE'> = {
  [process.env.STRIPE_PRICE_STARTER ?? 'price_starter_tier']: 'STARTER',
  [process.env.STRIPE_PRICE_PRO ?? 'price_pro_tier']: 'PRO',
  [process.env.STRIPE_PRICE_ENTERPRISE ?? 'price_enterprise_tier']: 'ENTERPRISE',
}

function resolvePlanFromSubscription(sub: Stripe.Subscription): 'STARTER' | 'PRO' | 'ENTERPRISE' {
  const metaPlan = (sub.metadata?.planTier || sub.metadata?.plan as string | undefined)?.toUpperCase()
  if (metaPlan === 'PRO') return 'PRO'
  if (metaPlan === 'ENTERPRISE') return 'ENTERPRISE'
  if (metaPlan === 'STARTER') return 'STARTER'
  const priceId = sub.items?.data?.[0]?.price?.id
  if (priceId && PRICE_PLAN_MAP[priceId]) return PRICE_PLAN_MAP[priceId]
  return 'PRO'
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set, processing in test mode')
  }

  const rawBody = await req.arrayBuffer()
  const signature = req.headers.get('stripe-signature')

  let event: Stripe.Event
  if (process.env.NODE_ENV === 'production') {
    if (!webhookSecret || !signature) {
      console.error('[Stripe Webhook] Rejected webhook in production: missing secret or signature')
      return NextResponse.json({ error: 'Missing webhook signature configuration' }, { status: 400 })
    }
    try {
      event = stripe.webhooks.constructEvent(Buffer.from(rawBody), signature, webhookSecret)
    } catch (err: unknown) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }
  } else {
    try {
      if (webhookSecret && signature) {
        event = stripe.webhooks.constructEvent(Buffer.from(rawBody), signature, webhookSecret)
      } else {
        event = JSON.parse(Buffer.from(rawBody).toString('utf-8'))
      }
    } catch (err: unknown) {
      console.error('[Stripe Webhook] Dev parsing failed:', err.message)
      return NextResponse.json({ error: 'Webhook parsing failed' }, { status: 400 })
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[Stripe Webhook] Received ${event.type} (${event.id})`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionObj = event.data.object as Stripe.Checkout.Session
        const restaurantId = sessionObj.metadata?.restaurantId
        const planTier = (sessionObj.metadata?.planTier as any) || 'PRO'
        const customerId = sessionObj.customer as string | undefined
        const subId = sessionObj.subscription as string | undefined

        if (restaurantId) {
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
              planTier,
              stripeCustomerId: customerId || undefined,
              stripeSubscriptionId: subId || undefined,
            },
          })
          console.info(`[Stripe Webhook] checkout.session.completed => ${restaurantId} upgraded to ${planTier}`)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const orderId = intent.metadata?.orderId
        if (orderId) {
          await prisma.payment.updateMany({
            where: { stripePaymentIntentId: intent.id, status: 'PENDING' },
            data: { status: 'COMPLETED' },
          })
          console.info(`[Stripe Webhook] payment_intent.succeeded => orderId=${orderId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const restaurantId = sub.metadata?.restaurantId
        if (!restaurantId) {
          console.warn('[Stripe Webhook] subscription.updated: no restaurantId')
          break
        }
        const newPlan = resolvePlanFromSubscription(sub)
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            planTier: newPlan,
            stripeSubscriptionId: sub.id,
          },
        })
        console.info(`[Stripe Webhook] subscription.updated => ${restaurantId} plan=${newPlan}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const restaurantId = sub.metadata?.restaurantId
        if (!restaurantId) {
          console.warn('[Stripe Webhook] subscription.deleted: no restaurantId')
          break
        }
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { planTier: 'STARTER' },
        })
        console.info(`[Stripe Webhook] subscription.deleted => ${restaurantId} downgraded to STARTER`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : 'unknown'
        console.warn(`[Stripe Webhook] invoice.payment_failed => stripeCustomerId=${customerId}, attempt=${invoice.attempt_count}`)
        break
      }

      default:
        // Silently ignore unhandled events in production
        break
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
