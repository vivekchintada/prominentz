import { auth, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import KdsMonitor from '@/components/kds/KdsMonitor'

export default async function KdsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login?portal=kitchen')
  }

  const user = session.user

  // Ensure authorized roles can access KDS
  if (!['OWNER', 'MANAGER', 'KITCHEN', 'SERVER', 'HOST'].includes(user.role)) {
    redirect('/dashboard')
  }

  // Resolve employee's locationId (needed for SSE location filtering)
  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, isActive: true },
  })

  let locationId: string = employee?.locationId || ''

  if (!locationId) {
    const restaurantId: string | undefined = user.restaurantId
    if (restaurantId) {
      const fallbackLocation = await prisma.location.findFirst({
        where: { restaurantId },
        select: { id: true },
      })
      locationId = fallbackLocation?.id || ''
    }
  }

  const currentUser = {
    id:    user.id!,
    name:  user.name!,
    role:  user.role,
    email: user.email!,
  }

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <KdsMonitor
      currentUser={currentUser}
      locationId={locationId}
      onSignOut={handleSignOut}
    />
  )
}
