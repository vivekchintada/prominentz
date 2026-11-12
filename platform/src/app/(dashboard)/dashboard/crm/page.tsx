import Link from 'next/link'
import { verifyRestaurantPlan } from '@/lib/plan-gate'
import { CrmClient } from '@/components/dashboard/CrmClient'
import { CustomersBoardView } from '@/components/bento/pages/CustomersBoardView'
import { PageHead, ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_CUSTOMERS_BOARD, getCustomersBoard } from '@/lib/bento/customers-page'

export const metadata = { title: 'Customers | Prominentz' }

export default async function CustomersPage() {
  const ctx = await getBentoPageContext()
  const { allowed } = await verifyRestaurantPlan(ctx.restaurantId, 'PRO')

  if (!allowed) {
    return (
      <>
        <PageHead eyebrow="Customers · feedback" title="Guest profiles come with the Pro plan." />
        <section className="bz-grid" style={{ marginTop: 20 }}>
          <article className="bz-tile bz-tile--ink bz-c6">
            <h2 className="bz-title">What you get</h2>
            <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
              <span className="bz-darkrow__main" style={{ fontSize: 14 }}>Guest profiles and visit history</span>
            </div>
            <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
              <span className="bz-darkrow__main" style={{ fontSize: 14 }}>Top guests and win-back lists</span>
            </div>
            <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
              <span className="bz-darkrow__main" style={{ fontSize: 14 }}>Loyalty points and campaigns</span>
            </div>
          </article>
          <article className="bz-tile bz-c6">
            <h2 className="bz-title">Your plan</h2>
            <span className="bz-sub">The Basic plan covers the till, kitchen, tables, menu and staff. Guest CRM is part of Pro, which is still in development.</span>
            <div className="bz-row bz-row--wrap bz-push" style={{ justifyContent: 'flex-start', gap: 10 }}>
              <Link href="/dashboard/settings/billing" className="bz-btn bz-btn--ink">Billing and plan</Link>
              <Link href="/dashboard" className="bz-btn bz-btn--outline">Back to overview</Link>
            </div>
          </article>
        </section>
      </>
    )
  }

  const board = await safeLoad('customers board', () => getCustomersBoard(ctx.restaurantId, ctx.todayStart, ctx.timezone), EMPTY_CUSTOMERS_BOARD)

  return (
    <>
      <CustomersBoardView data={board} currency={ctx.currency} />
      <ToolSection title="Guest list and campaigns" sub="Search guests, open a profile, and send a campaign">
        <CrmClient />
      </ToolSection>
    </>
  )
}
