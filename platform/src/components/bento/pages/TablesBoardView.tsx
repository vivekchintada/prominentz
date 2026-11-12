import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { clockTime, durationLabel, initials } from '@/lib/bento/time'
import { TABLE_STATE_LABEL, type TableState, type TablesBoard } from '@/lib/bento/tables-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: TablesBoard
  currency: string
  timezone: string
}

const LEGEND: TableState[] = ['free', 'reserved', 'seated', 'eating', 'ready', 'bill']

/** Tables · floor plan board. */
export function TablesBoardView({ data, currency, timezone }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const headline = data.total === 0 ? 'No tables set up yet.' : `${data.seated} of ${data.total} tables seated.`
  const sp = data.spotlight

  return (
    <>
      <PageHead
        eyebrow="Tables · floor plan"
        title={headline}
        actions={
          <>
            <Link href="/dashboard/tables/qr" className="bz-btn bz-btn--outline">QR codes</Link>
            <a href="#manage" className="bz-btn bz-btn--ink">Edit floor plan</a>
          </>
        }
      />

      <section className="bz-grid" aria-label="Floor at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-c8 bz-r2">
          <div className="bz-row">
            <h2 className="bz-title">Floor plan</h2>
            <span className="bz-meta">{plural(data.total, 'table')}</span>
          </div>
          {data.floors.length > 0 ? (
            <div className="bz-stack bz-stack--lg">
              {data.floors.map((f) => (
                <div key={f.name} className="bz-floor__group">
                  {data.floors.length > 1 && <span className="bz-floor__label">{f.name}</span>}
                  <div className="bz-floor">
                    {f.tables.map((t) => (
                      <Link
                        key={t.id}
                        href={t.href}
                        className={`bz-ctable bz-ctable--${t.state}`}
                        aria-label={`${t.name}, ${TABLE_STATE_LABEL[t.state]}, seats ${t.capacity}`}
                      >
                        <span className="bz-ctable__name">{t.name}</span>
                        <span className="bz-ctable__state">
                          {TABLE_STATE_LABEL[t.state]} · {t.guests ?? t.capacity}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No tables yet">Add tables in the floor plan editor below and they show here live.</Empty>
          )}
          <div className="bz-legend bz-push" aria-label="Colour key">
            {LEGEND.map((s) => (
              <span key={s} className="bz-legend__item">
                <span className={`bz-legend__sw bz-legend__sw--${s}`} aria-hidden="true" />
                {TABLE_STATE_LABEL[s]}
              </span>
            ))}
          </div>
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          {sp ? (
            <>
              <div className="bz-row">
                <h2 className="bz-title bz-title--lg">{sp.name}</h2>
                <span className="bz-meta">{sp.server ? `server ${sp.server}` : 'no server'}</span>
              </div>
              <div className="bz-kpis" style={{ gap: 10 }}>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">Guests</span>
                  <span className="bz-kpi__value">{sp.guests}</span>
                </div>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">Seated</span>
                  <span className="bz-kpi__value">{durationLabel(sp.seatedMin)}</span>
                </div>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">Bill</span>
                  <span className="bz-kpi__value bz-kpi__value--lime">{m(sp.total)}</span>
                </div>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">{TABLE_STATE_LABEL[sp.state]}</span>
                  <span className="bz-kpi__value">{sp.waitMin === null ? '–' : `${sp.waitMin} min`}</span>
                </div>
              </div>
              <Link href={sp.href} className="bz-btn bz-btn--lime bz-btn--lg bz-btn--block bz-push">
                {sp.state === 'bill' ? 'Take payment' : 'Open table'}
              </Link>
            </>
          ) : (
            <>
              <h2 className="bz-title">Busiest table</h2>
              <Empty title="No tables in use">The table that needs you most shows here.</Empty>
            </>
          )}
        </article>

        <article className="bz-tile bz-tile--accent bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Waitlist</h2>
            <span className="bz-meta">{plural(data.waitlistCount, 'party', 'parties')}</span>
          </div>
          {data.waitlist.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.waitlist.map((w) => (
                <div key={w.id} className="bz-glassrow">
                  <span className="bz-grow" style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.name} · {w.party}
                  </span>
                  <span className="bz-mono" style={{ fontSize: 13, color: 'var(--bz-on-accent-muted)', whiteSpace: 'nowrap' }}>
                    {durationLabel(w.waited)} · quoted {w.quoted}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Nobody waiting">Walk-ins you add to the waitlist show here.</Empty>
          )}
          <Link href="/dashboard/waitlist" className="bz-btn bz-btn--lime bz-push">Open waitlist</Link>
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Sections now</h2>
            <span className="bz-meta">open tables per server</span>
          </div>
          {data.sections.length > 0 ? (
            <div className="bz-list" style={{ gap: 12 }}>
              {data.sections.map((s) => (
                <div key={s.server} className="bz-item">
                  <span className="bz-ini">{initials(s.server)}</span>
                  <div className="bz-item__body">
                    <span className="bz-item__name" style={{ fontSize: 14 }}>{s.server}</span>
                    <span className="bz-item__sub">{plural(s.guests, 'guest')}</span>
                  </div>
                  <span className="bz-mono" style={{ fontSize: 18, fontWeight: 700 }}>{s.tables}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No open tables">Servers and their tables appear once orders open.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Turn time</h2>
            <span className="bz-meta">today</span>
          </div>
          <span className="bz-big bz-big--md">{data.turn.avgMin === null ? '–' : `${data.turn.avgMin} min`}</span>
          <span className="bz-sub">Average from order opened to closed, dine-in</span>
          <div className="bz-row bz-push" style={{ fontSize: 14 }}>
            <span style={{ fontWeight: 700 }}>Tables turned</span>
            <span className="bz-mono">{data.turn.turnedToday}</span>
          </div>
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <h2 className="bz-title">Next reservations</h2>
          {data.nextBookings.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.nextBookings.map((b) => (
                <div key={b.id} className="bz-row" style={{ fontSize: 14, padding: '8px 0', borderBottom: '1px solid var(--bz-night-line)' }}>
                  <span style={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="bz-mono">{clockTime(b.time, timezone)}</span> · {b.name}, {b.party}
                  </span>
                  <span className="bz-mono" style={{ color: 'var(--bz-lime)', whiteSpace: 'nowrap' }}>{b.table ?? 'no table'}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No more bookings today" />
          )}
          <Link href="/dashboard/reservations" className="bz-link bz-push">Open reservations</Link>
        </article>
      </section>
    </>
  )
}
