import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { initials } from '@/lib/bento/time'
import type { CustomersBoard } from '@/lib/bento/customers-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: CustomersBoard
  currency: string
}

/** Customers · feedback board. */
export function CustomersBoardView({ data, currency }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const maxMonth = Math.max(...data.months.map((x) => x.value), 0)
  const headline =
    data.totalGuests === 0
      ? 'No guest profiles yet.'
      : `${plural(data.guestsThisMonth, 'guest')} in ${data.monthName}.${data.winBack.count > 0 ? ` ${data.winBack.count} worth winning back.` : ''}`
  const returningPct = data.guestsThisMonth > 0 ? Math.round((data.returningThisMonth / data.guestsThisMonth) * 100) : null

  return (
    <>
      <PageHead
        eyebrow="Customers · feedback"
        title={headline}
        actions={
          <>
            <a href="#manage" className="bz-btn bz-btn--outline">Guest list</a>
            <a href="#manage" className="bz-btn bz-btn--ink">New campaign</a>
          </>
        }
      />

      <section className="bz-grid" aria-label="Guests at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c5 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 110, right: -8, top: 4 }}>GUESTS</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>Guests this month</h2>
            <span className="bz-big" style={{ fontSize: 60 }}>{data.guestsThisMonth}</span>
            <span className="bz-sub">
              {data.monthName}
              {returningPct !== null ? ` · ${returningPct}% returning · ${100 - returningPct}% new` : ' · no visits recorded yet'}
            </span>
          </div>
          {maxMonth > 0 ? (
            <div className="bz-bars bz-bars--sm bz-push" style={{ height: 200 }}>
              {data.months.map((x, i) => (
                <div className="bz-bar" key={x.key} style={{ gap: 6 }}>
                  <span className="bz-bar__val" style={{ fontSize: 11 }}>{x.value > 0 ? x.value : ''}</span>
                  <div
                    className={`bz-bar__fill${x.current ? ' bz-bar__fill--hi' : ''}`}
                    style={{ height: Math.max(6, Math.round((x.value / maxMonth) * 150)), ['--i' as string]: i }}
                  />
                  <span className="bz-bar__label" style={{ fontSize: 12 }}>{x.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No guest visits recorded yet">
              Guests appear here once orders are linked to a profile at the till, on the QR menu or in online checkout.
            </Empty>
          )}
        </article>

        <article className="bz-tile bz-c4 bz-r2">
          <div className="bz-row">
            <h2 className="bz-title">Recent feedback</h2>
            <span className="bz-meta">reviews</span>
          </div>
          <Empty title="No review source connected">
            <span>Google, Zomato and after-payment QR ratings can be shown here once a review feed is connected in Settings.</span>
            <Link href="/dashboard/settings" className="bz-btn bz-btn--lime" style={{ marginTop: 6 }}>Open settings</Link>
          </Empty>
        </article>

        <article className="bz-tile bz-tile--ink bz-c3">
          <div className="bz-row">
            <h2 className="bz-title">Loyalty</h2>
            <span className="bz-meta">{data.loyalty?.enabled ? 'live' : 'off'}</span>
          </div>
          {data.loyalty ? (
            <div className="bz-kpis" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
              <div className="bz-kpi">
                <span className="bz-kpi__label">Members with points</span>
                <span className="bz-kpi__value">{data.loyalty.members}</span>
              </div>
              <div className="bz-kpi">
                <span className="bz-kpi__label">Points issued · {data.monthName.slice(0, 3)}</span>
                <span className="bz-kpi__value">{data.loyalty.issued.toLocaleString()}</span>
              </div>
              <div className="bz-kpi">
                <span className="bz-kpi__label">Redeemed</span>
                <span className="bz-kpi__value">{data.loyalty.redeemed.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <Empty title="Loyalty is not set up">
              <span>Turn it on to reward repeat guests with points at checkout.</span>
            </Empty>
          )}
          <Link href="/dashboard/loyalty" className="bz-link bz-push">Loyalty settings</Link>
        </article>

        <article className="bz-tile bz-tile--ink bz-c3">
          <h2 className="bz-title">Win-back</h2>
          <span className="bz-big bz-big--md bz-mono" style={{ color: 'var(--bz-lime)', fontWeight: 800 }}>{data.winBack.count}</span>
          <span className="bz-sub">regulars haven’t visited in 60 days</span>
          {data.winBack.sample.length > 0 && (
            <div className="bz-stack" style={{ gap: 4 }}>
              {data.winBack.sample.map((g) => (
                <span key={g.id} className="bz-sub" style={{ fontSize: 13 }}>
                  {g.name} · {g.daysAway} days
                </span>
              ))}
            </div>
          )}
          <a href="#manage" className={`bz-btn bz-btn--block bz-push ${data.winBack.count > 0 ? 'bz-btn--lime' : 'bz-btn--ghost-night'}`}>
            {data.winBack.count > 0 ? 'Send an offer' : 'Campaigns'}
          </a>
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Top guests</h2>
            <span className="bz-meta">by spend · all time</span>
          </div>
          {data.topGuests.length > 0 ? (
            data.topGuests.map((g) => (
              <div key={g.id} className="bz-item">
                <span aria-hidden="true" className="bz-ini">{initials(g.name)}</span>
                <div className="bz-item__body">
                  <span className="bz-item__name" style={{ fontSize: 14 }}>{g.name}</span>
                  <span className="bz-item__sub">
                    {plural(g.visits, 'visit')} · {g.note}
                  </span>
                </div>
                <span className="bz-mono" style={{ fontWeight: 700 }}>{m(g.spend)}</span>
              </div>
            ))
          ) : (
            <Empty title="No guest profiles yet">Add a guest at the till or let them join from the QR menu, and the regulars rise to the top here.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Ratings by source</h2>
            <span className="bz-meta">last 30 days</span>
          </div>
          <Empty title="No ratings yet">
            Ratings asked right after a QR payment come in most often. They will be listed here by source once a review feed is connected.
          </Empty>
        </article>
      </section>
    </>
  )
}
