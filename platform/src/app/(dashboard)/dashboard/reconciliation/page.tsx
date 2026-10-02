import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import ReconciliationClient from '@/components/dashboard/ReconciliationClient'

export const metadata = {
  title: 'Delivery Reconciliation — Resto AI',
  description: 'Reconcile marketplace payouts, match orders, manage exceptions, and export audit-ready reports.',
}

export default async function ReconciliationPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
  if (!location) redirect('/dashboard')

  const locationId = location.id

  const [periods, providers] = await Promise.all([
    prisma.reconciliationPeriod.findMany({
      where: { locationId },
      orderBy: { periodStart: 'desc' },
      take: 20,
      include: {
        statements: {
          include: {
            statement: {
              select: {
                id: true,
                provider: { select: { name: true, slug: true } },
                lineCount: true,
              },
            },
          },
        },
      },
    }),
    prisma.deliveryProvider.findMany({
      where: { locationId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return <ReconciliationClient initialPeriods={periods as any} providers={providers as any} locationId={locationId} />
}
