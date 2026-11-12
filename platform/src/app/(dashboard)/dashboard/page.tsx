import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LiveRefresh from '@/components/bento/LiveRefresh'
import { WelcomeRouter } from '@/components/dashboard/WelcomeRouter'
import { OwnerOverviewView } from '@/components/bento/overview/OwnerOverviewView'
import { getOwnerOverview, resolveLocationId } from '@/lib/bento/owner-overview'
import { getMoneySettings, getRestaurantBasics } from '@/lib/bento/request-cache'
import { greeting } from '@/lib/bento/time'

export const metadata = {
  title: 'Overview',
  description: 'Sales, the floor, top dishes and who is on shift, at a glance.',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user
  if (user.role === 'KITCHEN') redirect('/kds')
  if (user.role === 'SERVER') redirect('/server')
  if (!user.restaurantId) redirect('/onboarding')

  const [restaurant, locationId, money] = await Promise.all([
    getRestaurantBasics(user.restaurantId),
    resolveLocationId(user.id!, user.restaurantId).catch(() => null),
    getMoneySettings(user.restaurantId),
  ])
  const planTier = restaurant?.planTier || 'ENTERPRISE'
  const onboardingStep = restaurant?.onboardingStep ?? 6
  const restaurantName = restaurant?.name || 'Your restaurant'

  const data = await getOwnerOverview(locationId).catch((err) => {
    console.error('Failed to load overview', err)
    return getOwnerOverview(null)
  })

  const hello = greeting(data.timezone)
  const headline =
    data.tables.total > 0
      ? `${hello}. ${data.tables.seated} of ${data.tables.total} tables are seated.`
      : `${hello}. Here is today so far.`
  const roleLabel = `${user.role === 'OWNER' ? 'Owner' : 'Manager'} · ${restaurantName}`

  return (
    <>
      <LiveRefresh events={['order.created', 'order.sent_to_kitchen', 'order.modified', 'order.voided', 'payment.processed', 'ticket.status.updated', 'ticket.completed', 'table.status.changed', 'reservation.confirmed', 'reservation.updated', 'waitlist.updated', 'delivery.order.received', 'delivery.order.updated', 'delivery.order.cancelled']} />
      <WelcomeRouter planTier={planTier} onboardingStep={onboardingStep} />
      <OwnerOverviewView data={data} currency={money.currency} roleLabel={roleLabel} headline={headline} />
    </>
  )
}
