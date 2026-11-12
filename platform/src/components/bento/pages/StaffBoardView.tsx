import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { clockTime, durationLabel, initials, localParts } from '@/lib/bento/time'
import type { StaffBoard } from '@/lib/bento/staff-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: StaffBoard
  currency: string
  timezone: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ROTA_COLS = 'minmax(120px, 1.4fr) repeat(7, minmax(64px, 1fr))'

/** Staff · shifts and rota board. */
export function StaffBoardView({ data, currency, timezone }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const hm = (d: Date) => {
    const t = clockTime(d, timezone)
    return t.endsWith(':00') ? t.slice(0, 2) : t
  }
  const l = data.labour
  const headline =
    l.onShift === 0
      ? 'Nobody is clocked in right now.'
      : `${l.onShift} on shift now.${l.pct !== null ? ` Labour is ${Math.round(l.pct)}% of sales.` : ''}`
  const maxGroup = Math.max(...data.hoursByGroup.map((g) => g.hours), 0)

  return (
    <>
      <PageHead
        eyebrow="Staff · shifts"
        title={headline}
        actions={
          <>
            <Link href="/dashboard/attendance" className="bz-btn bz-btn--outline">Attendance</Link>
            <Link href="/dashboard/schedule" className="bz-btn bz-btn--ink">Open schedule</Link>
          </>
        }
      />

      <section className="bz-grid" aria-label="Team at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c4">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 120 }}>PAY</span>
          <h2 className="bz-title">Labour today</h2>
          <span className="bz-big bz-big--md">{l.cost === null ? '–' : m(l.cost)}</span>
          <span className="bz-sub">
            {l.cost === null
              ? 'Add hourly rates in People to see labour cost'
              : l.pct === null
                ? 'No sales yet today to compare with'
                : `${Math.round(l.pct)}% of ${m(l.sales)} sales`}
          </span>
          <div className="bz-kpis bz-push" style={{ gap: 10 }}>
            <div className="bz-kpi">
              <span className="bz-kpi__label">Hours</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{l.hours.toFixed(1)} h</span>
            </div>
            <div className="bz-kpi">
              <span className="bz-kpi__label">On shift</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{l.onShift}</span>
            </div>
          </div>
        </article>

        <article className="bz-tile bz-c8 bz-r2">
          <div className="bz-row bz-row--center bz-row--wrap">
            <h2 className="bz-title">This week’s rota</h2>
            <Link href="/dashboard/schedule" className="bz-btn bz-btn--lime bz-btn--sm">Edit rota</Link>
          </div>
          {data.rota.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner" style={{ minWidth: 720 }}>
                <div className="bz-table__head" style={{ gridTemplateColumns: ROTA_COLS }}>
                  <span>Person</span>
                  {DAYS.map((d, i) => (
                    <span key={d} style={{ textAlign: 'center', color: i === data.week.todayIndex ? 'var(--bz-ink)' : undefined }}>
                      {d}
                    </span>
                  ))}
                </div>
                {data.rota.map((p) => (
                  <div key={p.id} className="bz-table__row" style={{ gridTemplateColumns: ROTA_COLS }}>
                    <div className="bz-stack" style={{ gap: 0 }}>
                      <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span className="bz-sub" style={{ fontSize: 12 }}>{p.role}</span>
                    </div>
                    {p.days.map((d, i) => (
                      <span
                        key={i}
                        className={`bz-rota-cell${d ? '' : ' bz-rota-cell--off'}${i === data.week.todayIndex && d ? ' bz-rota-cell--today' : ''}`}
                      >
                        {d ? `${hm(d.start)}–${d.end ? hm(d.end) : '?'}` : 'off'}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No shifts this week">Build and publish the rota in Schedule and it shows here.</Empty>
          )}
          {data.rotaMore > 0 && <span className="bz-sub">and {plural(data.rotaMore, 'more person', 'more people')} in Schedule</span>}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Swap requests</h2>
            <span className="bz-meta">{data.swaps.length}</span>
          </div>
          {data.swaps.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.swaps.map((s) => (
                <div key={s.id} style={{ background: 'var(--bz-night-3)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {s.who}
                    {s.to ? ` → ${s.to}` : ' · open swap'}
                    {s.when ? ` · ${localParts(s.when, timezone).weekday} ${hm(s.when)}` : ''}
                  </span>
                  <span className="bz-sub" style={{ fontSize: 13 }}>
                    {[s.reason, s.waitingOn === 'peer' ? 'waiting on coworker' : 'waiting on you'].filter(Boolean).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No swap requests" />
          )}
          <Link href="/dashboard/approvals" className="bz-btn bz-btn--lime bz-push">Review approvals</Link>
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Clocked in now</h2>
            <span className="bz-meta">{l.onShift}</span>
          </div>
          {data.clockedIn.length > 0 ? (
            <div className="bz-list" style={{ gap: 12 }}>
              {data.clockedIn.map((c) => (
                <div key={c.id} className="bz-item">
                  <span className="bz-ini">{initials(c.name)}</span>
                  <div className="bz-item__body">
                    <span className="bz-item__name" style={{ fontSize: 14 }}>{c.name}</span>
                    <span className="bz-item__sub">{c.role} · since {clockTime(c.since, timezone)}</span>
                  </div>
                  <span className="bz-meta" style={{ fontSize: 12 }}>{durationLabel(c.mins)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Nobody clocked in">Staff appear here when they clock in.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Hours this week</h2>
            <span className="bz-meta">from clock-ins</span>
          </div>
          {data.hoursByGroup.length > 0 ? (
            data.hoursByGroup.map((g, i) => (
              <div key={g.label} className="bz-stack">
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{g.label}</span>
                  <span className="bz-mono bz-sub">{Math.round(g.hours)} h</span>
                </div>
                <div className="bz-meter">
                  <div className={`bz-meter__fill${i === 0 ? ' bz-meter__fill--accent' : ''}`} style={{ width: `${maxGroup > 0 ? Math.max(4, (g.hours / maxGroup) * 100) : 0}%` }} />
                </div>
              </div>
            ))
          ) : (
            <Empty title="No hours logged this week" />
          )}
          <Link href="/dashboard/labor" className="bz-link bz-push">Timesheets and payroll export</Link>
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Tips today</h2>
            <span className="bz-meta">by server</span>
          </div>
          <span className="bz-big bz-big--sm" style={{ color: 'var(--bz-lime)' }}>{m(data.tips.total)}</span>
          {data.tips.byServer.length > 0 ? (
            data.tips.byServer.map((t) => (
              <div key={t.name} className="bz-row" style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--bz-night-line)' }}>
                <span>{t.name}</span>
                <span className="bz-mono" style={{ color: 'var(--bz-on-night-soft)' }}>{m(t.amount)}</span>
              </div>
            ))
          ) : (
            <span className="bz-sub">No tips recorded on today’s payments yet.</span>
          )}
        </article>
      </section>
    </>
  )
}
