import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { getRestaurantMoneySettings } from '@/lib/settings-helpers'
import { getRestaurantAccessStatus } from '@/lib/subscription-status'
import type { PlanTier } from '@/lib/plans'

/**
 * Per-request memoised lookups shared by the dashboard layout, the shell and
 * every bento page. Without these, one page view asked the database for the
 * same restaurant row three or four times.
 */

export interface RestaurantBasics {
  id: string
  name: string
  planTier: PlanTier
  onboardingStep: number
  createdAt: Date
}

export const getRestaurantBasics = cache(async (restaurantId: string): Promise<RestaurantBasics | null> => {
  if (!restaurantId) return null
  try {
    const r = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, planTier: true, onboardingStep: true, createdAt: true },
    })
    if (!r) return null
    return { ...r, planTier: (r.planTier as PlanTier) || 'STARTER' }
  } catch (err) {
    console.error('Failed to load restaurant', err)
    return null
  }
})

export const getMoneySettings = cache((restaurantId: string) => getRestaurantMoneySettings(restaurantId))

export const getAccessStatus = cache(async (restaurantId: string) => {
  try {
    return await getRestaurantAccessStatus(restaurantId)
  } catch (err) {
    console.error('Failed to load subscription status', err)
    return null
  }
})
