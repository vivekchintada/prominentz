import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'
import AgentCommandCenterClient from '@/components/dashboard/AgentCommandCenterClient'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlanGateCard } from '@/components/ui/PlanGateCard'

export const metadata = {
  title: 'Resto IQ Agent Command Center | Resto AI',
  description: 'Autonomous restaurant operations monitoring, predictive analytics, and function-calling AI agent.',
}

export default async function AiAgentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let restaurantId = session.user.restaurantId
  if (!restaurantId) {
    const fb = await prisma.restaurant.findFirst()
    restaurantId = fb?.id || ''
  }

  const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')

  return (
    <>
      <PageHeader
        title="Resto IQ Agent Command Center"
        showRefresh
        subtitle="Autonomous operations monitoring, inventory forecasting, and real-time smart actions"
      />
      <div className="page-body">
        {allowed ? (
          <AgentCommandCenterClient />
        ) : (
          <PlanGateCard
            title="Resto IQ Autonomous AI Agent"
            description="Autonomous 24/7 operations monitoring, predictive demand forecasting, automated stock replenishments, and function-calling intelligence are exclusive to the Professional Plan."
          />
        )}
      </div>
    </>
  )
}
