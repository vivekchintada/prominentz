import dynamic from 'next/dynamic'
import { TablesBoardView } from '@/components/bento/pages/TablesBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_TABLES_BOARD, getTablesBoard } from '@/lib/bento/tables-page'

const TablesClient = dynamic(() => import('@/components/dashboard/TablesClient'), {
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--color-text-secondary)' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <span style={{ marginLeft: 12, fontSize: 14 }}>Loading Tables...</span>
    </div>
  ),
})

export const metadata = { title: 'Tables & Floor Plan | Prominentz' }

export default async function TablesPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad('tables board', () => getTablesBoard(ctx.locationId, ctx.todayStart), EMPTY_TABLES_BOARD)

  return (
    <>
      <TablesBoardView data={board} currency={ctx.currency} timezone={ctx.timezone} />
      <ToolSection title="Floor plan editor" sub="Add, move and seat tables">
        <TablesClient />
      </ToolSection>
    </>
  )
}
