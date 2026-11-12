import Link from 'next/link'
import { formatMoney, formatMoneyCompact } from '@/lib/money'
import { badgeClass } from '@/lib/bento/channels'
import type { BranchesBoard } from '@/lib/bento/branches-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: BranchesBoard
  currency: string
  canAddBranch: boolean
}

const COLS = 'minmax(0, 1.5fr) 110px 70px 70px 80px 120px'

/** Owner · all branches board. */
export function BranchesBoardView({ data, currency, canAddBranch }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const n = data.branches.length
  const maxSales = Math.max(...data.branches.map((b) => b.sales), 0)
  const headline =
    n === 0 ? 'No branches set up yet.' : data.today.sales > 0 ? `${plural(n, 'branch', 'branches')} took ${m(data.today.sales)} today.` : `${plural(n, 'branch', 'branches')}. Nothing taken yet today.`

  return (
    <>
      <PageHead
        eyebrow="Owner · all branches"
        title={headline}
        actions={
          <>
            <Link href="/dashboard/reports" className="bz-btn bz-btn--outline">Compare months</Link>
            <Link href="/dashboard/invoices" className="bz-btn bz-btn--ink">Day-end close</Link>
          </>
        }
      />

      <section className="bz-grid" aria-label="Branches at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c5 bz-r2">
          <span aria-hidden="true" className="bz-ghost">ALL</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>All branches · today</h2>
            <span className="bz-big" style={{ fontSize: 52 }}>{m(data.today.sales)}</span>
            <span className="bz-sub">
              {plural(n, 'branch', 'branches')} · {plural(data.today.orders, 'order')}
            </span>
          </div>
          {maxSales > 0 ? (
            <div className="bz-bars bz-bars--sm bz-push" style={{ height: 190 }}>
              {data.branches.map((b, i) => (
                <div className="bz-bar" key={b.id} style={{ gap: 6 }}>
                  <span className="bz-bar__val" style={{ fontSize: 11 }}>{b.sales > 0 ? formatMoneyCompact(b.sales, currency) : ''}</span>
                  <div
                    className={`bz-bar__fill${b.sales === maxSales ? ' bz-bar__fill--hi' : ''}`}
                    style={{ height: Math.max(6, Math.round((b.sales / maxSales) * 140)), ['--i' as string]: i }}
                  />
                  <span className="bz-bar__label" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{b.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No sales yet today">Each branch’s takings stack up here through the day.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c7">
          <div className="bz-row">
            <h2 className="bz-title">Branches</h2>
            <span className="bz-meta">live</span>
          </div>
          {n > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner" style={{ minWidth: 640 }}>
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>Branch</span><span>Sales</span><span>Orders</span><span>Labour</span><span>Tables</span><span>Status</span>
                </div>
                {data.branches.map((b) => (
                  <div key={b.id} className="bz-table__row" style={{ gridTemplateColumns: COLS, minHeight: 56 }}>
                    <span style={{ minWidth: 0 }}>
                      <b>{b.name}</b>
                      {b.isHq && <span className="bz-badge bz-badge--quiet" style={{ marginLeft: 8, fontSize: 11 }}>HQ</span>}
                      <br />
                      <span className="bz-sub" style={{ fontSize: 12 }}>{b.area || 'No address yet'}</span>
                    </span>
                    <span className="bz-mono" style={{ fontWeight: 700 }}>{m(b.sales)}</span>
                    <span className="bz-mono">{b.orders}</span>
                    <span className="bz-mono">{b.labourPct === null ? '–' : `${b.labourPct}%`}</span>
                    <span className="bz-mono">{b.openTables}/{b.totalTables}</span>
                    <span className={badgeClass(b.status.tone)}>{b.status.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No branches yet">Add your first location and it appears here with its sales, labour and kitchen status.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c7">
          <div className="bz-row">
            <h2 className="bz-title">Needs attention</h2>
            <span className="bz-meta">across branches</span>
          </div>
          {data.attention.length > 0 ? (
            data.attention.map((a) => (
              <div key={a.id} className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{a.title}</span>
                <span className="bz-darkrow__meta">{a.detail}</span>
                <Link href={a.href} className="bz-btn bz-btn--lime bz-btn--sm">{a.cta}</Link>
              </div>
            ))
          ) : (
            <Empty title="All clear">No late kitchens and nothing below minimum stock at any branch.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Menu sync</h2>
            <span className="bz-meta">{plural(data.menu.shared + data.menu.branchOnly, 'item')}</span>
          </div>
          <div className="bz-pillrow" style={{ borderRadius: 16, paddingRight: 8 }}>
            <span className="bz-grow" style={{ fontWeight: 700, fontSize: 14 }}>Same menu everywhere</span>
            <span className="bz-sub" style={{ fontSize: 13 }}>{plural(data.menu.shared, 'item')}</span>
            <span className="bz-badge bz-badge--ink">Shared</span>
          </div>
          <div className="bz-pillrow" style={{ borderRadius: 16, paddingRight: 8 }}>
            <span className="bz-grow" style={{ fontWeight: 700, fontSize: 14 }}>Branch-only items</span>
            <span className="bz-sub" style={{ fontSize: 13 }}>{plural(data.menu.branchOnly, 'item')}</span>
            <Link href="/dashboard/menu" className="bz-btn bz-btn--ink bz-btn--sm">Review</Link>
          </div>
          <span className="bz-sub">
            {data.menu.branchesWithOwnMenu > 0 ? `${plural(data.menu.branchesWithOwnMenu, 'branch', 'branches')} carry items of their own` : 'Every branch sells the same menu'}
          </span>
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Push the menu</h2>
            <span className="bz-meta">HQ to branches</span>
          </div>
          <span className="bz-sub">Send the master menu, prices and photos to every branch in one go from the tool below.</span>
          <a href="#manage" className="bz-btn bz-btn--outline bz-btn--block bz-push">Open branch tools</a>
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <h2 className="bz-title">Add a branch</h2>
          <span className="bz-sub">Same menu, staff roles and reports from day one.{canAddBranch ? '' : ' Multi-branch is part of the Pro plan.'}</span>
          {canAddBranch ? (
            <a href="#manage" className="bz-btn bz-btn--lime bz-btn--block bz-push">Add branch</a>
          ) : (
            <Link href="/dashboard/settings/billing" className="bz-btn bz-btn--lime bz-btn--block bz-push">See plans</Link>
          )}
        </article>
      </section>
    </>
  )
}
