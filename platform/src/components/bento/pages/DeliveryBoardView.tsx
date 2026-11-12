import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import type { DeliveryBoard } from '@/lib/bento/delivery-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: DeliveryBoard
  currency: string
}

const COLS = '84px minmax(0, 1fr) minmax(0, 1fr) 96px 110px'

/** Delivery · apps and riders board, for the online orders page. */
export function DeliveryBoardView({ data, currency }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const headline = data.paused
    ? 'Online ordering is paused.'
    : data.liveCount === 0
      ? 'No online orders in progress.'
      : `${plural(data.liveCount, 'online order')} live right now.`

  return (
    <>
      <PageHead
        eyebrow="Delivery · apps and riders"
        title={headline}
        actions={
          <>
            <Link href="/dashboard/settings/ordering" className="bz-btn bz-btn--outline">Ordering settings</Link>
            <a href="#manage" className="bz-btn bz-btn--ink">Dispatch board</a>
          </>
        }
      />

      <section className="bz-grid" aria-label="Delivery at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--flush bz-c5 bz-r2" style={{ minHeight: 360 }}>
          <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 560 520" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
            <rect width="560" height="520" fill="var(--bz-map-ground, #F4F3F7)" />
            <path d="M0 110 H560 M0 300 H560 M0 440 H560 M120 0 V520 M300 0 V520 M450 0 V520" stroke="var(--bz-map-road, #FFFFFF)" strokeWidth="14" />
            <path d="M0 420 L560 180" stroke="var(--bz-map-road, #FFFFFF)" strokeWidth="20" />
            <rect x="320" y="320" width="110" height="100" rx="10" fill="var(--bz-map-block, #E4E4E8)" />
            <rect x="140" y="130" width="140" height="150" rx="10" fill="var(--bz-map-block, #E4E4E8)" />
            <path d="M130 420 V300 H300 V110 H440" fill="none" stroke="#6835F9" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 12" />
            <circle cx="130" cy="420" r="10" fill="#D4FF3F" stroke="#141416" strokeWidth="4" />
            <circle cx="440" cy="110" r="14" fill="#6835F9" />
            <circle cx="440" cy="110" r="5" fill="#FFFFFF" />
          </svg>
          <div style={{ position: 'relative', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: 12 }}>
            <div className="bz-row bz-row--wrap" style={{ gap: 10 }}>
              <h2 className="bz-chip bz-chip--plain" style={{ fontWeight: 800, fontSize: 16, padding: '8px 14px' }}>Out for delivery</h2>
              <span className="bz-chip bz-chip--plain" style={{ fontWeight: 600, padding: '8px 14px' }}>{data.onTheWay.length} on the way</span>
            </div>
            <div className="bz-list" style={{ gap: 8 }}>
              {data.onTheWay.length > 0 ? (
                data.onTheWay.map((o) => (
                  <span key={o.id} className="bz-darkrow bz-darkrow--pad" style={{ alignSelf: 'flex-start', borderRadius: 18, gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{o.ref} · {o.who}</span>
                    <span className="bz-darkrow__amt" style={{ fontSize: 13 }}>{o.mins} min out</span>
                  </span>
                ))
              ) : (
                <span className="bz-darkrow bz-darkrow--pad" style={{ alignSelf: 'flex-start', borderRadius: 18 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>No orders out for delivery</span>
                </span>
              )}
            </div>
          </div>
        </article>

        <article className="bz-tile bz-tile--accent bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Prep queue</h2>
            <span className="bz-meta">oldest first</span>
          </div>
          {data.queue.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.queue.map((q) => (
                <div key={q.id} className="bz-glassrow">
                  <div className="bz-stack bz-grow" style={{ gap: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.label}</span>
                    <span className="bz-mono" style={{ fontSize: 12, color: 'var(--bz-on-accent-muted)' }}>
                      {q.minsLeft === null ? 'no ready time' : q.late ? `late ${Math.abs(q.minsLeft)} min` : `${q.minsLeft} min left`}
                    </span>
                  </div>
                  <span
                    className="bz-mono"
                    style={{ padding: '4px 10px', borderRadius: 8, background: q.late ? 'var(--bz-lime)' : '#FFFFFF', color: '#141416', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {q.late ? 'Late' : q.state}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Kitchen queue is clear" />
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c3">
          <h2 className="bz-title">Channels</h2>
          <div className="bz-list" style={{ gap: 0 }}>
            {data.apps.map((a) => (
              <div key={a.name} className="bz-toggle-row">
                <div className="bz-stack" style={{ gap: 0, minWidth: 0 }}>
                  <span className="bz-toggle-row__name" style={{ fontSize: 14 }}>{a.name}</span>
                  <span className="bz-sub" style={{ fontSize: 12 }}>{a.detail}</span>
                </div>
                <span className={a.on ? 'bz-on' : 'bz-off'}>{a.on ? 'On' : 'Off'}</span>
              </div>
            ))}
          </div>
          {data.paused && <Link href="/dashboard/settings/ordering" className="bz-btn bz-btn--lime bz-push">Go online</Link>}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Today</h2>
            <span className="bz-meta">{data.today.live} live</span>
          </div>
          <div className="bz-kpis" style={{ gap: 10 }}>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Online sales</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{m(data.today.sales)}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Avg prep</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{data.today.avgPrep === null ? '–' : `${data.today.avgPrep} min`}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Late orders</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{data.today.late}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Cancelled</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{data.today.cancelled}</span>
            </div>
          </div>
        </article>

        <article className="bz-tile bz-c3">
          <div className="bz-row">
            <h2 className="bz-title">Commission</h2>
            <span className="bz-meta">30 days</span>
          </div>
          {data.commission ? (
            <>
              <span className="bz-big bz-big--sm">{m(data.commission.total)}</span>
              <span className="bz-sub">
                {data.commission.gross > 0 ? `${((data.commission.total / data.commission.gross) * 100).toFixed(1)}% of ${m(data.commission.gross)} app sales` : 'From imported statements'}
              </span>
              {data.commission.byApp.slice(0, 3).map((a) => (
                <div key={a.name} className="bz-row" style={{ fontSize: 14 }}>
                  <span>{a.name}</span>
                  <span className="bz-mono">{m(a.amount)}</span>
                </div>
              ))}
            </>
          ) : (
            <Empty title="No statements yet">Import app payout statements to see commission.</Empty>
          )}
          <Link href="/dashboard/reconciliation" className="bz-link bz-push">Reconciliation</Link>
        </article>

        <article className="bz-tile bz-c7">
          <div className="bz-row bz-row--center">
            <h2 className="bz-title">Online orders today</h2>
            <a href="#manage" className="bz-link">Open dispatch board</a>
          </div>
          {data.recent.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner" style={{ minWidth: 560 }}>
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>Order</span><span>Channel</span><span>Guest</span><span>Total</span><span>Status</span>
                </div>
                {data.recent.map((o) => (
                  <div key={o.id} className="bz-table__row" style={{ gridTemplateColumns: COLS }}>
                    <span className="bz-mono" style={{ fontWeight: 700 }}>{o.ref}</span>
                    <span style={{ fontWeight: 700 }}>{o.app}</span>
                    <span className="bz-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.who || '–'}</span>
                    <span className="bz-mono">{m(o.total)}</span>
                    <span className="bz-badge">{o.state}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No online orders yet today" />
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c5">
          <div className="bz-row">
            <h2 className="bz-title">Sold out on every channel</h2>
            <span className="bz-meta">{data.soldOutCount}</span>
          </div>
          {data.soldOut.length > 0 ? (
            data.soldOut.map((s) => (
              <div key={s.id} className="bz-row" style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--bz-night-line)' }}>
                <span style={{ fontWeight: 700 }}>{s.name}</span>
                <span className="bz-off">Sold out</span>
              </div>
            ))
          ) : (
            <span className="bz-sub">Every dish is available on POS, QR and online.</span>
          )}
          <Link href="/dashboard/menu" className="bz-link bz-push">Menu editor</Link>
        </article>
      </section>
    </>
  )
}
