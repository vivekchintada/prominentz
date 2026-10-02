/**
 * Geofencing and coordinate calculations for Resto SaaS
 */

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in meters
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c)
}

/**
 * Checks if a given coordinate is within the location's geofence radius.
 */
export function isWithinGeofence(
  userLat?: number | null,
  userLng?: number | null,
  locLat?: number | null,
  locLng?: number | null,
  radiusMeters: number = 150
): { inBounds: boolean; distanceMeters: number | null } {
  if (
    userLat == null ||
    userLng == null ||
    locLat == null ||
    locLng == null
  ) {
    // If location coordinates aren't configured or user didn't send GPS,
    // don't hard block (return inBounds true with null distance).
    return { inBounds: true, distanceMeters: null }
  }

  const distanceMeters = calculateHaversineDistanceMeters(userLat, userLng, locLat, locLng)
  return {
    inBounds: distanceMeters <= radiusMeters,
    distanceMeters,
  }
}
