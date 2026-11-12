import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import type { OwnerOverview } from '@/lib/bento/owner-overview'
import { clockTime, initials } from '@/lib/bento/time'
import { SalesHeroTile, SalesRangeProvider, SalesRangeToggle } from './SalesRange'

interface Props {
  data: OwnerOverview
  currency: string
  roleLabel: string
  headline: string
}

/** Owner / Manager overview, laid out exactly like the "Owner / Manager · Overview" board. */
export function OwnerOverviewView({ data, currency, roleLabel, headline }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const tz = data.timezone
  const ch = data.channels
  const chTotal = ch.pos + ch.qr + ch.online

  return (
    <SalesRangeProvider>
      <div className="bz-head">
        <div className="bz-head__text">
          <span className="bz-eyebrow">{roleLabel}</span>
          <h1 className="bz-h1">{headline}</h1>
        </div>
        <SalesRangeToggle />
      </div>

      <section className="bz-grid bz-grid--overview" aria-label="Today at a glance" style={{ marginTop: 20 }}>
        <SalesHeroTile data={data.sales} />

        {/* Right now */}
        <article className="bz-tile bz-c3">
          <h2 className="bz-title">Right now</h2>
          <Link href="/dashboard/orders" className="bz-pillrow bz-pillrow--ink">
            <span>New orders</span>
            <span className="bz-pillrow__n">{data.rightNow.newOrders}</span>
          </Link>
          <Link href="/dashboard/reservations" className="bz-pillrow">
            <span>Reservations</span>
            <span className="bz-pillrow__n">{data.rightNow.reservations}</span>
          </Link>
          <Link href="/dashboard/waitlist" className="bz-pillrow">
            <span>Waitlist</span>
            <span className="bz-pillrow__n">{data.rightNow.waitlist}</span>
          </Link>
        </article>

        {/* Needs you */}
        <article className="bz-tile bz-tile--ink bz-c3">
          <div className="bz-row bz-row--center" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <span className={`bz-dot${data.needsYou ? ' bz-dot--live' : ''}`} />
            <span className="bz-eyebrow" style={{ fontSize: 12, color: '#A1A1AA' }}>Needs you</span>
          </div>
          {data.needsYou ? (
            <>
              <span style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>{data.needsYou.title}</span>
              <span className="bz-sub">
                {[data.needsYou.total !== null ? m(data.needsYou.total) : null, data.needsYou.detail].filter(Boolean).join(' · ')}
              </span>
              <Link href={data.needsYou.href} className="bz-btn bz-btn--lime bz-btn--block bz-push" style={{ height: 48, borderRadius: 14, fontSize: 15 }}>
                {data.needsYou.cta}
              </Link>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>All clear on the floor</span>
              <span className="bz-sub">No bills or ready plates are waiting.</span>
              <Link href="/dashboard/tables" className="bz-btn bz-btn--ghost-night bz-btn--block bz-push" style={{ height: 48, borderRadius: 14 }}>
                Open floor plan
              </Link>
            </>
          )}
        </article>

        {/* Top dishes */}
        <article className="bz-tile bz-c3">
          <div className="bz-row">
            <h2 className="bz-title">Top dishes</h2>
            <Link href="/dashboard/menu" className="bz-link">Menu</Link>
          </div>
          {data.topDishes.length > 0 ? (
            <div className="bz-list" style={{ gap: 14 }}>
              {data.topDishes.map((d) => (
                <div className="bz-item" key={d.id}>
                  <span className="bz-thumb" aria-hidden="true">
                    {d.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <DishIcon />
                    )}
                  </span>
                  <div className="bz-item__body">
                    <span className="bz-item__name">{d.name}</span>
                    <span className="bz-item__sub">{d.sold} sold {data.topDishesWindow === 'today' ? 'today' : 'this week'}</span>
                  </div>
                  <span className="bz-mono" style={{ fontSize: 14, fontWeight: 600 }}>{m(d.price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bz-empty">
              <strong>Nothing sold yet</strong>
              Your best sellers appear after the first orders.
            </div>
          )}
        </article>

        {/* Today so far */}
        <article className="bz-tile bz-tile--accent bz-c3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignContent: 'start' }}>
          <h2 className="bz-title" style={{ gridColumn: '1 / -1' }}>Today so far</h2>
          <div className="bz-kpi">
            <span className="bz-kpi__label">Net sales</span>
            <span className="bz-kpi__value bz-kpi__value--lime">{m(data.today.netSales)}</span>
          </div>
          <div className="bz-kpi">
            <span className="bz-kpi__label">Covers</span>
            <span className="bz-kpi__value">{data.today.covers}</span>
          </div>
          <div className="bz-kpi">
            <span className="bz-kpi__label">Avg ticket</span>
            <span className="bz-kpi__value">{data.today.avgTicket === null ? '–' : m(data.today.avgTicket)}</span>
          </div>
          <div className="bz-kpi">
            <span className="bz-kpi__label">Tables in use</span>
            <span className="bz-kpi__value">{data.tables.seated}/{data.tables.total}</span>
          </div>
        </article>

        {/* Coming up (reservations) */}
        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Coming up</h2>
            <Link href="/dashboard/reservations" className="bz-link">Reservations</Link>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div className="bz-stack" style={{ gap: 2 }}>
              <span className="bz-big" style={{ fontSize: 48 }}>{data.reservationsTonight}</span>
              <span className="bz-sub" style={{ fontSize: 13 }}>bookings left today</span>
            </div>
          </div>
          {data.comingUp.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.comingUp.map((r) => (
                <div key={r.id} className="bz-item" style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--bz-soft)' }}>
                  <span className="bz-mono" style={{ fontWeight: 700, fontSize: 14, minWidth: 48 }}>{clockTime(r.time, tz)}</span>
                  <div className="bz-item__body">
                    <span className="bz-item__name" style={{ fontSize: 14 }}>{r.name}</span>
                    <span className="bz-item__sub">
                      {r.party} guest{r.party === 1 ? '' : 's'}
                      {r.table ? ` · ${r.table}` : ' · no table yet'}
                    </span>
                  </div>
                  <span className={`bz-badge${r.status === 'CONFIRMED' ? ' bz-badge--ink' : ''}`}>{r.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bz-empty">
              <strong>No more bookings today</strong>
              Walk-ins go on the waitlist.
            </div>
          )}
        </article>

        {/* Channels (delivery tile) */}
        <article className="bz-tile bz-tile--flush bz-c5" style={{ minHeight: 260 }}>
          <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 560 300" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
            <rect width="560" height="300" fill="var(--bz-map-ground, #F4F3F7)" className="bz-map-ground" />
            <path d="M0 70 H560 M0 190 H560 M120 0 V300 M300 0 V300 M450 0 V300" stroke="var(--bz-map-road, #FFFFFF)" strokeWidth="14" />
            <path d="M0 250 L560 120" stroke="var(--bz-map-road, #FFFFFF)" strokeWidth="20" />
            <rect x="320" y="200" width="110" height="80" rx="10" fill="var(--bz-map-block, #E4E4E8)" />
            <rect x="140" y="90" width="140" height="80" rx="10" fill="var(--bz-map-block, #E4E4E8)" />
            <path d="M130 250 V190 H300 V70 H440" fill="none" stroke="#6835F9" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 12" />
            <circle cx="130" cy="250" r="10" fill="#D4FF3F" stroke="#141416" strokeWidth="4" />
            <circle cx="440" cy="70" r="14" fill="#6835F9" />
            <circle cx="440" cy="70" r="5" fill="#FFFFFF" />
          </svg>
          <div style={{ position: 'relative', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: 12 }}>
            <div className="bz-row bz-row--wrap" style={{ gap: 10 }}>
              <h2 className="bz-chip bz-chip--plain" style={{ fontWeight: 800, fontSize: 16, padding: '8px 14px' }}>Orders by channel</h2>
              <span className="bz-chip bz-chip--plain" style={{ fontWeight: 600, padding: '8px 14px' }}>
                POS {ch.pos} · QR {ch.qr} · Online {ch.online}
              </span>
            </div>
            {data.liveOnline ? (
              <Link href="/dashboard/online-orders" className="bz-darkrow bz-darkrow--pad" style={{ alignSelf: 'flex-start', borderRadius: 18, padding: '12px 16px', gap: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{data.liveOnline.label}</span>
                {data.liveOnline.detail && <span className="bz-darkrow__amt" style={{ fontSize: 13 }}>{data.liveOnline.detail}</span>}
              </Link>
            ) : (
              <span className="bz-darkrow bz-darkrow--pad" style={{ alignSelf: 'flex-start', borderRadius: 18, padding: '12px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {chTotal === 0 ? 'No orders yet today' : 'No online orders in progress'}
                </span>
              </span>
            )}
          </div>
        </article>

        {/* On shift */}
        <article className="bz-tile bz-tile--ink bz-c3 bz-ov-shift">
          <div className="bz-row">
            <h2 className="bz-title">On shift</h2>
            {data.laborPct !== null && <span className="bz-meta">Labour {Math.round(data.laborPct)}%</span>}
          </div>
          {data.onShift.length > 0 ? (
            <div className="bz-list" style={{ gap: 14 }}>
              {data.onShift.slice(0, 4).map((p) => (
                <div className="bz-item" key={p.id}>
                  <span className="bz-ini">{initials(p.name)}</span>
                  <div className="bz-item__body">
                    <span className="bz-item__name" style={{ fontSize: 14 }}>{p.name}</span>
                    <span className="bz-item__sub">{p.role}</span>
                  </div>
                  <span className="bz-meta" style={{ fontSize: 12 }}>
                    <span className="bz-sr">Clocked in at </span>
                    {clockTime(p.since, tz)}
                  </span>
                </div>
              ))}
              {data.onShift.length > 4 && (
                <span className="bz-meta" style={{ fontSize: 12 }}>+{data.onShift.length - 4} more on shift</span>
              )}
            </div>
          ) : (
            <div className="bz-empty">
              <strong>Nobody clocked in</strong>
              Staff appear here when they clock in.
            </div>
          )}
          <Link href="/dashboard/attendance" className="bz-link bz-push">Attendance</Link>
        </article>
      </section>
    </SalesRangeProvider>
  )
}

function DishIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="13" r="7" />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M3 5v5M5 5v5M4 10v9M20 5c-1.5 1-2 3-2 5h2v9" />
    </svg>
  )
}
