import dynamic from 'next/dynamic'
import { PaymentsBoardView } from '@/components/bento/pages/PaymentsBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_PAYMENTS_BOARD, getPaymentsBoard } from '@/lib/bento/payments-page'

const InvoicesTableView = dynamic(() => import('@/components/dashboard/InvoicesTableView'), {
  loading: () => <div className="bz-skel" style={{ minHeight: 320 }} aria-busy="true" aria-label="Loading receipts" />,
})

export const metadata = { title: 'Payments | Prominentz' }

export default async function PaymentsPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad('payments board', () => getPaymentsBoard(ctx.locationId, ctx.todayStart), EMPTY_PAYMENTS_BOARD)
  const dateLabel = new Intl.DateTimeFormat('en-GB', { timeZone: ctx.timezone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())

  return (
    <>
      <PaymentsBoardView data={board} currency={ctx.currency} timezone={ctx.timezone} dateLabel={dateLabel} />
      <ToolSection title="Receipts and refunds" sub="Every payment with its receipt, search, filters and refunds">
        <InvoicesTableView />
      </ToolSection>
    </>
  )
}
