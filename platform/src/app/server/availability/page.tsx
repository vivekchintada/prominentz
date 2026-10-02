import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import AvailabilityClient from '@/components/server/AvailabilityClient'

export const metadata: Metadata = {
  title: 'Weekly Availability | Resto Staff',
  description: 'Submit recurring weekly work availability and shift preferences',
}

export default async function AvailabilityPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const allowed = ['SERVER', 'MANAGER', 'OWNER', 'HOST', 'KITCHEN']
  if (!allowed.includes(session.user.role)) redirect('/dashboard')

  const user = {
    id: session.user.id,
    name: session.user.name ?? '',
    role: session.user.role,
    email: session.user.email ?? '',
  }

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return <AvailabilityClient currentUser={user} onSignOut={handleSignOut} />
}
