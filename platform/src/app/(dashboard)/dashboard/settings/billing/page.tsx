import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { BillingManagerClient } from '@/components/dashboard/BillingManagerClient'
import { PageHeader } from '@/components/ui/PageHeader'
import { PaymentsSetupCard } from '@/components/dashboard/PaymentsSetupCard'

export const metadata = {
  title: 'Subscription & Billing Portal | Prominentz',
}

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Payments & Billing"
        showRefresh
        subtitle="Accept card payments and manage your Prominentz subscription"
      />
      <div className="page-body">
        <PaymentsSetupCard />
        <BillingManagerClient />
      </div>
    </>
  )
}
