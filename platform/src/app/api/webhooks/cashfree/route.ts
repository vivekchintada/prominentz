import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCashfreeWebhookSignature, isMockCashfree, CASHFREE_PLAN_PRICING } from '@/lib/cashfree'
import { PlanTier } from '@/lib/plans'

export const dynamic = 'force-dynamic'

function resolvePlanFromPlanId(planId?: string): PlanTier {
  if (!planId) return 'PRO'
  const normalized = planId.toLowerCase()
  if (normalized.includes('enterprise')) return 'ENTERPRISE'
  if (normalized.includes('starter') || normalized.includes('basic')) return 'STARTER'
  return 'PRO'
}

export async function POST(req: NextRequest) {
  const rawBodyBuffer = await req.arrayBuffer()
  const rawBody = Buffer.from(rawBodyBuffer).toString('utf-8')

  const signature =
    req.headers.get('x-webhook-signature') ||
    req.headers.get('x-cf-signature') ||
    req.headers.get('signature')
  const timestamp =
    req.headers.get('x-webhook-timestamp') ||
    req.headers.get('x-cf-timestamp')

  const isValidSignature = verifyCashfreeWebhookSignature({
    rawBody,
    signature,
    timestamp,
  })

  if (process.env.NODE_ENV === 'production' && !isMockCashfree() && !isValidSignature) {
    console.error('[Cashfree Webhook] Invalid webhook signature detected')
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err: any) {
    console.error('[Cashfree Webhook] JSON parse error:', err.message)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const eventType = (event.type || event.event || event.event_type || '').toUpperCase()
  console.info(`[Cashfree Webhook] Received event: ${eventType || 'UNKNOWN'}`)

  try {
    // 1. Subscription activation / renewal / payment success
    if (
      eventType.includes('SUBSCRIPTION_ACTIVATED') ||
      eventType.includes('SUBSCRIPTION_STATUS_CHANGE') ||
      eventType.includes('PAYMENT_SUCCESS_WEBHOOK') ||
      eventType.includes('SUBSCRIPTION_PAYMENT_SUCCESS') ||
      eventType.includes('ORDER_PAID') ||
      event.data?.subscription?.status === 'ACTIVE' ||
      event.data?.order?.order_status === 'PAID'
    ) {
      const sub = event.data?.subscription || event.subscription || event.data?.order || {}
      const notes = sub.notes || event.data?.link_notes || event.data?.notes || event.notes || {}

      const restaurantId =
        notes.restaurantId ||
        notes.restaurant_id ||
        sub.customer_details?.customer_id ||
        event.data?.customer_details?.customer_id

      const rawPlanTier = (notes.planTier || notes.plan_tier || resolvePlanFromPlanId(sub.plan_id || sub.planId))?.toUpperCase()
      const planTier: PlanTier = ['STARTER', 'PRO', 'ENTERPRISE'].includes(rawPlanTier)
        ? (rawPlanTier as PlanTier)
        : 'PRO'

      const subscriptionId =
        sub.subscription_id ||
        sub.subscriptionId ||
        notes.subscriptionId ||
        event.data?.subscription_id ||
        sub.cf_order_id ||
        null

      if (restaurantId) {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId },
        })

        if (restaurant) {
          const currentSettings = (restaurant.settings as Record<string, any>) || {}
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
              planTier: planTier as any,
              stripeSubscriptionId: subscriptionId || restaurant.stripeSubscriptionId,
              settings: {
                ...currentSettings,
                cashfreeSubscriptionId: subscriptionId || currentSettings.cashfreeSubscriptionId,
                lastBillingGateway: 'CASHFREE',
                lastBilledAt: new Date().toISOString(),
              },
            },
          })
          console.info(`[Cashfree Webhook] Successfully upgraded ${restaurantId} to ${planTier}`)
        }
      }
    }

    // 2. Subscription cancelled / revoked / expired
    else if (
      eventType.includes('SUBSCRIPTION_CANCELLED') ||
      eventType.includes('SUBSCRIPTION_REVOKED') ||
      eventType.includes('SUBSCRIPTION_EXPIRED') ||
      event.data?.subscription?.status === 'CANCELLED'
    ) {
      const sub = event.data?.subscription || event.subscription || {}
      const notes = sub.notes || event.notes || {}
      const restaurantId = notes.restaurantId || notes.restaurant_id

      if (restaurantId) {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId },
        })

        if (restaurant) {
          const currentSettings = (restaurant.settings as Record<string, any>) || {}
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
              planTier: 'STARTER',
              settings: {
                ...currentSettings,
                cashfreeSubscriptionStatus: 'CANCELLED',
              },
            },
          })
          console.info(`[Cashfree Webhook] Subscription cancelled for ${restaurantId}, reverted to STARTER`)
        }
      }
    }

    return NextResponse.json({ status: 'ok', received: true })
  } catch (error: any) {
    console.error('[Cashfree Webhook Handler Error]', error)
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 })
  }
}
