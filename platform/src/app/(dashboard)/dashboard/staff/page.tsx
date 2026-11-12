import dynamic from 'next/dynamic'
import { StaffBoardView } from '@/components/bento/pages/StaffBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_STAFF_BOARD, getStaffBoard } from '@/lib/bento/staff-page'

const StaffManagementClient = dynamic(
  () => import('@/components/dashboard/StaffManagementClient').then((mod) => mod.StaffManagementClient),
  {
    loading: () => (
      <div className="flex items-center justify-center p-12 text-secondary">
        <div className="spinner" />
        <span className="ml-3 text-sm">Loading Staff Management...</span>
      </div>
    ),
  }
)

export const metadata = {
  title: 'Staff & Delegated Access | Prominentz',
}

export default async function StaffManagementPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad('staff board', () => getStaffBoard(ctx.locationId, ctx.todayStart, ctx.timezone), EMPTY_STAFF_BOARD)

  return (
    <>
      <StaffBoardView data={board} currency={ctx.currency} timezone={ctx.timezone} />
      <ToolSection title="Team and access" sub="Roles, outlets and staff invitations">
        <StaffManagementClient />
      </ToolSection>
    </>
  )
}
