import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { BentoKds } from '@/components/bento/kds/BentoKds'

export const metadata = { title: 'Kitchen display' }

export default async function KdsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?portal=kitchen')

  const user = session.user
  if (!['OWNER', 'MANAGER', 'KITCHEN', 'SERVER', 'HOST'].includes(user.role)) redirect('/dashboard')

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  const homeHref = user.role === 'OWNER' || user.role === 'MANAGER' ? '/dashboard' : null
  return <BentoKds homeHref={homeHref} onSignOut={handleSignOut} />
}
