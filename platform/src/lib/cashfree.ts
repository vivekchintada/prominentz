import crypto from 'crypto'
import { PlanTier } from './plans'

const rawCashfreeAppId = process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID || ''
const rawCashfreeSecret = process.env.CASHFREE_SECRET_KEY || ''
const rawCashfreeWebhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || rawCashfreeSecret
const cashfreeEnvironment = (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase()

const isTestOrMockKey =
  !rawCashfreeAppId ||
  !rawCashfreeSecret ||
  rawCashfreeSecret.includes('mock') ||
  rawCashfreeSecret.includes('REPLACE_ME') ||
  rawCashfreeSecret.startsWith('cf_test_mock')

export function isMockCashfree(): boolean {
  if (process.env.NODE_ENV === 'production' && !isTestOrMockKey) {
    return false
  }
  return isTestOrMockKey
}

import { PRICING } from './pricing'

export type CashfreeBillingMode = 'RECURRING_SUBSCRIPTION' | 'ONE_TIME_PAYMENT_LINK'
export const cashfreeBillingMode: CashfreeBillingMode =
  (process.env.CASHFREE_BILLING_MODE as CashfreeBillingMode) || 'RECURRING_SUBSCRIPTION'

export const CASHFREE_PLAN_PRICING: Record<
  PlanTier,
  { name: string; amount: number; amountINR: number; currency: 'INR'; planId: string; description: string; interval: 'month' | 'year' }
> = {
  STARTER: {
    name: PRICING.STARTER.label,
    amount: PRICING.STARTER.monthly,
    amountINR: PRICING.STARTER.monthlyINR,
    currency: 'INR',
    planId: process.env.CASHFREE_PLAN_STARTER || 'plan_starter_tier',
    description: 'Core POS & KDS, Table Floor Management, Digital Menu & QR Studio, Staff Accounts, End-of-Day Reports',
    interval: 'month',
  },
  PRO: {
    name: PRICING.PRO.label,
    amount: PRICING.PRO.monthly,
    amountINR: PRICING.PRO.monthlyINR,
    currency: 'INR',
    planId: process.env.CASHFREE_PLAN_PRO || 'plan_pro_tier',
    description: 'Advanced AI Intelligence, Guest CRM & Loyalty Engine',
    interval: 'month',
  },
  ENTERPRISE: {
    name: PRICING.ENTERPRISE.label,
    amount: PRICING.ENTERPRISE.monthly,
    amountINR: PRICING.ENTERPRISE.monthlyINR,
    currency: 'INR',
    planId: process.env.CASHFREE_PLAN_ENTERPRISE || 'plan_enterprise_tier',
    description: 'Multi-Location Outlets, Dedicated Infrastructure and Custom SLA',
    interval: 'month',
  },
}

function getBaseUrls() {
  const isProd = cashfreeEnvironment === 'PRODUCTION'
  return {
    subApi: isProd ? 'https://api.cashfree.com/api/v2' : 'https://sandbox.cashfree.com/api/v2',
    pgApi: isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg',
  }
}

/**
 * Creates a Cashfree checkout session for SaaS Plan Subscriptions.
 * Supports explicit modes: RECURRING_SUBSCRIPTION or ONE_TIME_PAYMENT_LINK.
 * NO silent substitutions between recurring and one-time billing.
 */
export async function createSubscriptionCheckoutSession({
  restaurantId,
  restaurantName,
  userEmail,
  userPhone,
  planTier,
  returnUrl,
  mode,
}: {
  restaurantId: string
  restaurantName: string
  userEmail: string
  userPhone?: string
  planTier: PlanTier
  returnUrl: string
  mode?: CashfreeBillingMode
}): Promise<{ url: string; id: string; subscriptionId: string; billingMode: CashfreeBillingMode }> {
  const effectiveMode = mode || cashfreeBillingMode
  const planInfo = CASHFREE_PLAN_PRICING[planTier] || CASHFREE_PLAN_PRICING.STARTER

  if (process.env.NODE_ENV === 'production' && isTestOrMockKey) {
    throw new Error('Cashfree is not configured for production environment. Missing CASHFREE_SECRET_KEY or CASHFREE_APP_ID.')
  }

  if (isMockCashfree()) {
    const mockId = `cf_mock_${Math.random().toString(36).substring(2, 9)}`
    const mockSubId = `sub_mock_${Math.random().toString(36).substring(2, 9)}`
    return {
      url: `${returnUrl}?session_id=${mockId}&plan=${planTier}&success=true&gateway=cashfree&mode=${effectiveMode}`,
      id: mockId,
      subscriptionId: mockSubId,
      billingMode: effectiveMode,
    }
  }

  const { subApi, pgApi } = getBaseUrls()
  const sanitizedRestaurantId = restaurantId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
  const uniqueSubId = `sub${sanitizedRestaurantId}${Date.now().toString(36)}`

  // ── Mode 1: RECURRING_SUBSCRIPTION (Cashfree Subscriptions API v2) ────────────
  if (effectiveMode === 'RECURRING_SUBSCRIPTION') {
    if (!planInfo.planId || planInfo.planId.startsWith('plan_starter_tier') || planInfo.planId.startsWith('plan_pro_tier') || planInfo.planId.startsWith('plan_enterprise_tier')) {
      // In sandbox/production, recurring mandates require real plan IDs from the Cashfree dashboard
      console.warn(`[Cashfree Subscriptions] Plan ID is using placeholder (${planInfo.planId}). Attempting creation with configured planId.`)
    }

    const subResponse = await fetch(`${subApi}/subscriptions`, {
      method: 'POST',
      headers: {
        'x-client-id': rawCashfreeAppId,
        'x-client-secret': rawCashfreeSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: uniqueSubId,
        planId: planInfo.planId,
        customerName: restaurantName || 'Restaurant Owner',
        customerEmail: userEmail,
        customerPhone: userPhone || '9999999999',
        returnUrl: `${returnUrl}?session_id=${uniqueSubId}&plan=${planTier}&success=true&gateway=cashfree&mode=RECURRING_SUBSCRIPTION`,
        notification: ['EMAIL'],
        authAmount: 1, // Standard INR 1 e-mandate authentication
        notes: {
          restaurantId,
          planTier,
          billingMode: 'RECURRING_SUBSCRIPTION',
        },
      }),
    })

    const subData = await subResponse.json().catch(() => ({}))
    console.info('[Cashfree Subscriptions API]', subResponse.status, JSON.stringify(subData))

    if (subResponse.ok && (subData.authLink || subData.subReferenceId)) {
      return {
        url: subData.authLink || `${subApi}/subscriptions/pay/${subData.subReferenceId}`,
        id: String(subData.subReferenceId || uniqueSubId),
        subscriptionId: uniqueSubId,
        billingMode: 'RECURRING_SUBSCRIPTION',
      }
    }

    // Explicit error — DO NOT silently substitute one-time payment link
    const errorMsg = subData.message || subData.error || `HTTP ${subResponse.status}`
    throw new Error(
      `Recurring subscription creation failed: ${errorMsg}. ` +
      `Ensure plan "${planInfo.planId}" is active in your Cashfree dashboard, or set CASHFREE_BILLING_MODE="ONE_TIME_PAYMENT_LINK" if one-time billing access is intended.`
    )
  }

  // ── Mode 2: ONE_TIME_PAYMENT_LINK (Cashfree PG Payment Link v2023-08-01) ─────
  const linkId = `sub${sanitizedRestaurantId}${Date.now().toString(36)}`
  const amountInINR = planInfo.amountINR

  const linkPayload = {
    link_id: linkId,
    link_amount: amountInINR,
    link_currency: 'INR',
    link_purpose: `Prominentz ${planInfo.name} Access`,
    customer_details: {
      customer_id: sanitizedRestaurantId || 'cust001',
      customer_name: (restaurantName || 'Restaurant Owner').slice(0, 50),
      customer_email: userEmail,
      customer_phone: userPhone || '9999999999',
    },
    link_notify: {
      send_sms: false,
      send_email: true,
    },
    link_auto_reminders: false,
    link_notes: {
      restaurantId,
      planTier,
      billingMode: 'ONE_TIME_PAYMENT_LINK',
      subscriptionId: uniqueSubId,
    },
    link_meta: {
      notify_url: `${returnUrl.split('/dashboard')[0]}/api/webhooks/cashfree`,
      return_url: `${returnUrl}?session_id=${linkId}&plan=${planTier}&success=true&gateway=cashfree&mode=ONE_TIME_PAYMENT_LINK`,
    },
  }

  console.info('[Cashfree PG Link] Creating one-time payment link:', JSON.stringify({ linkId, amountInINR, planTier }))

  const linkResponse = await fetch(`${pgApi}/links`, {
    method: 'POST',
    headers: {
      'x-client-id': rawCashfreeAppId,
      'x-client-secret': rawCashfreeSecret,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(linkPayload),
  })

  const linkData = await linkResponse.json().catch(() => ({}))
  console.info('[Cashfree PG Link] Response:', linkResponse.status, JSON.stringify(linkData))

  if (linkResponse.ok && linkData.link_url) {
    return {
      url: linkData.link_url,
      id: linkData.link_id,
      subscriptionId: uniqueSubId,
      billingMode: 'ONE_TIME_PAYMENT_LINK',
    }
  }

  const errorMsg = linkData.message || linkData.error || JSON.stringify(linkData)
  throw new Error(`Cashfree payment link creation failed: ${errorMsg}`)
}

/**
 * Cancels an active Cashfree recurring subscription via Subscriptions v2 API.
 */
export async function cancelCashfreeSubscription(subscriptionId: string): Promise<{ success: boolean; message?: string }> {
  if (isMockCashfree() || subscriptionId.startsWith('sub_mock_')) {
    return { success: true }
  }

  const { subApi } = getBaseUrls()
  const res = await fetch(`${subApi}/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'x-client-id': rawCashfreeAppId,
      'x-client-secret': rawCashfreeSecret,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`Failed to cancel Cashfree subscription (${res.status}): ${errorText}`)
  }

  return { success: true }
}

/**
 * Creates or retrieves a customer billing portal session in Cashfree.
 */
export async function createBillingPortalSession({
  customerId,
  subscriptionId,
  returnUrl,
}: {
  customerId?: string
  subscriptionId?: string
  returnUrl: string
}) {
  if (isMockCashfree() || !subscriptionId || subscriptionId.startsWith('sub_mock_')) {
    return {
      url: `${returnUrl}?portal_simulated=true&gateway=cashfree`,
    }
  }

  // Cashfree in-app billing manager with direct subscription management
  return {
    url: `${returnUrl}?cashfree_sub=${encodeURIComponent(subscriptionId)}&manage=true`,
  }
}

/**
 * Verify a Cashfree subscription status.
 */
export async function verifyCashfreeSubscription(subscriptionId: string): Promise<{
  status: string
  isActive: boolean
  planId?: string
}> {
  if (isMockCashfree() || subscriptionId.startsWith('sub_mock_')) {
    return {
      status: 'ACTIVE',
      isActive: true,
    }
  }

  const { subApi } = getBaseUrls()
  const res = await fetch(`${subApi}/subscriptions/${subscriptionId}`, {
    headers: {
      'x-client-id': rawCashfreeAppId,
      'x-client-secret': rawCashfreeSecret,
    },
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Cashfree subscription check failed: ${errorText}`)
  }

  const data = await res.json()
  const status = data.subscription_status || data.status || 'UNKNOWN'
  const isActive = ['ACTIVE', 'INITIALIZED', 'COMPLETED'].includes(status.toUpperCase())

  return {
    status,
    isActive,
    planId: data.plan_id || data.planId,
  }
}

/**
 * Verifies webhook payload signature from Cashfree.
 * Rejects missing credentials, missing signatures, invalid signatures, and all mock-signature values strictly.
 */
export function verifyCashfreeWebhookSignature({
  rawBody,
  signature,
  timestamp,
}: {
  rawBody: string
  signature: string | null
  timestamp?: string | null
}): boolean {
  if (!signature || typeof signature !== 'string' || signature.trim() === '') {
    return false
  }

  // Reject all mock signature strings across all environments
  if (signature.includes('mock_') || signature === 'mock_valid_signature') {
    return false
  }

  const secret = rawCashfreeWebhookSecret || rawCashfreeSecret
  if (!secret || secret === 'cf_test_mock_secret_key') {
    return false
  }

  try {
    const payloadToSign = timestamp ? `${timestamp}${rawBody}` : rawBody

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payloadToSign)
    const expectedSignature = hmac.digest('base64')

    if (signature === expectedSignature) return true

    // Also check hex encoding as Cashfree supports both base64 and hex across versions
    const hexSignature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex')
    return signature.toLowerCase() === hexSignature.toLowerCase()
  } catch (err) {
    console.error('[Cashfree Webhook Signature Error]', err)
    return false
  }
}
