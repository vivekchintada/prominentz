import ReportsClient from '@/components/dashboard/ReportsClient'
import { ReportsBoardView } from '@/components/bento/pages/ReportsBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_REPORTS_BOARD, getReportsBoard } from '@/lib/bento/reports-page'

export const metadata = { title: 'Sales & Analytics | Prominentz' }

export default async function ReportsPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad('reports board', () => getReportsBoard(ctx.locationId, ctx.todayStart, ctx.timezone), EMPTY_REPORTS_BOARD)

  return (
    <>
      <ReportsBoardView data={board} currency={ctx.currency} />
      <ToolSection title="Detailed reports" sub="Pick any date range, compare periods and break sales down">
        <ReportsClient />
      </ToolSection>
    </>
  )
}
