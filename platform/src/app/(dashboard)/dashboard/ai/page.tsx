import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AgentCommandCenterClient from '@/components/dashboard/AgentCommandCenterClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = {
  title: 'Resto IQ Agent Command Center | Resto AI',
  description: 'Autonomous restaurant operations monitoring, predictive analytics, and function-calling AI agent.',
}

export default async function AiAgentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Resto IQ Agent Command Center"
        showRefresh
        subtitle="Autonomous operations monitoring, inventory forecasting, and real-time smart actions"
      />
      <div className="page-body">
        <AgentCommandCenterClient />
      </div>
    </>
  )
}
