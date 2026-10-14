import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
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

  const data = event.data || {}
  const eventTime = event.event_time || event.created_at || data.payment?.payment_time || ''

  // 2. Stable, Provider-Specific Event Identity (No timestamp fallbacks)
  let eventUniqueId = ''
  if (event.event_id) {
    eventUniqueId = `cf_evt_${event.event_id}`
  } else if (data.payment?.cf_payment_id) {
    eventUniqueId = `cf_pay_${data.payment.cf_payment_id}_${eventType}`
  } else if (data.order?.cf_order_id) {
    eventUniqueId = `cf_ord_${data.order.cf_order_id}_${eventType}`
  } else if (data.link_id) {
    eventUniqueId = `cf_link_${data.link_id}_${data.link_status || eventType}_${data.payment_id || eventTime}`
  } else if (data.subscription?.subscription_id) {
    const cycle = data.subscription.current_cycle ?? ''
    const status = data.subscription.status ?? ''
    eventUniqueId = `cf_sub_${data.subscription.subscription_id}_${eventType}_${cycle}_${status}_${eventTime}`
  } else {
    // Deterministic cryptographic hash of rawBody guarantees exact duplicates yield the exact same event ID
    eventUniqueId = `cf_hash_${crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`
  }

  try {
    // Check if this provider event has already been processed using DB uniqueness constraint and audit log
    const existingEvent = await prisma.stripeEventLog.findUnique({
      where: { eventId: eventUniqueId },
    }).catch(() => null)

    const existingLog = await prisma.auditLog.findFirst({
      where: {
        action: 'BILLING_PAYMENT_SUCCESS',
        targetId: String(eventUniqueId),
      },
    }).catch(() => null)

    if (existingEvent || existingLog) {
      console.info(`[Cashfree Webhook] Replay detected for event ${eventUniqueId}. Skipping duplicate.`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // 3. Process event lifecycle
    const subStatus = (data.subscription?.status || data.status || '').toUpperCase()
    const linkStatus = (data.link_status || '').toUpperCase()

    // A. Payment Link Events (One-time checkouts / Quotes)
    // CRITICAL: An abandoned, expired, or cancelled payment link MUST NEVER downgrade an active subscription!
    if (eventType === 'PAYMENT_LINK_EVENT' || (Boolean(data.link_id) && !eventType.includes('SUBSCRIPTION_'))) {
      if (linkStatus !== 'PAID') {
        console.info(`[Cashfree Webhook] Payment link ${data.link_id} is in non-paid state (${linkStatus || 'PENDING'}). Preserving current restaurant subscription status.`)
        await prisma.stripeEventLog.create({
          data: {
            eventId: eventUniqueId,
            eventType,
            orderId: String(data.link_notes?.restaurantId || data.customer_details?.customer_id || data.link_id || 'link_event'),
          },
        }).catch(() => null)
        return NextResponse.json({ received: true, status: linkStatus || 'IGNORED' })
      }

      // Process PAID payment link
      const notes = data.link_notes || data.notes || {}
      const restaurantId = notes.restaurantId || notes.restaurant_id
      const rawPlanTier = (notes.planTier || notes.plan_tier || 'STARTER').toUpperCase()
      const planTier: PlanTier = ['STARTER', 'PRO', 'ENTERPRISE'].includes(rawPlanTier)
        ? (rawPlanTier as PlanTier)
        : 'STARTER'

      if (restaurantId) {
        await prisma.$transaction(async (tx) => {
          await tx.stripeEventLog.create({
            data: {
              eventId: eventUniqueId,
              eventType,
              orderId: restaurantId,
            },
          })

          const restaurant = await tx.restaurant.findUnique({
            where: { id: restaurantId },
          })

          if (restaurant) {
            const currentSettings = (restaurant.settings as Record<string, any>) || {}
            const lastEventTime = currentSettings.lastCashfreeEventTime ? new Date(currentSettings.lastCashfreeEventTime).getTime() : 0
            const incomingEventTime = eventTime ? new Date(eventTime).getTime() : Date.now()

            // Reject stale transition in activation direction
            if (incomingEventTime < lastEventTime) {
              console.warn(`[Cashfree Webhook] Outdated payment link paid event (${eventUniqueId}) arrived after newer recorded state. Skipping.`)
              return
            }

            await tx.restaurant.update({
              where: { id: restaurantId },
              data: {
                planTier: planTier as any,
                settings: {
                  ...currentSettings,
                  cashfreeSubscriptionStatus: 'ACTIVE',
                  cashfreeLinkId: data.link_id,
                  lastBillingGateway: 'CASHFREE',
                  lastBilledAt: new Date().toISOString(),
                  lastCashfreeEventTime: eventTime || new Date().toISOString(),
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
        })
      }

      return NextResponse.json({ received: true, status: 'ACTIVATED' })
    }

    // B. Subscription Cancellation / Revocation / Termination
    const isSubscriptionCancellation =
      eventType.includes('SUBSCRIPTION_CANCEL') ||
      eventType.includes('SUBSCRIPTION_REVOKED') ||
      eventType.includes('SUBSCRIPTION_TERMINATED') ||
      eventType.includes('SUBSCRIPTION_ON_HOLD') ||
      (subStatus === 'CANCELLED' && Boolean(data.subscription?.subscription_id || event.subscription?.subscription_id)) ||
      (subStatus === 'TERMINATED' && Boolean(data.subscription?.subscription_id || event.subscription?.subscription_id))

    if (isSubscriptionCancellation) {
      const sub = data.subscription || event.subscription || {}
      const notes = sub.notes || data.link_notes || data.notes || {}
      const restaurantId = notes.restaurantId || notes.restaurant_id || data.customer_details?.customer_id
      const incomingSubId = sub.subscription_id || sub.subscriptionId || data.subscription_id || null

      if (restaurantId) {
        await prisma.$transaction(async (tx) => {
          // Record event atomically to prevent concurrent duplicate processing
          await tx.stripeEventLog.create({
            data: {
              eventId: eventUniqueId,
              eventType,
              orderId: restaurantId,
            },
          })

          const restaurant = await tx.restaurant.findUnique({
            where: { id: restaurantId },
          })

          if (restaurant) {
            const currentSettings = (restaurant.settings as Record<string, any>) || {}
            const recordedSubId = currentSettings.cashfreeSubscriptionId || restaurant.stripeSubscriptionId

            // Fix 1: Bind event to current recorded subscription.
            // If the restaurant has an active subscription recorded, verify the cancellation belongs to IT!
            if (recordedSubId && incomingSubId && recordedSubId !== incomingSubId) {
              console.warn(`[Cashfree Webhook] Cancellation event for subscription ${incomingSubId} does not match active recorded subscription ${recordedSubId}. Ignoring mismatch.`)
              return
            }

            // Fix 2: Stale transition ordering check in cancellation direction.
            const lastEventTime = currentSettings.lastCashfreeEventTime ? new Date(currentSettings.lastCashfreeEventTime).getTime() : 0
            const incomingEventTime = eventTime ? new Date(eventTime).getTime() : Date.now()
            if (incomingEventTime < lastEventTime) {
              console.warn(`[Cashfree Webhook] Stale cancellation event (${eventUniqueId}, eventTime: ${eventTime}) arrived after newer recorded active state (${currentSettings.lastCashfreeEventTime}). Rejecting stale downgrade.`)
              return
            }

            // If already on STARTER with CANCELLED status, no duplicate downgrade
            if (restaurant.planTier === 'STARTER' && currentSettings.cashfreeSubscriptionStatus === 'CANCELLED') {
              console.info(`[Cashfree Webhook] Restaurant ${restaurantId} already in CANCELLED/STARTER state.`)
              return
            }

            // Preserve ALL store, ordering, printer, tax, and unrelated settings
            await tx.restaurant.update({
              where: { id: restaurantId },
              data: {
                planTier: 'STARTER',
                settings: {
                  ...currentSettings,
                  cashfreeSubscriptionStatus: 'CANCELLED',
                  cashfreeCancelledAt: new Date().toISOString(),
                  lastCashfreeEventTime: eventTime || new Date().toISOString(),
                },
              },
            })
            console.info(`[Cashfree Webhook] Subscription ${incomingSubId || recordedSubId} cancelled for ${restaurantId}. Preserved existing settings, reverted plan to STARTER.`)
          }
        })
      }

      return NextResponse.json({ received: true, status: 'CANCELLED' })
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
        await prisma.$transaction(async (tx) => {
          await tx.stripeEventLog.create({
            data: {
              eventId: eventUniqueId,
              eventType,
              orderId: restaurantId,
            },
          })

          const restaurant = await tx.restaurant.findUnique({
            where: { id: restaurantId },
          })

          if (restaurant) {
            const currentSettings = (restaurant.settings as Record<string, any>) || {}

            // Stale transition ordering check in activation direction
            const lastEventTime = currentSettings.lastCashfreeEventTime ? new Date(currentSettings.lastCashfreeEventTime).getTime() : 0
            const incomingEventTime = eventTime ? new Date(eventTime).getTime() : Date.now()
            if (incomingEventTime < lastEventTime) {
              console.warn(`[Cashfree Webhook] Outdated subscription activation (${eventUniqueId}, eventTime: ${eventTime}) arrived after newer recorded state (${currentSettings.lastCashfreeEventTime}). Skipping stale upgrade.`)
              return
            }

            await tx.restaurant.update({
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
                  lastCashfreeEventTime: eventTime || new Date().toISOString(),
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
        })
      }

      return NextResponse.json({ received: true, status: 'ACTIVATED' })
    }

    return NextResponse.json({ received: true, status: 'UNHANDLED_EVENT' })
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.info(`[Cashfree Webhook] Concurrent duplicate detected for ${eventUniqueId}. Skipping.`)
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error('[Cashfree Webhook Handler Error]', error)
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 })
  }
}
