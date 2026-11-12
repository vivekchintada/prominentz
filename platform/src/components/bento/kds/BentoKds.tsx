'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BentoLogo } from '@/components/bento/BentoLogo'
import { OfflineBanner } from '@/components/bento/OfflineBanner'
import { stopwatch } from '@/lib/bento/time'

type Station = 'HOT' | 'COLD' | 'BAR' | 'EXPO'
type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'READY' | 'SERVED'

interface Ticket {
  id: string
  orderId: string
  station: Station
  status: TicketStatus
  createdAt: string
  readyAt: string | null
  items: {
    id: string
    quantity: number
    modifiers: unknown
    specialNote: string | null
    status: string
    menuItem?: { name: string } | null
  }[]
  order: {
    id: string
    notes: string | null
    orderSource?: string
    publicOrderNumber?: string | null
    customerName?: string | null
    server?: { name: string } | null
    table?: { name: string } | null
  }
}

interface Kpi {
  avgTicketTimeMins: number
  targetMins?: number
  pace?: { hour: number; avgMins: number; tickets: number }[]
}

interface MenuItemLite {
  id: string
  name: string
  is86d: boolean
}

const STATIONS: { key: 'ALL' | Station; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'HOT', label: 'Hot line' },
  { key: 'COLD', label: 'Cold' },
  { key: 'BAR', label: 'Bar' },
  { key: 'EXPO', label: 'Expo' },
]
const STATION_NAME: Record<Station, string> = { HOT: 'Hot line', COLD: 'Cold', BAR: 'Bar', EXPO: 'Expo' }

const ONLINE = ['DELIVERY_DOORDASH', 'DELIVERY_UBEREATS', 'DELIVERY_OTHER', 'WEB_PICKUP', 'WEB_DELIVERY']

function whereLabel(t: Ticket): string {
  const src = t.order.orderSource ?? ''
  const table = t.order.table?.name ?? 'Order'
  if (ONLINE.includes(src)) {
    const tag = src.startsWith('WEB') ? 'ONLINE' : src === 'DELIVERY_OTHER' ? 'DELIVERY' : src.replace('DELIVERY_', '')
    return t.order.publicOrderNumber ? `${tag} #${t.order.publicOrderNumber}` : tag
  }
  if (src.startsWith('QR')) return `QR · ${table}`
  return table
}

function modifierText(mods: unknown, note: string | null): string {
  const parts: string[] = []
  if (Array.isArray(mods)) {
    for (const m of mods) {
      const o = m as { optionName?: string; name?: string }
      if (o?.optionName || o?.name) parts.push(String(o.optionName ?? o.name))
    }
  }
  // Allergy notes get their own highlighted line on the ticket
  if (note && !/allerg/i.test(note)) parts.push(note)
  return parts.join(', ')
}

function allergyText(t: Ticket): string | null {
  const hits = new Set<string>()
  const n = t.order.notes ?? ''
  if (/allerg|peanut|gluten|dairy|shellfish|nut/i.test(n)) hits.add(n)
  for (const i of t.items) if (i.specialNote && /allerg/i.test(i.specialNote)) hits.add(i.specialNote)
  return hits.size ? [...hits].map((h) => h.replace(/^\s*allerg(y|ies)\s*[:-]?\s*/i, '')).join(' · ') : null
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {}
}

