import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { BillingManagerClient } from '@/components/dashboard/BillingManagerClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = {
  title: 'Subscription & Billing Portal | Resto AI',
}

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Subscription & Billing"
        showRefresh
        subtitle="Manage your SaaS tier, Stripe invoices, and active payment methods"
      />
      <div className="page-body">
        <BillingManagerClient />
      </div>
    </>
  )
}
