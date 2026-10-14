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

export const CASHFREE_PLAN_PRICING: Record<
  PlanTier,
  { name: string; amount: number; amountINR: number; currency: 'INR'; planId: string; description: string; interval: 'month' | 'year' }
> = {
  STARTER: {
    name: 'Basic Plan',
    amount: 0,
    amountINR: 0,
    currency: 'INR',
    planId: process.env.CASHFREE_PLAN_STARTER || 'plan_starter_tier',
    description: 'Core POS & KDS, Table Floor Management, Digital Menu & QR Studio, Staff Accounts, End-of-Day Reports',
    interval: 'month',
  },
  PRO: {
    name: 'Professional Plan',
    amount: Number(process.env.CASHFREE_AMOUNT_PRO || 3999),
    amountINR: Number(process.env.CASHFREE_AMOUNT_PRO || 3999),
    currency: 'INR',
    planId: process.env.CASHFREE_PLAN_PRO || 'plan_pro_tier',
    description: 'Advanced AI Intelligence, Guest CRM & Loyalty Engine',
    interval: 'month',
  },
  ENTERPRISE: {
    name: 'Enterprise Plan',
    amount: Number(process.env.CASHFREE_AMOUNT_ENTERPRISE || 9999),
    amountINR: Number(process.env.CASHFREE_AMOUNT_ENTERPRISE || 9999),
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
 * Supports Cashfree Subscriptions v2 e-mandate and Cashfree PG Links.
 */
export async function createSubscriptionCheckoutSession({
  restaurantId,
  restaurantName,
  userEmail,
  userPhone,
  planTier,
  returnUrl,
}: {
  restaurantId: string
  restaurantName: string
  userEmail: string
  userPhone?: string
  planTier: PlanTier
  returnUrl: string
}): Promise<{ url: string; id: string; subscriptionId: string }> {
  const planInfo = CASHFREE_PLAN_PRICING[planTier] || CASHFREE_PLAN_PRICING.STARTER

  if (process.env.NODE_ENV === 'production' && isTestOrMockKey) {
    throw new Error('Cashfree is not configured for production environment. Missing CASHFREE_SECRET_KEY or CASHFREE_APP_ID.')
  }

  if (isMockCashfree()) {
    const mockId = `cf_mock_${Math.random().toString(36).substring(2, 9)}`
    const mockSubId = `sub_mock_${Math.random().toString(36).substring(2, 9)}`
    return {
      url: `${returnUrl}?session_id=${mockId}&plan=${planTier}&success=true&gateway=cashfree`,
      id: mockId,
      subscriptionId: mockSubId,
    }
  }

  const { subApi, pgApi } = getBaseUrls()
  const sanitizedRestaurantId = restaurantId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
  const uniqueSubId = `sub${sanitizedRestaurantId}${Date.now().toString(36)}`

  // 1. Try Cashfree Subscriptions API (v2 recurring subscription)
  // Requires pre-created plans in Cashfree dashboard
  if (planInfo.planId && !planInfo.planId.includes('plan_starter_tier') && !planInfo.planId.includes('plan_pro_tier') && !planInfo.planId.includes('plan_enterprise_tier')) {
    try {
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
          returnUrl: `${returnUrl}?session_id=${uniqueSubId}&plan=${planTier}&success=true&gateway=cashfree`,
          notification: ['EMAIL'],
          authAmount: 1, // INR 1 mandate authorization
          notes: {
            restaurantId,
            planTier,
          },
        }),
      })

      const subData = await subResponse.json()
      console.info('[Cashfree Subscriptions API]', subResponse.status, JSON.stringify(subData))

      if (subResponse.ok && (subData.authLink || subData.subReferenceId)) {
        return {
          url: subData.authLink || `${subApi}/subscriptions/pay/${subData.subReferenceId}`,
          id: String(subData.subReferenceId || uniqueSubId),
          subscriptionId: uniqueSubId,
        }
      }
    } catch (subErr) {
      console.warn('[Cashfree Subscriptions API warning - falling back to PG link]', subErr)
    }
  }

  // 2. Fallback to Cashfree PG Payment Link (v2023-08-01)
  // This works without pre-created plans — simplest approach for sandbox testing
  try {
    // link_id: alphanumeric, max 50 chars, no spaces or special chars
    const linkId = `sub${sanitizedRestaurantId}${Date.now().toString(36)}`
    // Direct INR amount configured for the plan
    const amountInINR = planInfo.amountINR

    const linkPayload = {
      link_id: linkId,
      link_amount: amountInINR,
      link_currency: 'INR',
      link_purpose: `Prominentz ${planInfo.name}`,
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
        subscriptionId: uniqueSubId,
      },
      link_meta: {
        notify_url: `${returnUrl.split('/dashboard')[0]}/api/webhooks/cashfree`,
        return_url: `${returnUrl}?session_id=${linkId}&plan=${planTier}&success=true&gateway=cashfree`,
      },
    }

    console.info('[Cashfree PG Link] Creating payment link:', JSON.stringify({ linkId, amountInINR, planTier }))

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

    const linkData = await linkResponse.json()
    console.info('[Cashfree PG Link] Response:', linkResponse.status, JSON.stringify(linkData))

    if (linkResponse.ok && linkData.link_url) {
      return {
        url: linkData.link_url,
        id: linkData.link_id,
        subscriptionId: uniqueSubId,
      }
    }

    // Surface Cashfree's exact error message
    const errorMsg = linkData.message || linkData.error || JSON.stringify(linkData)
    throw new Error(`Cashfree rejected the payment link request: ${errorMsg}`)
  } catch (error: any) {
    console.error('[Cashfree Checkout Error]', error)
    throw new Error(error.message || 'Failed to initiate Cashfree checkout session')
  }
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

  // Cashfree subscription details link or portal redirect
  return {
    url: `${returnUrl}?cashfree_sub=${encodeURIComponent(subscriptionId)}`,
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
