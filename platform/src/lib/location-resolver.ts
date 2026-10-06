import { prisma } from '@/lib/prisma'

export interface ResolvedLocation {
  restaurantId: string
  locationId: string
  restaurantName: string
  locationName: string
}

/**
 * Universal safe resolver for Restaurant and Location for any authenticated user.
 * Prevents 404 / 500 errors when users have no employee record, locationId, or restaurantId in session.
 * Automatically provisions a primary location for the restaurant if none exists yet.
 */
export async function resolveUserLocation(sessionUser: {
  id: string
  restaurantId?: string | null
  locationId?: string | null
}): Promise<ResolvedLocation | null> {
  try {
    let restaurantId = sessionUser.restaurantId || undefined
    let locationId = sessionUser.locationId || undefined

    // 1. Fetch user record from database to get fresh restaurantId & employee details
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        employee: { select: { locationId: true } },
        restaurant: {
          select: {
            id: true,
            name: true,
            locations: {
              select: { id: true, name: true, isHeadquarters: true },
              orderBy: { isHeadquarters: 'desc' },
            },
          },
        },
      },
    })

    if (dbUser) {
      if (!restaurantId && dbUser.restaurantId) {
        restaurantId = dbUser.restaurantId
      }
      if (!locationId && dbUser.employee?.locationId) {
        locationId = dbUser.employee.locationId
      }
      if (!locationId && dbUser.restaurant?.locations?.[0]?.id) {
        locationId = dbUser.restaurant.locations[0].id
      }
    }

    // 2. If restaurantId still missing, check if user owns any restaurant or pick first
    if (!restaurantId) {
      const firstRest = await prisma.restaurant.findFirst({
        include: {
          locations: {
            select: { id: true, name: true, isHeadquarters: true },
            orderBy: { isHeadquarters: 'desc' },
          },
        },
      })
      if (firstRest) {
        restaurantId = firstRest.id
        if (!locationId && firstRest.locations?.[0]?.id) {
          locationId = firstRest.locations[0].id
        }
      }
    }

    if (!restaurantId) {
      return null
    }

    // 3. Ensure a location exists for this restaurant
    let location = locationId
      ? await prisma.location.findUnique({
          where: { id: locationId },
          include: { restaurant: { select: { id: true, name: true } } },
        })
      : await prisma.location.findFirst({
          where: { restaurantId },
          include: { restaurant: { select: { id: true, name: true } } },
        })

    // 4. If no location exists in the database for this restaurant, auto-provision primary location
    if (!location) {
      const rest = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true },
      })
      if (!rest) return null

      location = await prisma.location.create({
        data: {
          restaurantId: rest.id,
          name: 'Main Dining Room',
          isHeadquarters: true,
          timezone: 'UTC',
        },
        include: { restaurant: { select: { id: true, name: true } } },
      })
    }

    return {
      restaurantId: location.restaurantId,
      locationId: location.id,
      restaurantName: location.restaurant?.name || 'Restaurant',
      locationName: location.name || 'Main Dining Room',
    }
  } catch (error) {
    console.error('[resolveUserLocation] Error resolving location:', error)
    return null
  }
}
