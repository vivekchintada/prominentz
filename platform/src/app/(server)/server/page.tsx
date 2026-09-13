import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ServerDashboard from '@/components/server/ServerDashboard'

export default async function ServerPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user

  // Resolve employee record & location
  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, isActive: true },
    include: { location: { select: { id: true, name: true } } },
  })

  let locationId = employee?.locationId
  if (!locationId) {
    const loc = await prisma.location.findFirst({
      where: { restaurantId: user.restaurantId },
      select: { id: true },
    })
    locationId = loc?.id
  }

  // Today range
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Fetch server's KPI — today's payments linked to their orders
  // For now use location-wide data; narrow to server when server field is added
  const [paymentsAgg, openOrdersCount] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { total: true },
      where: {
        order: { table: { locationId: locationId ?? '' } },
        status: 'COMPLETED',
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.order.count({
      where: {
        table: { locationId: locationId ?? '' },
        status: { notIn: ['PAID', 'VOIDED'] },
      },
    }),
  ])

  const kpi = {
    todayRevenue: Number(paymentsAgg._sum.total || 0),
    openChecks: openOrdersCount,
    locationName: employee?.location?.name ?? 'Main Location',
  }

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <ServerDashboard
      currentUser={{ id: user.id!, name: user.name!, role: user.role, email: user.email! }}
      locationId={locationId ?? ''}
      kpi={kpi}
      onSignOut={handleSignOut}
    />
  )
}
