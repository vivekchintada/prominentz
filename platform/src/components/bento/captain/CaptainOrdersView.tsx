'use client'

import Link from 'next/link'
import { useMoney } from '@/components/providers/CurrencyProvider'
import type { CaptainData, CaptainOrderFilter, CaptainOrderState, CaptainOrders } from '@/lib/bento/captain'
import { CaptainBell, CaptainFrame } from './CaptainFrame'
import { shortTable, useCaptainLive } from './useCaptainLive'

const BADGE: Record<CaptainOrderState, { label: string; cls: string }> = {
  bill: { label: 'Bill asked', cls: 'bz-badge bz-badge--accent' },
  ready: { label: 'Serve now', cls: 'bz-badge bz-badge--lime' },
  new: { label: 'New', cls: 'bz-badge bz-badge--quiet' },
  kitchen: { label: 'Cooking', cls: 'bz-badge' },
  eating: { label: 'Eating', cls: 'bz-badge bz-badge--ink' },
}

const FILTERS: { key: CaptainOrderFilter; label: string }[] = [
  { key: 'mine', label: 'Mine' },
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
]

interface Props {
  data: CaptainData
  orders: CaptainOrders
  firstName: string
  onSignOut: () => void
}

/** Captain / Server phone · Orders tab. */
export function CaptainOrdersView({ data, orders, firstName, onSignOut }: Props) {
  const { money } = useMoney()
  const { calls } = useCaptainLive(data.locationId)
  const empty =
    orders.filter === 'mine' ? 'None of your tables have an open order.' : orders.filter === 'ready' ? 'Nothing is waiting at the pass.' : 'No open orders on the floor.'

  return (
    <CaptainFrame active="orders" firstName={firstName} locationId={data.locationId} onSignOut={onSignOut}>
      <header className="bz-row bz-row--center">
        <div className="bz-stack" style={{ gap: 2 }}>
          <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Orders</h1>
          <span className="bz-meta" style={{ fontSize: 12 }}>
            {firstName} · {data.locationName} · {orders.counts.all} open
          </span>
        </div>
        <CaptainBell count={calls.length + data.ready.count} />
      </header>

      {data.needsYou?.kind === 'bill' && (
        <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 16, gap: 10 }}>
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 80, right: -8, top: 4, color: 'rgba(255,255,255,0.10)' }}>
            {shortTable(data.needsYou.tableName)}
          </span>
          <span style={{ position: 'relative', fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>{data.needsYou.title}</span>
          <Link href={data.needsYou.href} className="bz-btn bz-btn--lime" style={{ width: '100%', height: 48, borderRadius: 14, fontSize: 14 }}>
            Take payment
          </Link>
        </article>
      )}

      <nav aria-label="Show orders" className="bz-filters">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/server/orders?show=${f.key}`}
            replace
            scroll={false}
            className={`bz-filter${orders.filter === f.key ? ' bz-filter--on' : ''}`}
            aria-current={orders.filter === f.key ? 'page' : undefined}
            style={{ height: 40, borderRadius: 999 }}
          >
            {f.label} <span className="bz-filter__n">{orders.counts[f.key]}</span>
          </Link>
        ))}
      </nav>

      <article className="bz-tile" style={{ borderRadius: 26, padding: 16, gap: 8 }}>
        {orders.rows.length > 0 ? (
          orders.rows.map((o) => (
            <Link
              key={o.id}
              href={`/pos?tableId=${o.tableId}&orderId=${o.id}`}
              className="bz-captain-row"
              aria-label={`${o.tableName}, ${o.detail}, ${BADGE[o.state].label}`}
            >
              <span className="bz-mono" style={{ fontWeight: 800, fontSize: 15, flexShrink: 0, minWidth: 40 }}>{shortTable(o.tableName)}</span>
              <span className="bz-item__body">
                <span style={{ fontWeight: 700, fontSize: 13 }}>{o.detail}</span>
                <span className="bz-meta" style={{ fontSize: 12 }}>{money(o.total, 0)}</span>
              </span>
              <span className={BADGE[o.state].cls}>{BADGE[o.state].label}</span>
            </Link>
          ))
        ) : (
          <span className="bz-sub">{empty}</span>
        )}
      </article>

      <article className="bz-tile bz-tile--ink" style={{ borderRadius: 26, padding: 16, gap: 4 }}>
        <div className="bz-row">
          <span style={{ fontWeight: 800, fontSize: 15 }}>Paid with me today</span>
          <span className="bz-mono" style={{ fontSize: 13, color: 'var(--bz-lime)' }}>
            {data.paidCount} · {money(data.sales, 0)}
          </span>
        </div>
      </article>
    </CaptainFrame>
  )
}
