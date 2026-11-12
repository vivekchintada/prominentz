import { CaptainNoLocation } from '@/components/bento/captain/CaptainNoLocation'
import { CaptainOrdersView } from '@/components/bento/captain/CaptainOrdersView'
import { getCaptainData, getCaptainOrders } from '@/lib/bento/captain'
import { captainSignOut } from '@/lib/bento/captain-actions'
import { getCaptainSession } from '@/lib/bento/captain-session'

export const metadata = { title: 'Orders' }

export default async function CaptainOrdersPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const [s, { show }] = await Promise.all([getCaptainSession(), searchParams])
  if (!s.locationId) return <CaptainNoLocation />

  const [data, orders] = await Promise.all([getCaptainData(s.userId, s.locationId), getCaptainOrders(s.userId, s.locationId, show)])
  return <CaptainOrdersView data={data} orders={orders} firstName={s.firstName} onSignOut={captainSignOut} />
}
