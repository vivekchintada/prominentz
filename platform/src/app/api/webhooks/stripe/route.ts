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

function resolvePlanFromSubscription(sub: Stripe.Subscription): 'STARTER' | 'PRO' | 'ENTERPRISE' | null {
  const metaPlan = (sub.metadata?.planTier || sub.metadata?.plan as string | undefined)?.toUpperCase()
  if (metaPlan === 'PRO') return 'PRO'
  if (metaPlan === 'ENTERPRISE') return 'ENTERPRISE'
  if (metaPlan === 'STARTER') return 'STARTER'
  const priceId = sub.items?.data?.[0]?.price?.id
  if (priceId && PRICE_PLAN_MAP[priceId]) return PRICE_PLAN_MAP[priceId]
  return null
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
    } catch (err: any) {
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
    } catch (err: any) {
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
        const rawPlan = (sessionObj.metadata?.planTier || (sessionObj.metadata?.plan as string | undefined))?.toUpperCase()
        const planTier = ['STARTER', 'PRO', 'ENTERPRISE'].includes(rawPlan || '') ? rawPlan : null
        if (!planTier) {
          console.error('[Stripe Webhook] checkout.session.completed: missing or invalid planTier in metadata')
          return NextResponse.json({ error: 'Missing or invalid planTier in checkout metadata' }, { status: 400 })
        }
        const customerId = sessionObj.customer as string | undefined
        const subId = sessionObj.subscription as string | undefined

        if (restaurantId) {
          const current = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { settings: true } })
          const currentSettings = (current?.settings as Record<string, any>) || {}
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
              planTier: planTier as any,
              stripeCustomerId: customerId || undefined,
              stripeSubscriptionId: subId || undefined,
              settings: {
                ...currentSettings,
                lastBillingGateway: 'STRIPE',
                stripeSubscriptionStatus: 'ACTIVE',
              },
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
        if (!newPlan) {
          console.error(`[Stripe Webhook] Unrecognized plan or price ID in subscription ${sub.id}`)
          return NextResponse.json({ error: 'Unrecognized subscription plan or price ID' }, { status: 400 })
        }
        const current = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { settings: true } })
        const currentSettings = (current?.settings as Record<string, any>) || {}
        const status = sub.status === 'active' || sub.status === 'trialing' ? 'ACTIVE' : sub.status === 'past_due' ? 'PAST_DUE' : 'CANCELLED'
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            planTier: newPlan,
            stripeSubscriptionId: sub.id,
            settings: { ...currentSettings, lastBillingGateway: 'STRIPE', stripeSubscriptionStatus: status },
          },
        })
        console.info(`[Stripe Webhook] subscription.updated => ${restaurantId} plan=${newPlan} status=${status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const restaurantId = sub.metadata?.restaurantId
        if (!restaurantId) {
          console.warn('[Stripe Webhook] subscription.deleted: no restaurantId')
          break
        }
        const current = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { settings: true } })
        const currentSettings = (current?.settings as Record<string, any>) || {}
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            planTier: 'STARTER',
            stripeSubscriptionId: null,
            settings: { ...currentSettings, stripeSubscriptionStatus: 'CANCELLED' },
          },
        })
        console.info(`[Stripe Webhook] subscription.deleted => ${restaurantId} downgraded to STARTER`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (customerId) {
          const restaurant = await prisma.restaurant.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true, settings: true } })
          if (restaurant) {
            const currentSettings = (restaurant.settings as Record<string, any>) || {}
            await prisma.restaurant.update({
              where: { id: restaurant.id },
              data: { settings: { ...currentSettings, stripeSubscriptionStatus: 'PAST_DUE' } },
            })
          }
        }
        console.warn(`[Stripe Webhook] invoice.payment_failed => stripeCustomerId=${customerId ?? 'unknown'}, attempt=${invoice.attempt_count}`)
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
