import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCashfreeWebhookSignature, isMockCashfree, CASHFREE_PLAN_PRICING } from '@/lib/cashfree'
import { PlanTier } from '@/lib/plans'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function resolvePlanFromPlanId(planId?: string): PlanTier {
  if (!planId) return 'STARTER'
  const normalized = planId.toLowerCase()
  if (normalized.includes('enterprise')) return 'ENTERPRISE'
  if (normalized.includes('pro')) return 'PRO'
  return 'STARTER'
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

  // 1. Strict signature verification
  const isValidSignature = verifyCashfreeWebhookSignature({
    rawBody,
    signature,
    timestamp,
  })

  if (!isValidSignature) {
    console.error('[Cashfree Webhook] Rejecting unsigned or invalid webhook payload')
    return NextResponse.json({ error: 'Invalid or missing webhook signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err: any) {
    console.error('[Cashfree Webhook] JSON parse error:', err.message)
    return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 })
  }

  const eventType = (event.type || event.event || event.event_type || '').toUpperCase()
  console.info(`[Cashfree Webhook] Verified event: ${eventType}`)

  // 2. Persisted Replay Protection
  const eventUniqueId =
    event.event_id ||
    event.data?.link_id ||
    event.data?.payment?.cf_payment_id ||
    event.data?.order?.cf_order_id ||
    event.data?.subscription?.subscription_id ||
    `cf_evt_${Date.now()}`

  try {
    const existingLog = await prisma.auditLog.findFirst({
      where: {
        action: 'BILLING_PAYMENT_SUCCESS',
        targetId: String(eventUniqueId),
      },
    })

    if (existingLog) {
      console.info(`[Cashfree Webhook] Replay detected for event ${eventUniqueId}. Skipping.`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // 3. Process event lifecycle
    const data = event.data || {}

    // A. Cancellation / Revocation / Failure
    const subStatus = (data.subscription?.status || data.status || '').toUpperCase()
    const linkStatus = (data.link_status || '').toUpperCase()

    if (
      eventType.includes('CANCEL') ||
      eventType.includes('REVOKED') ||
      eventType.includes('EXPIRED') ||
      eventType.includes('TERMINATED') ||
      subStatus === 'CANCELLED' ||
      subStatus === 'TERMINATED' ||
      subStatus === 'ON_HOLD' ||
      linkStatus === 'CANCELLED' ||
      linkStatus === 'EXPIRED'
    ) {
      const sub = data.subscription || event.subscription || {}
      const notes = sub.notes || data.link_notes || data.notes || {}
      const restaurantId = notes.restaurantId || notes.restaurant_id || data.customer_details?.customer_id

      if (restaurantId) {
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            planTier: 'STARTER',
            settings: {
              cashfreeSubscriptionStatus: 'CANCELLED',
              updatedAt: new Date().toISOString(),
            },
          },
        })
        console.info(`[Cashfree Webhook] Subscription cancelled for ${restaurantId}. Reverted to STARTER.`)
      }

      return NextResponse.json({ received: true, status: 'CANCELLED' })
    }

    // B. Payment Link Paid Event (PAYMENT_LINK_EVENT)
    if (eventType === 'PAYMENT_LINK_EVENT' || linkStatus === 'PAID') {
      if (linkStatus !== 'PAID') {
        // Link created, viewed, or expired - no activation
        return NextResponse.json({ received: true, status: linkStatus || 'IGNORED' })
      }

      const notes = data.link_notes || data.notes || {}
      const restaurantId = notes.restaurantId || notes.restaurant_id
      const rawPlanTier = (notes.planTier || notes.plan_tier || 'STARTER').toUpperCase()
      const planTier: PlanTier = ['STARTER', 'PRO', 'ENTERPRISE'].includes(rawPlanTier)
        ? (rawPlanTier as PlanTier)
        : 'STARTER'

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
              settings: {
                ...currentSettings,
                cashfreeSubscriptionStatus: 'ACTIVE',
                cashfreeLinkId: data.link_id,
                lastBillingGateway: 'CASHFREE',
                lastBilledAt: new Date().toISOString(),
              },
            },
          })

          await logAuditEvent({
            restaurantId,
            actorId: 'cashfree_webhook',
            actorName: 'Cashfree Payment Link',
            action: 'BILLING_PAYMENT_SUCCESS',
            targetType: 'Restaurant',
            targetId: String(eventUniqueId),
            after: {
              linkId: data.link_id,
              amountPaid: data.link_amount_paid,
              planTier,
            },
          })
          console.info(`[Cashfree Webhook] Payment link ${data.link_id} paid. Activated ${planTier} for ${restaurantId}.`)
        }
      }

      return NextResponse.json({ received: true, status: 'ACTIVATED' })
    }

    // C. Subscription Activated / Recurring Payment Success
    const isActivation =
      eventType.includes('SUBSCRIPTION_ACTIVATED') ||
      eventType.includes('SUBSCRIPTION_PAYMENT_SUCCESS') ||
      eventType.includes('PAYMENT_SUCCESS_WEBHOOK') ||
      eventType.includes('ORDER_PAID') ||
      (eventType.includes('SUBSCRIPTION_STATUS_CHANGE') && subStatus === 'ACTIVE')

    if (isActivation) {
      const sub = data.subscription || event.subscription || data.order || {}
      const notes = sub.notes || data.link_notes || data.notes || {}
      const restaurantId =
        notes.restaurantId ||
        notes.restaurant_id ||
        sub.customer_details?.customer_id ||
        data.customer_details?.customer_id

      const rawPlanTier = (notes.planTier || notes.plan_tier || resolvePlanFromPlanId(sub.plan_id || sub.planId))?.toUpperCase()
      const planTier: PlanTier = ['STARTER', 'PRO', 'ENTERPRISE'].includes(rawPlanTier)
        ? (rawPlanTier as PlanTier)
        : 'STARTER'

      const subscriptionId = sub.subscription_id || sub.subscriptionId || data.subscription_id || sub.cf_order_id || null

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
                cashfreeSubscriptionStatus: 'ACTIVE',
                lastBillingGateway: 'CASHFREE',
                lastBilledAt: new Date().toISOString(),
              },
            },
          })

          await logAuditEvent({
            restaurantId,
            actorId: 'cashfree_webhook',
            actorName: 'Cashfree Gateway',
            action: 'BILLING_PAYMENT_SUCCESS',
            targetType: 'Restaurant',
            targetId: String(eventUniqueId),
            after: {
              subscriptionId,
              planTier,
              eventType,
            },
          })
          console.info(`[Cashfree Webhook] Activated ${planTier} subscription for ${restaurantId}.`)
        }
      }

      return NextResponse.json({ received: true, status: 'ACTIVATED' })
    }

    return NextResponse.json({ received: true, status: 'UNHANDLED_EVENT' })
  } catch (error: any) {
    console.error('[Cashfree Webhook Handler Error]', error)
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 })
  }
}
