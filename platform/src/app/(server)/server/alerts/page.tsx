import { CaptainAlertsView } from '@/components/bento/captain/CaptainAlertsView'
import { CaptainNoLocation } from '@/components/bento/captain/CaptainNoLocation'
import { getCaptainAlerts, getCaptainData } from '@/lib/bento/captain'
import { captainSignOut } from '@/lib/bento/captain-actions'
import { getCaptainSession } from '@/lib/bento/captain-session'

export const metadata = { title: 'Alerts' }

export default async function CaptainAlertsPage() {
  const s = await getCaptainSession()
  if (!s.locationId) return <CaptainNoLocation />

  const [data, alerts] = await Promise.all([getCaptainData(s.userId, s.locationId), getCaptainAlerts(s.locationId)])
  return <CaptainAlertsView data={data} alerts={alerts} firstName={s.firstName} onSignOut={captainSignOut} />
}
