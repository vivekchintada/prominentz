import { prisma } from '@/lib/prisma'

export type BillingGateway = 'STRIPE' | 'DODO'

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
  if (settings.lastBillingGateway === 'DODO' || settings.lastBillingGateway === 'STRIPE') {
    return settings.lastBillingGateway
  }
  if (settings.dodoSubscriptionId) return 'DODO'
  return 'STRIPE'
}

function isGatewayActive(gateway: BillingGateway, settings: Record<string, any>): boolean {
  if (gateway === 'DODO') return settings.dodoSubscriptionStatus === 'ACTIVE'
  return settings.stripeSubscriptionStatus === 'ACTIVE'
}

function isGatewayPastDue(gateway: BillingGateway, settings: Record<string, any>): boolean {
  if (gateway === 'STRIPE') return settings.stripeSubscriptionStatus === 'PAST_DUE'
  if (gateway === 'DODO') return settings.dodoSubscriptionStatus === 'BILLING_ISSUE'
  return false
}

export async function getRestaurantAccessStatus(restaurantId: string): Promise<RestaurantAccessStatus | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { createdAt: true, settings: true },
  })
  if (!restaurant) return null
  return accessStatusFrom(restaurant.createdAt, restaurant.settings)
}

/** The same rule as getRestaurantAccessStatus, for a restaurant row already in hand (HQ lists). */
export function accessStatusFrom(createdAt: Date, rawSettings: unknown): RestaurantAccessStatus {
  const settings = (rawSettings as Record<string, any>) || {}
  const gateway = resolveGateway(settings)
  const isActive = isGatewayActive(gateway, settings)
  const isPastDue = !isActive && isGatewayPastDue(gateway, settings)

  const trialEndsAt = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const daysLeftInTrial = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
  const isTrialing = !isActive && daysLeftInTrial > 0
  const isExpired = !isActive && daysLeftInTrial === 0

  return { gateway, isActive, isPastDue, trialEndsAt, daysLeftInTrial, isTrialing, isExpired }
}
