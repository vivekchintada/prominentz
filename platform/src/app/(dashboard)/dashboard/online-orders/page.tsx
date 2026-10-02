import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import OnlineOrdersClient from '@/components/dashboard/OnlineOrdersClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Online Orders Dispatch | Prominentz',
  description: 'Live order command center, kitchen dispatch, and customer fulfilment tracking',
}

export default async function OnlineOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER', 'KITCHEN'].includes(session.user.role)) redirect('/dashboard')

  return (
    <>
      <PageHeader
        title="Online Orders"
        subtitle="Accept incoming orders, monitor preparation milestones, and dispatch pickup and delivery orders."
      />
      <div className="page-body">
        <OnlineOrdersClient />
      </div>
    </>
  )
}
