import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'
import { CrmClient } from '@/components/dashboard/CrmClient'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlanGateCard } from '@/components/ui/PlanGateCard'

export const metadata = {
  title: 'Customer CRM & Guest Directory | Resto AI',
}

export default async function CrmPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const restaurantId = session.user.restaurantId
  if (!restaurantId) redirect('/onboarding')

  const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')

  return (
    <>
      <PageHeader
        title="Customer CRM & Guests"
        showRefresh
        actions={
          allowed ? (
            <button className="btn btn--secondary btn--sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Export
            </button>
          ) : undefined
        }
      />
      <div className="page-body">
        {allowed ? (
          <CrmClient />
        ) : (
          <PlanGateCard
            title="Guest CRM & Customer Intelligence"
            description="Guest profiles, dining histories, spend rankings, and automatic visit tags are included exclusively in the Professional Plan."
          />
        )}
      </div>
    </>
  )
}
