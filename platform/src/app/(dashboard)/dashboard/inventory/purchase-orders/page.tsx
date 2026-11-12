import dynamic from 'next/dynamic'
import { SuppliersBoardView } from '@/components/bento/pages/SuppliersBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_SUPPLIERS_BOARD, getSuppliersBoard } from '@/lib/bento/suppliers-page'

const InventoryClient = dynamic(() => import('@/components/dashboard/InventoryClient'), {
  loading: () => <div className="bz-skel" style={{ minHeight: 320 }} aria-busy="true" aria-label="Loading purchase orders" />,
})

export const metadata = { title: 'Purchase orders | Prominentz' }

export default async function InventoryPurchaseOrdersPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad('suppliers board', () => getSuppliersBoard(ctx.locationId, ctx.todayStart, ctx.timezone), EMPTY_SUPPLIERS_BOARD)

  return (
    <>
      <SuppliersBoardView data={board} currency={ctx.currency} timezone={ctx.timezone} />
      <ToolSection title="Purchase orders and receiving" sub="Raise a PO, send it, and check deliveries in line by line">
        <InventoryClient initialTab="pos" />
      </ToolSection>
    </>
  )
}
