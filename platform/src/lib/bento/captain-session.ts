import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { resolveLocationId } from './owner-overview'

export interface CaptainSession {
  userId: string
  locationId: string | null
  firstName: string
  /** Owners and managers get a way back to the dashboard. */
  homeHref: string | null
}

/** Who is using the Captain phone screens, and at which outlet. */
export async function getCaptainSession(): Promise<CaptainSession> {
  const session = await auth()
  if (!session?.user) redirect('/login?portal=server')
  const user = session.user
  if (user.role === 'KITCHEN') redirect('/kds')

  const locationId = await resolveLocationId(user.id!, user.restaurantId).catch(() => null)
  return {
    userId: user.id!,
    locationId,
    firstName: (user.name ?? '').split(' ')[0] || 'there',
    homeHref: user.role === 'OWNER' || user.role === 'MANAGER' ? '/dashboard' : null,
  }
}
