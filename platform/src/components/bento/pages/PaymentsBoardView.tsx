import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { clockTime } from '@/lib/bento/time'
import { badgeClass } from '@/lib/bento/channels'
import type { PaymentsBoard } from '@/lib/bento/payments-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: PaymentsBoard
  currency: string
  timezone: string
  dateLabel: string
}

const COLS = '64px 84px minmax(0, 1.4fr) 110px 120px'

/** Payments · day-end close board. */
export function PaymentsBoardView({ data, currency, timezone, dateLabel }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const stepsLeft = (data.close.openTables.count > 0 ? 1 : 0) + (data.count > 0 ? 0 : 1)
  const headline =
    data.count === 0
      ? 'Nothing taken yet today.'
      : `${m(data.takings)} taken today. ${stepsLeft === 0 ? 'Ready to close.' : `${plural(stepsLeft, 'step')} to close.`}`

  return (
    <>
      <PageHead
        eyebrow="Payments · day-end close"
        title={headline}
        actions={
          <>
            <a href="#manage" className="bz-btn bz-btn--outline">Refund an order</a>
            <Link href="/pos" className="bz-btn bz-btn--ink">Open the till</Link>
          </>
        }
      />

      <section className="bz-grid" aria-label="Payments at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c5 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 140, right: -8, top: 4 }}>PAID</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>Takings today</h2>
            <span className="bz-big">{m(data.takings)}</span>
            <span className="bz-sub">
              {plural(data.count, 'payment')} · {dateLabel}
            </span>
          </div>
          {data.byMethod.length > 0 ? (
            data.byMethod.map((x) => (
              <div key={x.key} className="bz-stack">
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{x.label}</span>
                  <span className="bz-mono" style={{ color: 'var(--bz-on-accent-muted)' }}>
                    {m(x.total)} · {data.takings > 0 ? Math.round((x.total / data.takings) * 100) : 0}%
                  </span>
                </div>
                <div className="bz-meter" style={{ background: '#141416' }}>
                  <div className="bz-meter__fill bz-meter__fill--lime" style={{ width: `${data.takings > 0 ? Math.max(2, (x.total / data.takings) * 100) : 0}%` }} />
                </div>
              </div>
            ))
          ) : (
            <Empty title="No payments yet today">Card, cash and wallet takings split by method as they come in.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Close the day</h2>
            <span className="bz-meta">{stepsLeft === 0 ? 'ready' : `${stepsLeft} left`}</span>
          </div>
          <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
            <span className="bz-darkrow__main" style={{ fontSize: 14 }}>All tables closed</span>
            <span className="bz-darkrow__meta">
              {data.close.openTables.count === 0 ? 'none open' : `${data.close.openTables.count} open: ${data.close.openTables.names.join(', ')}`}
            </span>
            {data.close.openTables.count === 0 ? <span className="bz-on">Done</span> : <Link href="/dashboard/tables" className="bz-badge">Waiting</Link>}
          </div>
          <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
            <span className="bz-darkrow__main" style={{ fontSize: 14 }}>Tips recorded</span>
            <span className="bz-darkrow__meta">
              {data.close.tips.total > 0 ? `${m(data.close.tips.total)} to ${plural(data.close.tips.people, 'person', 'people')}` : 'none yet'}
            </span>
            <span className={data.close.tips.total > 0 ? 'bz-on' : 'bz-off'}>{data.close.tips.total > 0 ? 'Done' : 'None'}</span>
          </div>
          <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
            <span className="bz-darkrow__main" style={{ fontSize: 14 }}>Refunds checked</span>
            <span className="bz-darkrow__meta">{data.close.refunds.count === 0 ? 'none today' : `${data.close.refunds.count} · ${m(data.close.refunds.total)}`}</span>
            <span className="bz-on">Done</span>
          </div>
          <div className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
            <span className="bz-darkrow__main" style={{ fontSize: 14 }}>Z report</span>
            <span className="bz-darkrow__meta">{data.count > 0 ? 'ready' : 'needs a first payment'}</span>
            <span className={data.count > 0 ? 'bz-on' : 'bz-off'}>{data.count > 0 ? 'Ready' : 'Locked'}</span>
          </div>
          <Link href="/dashboard/reports#manage" className={`bz-btn bz-btn--block bz-btn--lg bz-push ${data.count > 0 ? 'bz-btn--lime' : 'bz-btn--ghost-night'}`}>
            {data.count > 0 ? 'Open the Z report' : 'Day-end reports'}
          </Link>
        </article>

        <article className="bz-tile bz-c3">
          <div className="bz-row">
            <h2 className="bz-title">Cash drawer</h2>
            <span className="bz-meta">today</span>
          </div>
          <div className="bz-kpis" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Cash sales</span>
              <span className="bz-kpi__value">{m(data.drawer.cashSales)}</span>
              <span className="bz-kpi__note">{plural(data.drawer.cashCount, 'cash payment')}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Change given</span>
              <span className="bz-kpi__value">{data.drawer.change > 0 ? `−${m(data.drawer.change)}` : m(0)}</span>
              <span className="bz-kpi__note">{m(data.drawer.received)} handed over</span>
            </div>
            {data.drawer.refundedCash > 0 && (
              <div className="bz-kpi">
                <span className="bz-kpi__label">Cash refunds</span>
                <span className="bz-kpi__value">−{m(data.drawer.refundedCash)}</span>
              </div>
            )}
            <div className="bz-kpi">
              <span className="bz-kpi__label">Expected in drawer</span>
              <span className="bz-kpi__value">{m(data.drawer.expected)}</span>
              <span className="bz-kpi__note">plus your opening float</span>
            </div>
          </div>
        </article>

        <article className="bz-tile bz-c7">
          <div className="bz-row bz-row--center">
            <h2 className="bz-title">Payments</h2>
            <a href="#manage" className="bz-link">All receipts</a>
          </div>
          {data.recent.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner" style={{ minWidth: 560 }}>
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>Time</span><span>Order</span><span>Method</span><span>Amount</span><span>Status</span>
                </div>
                {data.recent.map((p) => (
                  <div key={p.id} className="bz-table__row" style={{ gridTemplateColumns: COLS, minHeight: 54 }}>
                    <span className="bz-mono bz-sub">{clockTime(p.at, timezone)}</span>
                    <span className="bz-mono" style={{ fontWeight: 700 }}>{p.ref}</span>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.method}</span>
                    <span className="bz-mono">{p.amount < 0 ? `−${m(-p.amount)}` : m(p.amount)}</span>
                    <span className={badgeClass(p.status.tone)}>{p.status.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No payments yet today">
              <span>Every payment taken on the till, at the table or through the QR menu lists here as it happens.</span>
              <Link href="/pos" className="bz-btn bz-btn--lime" style={{ marginTop: 6 }}>Take the first payment</Link>
            </Empty>
          )}
        </article>

        <article className="bz-tile bz-c5">
          <div className="bz-row">
            <h2 className="bz-title">Paid through apps</h2>
            <span className="bz-meta">settled by the app</span>
          </div>
          {data.appOrders.length > 0 ? (
            <>
              {data.appOrders.map((a) => (
                <div key={a.source} className="bz-pillrow" style={{ borderRadius: 16, paddingRight: 16 }}>
                  <span className="bz-grow" style={{ fontWeight: 700, fontSize: 14 }}>{a.source}</span>
                  <span className="bz-sub" style={{ fontSize: 13 }}>{plural(a.count, 'order')}</span>
                  <span className="bz-mono" style={{ fontWeight: 700 }}>{m(a.total)}</span>
                </div>
              ))}
              <span className="bz-sub">Gross order value. The app pays out after its commission and fees.</span>
              <Link href="/dashboard/reconciliation" className="bz-link">Match app payouts</Link>
            </>
          ) : (
            <Empty title="No app orders today">Orders from DoorDash, Uber Eats and your own online menu show here with what each app owes you.</Empty>
          )}
        </article>
      </section>
    </>
  )
}
