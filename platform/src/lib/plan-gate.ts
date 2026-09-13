import { prisma } from '@/lib/prisma'
import { hasPlanAccess, PlanTier } from '@/lib/plans'

/**
 * Server-side helper to check if a restaurant has access to a specific PlanTier.
 * Returns true if the restaurant's tier meets or exceeds the required tier.
 */
export async function verifyRestaurantPlan(
  restaurantId: string,
  requiredTier: PlanTier
): Promise<{ allowed: boolean; currentTier: PlanTier }> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { planTier: true },
    })

    const currentTier = (restaurant?.planTier as PlanTier) ?? 'STARTER'
    const allowed = hasPlanAccess(currentTier, requiredTier)

    return { allowed, currentTier }
  } catch (err) {
    console.error('[PlanGate] Error checking plan access:', err)
    return { allowed: false, currentTier: 'STARTER' }
  }
}
