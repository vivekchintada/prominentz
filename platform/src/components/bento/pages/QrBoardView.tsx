import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import type { QrBoard } from '@/lib/bento/qr-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: QrBoard
  currency: string
}

/** QR ordering board. */
export function QrBoardView({ data, currency }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const headline =
    data.qrSharePct === null ? 'No dine-in orders yet today.' : `QR orders are ${data.qrSharePct}% of dine-in today.`
  const maxTop = Math.max(...data.topItems.map((t) => t.sold), 0)

  return (
    <>
      <PageHead
        eyebrow="QR ordering · tables"
        title={headline}
        actions={
          <>
            <Link href="/dashboard/settings/ordering" className="bz-btn bz-btn--outline">Ordering settings</Link>
            <a href="#manage" className="bz-btn bz-btn--ink">Print QR codes</a>
          </>
        }
      />

      <section className="bz-grid" aria-label="QR ordering at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c4 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 130 }}>QR</span>
          {data.table ? (
            <>
              <div className="bz-stack" style={{ gap: 4 }}>
                <h2 className="bz-title">{data.table.name} code</h2>
                <span className="bz-sub">Guests scan, order and pay from their phone</span>
              </div>
              <div className="bz-qr" role="img" aria-label={`QR code for ${data.table.name}`} dangerouslySetInnerHTML={{ __html: data.table.svg }} />
              <div className="bz-row bz-row--wrap bz-push" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <a href="#manage" className="bz-btn bz-btn--lime bz-btn--lg">Download all {data.tableCount}</a>
                <a href={data.table.url} target="_blank" rel="noreferrer" className="bz-btn bz-btn--ghost-light bz-btn--lg">Preview</a>
              </div>
            </>
          ) : (
            <>
              <h2 className="bz-title">Table codes</h2>
              <Empty title="No tables yet">Add tables in the floor plan, then print a code for each one.</Empty>
              <Link href="/dashboard/tables" className="bz-btn bz-btn--lime bz-btn--lg bz-push">Set up tables</Link>
            </>
          )}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Waiting for approval</h2>
            <span className="bz-meta">{data.waiting.length}</span>
          </div>
          {data.waiting.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.waiting.map((w) => (
                <div key={w.id} className="bz-item" style={{ padding: '8px 8px 8px 14px', borderRadius: 16, background: 'var(--bz-soft)' }}>
                  <div className="bz-item__body">
                    <span className="bz-item__name" style={{ fontSize: 14 }}>{w.table} · {plural(w.items, 'item')} · {m(w.total)}</span>
                    <span className="bz-item__sub">{w.note || `${w.ref} · ${w.ago} min ago`}</span>
                  </div>
                  <Link href="/dashboard/online-orders" className="bz-btn bz-btn--ink bz-btn--sm">Review</Link>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Nothing to approve">QR orders that need a yes from staff show here.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">QR today</h2>
            <span className="bz-meta">{plural(data.today.dineIn, 'dine-in order')}</span>
          </div>
          <div className="bz-kpis" style={{ gap: 10 }}>
            <div className="bz-kpi">
              <span className="bz-kpi__label">QR orders</span>
              <span className="bz-kpi__value bz-kpi__value--lime">{data.today.orders}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Avg ticket</span>
              <span className="bz-kpi__value">{data.today.avgTicket === null ? '–' : m(data.today.avgTicket)}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Paid online</span>
              <span className="bz-kpi__value">{data.today.paidOnlinePct === null ? '–' : `${data.today.paidOnlinePct}%`}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Share of dine-in</span>
              <span className="bz-kpi__value">{data.qrSharePct === null ? '–' : `${data.qrSharePct}%`}</span>
            </div>
          </div>
        </article>

        <article className="bz-tile bz-c8">
          <div className="bz-row">
            <h2 className="bz-title">How the QR menu works</h2>
            <Link href="/dashboard/settings" className="bz-link">Change</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', columnGap: 24 }}>
            {data.options.map((o) => (
              <div key={o.name} className="bz-toggle-row">
                <div className="bz-stack" style={{ gap: 2 }}>
                  <span className="bz-toggle-row__name">{o.name}</span>
                  <span className="bz-sub" style={{ fontSize: 13 }}>{o.detail}</span>
                </div>
                <span className={o.on ? 'bz-on' : 'bz-off'}>{o.on ? 'On' : 'Off'}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="bz-tile bz-tile--ink bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Floor calls</h2>
            <span className="bz-meta">open</span>
          </div>
          {data.calls.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.calls.map((c) => (
                <div key={c.id} className="bz-darkrow" style={{ background: 'var(--bz-night-3)', paddingRight: 16 }}>
                  <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{c.table ? `${c.table} · ` : ''}{c.message}</span>
                  <span className="bz-darkrow__meta">{c.ago} min</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No open calls">Calls and ready plates waiting for the floor show here.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Most ordered by QR</h2>
            <span className="bz-meta">last 7 days</span>
          </div>
          {data.topItems.length > 0 ? (
            data.topItems.map((t, i) => (
              <div key={t.id} className="bz-stack">
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{t.name}</span>
                  <span className="bz-mono bz-sub">{t.sold}</span>
                </div>
                <div className="bz-meter">
                  <div className={`bz-meter__fill${i === 0 ? ' bz-meter__fill--accent' : ''}`} style={{ width: `${maxTop > 0 ? Math.max(4, (t.sold / maxTop) * 100) : 0}%` }} />
                </div>
              </div>
            ))
          ) : (
            <Empty title="No QR orders this week" />
          )}
        </article>
      </section>
    </>
  )
}
