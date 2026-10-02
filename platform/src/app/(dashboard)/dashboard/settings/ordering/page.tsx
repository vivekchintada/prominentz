import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import OrderingSettingsClient from '@/components/dashboard/OrderingSettingsClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Online Ordering Settings | Prominentz',
  description: 'Manage digital storefront availability, pickup/delivery zones, prep times, and order rules',
}

export default async function OrderingSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  return (
    <>
      <PageHeader
        title="Online Ordering Settings"
        subtitle="Manage storefront availability, fulfillment methods, delivery radiuses, and kitchen preparation lead times."
      />
      <div className="page-body">
        <OrderingSettingsClient />
      </div>
    </>
  )
}
