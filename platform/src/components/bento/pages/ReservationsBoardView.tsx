import Link from 'next/link'
import { clockTime, durationLabel } from '@/lib/bento/time'
import type { BookingState, ReservationsBoard } from '@/lib/bento/reservations-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: ReservationsBoard
  timezone: string
}

const KEY: { state: BookingState; label: string }[] = [
  { state: 'gone', label: 'Cancelled or no-show' },
  { state: 'seated', label: 'Seated' },
  { state: 'next', label: 'Arriving next' },
  { state: 'booked', label: 'Booked' },
]

/** Reservations · today board. */
export function ReservationsBoardView({ data, timezone }: Props) {
  const day = data.weekday || 'Today'
  const headline = data.bookings === 0 ? 'No bookings today yet.' : `Today: ${plural(data.bookings, 'booking')}, ${plural(data.covers, 'cover')}.`
  const maxCovers = Math.max(...data.coversByHour.map((c) => c.covers), 0)
  const n = data.next

  return (
    <>
      <PageHead
        eyebrow={`Reservations · ${day}`}
        title={headline}
        actions={
          <>
            <Link href="/dashboard/waitlist" className="bz-btn bz-btn--outline">Waitlist</Link>
            <a href="#manage" className="bz-btn bz-btn--ink">New booking</a>
          </>
        }
      />

      <section className="bz-grid" aria-label="Bookings at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-c8 bz-r2">
          <div className="bz-row">
            <h2 className="bz-title">Today</h2>
            <span className="bz-meta">{plural(data.bookings, 'booking')} · {plural(data.covers, 'cover')}</span>
          </div>
          {data.slots.length > 0 ? (
            <div className="bz-slots">
              {data.slots.map((s) => (
                <div key={s.time} className="bz-slot">
                  <span className="bz-slot__time">{s.time}</span>
                  <div className="bz-slot__list">
                    {s.list.map((b) => (
                      <span key={b.id} className={`bz-booking bz-booking--${b.state}`} title={b.note ?? undefined}>
                        {b.name} · {b.party}
                        {b.table && <span className="bz-booking__t">{b.table}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No bookings today">New bookings from the form below show here by time.</Empty>
          )}
          <div className="bz-legend bz-push" aria-label="Colour key">
            {KEY.map((k) => (
              <span key={k.state} className="bz-legend__item">
                <span className={`bz-booking bz-booking--${k.state}`} style={{ minHeight: 18, width: 18, padding: 0, borderRadius: 5 }} aria-hidden="true" />
                {k.label}
              </span>
            ))}
          </div>
        </article>

        <article className="bz-tile bz-tile--accent bz-c4">
          {n ? (
            <>
              <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 96 }}>{clockTime(n.time, timezone)}</span>
              <h2 className="bz-title">Arriving next</h2>
              <div className="bz-stack" style={{ gap: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 24, lineHeight: 1.15 }}>{n.name} · {plural(n.party, 'guest')}</span>
                <span className="bz-sub">
                  {clockTime(n.time, timezone)} · {n.table ?? 'no table yet'} · {n.inMin > 0 ? `in ${n.inMin} min` : 'due now'}
                </span>
              </div>
              {n.note && (
                <div style={{ background: '#141416', borderRadius: 16, padding: '10px 14px', fontSize: 14 }}>
                  <span style={{ color: '#A1A1AA', fontSize: 12, fontWeight: 600 }}>Note</span>
                  <div style={{ fontWeight: 700 }}>{n.note}</div>
                </div>
              )}
              <div className="bz-row bz-push" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <a href="#manage" className="bz-btn bz-btn--lime">Seat or update</a>
                {n.phone && <a href={`tel:${n.phone}`} className="bz-btn bz-btn--ghost-light">Call</a>}
              </div>
            </>
          ) : (
            <>
              <h2 className="bz-title">Arriving next</h2>
              <Empty title="Nobody else booked today" />
            </>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Walk-in waitlist</h2>
            <span className="bz-meta">{data.waitlistCount}</span>
          </div>
          {data.waitlist.length > 0 ? (
            data.waitlist.map((w) => (
              <div key={w.id} className="bz-row" style={{ fontSize: 14, padding: '8px 0', borderBottom: '1px solid var(--bz-night-line)' }}>
                <span style={{ fontWeight: 700 }}>{w.name} · {w.party}</span>
                <span className="bz-mono" style={{ color: 'var(--bz-on-night-muted)' }}>{durationLabel(w.waited)} · quoted {w.quoted}</span>
              </div>
            ))
          ) : (
            <Empty title="Nobody waiting" />
          )}
          <Link href="/dashboard/waitlist" className="bz-btn bz-btn--lime bz-push">Add walk-in</Link>
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Covers by hour</h2>
            <span className="bz-meta">today</span>
          </div>
          {data.coversByHour.length > 0 ? (
            <div className="bz-bars bz-bars--sm" style={{ height: 150 }}>
              {data.coversByHour.map((c, i) => (
                <div className="bz-bar" key={c.hour} style={{ gap: 6 }}>
                  <span className="bz-bar__val" style={{ fontSize: 11, color: 'var(--bz-muted)', fontWeight: 400 }}>{c.covers || ''}</span>
                  <div
                    className={`bz-bar__fill${c.covers === maxCovers ? ' bz-bar__fill--hi' : ''}`}
                    style={{ height: maxCovers > 0 ? Math.max(4, Math.round((c.covers / maxCovers) * 100)) : 4, ['--i' as string]: i }}
                  />
                  <span className="bz-bar__label" style={{ fontSize: 12 }}>{String(c.hour).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No covers booked today" />
          )}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Special requests</h2>
            <span className="bz-meta">{data.requests.length}</span>
          </div>
          {data.requests.length > 0 ? (
            <div className="bz-list" style={{ gap: 0 }}>
              {data.requests.map((r) => (
                <div key={r.id} className="bz-toggle-row" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>{r.who}</span>
                  <span className="bz-sub" style={{ textAlign: 'right' }}>{r.note}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No notes on today’s bookings" />
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Last 30 days</h2>
            <span className="bz-meta">{plural(data.month.total, 'booking')}</span>
          </div>
          <div className="bz-kpis" style={{ gap: 10 }}>
            <div className="bz-kpi">
              <span className="bz-kpi__label">No-shows</span>
              <span className="bz-kpi__value">{data.month.noShowPct === null ? '–' : `${data.month.noShowPct}%`}</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Cancelled</span>
              <span className="bz-kpi__value">{data.month.cancelPct === null ? '–' : `${data.month.cancelPct}%`}</span>
            </div>
          </div>
          <div className="bz-row bz-push" style={{ fontSize: 14 }}>
            <span style={{ fontWeight: 700 }}>Booked for the next 7 days</span>
            <span className="bz-mono" style={{ color: 'var(--bz-lime)' }}>{data.month.nextWeek}</span>
          </div>
        </article>
      </section>
    </>
  )
}
