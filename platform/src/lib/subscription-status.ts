import { prisma } from '@/lib/prisma'

export type BillingGateway = 'STRIPE' | 'CASHFREE' | 'REVENUECAT'

export interface RestaurantAccessStatus {
  gateway: BillingGateway
  /** True if the restaurant currently has a paid, active subscription with its gateway. */
  isActive: boolean
  /** True if the gateway reported a failed/past-due charge (still inside the soft-lock window). */
  isPastDue: boolean
  trialEndsAt: Date
  daysLeftInTrial: number
  isTrialing: boolean
  /** Trial is over and there is no active paid subscription — the soft lock applies. */
  isExpired: boolean
}

export const TRIAL_DAYS = 14

function resolveGateway(settings: Record<string, any>): BillingGateway {
  if (settings.lastBillingGateway === 'REVENUECAT' || settings.lastBillingGateway === 'CASHFREE' || settings.lastBillingGateway === 'STRIPE') {
    return settings.lastBillingGateway
  }
  if (settings.cashfreeSubscriptionId) return 'CASHFREE'
  if (settings.revenuecatProductId) return 'REVENUECAT'
  return 'STRIPE'
}

// RevenueCat's own statuses (see RcStatus in lib/revenuecat.ts): ACTIVE and TRIAL are paid/trialing
// through the store, and CANCELLING still has access until the current period ends.
const REVENUECAT_ACTIVE_STATUSES = new Set(['ACTIVE', 'TRIAL', 'CANCELLING'])

function isGatewayActive(gateway: BillingGateway, settings: Record<string, any>): boolean {
  if (gateway === 'REVENUECAT') return REVENUECAT_ACTIVE_STATUSES.has(settings.revenuecatStatus)
  if (gateway === 'CASHFREE') return settings.cashfreeSubscriptionStatus === 'ACTIVE'
  return settings.stripeSubscriptionStatus === 'ACTIVE'
}

function isGatewayPastDue(gateway: BillingGateway, settings: Record<string, any>): boolean {
  if (gateway === 'STRIPE') return settings.stripeSubscriptionStatus === 'PAST_DUE'
  if (gateway === 'CASHFREE') return settings.cashfreeSubscriptionStatus === 'PAST_DUE'
  if (gateway === 'REVENUECAT') return settings.revenuecatStatus === 'BILLING_ISSUE'
  return false
}

export async function getRestaurantAccessStatus(restaurantId: string): Promise<RestaurantAccessStatus | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { createdAt: true, settings: true },
  })
  if (!restaurant) return null

  const settings = (restaurant.settings as Record<string, any>) || {}
  const gateway = resolveGateway(settings)
  const isActive = isGatewayActive(gateway, settings)
  const isPastDue = !isActive && isGatewayPastDue(gateway, settings)

  const trialEndsAt = new Date(restaurant.createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const daysLeftInTrial = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
  const isTrialing = !isActive && daysLeftInTrial > 0
  const isExpired = !isActive && daysLeftInTrial === 0

  return { gateway, isActive, isPastDue, trialEndsAt, daysLeftInTrial, isTrialing, isExpired }
}
