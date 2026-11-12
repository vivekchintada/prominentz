import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { clockTime, initials } from '@/lib/bento/time'
import { badgeClass } from '@/lib/bento/channels'
import type { SuppliersBoard } from '@/lib/bento/suppliers-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: SuppliersBoard
  currency: string
  timezone: string
}

const COLS = '76px minmax(0, 1fr) minmax(0, 1.5fr) 96px 120px'

/** Suppliers · purchase orders board. */
export function SuppliersBoardView({ data, currency, timezone }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const headline =
    data.open.count === 0
      ? data.supplierCount === 0
        ? 'No suppliers yet.'
        : 'No purchase orders open.'
      : `${plural(data.open.count, 'PO')} open.${data.open.arrivingToday > 0 ? ` ${plural(data.open.arrivingToday, 'delivery', 'deliveries')} ${data.open.arrivingToday === 1 ? 'arrives' : 'arrive'} today.` : ''}`
  const maxChange = Math.max(...data.priceWatch.map((p) => Math.abs(p.changePct)), 0)

  return (
    <>
      <PageHead
        eyebrow="Suppliers · purchase orders"
        title={headline}
        actions={
          <>
            <Link href="/dashboard/inventory/waste" className="bz-btn bz-btn--outline">Wastage log</Link>
            <a href="#manage" className="bz-btn bz-btn--ink">New purchase order</a>
          </>
        }
      />

      <section className="bz-grid" aria-label="Purchasing at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c4">
          <span aria-hidden="true" className="bz-ghost">PO</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>Open purchase orders</h2>
            <span className="bz-big" style={{ fontSize: 52 }}>{m(data.open.value)}</span>
            <span className="bz-sub">
              {plural(data.open.count, 'PO')} open{data.open.arrivingToday > 0 ? ` · ${data.open.arrivingToday} arriving today` : ''}
            </span>
          </div>
          <div className="bz-darkrow bz-push">
            <span className="bz-darkrow__main" style={{ fontSize: 14 }}>Below minimum stock</span>
            <span className="bz-darkrow__meta">{plural(data.lowItems, 'item')} low</span>
            <Link href="/dashboard/inventory" className="bz-btn bz-btn--lime bz-btn--sm">Reorder</Link>
          </div>
        </article>

        <article className="bz-tile bz-tile--ink bz-c5">
          <div className="bz-row">
            <h2 className="bz-title">Receive delivery</h2>
            <span className="bz-meta">next up</span>
          </div>
          {data.nextUp ? (
            <>
              <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>
                  {data.nextUp.supplier} · {data.nextUp.poNumber}
                </span>
                <span className="bz-darkrow__meta">{data.nextUp.expectedAt ? clockTime(data.nextUp.expectedAt, timezone) : 'no date'}</span>
                <span className="bz-on">Expected</span>
              </div>
              <span className="bz-sub">{data.nextUp.summary} · check weight and temperature on arrival</span>
              <div className="bz-row bz-row--wrap bz-push" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <Link href="/dashboard/inventory/purchase-orders#manage" className="bz-btn bz-btn--lime bz-btn--lg bz-grow">Check in delivery</Link>
                <Link href="/dashboard/inventory/waste" className="bz-btn bz-btn--ghost-night bz-btn--lg">Report issue</Link>
              </div>
            </>
          ) : (
            <Empty title="Nothing on its way">
              <span>Send a purchase order and its expected delivery shows here, worked out from the supplier’s lead time.</span>
              <a href="#manage" className="bz-btn bz-btn--lime" style={{ marginTop: 6 }}>Create a purchase order</a>
            </Empty>
          )}
        </article>

        <article className="bz-tile bz-c3">
          <div className="bz-row">
            <h2 className="bz-title">{data.month.name || 'This month'}</h2>
            <span className="bz-meta">purchasing</span>
          </div>
          <div className="bz-kpis" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Received</span>
              <span className="bz-kpi__value">{m(data.month.spent)}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Deliveries</span>
              <span className="bz-kpi__value">{data.month.deliveries}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Purchases vs sales</span>
              <span className="bz-kpi__value">{data.month.purchasesPct === null ? '–' : `${data.month.purchasesPct.toFixed(1)}%`}</span>
              <span className="bz-kpi__note">{data.month.purchasesPct === null ? 'needs sales and deliveries' : 'of this month’s takings'}</span>
            </div>
          </div>
        </article>

        <article className="bz-tile bz-c7 bz-r2">
          <div className="bz-row bz-row--center">
            <h2 className="bz-title">Purchase orders</h2>
            <a href="#manage" className="bz-btn bz-btn--ink bz-btn--sm">New PO</a>
          </div>
          {data.pos.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner" style={{ minWidth: 620 }}>
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>PO</span><span>Supplier</span><span>Items</span><span>Value</span><span>Status</span>
                </div>
                {data.pos.map((p) => (
                  <div key={p.id} className="bz-table__row" style={{ gridTemplateColumns: COLS, minHeight: 54 }}>
                    <span className="bz-mono" style={{ fontWeight: 700 }}>{p.poNumber}</span>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.supplier}</span>
                    <span className="bz-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.summary}</span>
                    <span className="bz-mono">{m(p.value)}</span>
                    <span className={badgeClass(p.status.tone)}>{p.status.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No purchase orders yet">
              <span>Orders you send to suppliers, and what came back, list here.</span>
              <a href="#manage" className="bz-btn bz-btn--lime" style={{ marginTop: 6 }}>Create the first PO</a>
            </Empty>
          )}
        </article>

        <article className="bz-tile bz-c5">
          <div className="bz-row">
            <h2 className="bz-title">Suppliers</h2>
            <span className="bz-meta">{plural(data.supplierCount, 'supplier')}</span>
          </div>
          {data.suppliers.length > 0 ? (
            data.suppliers.map((s) => (
              <div key={s.id} className="bz-item">
                <span aria-hidden="true" className="bz-ini">{initials(s.name)}</span>
                <div className="bz-item__body">
                  <span className="bz-item__name" style={{ fontSize: 14 }}>{s.name}</span>
                  <span className="bz-item__sub">{s.note}</span>
                </div>
                <span className={s.openCount > 0 ? 'bz-badge bz-badge--ink' : 'bz-badge bz-badge--quiet'}>
                  {s.openCount > 0 ? `${plural(s.openCount, 'open PO')}` : 'Nothing open'}
                </span>
              </div>
            ))
          ) : (
            <Empty title="No suppliers yet">Add the people you buy from, with their lead times, and purchase orders can be raised in two taps.</Empty>
          )}
          <Link href="/dashboard/inventory/suppliers#manage" className="bz-btn bz-btn--outline bz-btn--block bz-push">Add supplier</Link>
        </article>

        <article className="bz-tile bz-tile--ink bz-c5">
          <div className="bz-row">
            <h2 className="bz-title">Price watch</h2>
            <span className="bz-meta">vs last month</span>
          </div>
          {data.priceWatch.length > 0 ? (
            data.priceWatch.map((p) => (
              <div key={p.id} className="bz-stack">
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>
                    {p.item} · {m(p.nowCost, 2)}/{p.unit}
                  </span>
                  <span className="bz-mono bz-sub">
                    {p.changePct >= 0 ? 'up' : 'down'} {Math.abs(Math.round(p.changePct))}%
                  </span>
                </div>
                <div className="bz-meter">
                  <div
                    className={`bz-meter__fill${p.changePct > 0 ? ' bz-meter__fill--accent' : ' bz-meter__fill--lime'}`}
                    style={{ width: `${maxChange > 0 ? Math.max(6, (Math.abs(p.changePct) / maxChange) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <Empty title="Not enough history yet">Once an ingredient has been bought in two different months, price moves show here.</Empty>
          )}
        </article>
      </section>
    </>
  )
}