export function BentoKds({ homeHref, onSignOut }: { homeHref: string | null; onSignOut: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<Kpi | null>(null)
  const [menu, setMenu] = useState<MenuItemLite[]>([])
  const [station, setStation] = useState<'ALL' | Station>('ALL')
  const [now, setNow] = useState(() => new Date())
  const [lastBump, setLastBump] = useState<{ id: string; prev: TicketStatus; label: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  const loadTickets = useCallback(async () => {
    try {
      const r = await fetch('/api/kds/tickets')
      if (r.ok) setTickets(await r.json())
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])
  const loadKpi = useCallback(async () => {
    try {
      const r = await fetch('/api/kds/kpi')
      if (r.ok) setKpi(await r.json())
    } catch {}
  }, [])
  const loadMenu = useCallback(async () => {
    try {
      const r = await fetch('/api/menu/items?includeUnavailable=true')
      if (r.ok) {
        const d = await r.json()
        const list = Array.isArray(d) ? d : d.items ?? []
        setMenu(list.map((m: MenuItemLite) => ({ id: m.id, name: m.name, is86d: Boolean(m.is86d) })))
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadTickets()
    loadKpi()
    loadMenu()
    const tick = setInterval(() => setNow(new Date()), 1000)
    const kpiTimer = setInterval(loadKpi, 15000)
    // Live updates from the order pipeline; poll as a fallback in case the stream drops
    const poll = setInterval(loadTickets, 20000)
    const es = new EventSource('/api/events')
    es.addEventListener('order.sent_to_kitchen', () => {
      loadTickets()
      loadKpi()
      beep()
    })
    es.addEventListener('ticket.status.updated', () => {
      loadTickets()
      loadKpi()
    })
    es.addEventListener('ticket.completed', () => {
      loadTickets()
      loadKpi()
    })
    es.addEventListener('menu.item.86d', () => loadMenu())
    return () => {
      clearInterval(tick)
      clearInterval(kpiTimer)
      clearInterval(poll)
      es.close()
    }
  }, [loadTickets, loadKpi, loadMenu])

  const target = kpi?.targetMins ?? 12
  const ageMins = (t: Ticket) => (now.getTime() - new Date(t.createdAt).getTime()) / 60000

  const cooking = useMemo(() => tickets.filter((t) => t.status === 'NEW' || t.status === 'IN_PROGRESS'), [tickets])
  const ready = useMemo(
    () => tickets.filter((t) => t.status === 'READY').sort((a, b) => new Date(a.readyAt ?? a.createdAt).getTime() - new Date(b.readyAt ?? b.createdAt).getTime()),
    [tickets],
  )
  const countBy = (s: Station) => cooking.filter((t) => t.station === s).length

  const shown = cooking
    .filter((t) => station === 'ALL' || t.station === station)
    .sort((a, b) => {
      const la = ageMins(a) > target ? 0 : 1
      const lb = ageMins(b) > target ? 0 : 1
      return la - lb || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const allDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of cooking)
      for (const i of t.items) {
        if (i.status === 'VOIDED' || i.status === 'READY') continue
        const name = i.menuItem?.name ?? 'Item'
        m.set(name, (m.get(name) ?? 0) + i.quantity)
      }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [cooking])

  const load = (['HOT', 'COLD', 'BAR', 'EXPO'] as Station[]).map((s) => ({ s, n: countBy(s) }))
  const loadMax = Math.max(...load.map((l) => l.n), 1)
  const busiest = load.reduce((a, b) => (b.n > a.n ? b : a), load[0])

  const pace = kpi?.pace ?? []
  const paceMax = Math.max(target + 2, ...pace.map((p) => p.avgMins))
  const lateHour = pace.find((p) => p.avgMins > target)

  const setStatus = async (t: Ticket, next: TicketStatus, remember = true) => {
    setBusy(t.id)
    try {
      const r = await fetch(`/api/kds/tickets/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!r.ok) throw new Error()
      if (remember && (next === 'READY' || next === 'SERVED')) setLastBump({ id: t.id, prev: t.status, label: whereLabel(t) })
      await loadTickets()
      loadKpi()
    } catch {
      toast.error('Could not update the ticket. Check the connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  const recall = async () => {
    if (!lastBump) return
    const t = tickets.find((x) => x.id === lastBump.id) ?? ({ id: lastBump.id, status: 'READY' } as Ticket)
    await setStatus(t, lastBump.prev, false)
    toast.success(`Recalled ${lastBump.label}`)
    setLastBump(null)
  }

  const toggle86 = async (item: MenuItemLite) => {
    try {
      const r = await fetch(`/api/menu/items/${item.id}/86`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is86d: !item.is86d, reason: 'Kitchen out of stock' }),
      })
      if (!r.ok) throw new Error()
      toast.success(item.is86d ? `${item.name} is back on the menu` : `${item.name} marked sold out`)
      loadMenu()
    } catch {
      toast.error('Could not change that item')
    }
  }

  const sold = menu.filter((m) => m.is86d)
  const avail = menu.filter((m) => !m.is86d && (!query || m.name.toLowerCase().includes(query.toLowerCase()))).slice(0, 30)
  const avgSecs = Math.round((kpi?.avgTicketTimeMins ?? 0) * 60)
  const avgLabel = `${String(Math.floor(avgSecs / 60)).padStart(2, '0')}:${String(avgSecs % 60).padStart(2, '0')}`

  return (
    <div className="bz bz--night">
      <div className="bz-wrap">
        <header className="bz-header">
          <div className="bz-header__left" style={{ gap: 28 }}>
            <BentoLogo href={homeHref ?? undefined} />
            <nav aria-label="Stations" className="bz-nav">
              {STATIONS.map((s) => {
                const n = s.key === 'ALL' ? cooking.length : countBy(s.key)
                const on = station === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    className={`bz-nav__link${on ? ' bz-kds-station--on' : ''}`}
                    style={{ minHeight: 48, fontSize: 16, borderRadius: 14 }}
                    aria-pressed={on}
                    onClick={() => setStation(s.key)}
                  >
                    {s.label}
                    <span className="bz-nav__count">{n}</span>
                  </button>
                )
              })}
            </nav>
          </div>
          <div className="bz-header__right" style={{ gap: 14 }}>
            <span className="bz-mono" style={{ fontSize: 28, fontWeight: 700 }} suppressHydrationWarning>
              {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button type="button" className="bz-btn bz-btn--ghost-night" style={{ height: 48, borderRadius: 14, fontSize: 15 }} onClick={recall} disabled={!lastBump}>
              Recall last
            </button>
            <button type="button" className="bz-icon-btn" style={{ width: 48, height: 48 }} onClick={onSignOut} aria-label="Sign out">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </header>
        <OfflineBanner dark />

        <section className="bz-grid" aria-label="Kitchen">
          {/* Pace */}
          <article className="bz-tile bz-c4">
            <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 110, right: -6, top: 0, color: 'rgba(255,255,255,0.05)' }}>PACE</span>
            <h2 className="bz-title" style={{ fontWeight: 700 }}>Ticket time today</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span className="bz-mono" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{kpi && kpi.avgTicketTimeMins > 0 ? avgLabel : '--:--'}</span>
              <span className="bz-sub">average · target {String(target).padStart(2, '0')}:00</span>
            </div>
            {pace.length > 0 ? (
              <>
                <div className="bz-bars bz-bars--sm" style={{ height: 140, gap: 10 }}>
                  {pace.map((p, i) => (
                    <div className="bz-bar" key={p.hour} style={{ gap: 6 }}>
                      <div className={`bz-bar__fill${p.avgMins > target ? ' bz-bar__fill--hi' : ''}`} style={{ height: Math.max(6, Math.round((p.avgMins / paceMax) * 120)), ['--i' as string]: i }} />
                      <span className="bz-bar__label">{String(p.hour).padStart(2, '0')}h</span>
                    </div>
                  ))}
                </div>
                <span className="bz-sub" style={{ fontSize: 13 }}>
                  {lateHour ? 'Purple bar: an hour that went over target.' : 'Every hour so far is on target.'}
                </span>
              </>
            ) : (
              <div className="bz-empty">
                <strong>No tickets finished yet today</strong>
                The hourly pace builds up as tickets are bumped.
              </div>
            )}
          </article>

          {/* Tickets */}
          <article className="bz-tile bz-c8 bz-r2" style={{ padding: 20 }}>
            <div className="bz-row bz-row--wrap" style={{ padding: '0 4px', gap: 8 }}>
              <h2 className="bz-title bz-title--lg">
                {station === 'ALL' ? 'All stations' : STATION_NAME[station]} · {shown.length} ticket{shown.length === 1 ? '' : 's'}
              </h2>
              <span className="bz-meta" style={{ fontSize: 14 }}>late first, then oldest</span>
            </div>
            {loading ? (
              <div className="bz-kds-tickets">
                {[0, 1, 2, 3].map((i) => <div key={i} className="bz-skel" style={{ height: 280, borderRadius: 20 }} />)}
              </div>
            ) : shown.length > 0 ? (
              <div className="bz-kds-tickets">
                {shown.map((t) => {
                  const late = ageMins(t) > target
                  const kind = late ? 'late' : t.status === 'IN_PROGRESS' ? 'cooking' : 'new'
                  const allergy = allergyText(t)
                  const action = kind === 'new' ? 'Start' : kind === 'late' ? 'Bump to pass' : 'Bump'
                  const next: TicketStatus = t.status === 'NEW' && !late ? 'IN_PROGRESS' : 'READY'
                  return (
                    <div key={t.id} className={`bz-ticket bz-ticket--${kind}`}>
                      <div className="bz-ticket__head">
                        <span className="bz-ticket__state">
                          {kind === 'late' ? 'LATE' : kind === 'cooking' ? 'COOKING' : 'NEW'} · {whereLabel(t)}
                        </span>
                        <span className="bz-ticket__time">{stopwatch(new Date(t.createdAt), now)}</span>
                      </div>
                      <div className="bz-ticket__body">
                        {t.items
                          .filter((i) => i.status !== 'VOIDED')
                          .map((i) => {
                            const mod = modifierText(i.modifiers, i.specialNote)
                            return (
                              <div key={i.id} className="bz-stack" style={{ gap: 2 }}>
                                <span style={{ fontSize: 17, fontWeight: 700, textDecoration: i.status === 'READY' ? 'line-through' : undefined }}>
                                  {i.quantity} × {i.menuItem?.name ?? 'Item'}
                                </span>
                                {mod && <span style={{ fontSize: 14, fontWeight: 500, color: '#5C5C66' }}>{mod}</span>}
                              </div>
                            )
                          })}
                        {allergy && <span className="bz-ticket__allergy">Allergy: {allergy}</span>}
                      </div>
                      <div style={{ padding: '0 12px 12px', marginTop: 'auto' }}>
                        <button type="button" className="bz-ticket__btn" disabled={busy === t.id} onClick={() => setStatus(t, next)}>
                          {busy === t.id ? '…' : action}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bz-empty" style={{ minHeight: 240 }}>
                <strong>No tickets {station === 'ALL' ? 'in the kitchen' : `on ${STATION_NAME[station]}`}</strong>
                New orders appear here the moment they are sent, with a beep.
              </div>
            )}
            <div className="bz-push" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '6px 4px 0', fontSize: 14, color: 'var(--bz-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, height: 14, border: '2px dashed #FFFFFF', borderRadius: 4 }} />New</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, height: 14, background: '#3A3A42', border: '2px solid #FFFFFF', borderRadius: 4 }} />Cooking</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, height: 14, background: '#6835F9', borderRadius: 4 }} />Late, pinned first</span>
            </div>
          </article>

          {/* Ready at pass */}
          <article className="bz-tile bz-tile--accent bz-c4 bz-tile--pad-sm" style={{ gap: 10 }}>
            <div className="bz-row">
              <h2 className="bz-title">Ready at pass</h2>
              <span className="bz-meta">{ready.length} waiting</span>
            </div>
            {ready.length > 0 ? (
              ready.slice(0, 4).map((t) => (
                <div key={t.id} className="bz-darkrow">
                  <span className="bz-darkrow__main">
                    {whereLabel(t)}
                    {t.order.server?.name ? ` · ${t.order.server.name}` : ''}
                  </span>
                  <span className="bz-darkrow__meta">{stopwatch(new Date(t.readyAt ?? t.createdAt), now)}</span>
                  <button type="button" className="bz-btn bz-btn--lime" style={{ height: 44 }} disabled={busy === t.id} onClick={() => setStatus(t, 'SERVED')}>
                    Picked up
                  </button>
                </div>
              ))
            ) : (
              <div className="bz-empty">
                <strong>Pass is clear</strong>
                Bumped tickets wait here for a runner.
              </div>
            )}
          </article>

          {/* All day */}
          <article className="bz-tile bz-c4 bz-tile--pad-sm" style={{ gap: 12 }}>
            <h2 className="bz-title">All day</h2>
            {allDay.length > 0 ? (
              <div className="bz-kpis" style={{ gap: 10 }}>
                {allDay.map(([name, n]) => (
                  <div key={name} style={{ background: '#141416', borderRadius: 16, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span className="bz-mono" style={{ fontSize: 24, fontWeight: 700 }}>{n}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="bz-sub">Nothing left to cook.</span>
            )}
          </article>

          {/* Station load */}
          <article className="bz-tile bz-c4 bz-tile--pad-sm">
            <h2 className="bz-title">Station load</h2>
            {load.map((l) => (
              <div key={l.s} className="bz-stack">
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{STATION_NAME[l.s]}</span>
                  <span className="bz-mono" style={{ color: 'var(--bz-muted)' }}>
                    {l.n} ticket{l.n === 1 ? '' : 's'}
                    {l.s === busiest.s && l.n > 0 ? ' · busy' : ''}
                  </span>
                </div>
                <div className="bz-meter bz-meter--lg" style={{ background: '#2A2A30' }}>
                  <div className={`bz-meter__fill${l.s === busiest.s && l.n > 0 ? ' bz-meter__fill--accent' : ''}`} style={{ width: `${Math.round((l.n / loadMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </article>

          {/* 86 list */}
          <article className="bz-tile bz-c4 bz-tile--pad-sm" style={{ gap: 12 }}>
            <div className="bz-row bz-row--center">
              <h2 className="bz-title">86 list · sold out</h2>
              <button type="button" className="bz-btn bz-btn--ghost-night bz-btn--sm" onClick={() => { setQuery(''); dialogRef.current?.showModal() }}>
                Add item
              </button>
            </div>
            {sold.length > 0 ? (
              sold.slice(0, 5).map((m) => (
                <div key={m.id} className="bz-row bz-row--center" style={{ minHeight: 48, padding: '0 6px 0 16px', borderRadius: 16, border: '1.5px dashed #3A3A42' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, textDecoration: 'line-through' }}>{m.name}</span>
                  <button type="button" className="bz-btn bz-btn--sm" style={{ background: 'transparent', color: 'var(--bz-lime)' }} onClick={() => toggle86(m)}>
                    Restore
                  </button>
                </div>
              ))
            ) : (
              <span className="bz-sub">Nothing is sold out.</span>
            )}
            <span className="bz-sub bz-push" style={{ fontSize: 13 }}>Hidden from POS, QR menu and online ordering until restored.</span>
          </article>
        </section>
      </div>

      <dialog ref={dialogRef} className="bz-dialog" aria-labelledby="eighty-six-title">
        <div className="bz-stack bz-stack--lg">
          <h2 id="eighty-six-title" className="bz-title bz-title--lg">Mark an item sold out</h2>
          <label className="bz-field">
            <span>Find a dish</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing" autoFocus />
          </label>
          <div className="bz-stack" style={{ maxHeight: 320, overflowY: 'auto', gap: 4 }}>
            {avail.map((m) => (
              <button key={m.id} type="button" className="bz-menu__item" onClick={() => { toggle86(m); dialogRef.current?.close() }}>
                {m.name}
                <span className="bz-meta">86</span>
              </button>
            ))}
            {avail.length === 0 && <span className="bz-sub">No matching dishes.</span>}
          </div>
          <div className="bz-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="bz-btn bz-btn--outline" onClick={() => dialogRef.current?.close()}>Close</button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
