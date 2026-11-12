'use client'

import Link from 'next/link'
import { useMoney } from '@/components/providers/CurrencyProvider'
import type { CaptainData, TableState } from '@/lib/bento/captain'
import { durationLabel, minutesBetween } from '@/lib/bento/time'
import { CaptainBell, CaptainFrame } from './CaptainFrame'
import { CALL_LABEL, shortTable, useCaptainLive } from './useCaptainLive'

const STATE: Record<TableState, { label: string; cls: string }> = {
  bill: { label: 'Bill asked', cls: 'bz-ctable--bill' },
  ready: { label: 'Food ready', cls: 'bz-ctable--ready' },
  kitchen: { label: 'In kitchen', cls: 'bz-ctable--kitchen' },
  eating: { label: 'Eating', cls: 'bz-ctable--eating' },
  seated: { label: 'Seated', cls: 'bz-ctable--seated' },
  free: { label: 'Free', cls: 'bz-ctable--free' },
}

interface Props {
  data: CaptainData
  firstName: string
  homeHref: string | null
  onSignOut: () => void
}

/** Captain / Server phone · Tables tab. */
export function BentoCaptain({ data, firstName, homeHref, onSignOut }: Props) {
  const { money } = useMoney()
  const { calls, ack, now } = useCaptainLive(data.locationId)

  const shift = data.shiftStartedAt ? `on shift ${durationLabel(minutesBetween(new Date(data.shiftStartedAt), now))}` : 'not clocked in'
  const ghost = data.needsYou ? shortTable(data.needsYou.tableName) : ''

  return (
    <CaptainFrame active="tables" firstName={firstName} locationId={data.locationId} onSignOut={onSignOut}>
      <header className="bz-row bz-row--center">
        <div className="bz-stack" style={{ gap: 2 }}>
          <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Hi {firstName}</h1>
          <span className="bz-meta" style={{ fontSize: 12 }}>
            {data.locationName} · {shift}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {homeHref && (
            <Link href={homeHref} className="bz-icon-btn" style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--bz-card)' }} aria-label="Back to dashboard">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
            </Link>
          )}
          <CaptainBell count={calls.length + data.ready.count} />
        </div>
      </header>

      {/* Needs you */}
      {data.needsYou ? (
        <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 18, gap: 10 }}>
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 86, right: -6, top: -4, color: 'rgba(255,255,255,0.12)' }}>{ghost}</span>
          <span className="bz-chip bz-chip--tag" style={{ padding: '4px 10px' }}>Needs you</span>
          <span style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>{data.needsYou.title}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={data.needsYou.href} className="bz-btn bz-btn--lime" style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 15 }}>
              {data.needsYou.kind === 'bill' ? 'Take payment' : 'Open order'}
            </Link>
            <Link href={data.needsYou.secondaryHref} className="bz-btn bz-btn--ghost-light" style={{ height: 48, borderRadius: 14 }}>
              {data.needsYou.secondaryLabel}
            </Link>
          </div>
        </article>
      ) : (
        <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 18, gap: 6 }}>
          <span className="bz-chip bz-chip--tag" style={{ padding: '4px 10px' }}>All good</span>
          <span style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>No bills or plates waiting on you</span>
        </article>
      )}

      {/* My tables */}
      <article className="bz-tile" style={{ borderRadius: 26, padding: 16, gap: 10 }}>
        <div className="bz-row">
          <h2 className="bz-title" style={{ fontSize: 16 }}>{data.mineOnly ? 'My tables' : 'Floor'}</h2>
          <span className="bz-meta" style={{ fontSize: 12 }}>
            {data.mineOnly ? `${data.tables.length} of ${data.totalTables}` : `${data.totalTables} tables`}
          </span>
        </div>
        {data.tables.length > 0 ? (
          <div className="bz-ctables">
            {data.tables.map((t) => (
              <Link
                key={t.id}
                href={t.orderId ? `/pos?tableId=${t.id}&orderId=${t.orderId}` : `/pos?tableId=${t.id}`}
                className={`bz-ctable ${STATE[t.state].cls}`}
                aria-label={`${t.name}, ${STATE[t.state].label}`}
              >
                <span style={{ fontWeight: 800, fontSize: 18 }}>{t.name.replace(/^table\s*/i, 'T-')}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{STATE[t.state].label}</span>
              </Link>
            ))}
          </div>
        ) : (
          <span className="bz-sub">No tables set up yet.</span>
        )}
      </article>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <article className="bz-tile bz-tile--ink" style={{ borderRadius: 26, padding: 16, gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#A1A1AA' }}>Ready to serve</span>
          <span className="bz-mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: 'var(--bz-lime)' }}>{data.ready.count}</span>
          <span style={{ fontSize: 12, color: '#D4D4D8' }}>{data.ready.detail || 'Nothing at the pass'}</span>
        </article>
        <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 16, gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bz-on-accent-muted)' }}>My sales today</span>
          <span className="bz-mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{money(data.sales, 0)}</span>
          <span style={{ fontSize: 12, color: 'var(--bz-on-accent-muted)' }}>Tips {money(data.tips, 0)}</span>
        </article>
      </div>

      {/* Guest calls */}
      <article id="guest-calls" className="bz-tile" style={{ borderRadius: 26, padding: '14px 16px', gap: 6 }}>
        <div className="bz-row">
          <h2 className="bz-title" style={{ fontSize: 16 }}>Guest calls</h2>
          {calls.length > 4 && (
            <Link href="/server/alerts" className="bz-link" style={{ fontSize: 13 }}>
              All {calls.length}
            </Link>
          )}
        </div>
        {calls.length > 0 ? (
          calls.slice(0, 4).map((c) => (
            <div key={c.tableId} className="bz-item" style={{ minHeight: 44, gap: 10 }}>
              <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bz-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                {shortTable(c.tableName)}
              </span>
              <span className="bz-grow" style={{ fontSize: 14, fontWeight: 600 }}>{CALL_LABEL[c.type] ?? 'Needs help'}{c.notes ? ` · ${c.notes}` : ''}</span>
              <span className="bz-meta" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{durationLabel(minutesBetween(new Date(c.requestedAt), now))}</span>
              <button type="button" className="bz-btn bz-btn--sm bz-btn--ink" style={{ height: 36, padding: '0 10px' }} onClick={() => ack(c)} aria-label={`Done, ${c.tableName}`}>
                Done
              </button>
            </div>
          ))
        ) : (
          <span className="bz-sub">No one is calling right now.</span>
        )}
      </article>
    </CaptainFrame>
  )
}
