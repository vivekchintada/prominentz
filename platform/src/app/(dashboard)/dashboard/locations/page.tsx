import { verifyRestaurantPlan } from '@/lib/plan-gate'
import { MultiLocationClient } from '@/components/dashboard/MultiLocationClient'
import { BranchesBoardView } from '@/components/bento/pages/BranchesBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_BRANCHES_BOARD, getBranchesBoard } from '@/lib/bento/branches-page'

export const metadata = { title: 'All branches | Prominentz' }

export default async function BranchesPage() {
  const ctx = await getBentoPageContext()
  const [board, plan] = await Promise.all([
    safeLoad('branches board', () => getBranchesBoard(ctx.restaurantId), EMPTY_BRANCHES_BOARD),
    verifyRestaurantPlan(ctx.restaurantId, 'PRO'),
  ])

  return (
    <>
      <BranchesBoardView data={board} currency={ctx.currency} canAddBranch={plan.allowed} />
      {plan.allowed && (
        <ToolSection title="Branch tools" sub="Add a location, push the master menu, and compare branch revenue">
          <MultiLocationClient />
        </ToolSection>
      )}
    </>
  )
}
