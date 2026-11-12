'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { GuestConcierge } from './GuestConcierge'
import { GuestHelpSheet } from './GuestHelpSheet'
import { GuestItemSheet } from './GuestItemSheet'
import {
  STATION_WORD,
  lineKey,
  lineUnitPrice,
  normaliseMenu,
  type ActiveAssistance,
  type AssistanceType,
  type CartLine,
  type GuestCategory,
  type GuestMenuItem,
  type GuestModifierOption,
  type QrCombo,
  type QrConfig,
  type TrackedItem,
  type TrackedOrder,
} from './types'

interface Props {
  locationId: string
  tableId: string
  tableName: string
  restaurantName: string
  outletName: string | null
}

type View = 'menu' | 'cart' | 'status'

const HELP_LABEL: Record<string, string> = {
  CALL_WAITER: 'A server has been called',
  REQUEST_BILL: 'Bill requested',
  WATER: 'Water requested',
  CUTLERY: 'Cutlery requested',
  OTHER: 'The team has your request',
}

const ITEM_BADGE: Record<TrackedItem['status'], { label: string; cls: string }> = {
  PENDING: { label: 'Queued', cls: 'bz-badge bz-badge--quiet' },
  IN_PROGRESS: { label: 'Cooking', cls: 'bz-badge bz-badge--ink' },
  READY: { label: 'Ready', cls: 'bz-badge bz-badge--lime' },
  SERVED: { label: 'Served', cls: 'bz-badge' },
  VOIDED: { label: 'Cancelled', cls: 'bz-badge bz-badge--quiet' },
}

function readToken(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeToken(key: string, value: string | null) {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    // Private mode: the status screen still works until the page is closed.
  }
}

function shortTable(name: string) {
  return name.replace(/^table\s*/i, 'T-').slice(0, 6)
}

const orderable = (i: GuestMenuItem | undefined): i is GuestMenuItem => !!i && !i.is86d && i.modifiers.every((g) => !g.isRequired)

/** Chef recommends: a set from the QR settings whose dishes are all on today's menu, else the best seller. */
function chefPick(combos: QrCombo[], byName: Map<string, GuestMenuItem>, popular: GuestMenuItem[]) {
  for (const combo of combos) {
    const items = combo.itemNames.map((n) => byName.get(n.trim().toLowerCase()))
    if (items.length > 0 && items.every(orderable)) {
      return { title: combo.name, items: items as GuestMenuItem[], label: items.length === 2 ? 'Add the pair' : 'Add the set' }
    }
  }
  const top = popular.find(orderable) ?? popular[0]
  return top ? { title: top.name, items: [top], label: 'Add it' } : null
}

function minutesAgo(iso: string, now: number) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  return m < 1 ? 'just now' : `${m} min ago`
}

