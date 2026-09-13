import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { LoyaltyClient } from '@/components/dashboard/LoyaltyClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = {
  title: 'Loyalty Program & Points Engine | Resto AI',
}

export default async function LoyaltyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Loyalty Rewards Program"
        showRefresh
        subtitle="Configure points earning rates, milestone tiers, and guest reward redemption"
        actions={
          <button className="btn btn--primary btn--sm">+ Create Reward Tier</button>
        }
      />
      <div className="page-body">
        <LoyaltyClient />
      </div>
    </>
  )
}
