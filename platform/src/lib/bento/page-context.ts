import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMoneySettings } from './request-cache'
import { startOfDayInTimeZone } from '@/lib/dashboard-metrics'
import { resolveLocationId } from './owner-overview'

export { DAY_MS } from './time'

/** Who is looking, at which outlet, in which time zone and currency. Shared by the bento pages. */
export interface BentoPageContext {
  userId: string
  role: string
  restaurantId: string
  locationId: string | null
  locationName: string | null
  timezone: string
  currency: string
  /** Local midnight today, as a UTC moment. */
  todayStart: Date
  /** "Owner" or "Manager". */
  roleName: string
}

/**
 * Loads the context for a back-office page. Only owners and managers reach these
 * pages (the dashboard layout sends servers and kitchen staff elsewhere).
 */
export async function getBentoPageContext(): Promise<BentoPageContext> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const user = session.user
  if (!['OWNER', 'MANAGER'].includes(user.role)) redirect('/dashboard')

  const [locationId, money] = await Promise.all([
    resolveLocationId(user.id!, user.restaurantId).catch(() => null),
    getMoneySettings(user.restaurantId),
  ])

  let timezone = 'UTC'
  let locationName: string | null = null
  if (locationId) {
    const loc = await prisma.location
      .findUnique({ where: { id: locationId }, select: { timezone: true, name: true } })
      .catch(() => null)
    timezone = loc?.timezone || 'UTC'
    locationName = loc?.name ?? null
  }

  return {
    userId: user.id!,
    role: user.role,
    restaurantId: user.restaurantId,
    locationId,
    locationName,
    timezone,
    currency: money.currency,
    todayStart: startOfDayInTimeZone(timezone),
    roleName: user.role === 'OWNER' ? 'Owner' : 'Manager',
  }
}

/** Runs a loader and falls back to its empty result if the database call fails. */
export async function safeLoad<T>(label: string, load: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await load()
  } catch (err) {
    console.error(`Failed to load ${label}`, err)
    return empty
  }
}