/** Guest · QR menu, cart and live order status for one table. Orders are paid at the table. */
export function GuestTableOrder({ locationId, tableId, tableName, restaurantName, outletName }: Props) {
  const { money } = useMoney()
  const tokenKey = `pz-guest-order:${tableId}`

  const [view, setView] = useState<View>('menu')
  const [categories, setCategories] = useState<GuestCategory[]>([])
  const [config, setConfig] = useState<QrConfig>({})
  const [popularIds, setPopularIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [sheetItem, setSheetItem] = useState<GuestMenuItem | null>(null)

  const [orderNote, setOrderNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [token, setToken] = useState<string | null>(null)
  const [tracked, setTracked] = useState<TrackedOrder | null>(null)
  const [placedTotal, setPlacedTotal] = useState<number | null>(null)

  const [help, setHelp] = useState<ActiveAssistance | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpSending, setHelpSending] = useState(false)
  const [helpError, setHelpError] = useState<string | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // ── Load menu, QR settings, best sellers, and any open request ────────────
  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const q = `locationId=${encodeURIComponent(locationId)}`
      const [menuRes, configRes, popularRes] = await Promise.all([
        fetch(`/api/menu/categories?${q}`),
        fetch(`/api/qr-config?${q}`).catch(() => null),
        fetch(`/api/menu/popular?${q}`).catch(() => null),
      ])
      if (!menuRes.ok) throw new Error('menu')
      setCategories(normaliseMenu(await menuRes.json()))
      const cfg = configRes?.ok ? await configRes.json().catch(() => null) : null
      if (cfg && !cfg.error) setConfig(cfg)
      const pop = popularRes?.ok ? await popularRes.json().catch(() => null) : null
      if (Array.isArray(pop?.popularItemIds)) setPopularIds(pop.popularItemIds)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    load()
    setToken(readToken(tokenKey))
  }, [load, tokenKey])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // ── Follow the table's order while the guest has one ──────────────────────
  const refreshOrder = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch(`/api/ordering/orders/${encodeURIComponent(token)}`, { cache: 'no-store' })
      if (r.status === 404) {
        writeToken(tokenKey, null)
        setToken(null)
        setTracked(null)
        return
      }
      if (!r.ok) return
      const d = await r.json()
      const order: TrackedOrder = {
        orderNumber: d.orderNumber ?? null,
        orderStatus: d.orderStatus ?? '',
        tableName: d.tableName ?? null,
        total: Number(d.total ?? 0),
        paymentStatus: String(d.paymentStatus ?? ''),
        createdAt: d.createdAt,
        items: Array.isArray(d.items) ? d.items : [],
      }
      if (order.orderStatus === 'PAID' || order.orderStatus === 'VOIDED') {
        // The table has been settled or closed: start fresh next time.
        writeToken(tokenKey, null)
        setToken(null)
      }
      setTracked(order)
    } catch {
      // Offline: keep showing the last status.
    }
  }, [token, tokenKey])

  useEffect(() => {
    if (!token) return
    refreshOrder()
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refreshOrder()
    }, 15000)
    const onVisible = () => document.visibilityState === 'visible' && refreshOrder()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, refreshOrder])

  // ── Menu shaping ──────────────────────────────────────────────────────────
  const visible = useMemo(
    () => categories.filter((c) => !(config.hiddenCategoryIds ?? []).includes(c.id) && c.items.length > 0),
    [categories, config.hiddenCategoryIds],
  )
  const allItems = useMemo(() => visible.flatMap((c) => c.items), [visible])
  const byName = useMemo(() => new Map(allItems.map((i) => [i.name.trim().toLowerCase(), i])), [allItems])
  const popular = useMemo(() => popularIds.map((id) => allItems.find((i) => i.id === id)).filter((i): i is GuestMenuItem => !!i && !i.is86d), [popularIds, allItems])

  // Chef recommends: a set from the QR settings whose dishes are all on today's menu, else the best seller.
  const pick = chefPick(config.combos ?? [], byName, popular)

  const q = query.trim().toLowerCase()
  const sections = useMemo(() => {
    const match = (i: GuestMenuItem) => !q || i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
    if (filter === 'chef') return popular.length ? [{ id: 'chef', name: 'Chef picks', items: popular.filter(match) }] : []
    return visible.filter((c) => filter === 'all' || c.id === filter).map((c) => ({ ...c, items: c.items.filter(match) })).filter((c) => c.items.length > 0)
  }, [filter, popular, visible, q])

  // ── Cart ──────────────────────────────────────────────────────────────────
  const addLine = useCallback((item: GuestMenuItem, mods: GuestModifierOption[] = [], note = '', qty = 1) => {
    const key = lineKey(item.id, mods, note)
    setCart((prev) => {
      const at = prev.findIndex((l) => l.key === key)
      if (at > -1) return prev.map((l, i) => (i === at ? { ...l, qty: Math.min(50, l.qty + qty) } : l))
      return [...prev, { key, item, qty, mods, note }]
    })
  }, [])

  const changeLine = (key: string, delta: number) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.min(50, l.qty + delta) } : l)).filter((l) => l.qty > 0))

  const qtyOf = (itemId: string) => cart.filter((l) => l.item.id === itemId).reduce((s, l) => s + l.qty, 0)
  const removeOne = (itemId: string) => {
    const last = [...cart].reverse().find((l) => l.item.id === itemId)
    if (last) changeLine(last.key, -1)
  }
  const tapAdd = (item: GuestMenuItem) => (item.modifiers.length > 0 ? setSheetItem(item) : addLine(item))

  const count = cart.reduce((s, l) => s + l.qty, 0)
  const subtotal = cart.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0)

  const placeOrder = async () => {
    if (cart.length === 0 || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const r = await fetch('/api/table-order/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          tableId,
          items: cart.map((l) => ({
            menuItemId: l.item.id,
            quantity: l.qty,
            specialNote: l.note || undefined,
            modifiers: l.mods.map((m) => ({ name: m.name, priceDelta: m.priceAdjustment })),
          })),
          guestName: guestName.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          notes: orderNote.trim() || undefined,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setSubmitError(r.status === 429 ? 'Too many orders from this table in a minute. Wait a moment and try again.' : d.error || 'The order did not go through. Nothing was charged; please try again.')
        return
      }
      setCart([])
      setOrderNote('')
      setNoteOpen(false)
      setPlacedTotal(Number(d.total ?? subtotal))
      if (d.trackingToken) {
        writeToken(tokenKey, d.trackingToken)
        setToken(d.trackingToken)
      }
      setView('status')
      window.scrollTo({ top: 0 })
    } catch {
      setSubmitError('You seem to be offline. Your cart is kept; try again when you are connected.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Table help ────────────────────────────────────────────────────────────
  const sendHelp = async (type: AssistanceType, notes = '') => {
    setHelpSending(true)
    setHelpError(null)
    try {
      const r = await fetch('/api/table-order/assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, tableId, type, notes: notes || undefined }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error)
      setHelp(d.request ?? { type, notes, requestedAt: new Date().toISOString() })
      setHelpOpen(false)
    } catch {
      setHelpError('That request did not reach the team. Please wave to a server or try again.')
    } finally {
      setHelpSending(false)
    }
  }

  const openDish = (id: string) => {
    const item = allItems.find((i) => i.id === id)
    if (!item) return
    setAskOpen(false)
    setSheetItem(item)
  }

  // ── Shared pieces ─────────────────────────────────────────────────────────
  const place = outletName ? `${outletName} · ${tableName}` : tableName

  const helpTile = help && (
    <article className="bz-tile bz-tile--ink" style={{ borderRadius: 22, padding: 14, gap: 8 }} role="status">
      <div className="bz-row bz-row--center">
        <span className="bz-row" style={{ gap: 10, justifyContent: 'flex-start' }}>
          <span className="bz-dot bz-dot--live" aria-hidden="true" />
          <span style={{ fontWeight: 800, fontSize: 15 }}>{HELP_LABEL[help.type] ?? HELP_LABEL.OTHER}</span>
        </span>
        <span style={{ fontSize: 12, color: '#A1A1AA', whiteSpace: 'nowrap' }}>{minutesAgo(help.requestedAt, now)}</span>
      </div>
      {help.notes && <span style={{ fontSize: 13, color: '#D4D4D8' }}>{help.notes}</span>}
      <span className="bz-row" style={{ gap: 10 }}>
        <span style={{ fontSize: 12, color: '#A1A1AA' }}>The team sees it on their phones until someone comes over.</span>
        <button type="button" className="bz-btn bz-btn--ghost-night bz-btn--sm" style={{ flexShrink: 0 }} onClick={() => setHelp(null)}>
          Hide
        </button>
      </span>
    </article>
  )

  const helpErrorTile = helpError && (
    <div className="bz-error" role="alert">
      <span className="bz-error__detail">{helpError}</span>
    </div>
  )

  const sheets = (
    <>
      <GuestItemSheet item={sheetItem} onClose={() => setSheetItem(null)} onAdd={addLine} />
      <GuestHelpSheet open={helpOpen} sending={helpSending} onClose={() => setHelpOpen(false)} onSend={sendHelp} />
      <GuestConcierge open={askOpen} locationId={locationId} tableId={tableId} onClose={() => setAskOpen(false)} onPickDish={openDish} />
    </>
  )

  // ── Loading and failure ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bz bz-phone-ground">
        <div className="bz-phone">
          <div className="bz-phone__body" aria-busy="true" aria-label="Loading the menu">
            <div className="bz-skel" style={{ height: 52, borderRadius: 16 }} />
            <div className="bz-skel" style={{ height: 140, borderRadius: 26 }} />
            <div className="bz-skel" style={{ height: 40, borderRadius: 999 }} />
            <div className="bz-skel" style={{ height: 360, borderRadius: 26 }} />
          </div>
        </div>
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="bz bz-state-page">
        <div className="bz-tile" style={{ width: 'min(420px, calc(100% - 32px))', gap: 14 }}>
          <span className="bz-eyebrow">{restaurantName} · {tableName}</span>
          <div className="bz-error" role="alert">
            <span className="bz-error__title">The menu could not load</span>
            <span className="bz-error__detail">Check your connection and try again, or ask your server for a menu.</span>
          </div>
          <button type="button" className="bz-btn bz-btn--ink bz-btn--lg" onClick={load}>Try again</button>
        </div>
      </div>
    )
  }

  // ── Status ────────────────────────────────────────────────────────────────
  if (view === 'status') {
    const live = (tracked?.items ?? []).filter((i) => i.status !== 'VOIDED')
    const cooking = live.some((i) => i.status === 'IN_PROGRESS')
    const waiting = live.some((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS')
    const ready = live.some((i) => i.status === 'READY')
    const allServed = live.length > 0 && live.every((i) => i.status === 'SERVED')
    const settled = tracked?.orderStatus === 'PAID'
    const headline = settled
      ? 'All settled. Thank you!'
      : allServed
        ? 'Enjoy your meal'
        : ready && !waiting
          ? 'Your food is on its way'
          : cooking
            ? 'Your food is being cooked'
            : 'The kitchen has your order'
    const stations = [...new Set(live.map((i) => (i.station ? STATION_WORD[i.station] ?? i.station.toLowerCase() : null)).filter(Boolean))] as string[]
    const total = tracked?.total ?? placedTotal ?? 0
    const placedAt = tracked?.createdAt ? new Date(tracked.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
    const ref = tracked?.orderNumber ? ` · #${tracked.orderNumber}` : ''
    const step = (done: boolean, active: boolean) => (done ? 'bz-track__dot bz-track__dot--done' : active ? 'bz-track__dot bz-track__dot--now' : 'bz-track__dot')

    return (
      <div className="bz bz-phone-ground">
        <div className="bz-phone">
          <div className="bz-phone__body">
            <header className="bz-row bz-row--center">
              <div className="bz-stack" style={{ gap: 2 }}>
                <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>{settled ? 'Paid' : 'Order placed'}</h1>
                <span className="bz-meta" style={{ fontSize: 12 }}>{restaurantName} · {shortTable(tracked?.tableName ?? tableName)}{ref}</span>
              </div>
              <span className="bz-chip" style={{ fontSize: 12, fontWeight: 800 }}>
                {settled || tracked?.paymentStatus === 'PAID' ? 'PAID' : 'To pay'} {money(total)}
              </span>
            </header>

            <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 18, gap: 12 }} aria-live="polite">
              <span style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>{headline}</span>
              {!settled && <span style={{ fontSize: 13, color: 'var(--bz-on-accent-muted)' }}>This page updates on its own. Pay at the table when you are done.</span>}
              <ol className="bz-track">
                <li>
                  <span aria-hidden="true" className={step(true, false)}>✓</span>
                  <span className="bz-item__body">
                    <span style={{ fontWeight: 800, fontSize: 15 }}>Order placed</span>
                    <span style={{ fontSize: 13, color: 'var(--bz-on-accent-muted)' }}>
                      {placedAt ?? 'just now'}
                      {stations.length > 0 ? ` · sent to the ${stations.join(' and ')}` : ''}
                    </span>
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className={step(live.length > 0 && !waiting, cooking)} />
                  <span className="bz-item__body">
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{waiting ? 'Cooking now' : 'Cooked'}</span>
                    <span style={{ fontSize: 13, color: 'var(--bz-on-accent-muted)' }}>{waiting ? (cooking ? 'the kitchen is on it' : 'waiting for the next free cook') : 'everything has left the kitchen'}</span>
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" className={step(allServed || settled, ready)} />
                  <span className="bz-item__body">
                    <span style={{ fontWeight: 800, fontSize: 15 }}>At your table</span>
                    <span style={{ fontSize: 13, color: 'var(--bz-on-accent-muted)' }}>{allServed ? 'all served' : 'your server brings it over'}</span>
                  </span>
                </li>
              </ol>
            </article>

            {helpTile}
            {helpErrorTile}

            <article className="bz-tile" style={{ borderRadius: 26, padding: 16, gap: 8 }}>
              <h2 style={{ fontWeight: 800, fontSize: 15 }}>Your table’s items</h2>
              {tracked ? (
                tracked.items.map((i) => (
                  <div key={i.id} className="bz-captain-row" style={{ minHeight: 52 }}>
                    <span className="bz-grow" style={{ fontWeight: 700, fontSize: 14, textDecoration: i.status === 'VOIDED' ? 'line-through' : undefined }}>
                      {i.quantity} × {i.name}
                    </span>
                    {i.station && <span className="bz-meta" style={{ fontSize: 13 }}>{STATION_WORD[i.station] ?? i.station.toLowerCase()}</span>}
                    <span className={ITEM_BADGE[i.status]?.cls ?? 'bz-badge'}>{ITEM_BADGE[i.status]?.label ?? i.status}</span>
                  </div>
                ))
              ) : (
                <span className="bz-sub">{token ? 'Checking with the kitchen…' : 'Your order is with the kitchen.'}</span>
              )}
            </article>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <button type="button" className="bz-btn bz-btn--ink bz-btn--lg" onClick={() => setView('menu')}>
                {settled ? 'Order again' : 'Add more items'}
              </button>
              <button type="button" className="bz-btn bz-btn--outline bz-btn--lg" onClick={() => setHelpOpen(true)}>
                Call a server
              </button>
            </div>
            {!settled && (
              <button type="button" className="bz-btn bz-btn--outline" onClick={() => sendHelp('REQUEST_BILL')} disabled={helpSending || help?.type === 'REQUEST_BILL'}>
                {help?.type === 'REQUEST_BILL' ? 'Bill requested' : 'Ask for the bill'}
              </button>
            )}
            <span className="bz-meta" style={{ fontSize: 12, textAlign: 'center' }}>powered by prominentz</span>
          </div>
        </div>
        {sheets}
      </div>
    )
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  if (view === 'cart') {
    return (
      <div className="bz bz-phone-ground">
        <div className="bz-phone">
          <div className="bz-phone__body">
            <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" className="bz-icon-btn" style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--bz-card)' }} onClick={() => setView('menu')} aria-label="Back to menu">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <div className="bz-stack" style={{ gap: 2 }}>
                <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Your cart</h1>
                <span className="bz-meta" style={{ fontSize: 12 }}>{restaurantName} · {place}</span>
              </div>
            </header>

            <article className="bz-tile" style={{ borderRadius: 26, padding: 16, gap: 8 }}>
              {cart.length === 0 && <span className="bz-sub">Your cart is empty. Add dishes from the menu.</span>}
              {cart.map((l) => (
                <div key={l.key} className="bz-captain-row" style={{ alignItems: 'center' }}>
                  <span className="bz-item__body">
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{l.item.name}</span>
                    {l.mods.length > 0 && <span className="bz-meta" style={{ fontSize: 12, whiteSpace: 'normal' }}>{l.mods.map((m) => m.name).join(', ')}</span>}
                    {l.note && <span className="bz-meta" style={{ fontSize: 12, whiteSpace: 'normal' }}>Note: {l.note}</span>}
                    <span className="bz-mono" style={{ fontSize: 12 }}>{money(lineUnitPrice(l))}</span>
                  </span>
                  <div className="bz-stepper" role="group" aria-label={`${l.item.name}, ${l.qty}`}>
                    <button type="button" className="bz-step bz-step--minus" onClick={() => changeLine(l.key, -1)} aria-label={`Remove one ${l.item.name}`}>−</button>
                    <span className="bz-mono bz-stepper__n">{l.qty}</span>
                    <button type="button" className="bz-step bz-step--plus" onClick={() => changeLine(l.key, 1)} aria-label={`Add one ${l.item.name}`}>+</button>
                  </div>
                </div>
              ))}
              {cart.length > 0 &&
                (noteOpen ? (
                  <label className="bz-field">
                    Note for the kitchen
                    <textarea className="bz-textarea" rows={2} maxLength={300} value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="Allergies, less spicy, bring starters first…" autoFocus />
                  </label>
                ) : (
                  <button type="button" className="bz-dashed-btn" onClick={() => setNoteOpen(true)}>
                    Add a note (allergies, less spicy…)
                  </button>
                ))}
            </article>

            {cart.length > 0 && (
              <article className="bz-tile" style={{ borderRadius: 26, padding: 16, gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Your details <span className="bz-meta" style={{ fontWeight: 500 }}>optional</span></span>
                <label className="bz-field">
                  Name
                  <input value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={60} autoComplete="given-name" />
                </label>
                <label className="bz-field">
                  Phone, to collect loyalty points
                  <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} maxLength={20} inputMode="tel" autoComplete="tel" />
                </label>
              </article>
            )}

            {cart.length > 0 && (
              <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 18, gap: 10 }}>
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ color: 'var(--bz-on-accent-muted)' }}>{count} {count === 1 ? 'item' : 'items'}</span>
                  <span className="bz-mono">{money(subtotal)}</span>
                </div>
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ color: 'var(--bz-on-accent-muted)' }}>Tax and service</span>
                  <span>on your bill</span>
                </div>
                <div className="bz-row">
                  <span style={{ fontWeight: 800, fontSize: 17 }}>Subtotal</span>
                  <span className="bz-mono" style={{ fontWeight: 800, fontSize: 26 }}>{money(subtotal)}</span>
                </div>
              </article>
            )}

            {submitError && (
              <div className="bz-error" role="alert">
                <span className="bz-error__title">Order not sent</span>
                <span className="bz-error__detail">{submitError}</span>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="bz-guest-bar bz-guest-bar--stack">
              <button type="button" className="bz-btn bz-btn--lime bz-btn--lg bz-btn--block" onClick={placeOrder} disabled={submitting}>
                {submitting ? 'Sending to the kitchen…' : `Send order · ${money(subtotal)}`}
              </button>
              <span style={{ fontSize: 12, color: '#A1A1AA', textAlign: 'center' }}>You pay at the table when you are done</span>
            </div>
          )}
        </div>
        {sheets}
      </div>
    )
  }

  // ── Menu ──────────────────────────────────────────────────────────────────
  const liveOrderItems = (tracked?.items ?? []).filter((i) => i.status !== 'VOIDED')
  const cookingCount = liveOrderItems.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS').reduce((s, i) => s + i.quantity, 0)
  const chips = [{ id: 'all', name: 'All' }, ...(popular.length ? [{ id: 'chef', name: 'Chef picks' }] : []), ...visible.map((c) => ({ id: c.id, name: c.name }))]

  return (
    <div className="bz bz-phone-ground">
      <div className="bz-phone">
        <div className="bz-phone__body">
          <header className="bz-row bz-row--center">
            <div className="bz-stack" style={{ gap: 2, minWidth: 0 }}>
              <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>{restaurantName}</h1>
              <span className="bz-meta" style={{ fontSize: 12 }}>{place} · menu and ordering</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <button type="button" className="bz-btn bz-btn--outline bz-btn--sm" style={{ height: 40, borderRadius: 999 }} onClick={() => setHelpOpen(true)}>
                Call server
              </button>
              <span className="bz-chip" style={{ fontSize: 12, fontWeight: 800 }}>{shortTable(tableName)}</span>
            </div>
          </header>

          {config.welcomeMessage && <p className="bz-sub">{config.welcomeMessage}</p>}
          {helpTile}
          {helpErrorTile}

          {token && tracked && liveOrderItems.length > 0 && (
            <button type="button" className="bz-tile bz-tile--ink bz-order-strip" onClick={() => setView('status')}>
              <span className="bz-item__body">
                <span style={{ fontWeight: 800, fontSize: 15 }}>Your order</span>
                <span style={{ fontSize: 13, color: '#A1A1AA' }}>{cookingCount > 0 ? `${cookingCount} cooking` : 'all out of the kitchen'}</span>
              </span>
              <span className="bz-btn bz-btn--lime bz-btn--sm">See status</span>
            </button>
          )}

          {pick && (
            <article className="bz-tile bz-tile--accent" style={{ borderRadius: 26, padding: 16, gap: 6 }}>
              <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 76, right: -8, top: 4 }}>CHEF</span>
              <span style={{ position: 'relative', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--bz-on-accent-muted)' }}>
                {config.promoText || 'Chef recommends'}
              </span>
              <span style={{ position: 'relative', fontWeight: 800, fontSize: 19, lineHeight: 1.25 }}>
                {pick.items.length > 1 ? pick.items.map((i) => i.name).join(' + ') : pick.title} · {money(pick.items.reduce((s, i) => s + i.price, 0))}
              </span>
              <button
                type="button"
                className="bz-btn bz-btn--lime"
                style={{ position: 'relative', alignSelf: 'flex-start', height: 44, borderRadius: 14, marginTop: 4 }}
                onClick={() => (pick.items.length === 1 && pick.items[0].modifiers.length > 0 ? setSheetItem(pick.items[0]) : pick.items.forEach((i) => addLine(i)))}
              >
                {pick.label}
              </button>
            </article>
          )}

          <div className="bz-row" style={{ gap: 8 }}>
            <label className="bz-search bz-grow" style={{ background: 'var(--bz-card)' }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <span className="bz-sr">Search the menu</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes and drinks" style={{ width: '100%' }} />
            </label>
            <button type="button" className="bz-btn bz-btn--ink" style={{ height: 44, flexShrink: 0 }} onClick={() => setAskOpen(true)}>
              Ask
            </button>
          </div>

          <nav aria-label="Menu sections" className="bz-cats">
            {chips.map((c) => (
              <button key={c.id} type="button" className={`bz-filter bz-filter--card${filter === c.id ? ' bz-filter--on' : ''}`} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.name}
              </button>
            ))}
          </nav>

          {sections.length === 0 && (
            <article className="bz-tile" style={{ borderRadius: 26 }}>
              <span className="bz-sub">{q ? `Nothing matches “${query.trim()}”. Try another word.` : 'The menu is being updated. Please ask your server.'}</span>
            </article>
          )}

          {sections.map((c) => (
            <article key={c.id} className="bz-tile" style={{ borderRadius: 26, padding: 12, gap: 8 }} aria-labelledby={`cat-${c.id}`}>
              <h2 id={`cat-${c.id}`} style={{ fontWeight: 800, fontSize: 15, padding: '4px 6px 0' }}>{c.name}</h2>
              {c.items.map((item) => {
                const n = qtyOf(item.id)
                return (
                  <div key={item.id} className={`bz-dish${item.is86d ? ' bz-dish--out' : ''}`}>
                    <button type="button" className="bz-dish__open" onClick={() => !item.is86d && setSheetItem(item)} disabled={item.is86d} aria-label={`${item.name}, details`}>
                      <span aria-hidden="true" className="bz-dish__thumb">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- menu photos come from any host the restaurant uses
                          <img src={item.imageUrl} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="13" r="7" /><circle cx="12" cy="13" r="3.5" /></svg>
                        )}
                      </span>
                      <span className="bz-item__body">
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</span>
                        {item.description && <span className="bz-item__sub" style={{ fontSize: 12 }}>{item.description}</span>}
                        <span className="bz-mono" style={{ fontSize: 13, fontWeight: 600 }}>{money(item.price)}</span>
                      </span>
                    </button>
                    {item.is86d ? (
                      <span className="bz-badge bz-badge--quiet">Sold out</span>
                    ) : n > 0 ? (
                      <div className="bz-stepper" role="group" aria-label={`${item.name}, ${n} in cart`}>
                        <button type="button" className="bz-step bz-step--minus" onClick={() => removeOne(item.id)} aria-label={`Remove one ${item.name}`}>−</button>
                        <span className="bz-mono bz-stepper__n">{n}</span>
                        <button type="button" className="bz-step bz-step--plus" onClick={() => tapAdd(item)} aria-label={`Add one ${item.name}`}>+</button>
                      </div>
                    ) : (
                      <button type="button" className="bz-step bz-step--plus" onClick={() => tapAdd(item)} aria-label={`Add ${item.name}`}>+</button>
                    )}
                  </div>
                )
              })}
            </article>
          ))}

          <span className="bz-meta" style={{ fontSize: 12, textAlign: 'center' }}>Allergies? Add a note in your cart · powered by prominentz</span>
        </div>

        {count > 0 && (
          <div className="bz-guest-bar">
            <span className="bz-item__body">
              <span style={{ fontWeight: 800, fontSize: 15 }}>{count} {count === 1 ? 'item' : 'items'}</span>
              <span style={{ fontSize: 13, color: '#A1A1AA' }}>{money(subtotal)} · pay at the table</span>
            </span>
            <button type="button" className="bz-btn bz-btn--lime" style={{ height: 48, borderRadius: 14 }} onClick={() => { setView('cart'); window.scrollTo({ top: 0 }) }}>
              View cart
            </button>
          </div>
        )}
      </div>
      {sheets}
    </div>
  )
}
