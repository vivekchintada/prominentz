import { BentoCaptain } from '@/components/bento/captain/BentoCaptain'
import { CaptainNoLocation } from '@/components/bento/captain/CaptainNoLocation'
import { getCaptainData } from '@/lib/bento/captain'
import { captainSignOut } from '@/lib/bento/captain-actions'
import { getCaptainSession } from '@/lib/bento/captain-session'

export const metadata = { title: 'My tables' }

export default async function ServerPage() {
  const s = await getCaptainSession()
  if (!s.locationId) return <CaptainNoLocation />

  const data = await getCaptainData(s.userId, s.locationId)
  return <BentoCaptain data={data} firstName={s.firstName} homeHref={s.homeHref} onSignOut={captainSignOut} />
}
