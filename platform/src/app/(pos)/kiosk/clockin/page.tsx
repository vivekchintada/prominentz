import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClockInKioskClient from '@/components/kiosk/ClockInKioskClient'

export default async function ClockInKioskPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Resolve restaurant location name
  const location = await prisma.location.findFirst({
    where: { restaurantId: session.user.restaurantId },
    select: { name: true },
  })

  return (
    <ClockInKioskClient locationName={location?.name || 'Main Location'} />
  )
}
