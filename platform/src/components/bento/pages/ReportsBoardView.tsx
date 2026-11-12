import Link from 'next/link'
import { formatMoney, formatMoneyCompact } from '@/lib/money'
import { CHANNEL_LABEL, type Channel } from '@/lib/bento/channels'
import type { ReportsBoard } from '@/lib/bento/reports-page'
import { Empty, PageHead } from './parts'

interface Props {
  data: ReportsBoard
  currency: string
}

const CH_COLOR: Record<Channel, { bg: string; fg: string }> = {
  dine: { bg: 'var(--bz-ink)', fg: 'var(--bz-card)' },
  qr: { bg: 'var(--bz-accent)', fg: '#FFFFFF' },
  delivery: { bg: 'var(--bz-lime)', fg: '#141416' },
  pickup: { bg: 'var(--bz-line)', fg: 'var(--bz-ink)' },
}

function hourLabel(h: number): string {
  return String(h).padStart(2, '0')
}

/** Reports · sales and costs board. */
export function ReportsBoardView({ data, currency }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const monthName = data.monthName || 'This month'
  const maxMonth = Math.max(...data.months.map((x) => x.value), 0)
  const maxHour = Math.max(...data.hours.map((x) => x.orders), 0)
  const growth =
    data.growthPct === null
      ? ''
      : `, ${data.growthPct >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(data.growthPct))}%`
  const headline = data.monthSales > 0 ? `${monthName} so far: ${m(data.monthSales)} net sales${growth}.` : `No sales recorded in ${monthName} yet.`
  const prime = data.prime.foodPct !== null && data.prime.labourPct !== null ? data.prime.foodPct + data.prime.labourPct : null

  return (
    <>
      <PageHead
        eyebrow={`Reports · ${monthName}`}
        title={headline}
        actions={<a href="#manage" className="bz-btn bz-btn--ink">Detailed reports</a>}
      />

      <section className="bz-grid" aria-label="Month at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-tile--hero bz-c8 bz-r2">
          <span aria-hidden="true" className="bz-ghost">{monthName.slice(0, 3).toUpperCase()}</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero">Net sales by month</h2>
            <span className="bz-big">{m(data.monthSales)}</span>
            <span className="bz-sub">
              {monthName} so far
              {data.growthPct !== null ? ` · ${data.growthPct >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(data.growthPct))}% on the same days last month` : ''}
            </span>
          </div>
          <div className="bz-bars bz-push" style={{ height: 240 }}>
            {data.months.map((x, i) => (
              <div className="bz-bar" key={x.key}>
                <span className="bz-bar__val">{x.value > 0 ? formatMoneyCompact(x.value, currency) : ''}</span>
                <div
                  className={`bz-bar__fill${x.current ? ' bz-bar__fill--hi' : ''}`}
                  style={{ height: maxMonth > 0 ? Math.max(6, Math.round((x.value / maxMonth) * 170)) : 6, ['--i' as string]: i }}
                />
                <span className="bz-bar__label">{x.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Prime cost</h2>
            <span className="bz-meta">{monthName}</span>
          </div>
          <span className="bz-big bz-big--sm">{prime === null ? '–' : `${prime.toFixed(1)}%`}</span>
          <span className="bz-sub">Food plus labour, as a share of sales</span>
          <div className="bz-stack bz-push">
            <div className="bz-row" style={{ fontSize: 14 }}>
              <span>Food cost</span>
              <span className="bz-mono">{data.prime.foodPct === null ? 'add recipes' : `${data.prime.foodPct.toFixed(1)}%`}</span>
            </div>
            <div className="bz-meter"><div className="bz-meter__fill bz-meter__fill--lime" style={{ width: `${Math.min(100, data.prime.foodPct ?? 0)}%` }} /></div>
            <div className="bz-row" style={{ fontSize: 14 }}>
              <span>Labour</span>
              <span className="bz-mono">{data.prime.labourPct === null ? 'add pay rates' : `${data.prime.labourPct.toFixed(1)}%`}</span>
            </div>
            <div className="bz-meter"><div className="bz-meter__fill" style={{ width: `${Math.min(100, data.prime.labourPct ?? 0)}%` }} /></div>
          </div>
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Sales by channel</h2>
            <span className="bz-meta">share of orders</span>
          </div>
          {data.channels.length > 0 ? (
            <>
              <div className="bz-share" role="img" aria-label={data.channels.map((c) => `${CHANNEL_LABEL[c.channel]} ${c.share}%`).join(', ')}>
                {data.channels.filter((c) => c.share > 0).map((c) => (
                  <span key={c.channel} style={{ flex: c.share, background: CH_COLOR[c.channel].bg, color: CH_COLOR[c.channel].fg }}>
                    {c.share >= 12 ? `${c.share}%` : ''}
                  </span>
                ))}
              </div>
              <div className="bz-legend">
                {data.channels.map((c) => (
                  <span key={c.channel} className="bz-legend__item">
                    <span className="bz-legend__sw" style={{ background: CH_COLOR[c.channel].bg, borderColor: CH_COLOR[c.channel].bg }} aria-hidden="true" />
                    {CHANNEL_LABEL[c.channel]} <span className="bz-mono">{c.share}%</span>
                  </span>
                ))}
              </div>
              <div className="bz-kpis bz-push" style={{ gap: 10 }}>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">Avg ticket</span>
                  <span className="bz-kpi__value" style={{ fontSize: 18 }}>{data.avgTicket === null ? '–' : m(data.avgTicket)}</span>
                </div>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">Covers</span>
                  <span className="bz-kpi__value" style={{ fontSize: 18 }}>{data.covers.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <Empty title="No orders this month yet" />
          )}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Best sellers</h2>
            <span className="bz-meta">{monthName}</span>
          </div>
          {data.best.length > 0 ? (
            <div className="bz-list" style={{ gap: 0 }}>
              {data.best.map((b, i) => (
                <div key={b.id} className="bz-toggle-row">
                  <span className="bz-item__name" style={{ fontSize: 14 }}>
                    <span className="bz-mono bz-sub" style={{ marginRight: 8 }}>{i + 1}</span>
                    {b.name}
                  </span>
                  <span className="bz-mono" style={{ fontSize: 14 }}>{b.sold.toLocaleString()} sold</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Nothing sold yet this month" />
          )}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Busiest hours</h2>
            <span className="bz-meta">orders this month</span>
          </div>
          {data.hours.length > 0 ? (
            <div className="bz-bars bz-bars--sm" style={{ height: 150 }}>
              {data.hours.map((h, i) => (
                <div className="bz-bar" key={h.hour} style={{ gap: 6 }}>
                  <span className="bz-bar__val" style={{ fontSize: 10, color: 'var(--bz-muted)', fontWeight: 400 }}>{h.orders || ''}</span>
                  <div
                    className={`bz-bar__fill${h.orders === maxHour ? ' bz-bar__fill--hi' : ''}`}
                    style={{ height: maxHour > 0 ? Math.max(4, Math.round((h.orders / maxHour) * 100)) : 4, ['--i' as string]: i }}
                  />
                  <span className="bz-bar__label" style={{ fontSize: 11 }}>{hourLabel(h.hour)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No orders this month yet" />
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Download</h2>
            <span className="bz-meta">ready to send</span>
          </div>
          <div className="bz-list" style={{ gap: 8 }}>
            {data.exports.map((e) => (
              <a key={e.href} href={e.href} download className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
                <span className="bz-stack" style={{ gap: 0, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{e.label}</span>
                  <span className="bz-darkrow__meta" style={{ fontSize: 12 }}>{e.detail}</span>
                </span>
                <span className="bz-btn bz-btn--lime bz-btn--sm" aria-hidden="true">Download</span>
              </a>
            ))}
            <Link href="/dashboard/labor" className="bz-darkrow" style={{ background: 'var(--bz-night-3)' }}>
              <span className="bz-stack" style={{ gap: 0, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Payroll hours</span>
                <span className="bz-darkrow__meta" style={{ fontSize: 12 }}>Timesheets page</span>
              </span>
              <span className="bz-btn bz-btn--ghost-night bz-btn--sm" aria-hidden="true">Open</span>
            </Link>
          </div>
        </article>
      </section>
    </>
  )
}
