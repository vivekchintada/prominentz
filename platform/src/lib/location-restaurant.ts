import { prisma } from '@/lib/prisma'

/** The restaurant that owns a location, or null if the location doesn't exist. */
export async function restaurantIdForLocation(locationId: string): Promise<string | null> {
  try {
    const location = await prisma.location.findUnique({ where: { id: locationId }, select: { restaurantId: true } })
    return location?.restaurantId ?? null
  } catch {
    return null
  }
}
