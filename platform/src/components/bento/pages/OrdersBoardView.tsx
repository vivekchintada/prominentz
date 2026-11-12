import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { clockTime } from '@/lib/bento/time'
import { CHANNEL_LABEL, badgeClass } from '@/lib/bento/channels'
import type { OrdersBoard } from '@/lib/bento/orders-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: OrdersBoard
  currency: string
  timezone: string
}

const COLS = '84px minmax(0, 1.5fr) 80px 100px 130px 64px'

/** Orders · live board. */
export function OrdersBoardView({ data, currency, timezone }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const maxOpen = Math.max(...data.byChannel.map((c) => c.open), 0)
  const maxPrep = Math.max(...data.prep.map((p) => p.minutes), 0)
  const headline =
    data.openCount === 0
      ? 'No orders open right now.'
      : `${plural(data.openCount, 'order')} open. ${data.needsYou.length > 0 ? `${data.needsYou.length} need${data.needsYou.length === 1 ? 's' : ''} you now.` : 'Nothing is waiting on you.'}`

  return (
    <>
      <PageHead
        eyebrow="Orders · live"
        title={headline}
        actions={
          <>
            <a href="#manage" className="bz-btn bz-btn--outline">All orders</a>
            <Link href="/pos" className="bz-btn bz-btn--ink">New order</Link>
          </>
        }
      />

      <section className="bz-grid" aria-label="Orders at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c4 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 130, right: -8, top: 4 }}>LIVE</span>
          <div className="bz-stack">
            <h2 className="bz-title">Live orders</h2>
            <span className="bz-big" style={{ fontSize: 64 }}>{data.openCount}</span>
            <span className="bz-sub">open right now · {data.todayCount} today</span>
          </div>
          <div className="bz-bars bz-bars--sm" style={{ height: 210 }}>
            {data.byChannel.map((c, i) => (
              <div className="bz-bar" key={c.channel} style={{ gap: 6 }}>
                <span className="bz-bar__val" style={{ fontSize: 11 }}>{c.open}</span>
                <div
                  className={`bz-bar__fill${c.open > 0 && c.open === maxOpen ? ' bz-bar__fill--hi' : ''}`}
                  style={{ height: maxOpen > 0 ? Math.max(6, Math.round((c.open / maxOpen) * 160)) : 6, ['--i' as string]: i }}
                />
                <span className="bz-bar__label" style={{ fontSize: 12 }}>{CHANNEL_LABEL[c.channel]}</span>
              </div>
            ))}
          </div>
          <div className="bz-row bz-row--wrap bz-push" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <Link href="/pos" className="bz-btn bz-btn--lime bz-btn--lg">New order</Link>
            <Link href="/kds" className="bz-btn bz-btn--ghost-light bz-btn--lg">Open kitchen</Link>
          </div>
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Needs you</h2>
            <span className="bz-meta">{data.needsYou.length}</span>
          </div>
          {data.needsYou.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.needsYou.map((n) => (
                <div key={n.id} className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
                  <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{n.title}</span>
                  <span className="bz-darkrow__meta">{n.ago}</span>
                  <Link href={n.href} className="bz-btn bz-btn--lime bz-btn--sm">{n.cta}</Link>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="All clear">No bills, ready plates or online orders are waiting.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c4">
          <h2 className="bz-title">Today so far</h2>
          <div className="bz-kpis" style={{ gap: 10 }}>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Net sales</span>
              <span className="bz-kpi__value">{m(data.today.netSales)}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Orders</span>
              <span className="bz-kpi__value">{data.today.orders}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Avg ticket</span>
              <span className="bz-kpi__value">{data.today.avgTicket === null ? '–' : m(data.today.avgTicket)}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Avg prep</span>
              <span className="bz-kpi__value">{data.today.avgPrepMin === null ? '–' : `${data.today.avgPrepMin} min`}</span>
            </div>
          </div>
        </article>

        <article className="bz-tile bz-c8">
          <div className="bz-row bz-row--center">
            <h2 className="bz-title">Latest orders</h2>
            <a href="#manage" className="bz-link">Search and filter all</a>
          </div>
          {data.recent.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner">
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>Order</span><span>Table / channel</span><span>Items</span><span>Total</span><span>Status</span><span>Placed</span>
                </div>
                {data.recent.map((o) => (
                  <div key={o.id} className="bz-table__row" style={{ gridTemplateColumns: COLS }}>
                    <span className="bz-mono" style={{ fontWeight: 700 }}>{o.ref}</span>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.where}</span>
                    <span className="bz-sub">{plural(o.items, 'item')}</span>
                    <span className="bz-mono">{m(o.total)}</span>
                    <span className={badgeClass(o.status.tone)}>{o.status.label}</span>
                    <span className="bz-mono bz-sub">{clockTime(o.placedAt, timezone)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No orders yet today">Orders from the POS, QR menu and delivery apps show here.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Prep time by station</h2>
            <span className="bz-meta">today, ticket to ready</span>
          </div>
          {data.prep.length > 0 ? (
            data.prep.map((p, i) => (
              <div key={p.station} className="bz-stack">
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{p.station}</span>
                  <span className="bz-mono bz-sub">{p.minutes} min</span>
                </div>
                <div className="bz-meter">
                  <div className={`bz-meter__fill${i === 0 ? ' bz-meter__fill--accent' : ''}`} style={{ width: `${maxPrep > 0 ? Math.max(4, (p.minutes / maxPrep) * 100) : 0}%` }} />
                </div>
              </div>
            ))
          ) : (
            <Empty title="No finished tickets yet">Times appear once the kitchen marks tickets ready.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Refunds and voids</h2>
            <span className="bz-meta">today</span>
          </div>
          {data.voids.length > 0 ? (
            <>
              <div className="bz-list" style={{ gap: 8 }}>
                {data.voids.map((v) => (
                  <div key={v.id} className="bz-darkrow" style={{ background: 'var(--bz-night-3)', paddingRight: 16 }}>
                    <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{v.label}</span>
                    {v.who && <span className="bz-darkrow__meta">{v.who}</span>}
                    <span className="bz-mono">{m(v.amount)}</span>
                  </div>
                ))}
              </div>
              <span className="bz-sub">
                {data.voidCount} today · {m(data.voidTotal)} in total
              </span>
            </>
          ) : (
            <Empty title="No voids or refunds today" />
          )}
        </article>
      </section>
    </>
  )
}
