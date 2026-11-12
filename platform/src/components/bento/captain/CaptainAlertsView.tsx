'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { CaptainAlerts, CaptainData } from '@/lib/bento/captain'
import { durationLabel, minutesBetween } from '@/lib/bento/time'
import { CaptainFrame } from './CaptainFrame'
import { CALL_LABEL, shortTable, useCaptainLive } from './useCaptainLive'

interface Props {
  data: CaptainData
  alerts: CaptainAlerts
  firstName: string
  onSignOut: () => void
}

/** Captain / Server phone · Alerts: what needs you, guest calls, the pass, and notices from the team. */
export function CaptainAlertsView({ data, alerts, firstName, onSignOut }: Props) {
  const router = useRouter()
  const { calls, ack, now } = useCaptainLive(data.locationId)
  const [pickedUp, setPickedUp] = useState<Set<string>>(() => new Set())
  const pass = alerts.pass.filter((t) => !pickedUp.has(t.id))
  const waiting = calls.length + pass.length

  const pickUp = async (id: string) => {
    setPickedUp((prev) => new Set(prev).add(id))
    try {
      const r = await fetch(`/api/kds/tickets/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SERVED' }),
      })
      if (!r.ok) throw new Error()
      router.refresh()
    } catch {
      toast.error('Could not mark that plate as picked up')
      setPickedUp((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <CaptainFrame active="alerts" firstName={firstName} locationId={data.locationId} onSignOut={onSignOut}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/server" className="bz-icon-btn" style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--bz-card)' }} aria-label="Back to tables">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <div className="bz-stack" style={{ gap: 2 }}>
          <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Alerts</h1>
          <span className="bz-meta" style={{ fontSize: 12 }}>
            {waiting > 0 ? `${waiting} waiting` : 'Nothing waiting'} · {data.locationName}
          </span>
        </div>
      </header>

      {data.needsYou && (
        <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 16, gap: 10 }}>
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 80, right: -8, top: 4, color: 'rgba(255,255,255,0.10)' }}>NOW</span>
          <span className="bz-chip bz-chip--tag" style={{ position: 'relative', alignSelf: 'flex-start', background: '#141416', color: 'var(--bz-lime)' }}>Needs you</span>
          <span style={{ position: 'relative', fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>{data.needsYou.title}</span>
          <Link href={data.needsYou.href} className="bz-btn bz-btn--lime" style={{ width: '100%', height: 48, borderRadius: 14, fontSize: 14 }}>
            {data.needsYou.kind === 'bill' ? 'Take payment' : 'Open order'}
          </Link>
        </article>
      )}

      <article className="bz-tile" style={{ borderRadius: 26, padding: 16, gap: 8 }}>
        <h2 style={{ fontWeight: 800, fontSize: 15 }}>Guest calls and the pass</h2>
        {calls.length === 0 && pass.length === 0 && <span className="bz-sub">No one is calling and nothing is waiting at the pass.</span>}

        {calls.map((c) => {
          const callWaiter = c.type === 'CALL_WAITER'
          return (
            <div key={`call-${c.tableId}`} className="bz-captain-row">
              <span aria-hidden="true" className="bz-captain-row__tag">{shortTable(c.tableName)}</span>
              <span className="bz-item__body">
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {CALL_LABEL[c.type] ?? 'Needs help'}
                  <span className="bz-sr"> at {c.tableName}</span>
                </span>
                <span className="bz-meta" style={{ fontSize: 12 }}>
                  {c.notes ? `${c.notes} · ` : ''}
                  {durationLabel(minutesBetween(new Date(c.requestedAt), now))}
                </span>
              </span>
              <button type="button" className={`bz-btn ${callWaiter ? 'bz-btn--ink' : 'bz-btn--outline'}`} style={{ height: 40, borderRadius: 14 }} onClick={() => ack(c)}>
                {callWaiter ? 'On my way' : 'Done'}
              </button>
            </div>
          )
        })}

        {pass.map((t) => (
          <div key={`pass-${t.id}`} className="bz-captain-row">
            <span aria-hidden="true" className="bz-captain-row__tag">PASS</span>
            <span className="bz-item__body">
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {shortTable(t.tableName)} · {t.itemCount} {t.itemCount === 1 ? 'plate' : 'plates'} at the pass
              </span>
              <span className="bz-meta" style={{ fontSize: 12 }}>
                from the {t.station}
                {t.readyAt ? ` · ${durationLabel(minutesBetween(new Date(t.readyAt), now))}` : ''}
              </span>
            </span>
            <button type="button" className="bz-btn bz-btn--ink" style={{ height: 40, borderRadius: 14 }} onClick={() => pickUp(t.id)} aria-label={`Picked up, ${t.tableName}`}>
              Picked up
            </button>
          </div>
        ))}
      </article>

      <article className="bz-tile bz-tile--ink" style={{ borderRadius: 26, padding: 16, gap: 8 }}>
        <h2 style={{ fontWeight: 800, fontSize: 15 }}>From the team</h2>
        {alerts.team.length > 0 ? (
          alerts.team.map((n) => (
            <div key={n.id} className="bz-darkrow bz-darkrow--pad" style={{ minHeight: 52 }}>
              <span className="bz-darkrow__main" style={{ fontWeight: 700, fontSize: 14 }}>{n.text}</span>
              <span className="bz-darkrow__meta" style={{ whiteSpace: 'nowrap' }}>{n.by}</span>
            </div>
          ))
        ) : (
          <span style={{ fontSize: 14, color: '#A1A1AA' }}>No notices today. Items the kitchen marks as out show up here.</span>
        )}
      </article>
    </CaptainFrame>
  )
}
