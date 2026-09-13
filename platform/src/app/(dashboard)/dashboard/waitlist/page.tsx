import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import WaitlistClient from '@/components/dashboard/WaitlistClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = { title: 'Walk-in Waitlist Queue | Resto AI' }

export default async function WaitlistPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Walk-in Waitlist Queue"
        showRefresh
        actions={
          <button className="btn btn--primary btn--sm">+ Add Walk-In</button>
        }
      />
      <div className="page-body">
        <WaitlistClient />
      </div>
    </>
  )
}
