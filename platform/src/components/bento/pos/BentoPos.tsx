'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { BentoCheckout, type CheckoutMethod } from './BentoCheckout'
import SplitCheckModal from '@/components/pos/SplitCheckModal'
import ModifierSelector from '@/components/pos/ModifierSelector'
import { BentoLogo } from '@/components/bento/BentoLogo'
import { OfflineBanner } from '@/components/bento/OfflineBanner'
import { minutesBetween, durationLabel } from '@/lib/bento/time'
import { IDLE_STATE, openCounterPublisher, type CounterState } from '@/lib/bento/counter-display'

export interface PosModifier {
  id: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: { id: string; name: string; priceAdjustment: number }[]
}
export interface PosMenuItem {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  taxRate: number
  imageUrl: string | null
  modifiers: PosModifier[]
}
export interface PosTable {
  id: string
  name: string
  capacity: number
  status: string
}
export interface PosTab {
  id: string
  tableId: string | null
  label: string
  createdAt: string
  total: number
}

type Mode = 'Dine-in' | 'Takeaway' | 'Delivery'
type Selection = { modifierName: string; optionName: string; priceDelta: number }

interface Line {
  key: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  modifiers: Selection[]
  note: string | null
  /** Already on the order (sent or saved); only pending lines can be changed here. */
  sent: boolean
  status?: string
}

interface LoadedOrder {
  id: string
  status: string
  guestCount: number
  notes: string | null
  tableId: string
  tableName: string
  /** Stored on the server; the payment API checks against these. */
  subtotal: number
  tax: number
  items: {
    id: string
    menuItemId: string
    quantity: number
    priceAtOrder: number | string
    seatNumber: number
    modifiers: unknown
    specialNote: string | null
    status: string
    menuItem: { id: string; name: string; taxRate: number | string }
  }[]
}

interface Props {
  categories: { id: string; name: string }[]
  menu: PosMenuItem[]
  tables: PosTable[]
  tabs: PosTab[]
  specialId: string | null
  specialIsTopSeller: boolean
  locationId: string
  locationName: string
  user: { name: string; initials: string; role: string }
  initialTableId?: string
  initialOrderId?: string
  /** Open checkout as soon as the order loads (from the captain app). */
  initialPay?: boolean
}

const MODES: Mode[] = ['Dine-in', 'Takeaway', 'Delivery']
const NOTE_FOR: Record<Mode, string> = { 'Dine-in': 'Dine In', Takeaway: 'Take Away', Delivery: 'Delivery' }

function modeFromNotes(notes: string | null): Mode {
  const n = (notes ?? '').toLowerCase()
  if (n.includes('take')) return 'Takeaway'
  if (n.includes('delivery')) return 'Delivery'
  return 'Dine-in'
}

function selectionsOf(mods: unknown): Selection[] {
  if (!Array.isArray(mods)) return []
  return mods
    .map((m) => m as Partial<Selection>)
    .filter((m) => m && m.optionName)
    .map((m) => ({ modifierName: String(m.modifierName ?? ''), optionName: String(m.optionName), priceDelta: Number(m.priceDelta ?? 0) }))
}

export function BentoPos({ categories, menu, tables, tabs: initialTabs, specialId, specialIsTopSeller, locationId, locationName, user, initialTableId, initialOrderId, initialPay }: Props) {
  const router = useRouter()
  const { money, taxRate: restaurantTaxRate } = useMoney()

  const [category, setCategory] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('Dine-in')
  const [tableId, setTableId] = useState<string | null>(initialTableId ?? tables.find((t) => t.status === 'EMPTY')?.id ?? tables[0]?.id ?? null)
  const [order, setOrder] = useState<LoadedOrder | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [tabs, setTabs] = useState<PosTab[]>(initialTabs)
  const [busy, setBusy] = useState<null | 'send' | 'charge'>(null)
  const [modItem, setModItem] = useState<PosMenuItem | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutMethod, setCheckoutMethod] = useState<CheckoutMethod>('CASH')
  const [noteKey, setNoteKey] = useState<string | null>(null)
  const [splitOpen, setSplitOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const tableDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const table = tables.find((t) => t.id === tableId) ?? null
  const byId = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu])
  const special = specialId ? byId.get(specialId) ?? null : null

  // ── Load an existing order into the check ──
  const loadOrder = useCallback(async (orderId: string) => {
    const r = await fetch(`/api/orders/${orderId}`)
    if (!r.ok) {
      toast.error('Could not open that order')
      return false
    }
    const o = await r.json()
    if (o.status === 'PAID' || o.status === 'VOIDED') {
      toast.info('That order is already closed')
      return false
    }
    const loaded: LoadedOrder = {
      id: o.id,
      status: o.status,
      guestCount: o.guestCount ?? 1,
      notes: o.notes ?? null,
      tableId: o.table?.id ?? o.tableId,
      tableName: o.table?.name ?? 'Table',
      subtotal: Number(o.subtotal ?? 0),
      tax: Number(o.tax ?? 0),
      items: (o.items ?? []).filter((i: { status: string }) => i.status !== 'VOIDED'),
    }
    setOrder(loaded)
    setTableId(loaded.tableId)
    setMode(modeFromNotes(loaded.notes))
    setLines(
      loaded.items.map((i) => ({
        key: i.id,
        menuItemId: i.menuItemId,
        name: i.menuItem?.name ?? 'Item',
        // priceAtOrder is the base price; chosen options are stored separately and added on top.
        price: Number(i.priceAtOrder) + selectionsOf(i.modifiers).reduce((sum, m) => sum + m.priceDelta, 0),
        quantity: i.quantity,
        modifiers: selectionsOf(i.modifiers),
        note: i.specialNote,
        sent: true,
        status: i.status,
      })),
    )
    return true
  }, [])

  const refreshTabs = useCallback(async () => {
    try {
      const r = await fetch('/api/orders?status=OPEN,SENT_TO_KITCHEN,PARTIALLY_READY,READY,HOLD')
      if (!r.ok) return
      const list = await r.json()
      const arr = Array.isArray(list) ? list : list.orders ?? []
      setTabs(
        arr
          .filter((o: { table?: { locationId?: string } | null }) => o.table?.locationId === locationId)
          .map((o: { id: string; table?: { id: string; name: string } | null; createdAt: string; total: number | string; notes?: string | null; customerName?: string | null }) => {
          const m = modeFromNotes(o.notes ?? null)
          const who = o.customerName || o.table?.name || 'Walk-in'
          return { id: o.id, tableId: o.table?.id ?? null, label: m === 'Dine-in' ? who : `${o.table?.name ?? 'Order'} · ${m}`, createdAt: o.createdAt, total: Number(o.total) }
        }),
      )
    } catch {}
  }, [locationId])

  // Open the order passed in the URL, or the table's open order
  useEffect(() => {
    if (initialOrderId) {
      loadOrder(initialOrderId).then((ok) => ok && initialPay && setCheckoutOpen(true))
      return
    }
    if (initialTableId) {
      const tab = initialTabs.find((t) => t.tableId === initialTableId)
      if (tab) loadOrder(tab.id)
    }
  }, [initialOrderId, initialTableId, initialTabs, initialPay, loadOrder])

  // ── Cart editing ──
  const addItem = (item: PosMenuItem, mods: Selection[] = []) => {
    const delta = mods.reduce((s, m) => s + m.priceDelta, 0)
    const sig = `${item.id}|${mods.map((m) => m.optionName).join(',')}`
    setLines((prev) => {
      const i = prev.findIndex((l) => !l.sent && `${l.menuItemId}|${l.modifiers.map((m) => m.optionName).join(',')}` === sig)
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, quantity: l.quantity + 1 } : l))
      return [...prev, { key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, menuItemId: item.id, name: item.name, price: item.price + delta, quantity: 1, modifiers: mods, note: null, sent: false }]
    })
  }
  const onPick = (item: PosMenuItem) => {
    if (item.modifiers.length > 0) setModItem(item)
    else addItem(item)
  }
  const setNote = (key: string, note: string) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, note: note.slice(0, 140) || null } : l)))
  const bump = (key: string, d: number) =>
    setLines((prev) => prev.flatMap((l) => (l.key !== key ? [l] : l.quantity + d <= 0 ? [] : [{ ...l, quantity: l.quantity + d }])))

  const newCheck = (nextTableId?: string | null) => {
    setOrder(null)
    setLines([])
    if (nextTableId !== undefined) setTableId(nextTableId)
  }

  const chooseTable = async (t: PosTable) => {
    tableDialog.current?.close()
    const tab = tabs.find((x) => x.tableId === t.id)
    if (tab) await loadOrder(tab.id)
    else newCheck(t.id)
  }

  // ── Totals (same rule as the server: item's own rate, else the restaurant's) ──
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0)
  const rateOf = (id: string) => {
    const own = byId.get(id)?.taxRate ?? 0
    return own > 0 ? own : restaurantTaxRate
  }
  const tax = Number(lines.reduce((s, l) => s + l.price * l.quantity * rateOf(l.menuItemId), 0).toFixed(2))
  const total = Number((subtotal + tax).toFixed(2))
  const effRate = subtotal > 0 ? tax / subtotal : restaurantTaxRate
  const pending = lines.filter((l) => !l.sent)

  // ── Counter display: mirror this check to the guest-facing window ──
  const counter = useRef<ReturnType<typeof openCounterPublisher> | null>(null)
  const counterState = useRef<CounterState>(IDLE_STATE)
  const showingPaid = useRef(false)
  useEffect(() => {
    const p = openCounterPublisher(() => counterState.current)
    counter.current = p
    return () => p.close()
  }, [])
  useEffect(() => {
    // Keep "Paid" on the guest screen until the next check starts.
    // Also hold it while the "Paid" sheet is still open over the old check.
    if (showingPaid.current && (lines.length === 0 || checkoutOpen)) return
    showingPaid.current = false
    const tableName = order?.tableName ?? tables.find((t) => t.id === tableId)?.name ?? ''
    const state: CounterState = {
      stage: lines.length === 0 ? 'idle' : checkoutOpen ? 'paying' : 'ordering',
      ref: order ? `#${order.id.slice(-4).toUpperCase()}` : null,
      place: mode === 'Dine-in' ? tableName : mode,
      lines: lines.map((l) => ({ name: l.name, quantity: l.quantity, amount: l.price * l.quantity })),
      subtotal,
      tax,
      taxLabel: `Tax ${Number((effRate * 100).toFixed(2))}%`,
      total,
      at: Date.now(),
    }
    counterState.current = state
    counter.current?.publish(state)
  }, [lines, checkoutOpen, order, mode, tableId, tables, subtotal, tax, total, effRate])
  const announcePaid = (paidTotal: number) => {
    const paid: CounterState = { ...counterState.current, stage: 'paid', total: paidTotal, at: Date.now() }
    counterState.current = paid
    showingPaid.current = true
    counter.current?.publish(paid)
  }

  // ── Live: other tills, the captain app and QR orders change the open tabs ──
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const soon = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => refreshTabs(), 400)
    }
    const es = new EventSource('/api/events')
    for (const ev of ['order.created', 'order.modified', 'order.sent_to_kitchen', 'payment.processed', 'table.status_changed']) es.addEventListener(ev, soon)
    return () => {
      if (timer) clearTimeout(timer)
      es.close()
    }
  }, [refreshTabs])

  // ── Printed bill and kitchen ticket (browser print, works with any receipt printer driver) ──
  const printTicket = (kind: 'bill' | 'kot') => {
    const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
    const where = mode === 'Dine-in' ? table?.name ?? order?.tableName ?? 'Table' : mode
    const ref = order ? `#${order.id.slice(-5).toUpperCase()}` : 'New check'
    const when = new Date().toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    const rows = lines
      .map((l) => {
        const opts = [l.modifiers.map((m) => m.optionName).join(', '), l.note ? `Note: ${l.note}` : ''].filter(Boolean).join(' · ')
        return kind === 'kot'
          ? `<tr><td class="q">${l.quantity}×</td><td><b>${esc(l.name)}</b>${opts ? `<div class="o">${esc(opts)}</div>` : ''}</td></tr>`
          : `<tr><td class="q">${l.quantity}×</td><td>${esc(l.name)}${opts ? `<div class="o">${esc(opts)}</div>` : ''}</td><td class="a">${esc(money(l.price * l.quantity))}</td></tr>`
      })
      .join('')
    const totals =
      kind === 'bill'
        ? `<div class="line"></div><table><tr><td>Subtotal</td><td class="a">${esc(money(subtotal))}</td></tr><tr><td>Tax ${Number((effRate * 100).toFixed(2))}%</td><td class="a">${esc(money(tax))}</td></tr><tr class="t"><td>Total</td><td class="a">${esc(money(total))}</td></tr></table><p class="c">Thank you. Please pay at the counter or ask your server.</p>`
        : ''
    const w = window.open('', '_blank', 'width=380,height=600')
    if (!w) {
      toast.error('Allow pop-ups for this site to print')
      return
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${kind === 'bill' ? 'Bill' : 'KOT'} ${esc(ref)}</title><style>
      body{font:13px/1.35 ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:0 auto;padding:8px;color:#000}
      h1{font-size:16px;margin:0 0 2px;text-align:center}.c{text-align:center}.m{text-align:center;font-size:12px}
      table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:2px 0}.q{width:28px}.a{text-align:right;white-space:nowrap}
      .o{font-size:11px}.line{border-top:1px dashed #000;margin:8px 0}.t td{font-weight:700;font-size:15px;padding-top:4px}
      ${kind === 'kot' ? 'td{font-size:15px}' : ''}
    </style></head><body>
      <h1>${kind === 'bill' ? esc(locationName) : 'KITCHEN ORDER'}</h1>
      <div class="m">${esc(where)} · ${esc(ref)} · ${esc(when)}</div>
      <div class="line"></div><table>${rows}</table>${totals}
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}</script>
    </body></html>`)
    w.document.close()
  }

  // ── Send pending lines to the kitchen; returns the order id ──
  const send = async (): Promise<string | null> => {
    const tid = tableId ?? tables[0]?.id
    if (!tid) {
      toast.error('Add a table first in Tables and floor')
      return null
    }
    let orderId = order?.id ?? null
    if (!orderId) {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: tid, guestCount: 2, notes: NOTE_FOR[mode] }),
      })
      if (!r.ok) {
        toast.error((await r.json().catch(() => null))?.error || 'Could not open an order')
        return null
      }
      orderId = (await r.json()).id as string
    }
    if (pending.length > 0) {
      const add = await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: pending.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, seatNumber: 1, specialNote: l.note || undefined, modifiers: l.modifiers })),
        }),
      })
      if (!add.ok) {
        toast.error((await add.json().catch(() => null))?.error || 'Could not add the items')
        return null
      }
      const fire = await fetch(`/api/orders/${orderId}/send`, { method: 'POST' })
      if (!fire.ok) {
        toast.error((await fire.json().catch(() => null))?.error || 'Items saved but not sent to the kitchen')
      }
    }
    await loadOrder(orderId)
    refreshTabs()
    return orderId
  }

  const onSend = async () => {
    if (pending.length === 0) return
    setBusy('send')
    try {
      const id = await send()
      if (id) toast.success('Sent to the kitchen')
    } finally {
      setBusy(null)
    }
  }

  const onCharge = async (method: CheckoutMethod = 'CASH') => {
    if (lines.length === 0) return
    setCheckoutMethod(method)
    setBusy('charge')
    try {
      const id = pending.length > 0 || !order ? await send() : order.id
      if (id) setCheckoutOpen(true)
    } finally {
      setBusy(null)
    }
  }

  const visible = menu.filter(
    (m) => (category === 'all' || m.categoryId === category) && (!query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase())),
  )
  const countIn = (id: string) => menu.filter((m) => m.categoryId === id).length
  const otherTabs = tabs.filter((t) => t.id !== order?.id)
  const homeHref = user.role === 'OWNER' || user.role === 'MANAGER' ? '/dashboard' : user.role === 'SERVER' ? '/server' : undefined

  return (
    <div className="bz">
      <div className="bz-wrap">
        <header className="bz-header">
          <div className="bz-header__left" style={{ gap: 20 }}>
            <BentoLogo href={homeHref} />
            <span className="bz-chip" style={{ background: 'var(--bz-ink)', color: 'var(--bz-card)', padding: '8px 14px' }}>POS · {locationName}</span>
            {order && <span className="bz-meta bz-hide-sm">Order open {durationLabel(minutesBetween(new Date(tabs.find((t) => t.id === order.id)?.createdAt ?? now), now))}</span>}
          </div>
          <div className="bz-header__right">
            <label className="bz-search">
              <span className="bz-sr">Search menu</span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input type="search" placeholder="Search dish" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button
              type="button"
              className="bz-btn bz-btn--outline bz-hide-sm"
              onClick={() => window.open('/pos/display', 'pz-counter-display', 'popup,width=1280,height=800')}
              title="Open the guest-facing screen in a new window. Drag it to the second monitor."
            >
              Customer screen
            </button>
            <span className="bz-avatar bz-avatar--soft" aria-label={`Signed in as ${user.name || 'staff'}`} role="img">{user.initials}</span>
          </div>
        </header>
        <OfflineBanner />

        <section className="bz-grid" aria-label="Point of sale">
          {/* Special today */}
          <article className="bz-tile bz-tile--accent bz-c3 bz-r2" style={{ minHeight: 440 }}>
            <span className="bz-chip bz-chip--tag" style={{ background: '#141416', color: '#FFFFFF', fontSize: 12, padding: '6px 12px' }}>
              {specialIsTopSeller ? 'Top seller today' : 'Special today'}
            </span>
            {special ? (
              <>
                <div style={{ flexGrow: 1, minHeight: 180, borderRadius: 22, overflow: 'hidden', background: 'rgba(255,255,255,0.14)', border: special.imageUrl ? 0 : '2px dashed rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {special.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={special.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10c0-3.3 3.6-6 8-6s8 2.7 8 6H4z" /><path d="M3 13h18M4 16h16c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4z" /></svg>
                  )}
                </div>
                <div className="bz-stack" style={{ gap: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.03em' }}>{special.name}</span>
                  {special.description && <span className="bz-sub" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{special.description}</span>}
                </div>
                <div className="bz-row bz-row--center">
                  <span className="bz-mono" style={{ fontSize: 26, fontWeight: 700 }}>{money(special.price)}</span>
                  <button type="button" className="bz-btn bz-btn--lime" style={{ height: 48, padding: '0 20px', borderRadius: 14, fontSize: 15 }} onClick={() => onPick(special)}>Add</button>
                </div>
              </>
            ) : (
              <div className="bz-empty"><strong>No dishes yet</strong>Add dishes in the Menu editor.</div>
            )}
          </article>

          {/* Menu */}
          <article className="bz-tile bz-c5 bz-r2 bz-tile--pad-sm" style={{ gap: 16 }}>
            <nav aria-label="Menu categories" className="bz-filters" style={{ gap: 8 }}>
              <button type="button" className="bz-filter" style={{ height: 44 }} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
                All <span className="bz-filter__n">{menu.length}</span>
              </button>
              {categories.filter((c) => countIn(c.id) > 0).map((c) => (
                <button key={c.id} type="button" className="bz-filter" style={{ height: 44 }} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  {c.name} <span className="bz-filter__n">{countIn(c.id)}</span>
                </button>
              ))}
            </nav>
            <div className="bz-pos-menu">
              {visible.map((i) => (
                <div key={i.id} className="bz-pos-item">
                  <span aria-hidden="true" className="bz-pos-item__img">
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="13" r="7" /><circle cx="12" cy="13" r="3.5" /></svg>
                    )}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14, padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
                  <div className="bz-row bz-row--center" style={{ paddingLeft: 4 }}>
                    <span className="bz-mono" style={{ fontSize: 13, color: 'var(--bz-muted)' }}>{money(i.price)}</span>
                    <button type="button" className="bz-btn bz-btn--ink bz-btn--square" aria-label={`Add ${i.name}`} onClick={() => onPick(i)}>+</button>
                  </div>
                </div>
              ))}
              {visible.length === 0 && <div className="bz-empty" style={{ gridColumn: '1 / -1' }}>No dishes match.</div>}
            </div>
          </article>

          {/* Check */}
          <article className="bz-tile bz-tile--flush bz-c4 bz-r3">
            <div style={{ background: '#141416', color: '#FFFFFF', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="bz-row">
                <button type="button" onClick={() => tableDialog.current?.showModal()} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }} aria-label="Choose table">
                  <h2 className="bz-title bz-title--lg">{mode === 'Dine-in' ? table?.name ?? 'Pick a table' : mode}</h2>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <span className="bz-mono" style={{ fontSize: 13, color: '#A1A1AA' }}>
                  {order ? `#${order.id.slice(-5).toUpperCase()} · ${order.guestCount} guest${order.guestCount === 1 ? '' : 's'}` : 'New check'}
                </span>
              </div>
              <div role="group" aria-label="Order type" style={{ display: 'flex', gap: 6, padding: 4, background: '#2A2A30', borderRadius: 12 }}>
                {MODES.map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} disabled={Boolean(order)}
                    style={{ flex: 1, height: 40, border: 0, borderRadius: 9, cursor: order ? 'default' : 'pointer', background: mode === m ? '#FFFFFF' : 'transparent', color: mode === m ? '#141416' : '#FFFFFF', font: `${mode === m ? 700 : 600} 13px var(--bz-font)`, opacity: order && mode !== m ? 0.5 : 1 }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '10px 22px', display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: 'min(520px, 55vh)' }}>
              {lines.length === 0 && (
                <div className="bz-empty" style={{ margin: '12px 0' }}>
                  <strong>Empty check</strong>
                  Tap a dish to add it.
                </div>
              )}
              {lines.map((l) => {
                const sub = [l.modifiers.map((m) => m.optionName).join(', '), l.note].filter(Boolean).join(' · ')
                return (
                  <div key={l.key} className="bz-item" style={{ minHeight: 60, borderBottom: '1px dashed var(--bz-line)', padding: '6px 0' }}>
                    <div className="bz-item__body">
                      <span className="bz-item__name">{l.name}</span>
                      <span className="bz-item__sub" style={{ fontSize: 12 }}>
                        {l.sent ? (l.status === 'READY' ? 'Ready' : l.status === 'SERVED' ? 'Served' : l.status === 'PENDING' ? 'Saved' : 'In kitchen') : 'Not sent'}
                        {sub ? ` · ${sub}` : ''}
                      </span>
                      {!l.sent &&
                        (noteKey === l.key ? (
                          <input
                            className="bz-input"
                            style={{ height: 36, fontSize: 13, marginTop: 4 }}
                            autoFocus
                            maxLength={140}
                            defaultValue={l.note ?? ''}
                            placeholder="Note for the kitchen"
                            aria-label={`Kitchen note for ${l.name}`}
                            onBlur={(e) => {
                              setNote(l.key, e.target.value.trim())
                              setNoteKey(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                              if (e.key === 'Escape') setNoteKey(null)
                            }}
                          />
                        ) : (
                          <button type="button" className="bz-link" style={{ alignSelf: 'flex-start', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 12 }} onClick={() => setNoteKey(l.key)}>
                            {l.note ? 'Edit note' : 'Add note'}
                          </button>
                        ))}
                    </div>
                    {l.sent ? (
                      <span className="bz-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 30, textAlign: 'center' }}>×{l.quantity}</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--bz-line)', borderRadius: 12 }}>
                        <button type="button" className="bz-qty" aria-label={`Remove one ${l.name}`} onClick={() => bump(l.key, -1)}>−</button>
                        <span className="bz-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 18, textAlign: 'center' }}>{l.quantity}</span>
                        <button type="button" className="bz-qty" aria-label={`Add one ${l.name}`} onClick={() => bump(l.key, 1)}>+</button>
                      </div>
                    )}
                    <span className="bz-mono" style={{ width: 76, textAlign: 'right', fontSize: 14, fontWeight: 600 }}>{money(l.price * l.quantity)}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 'auto', padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bz-soft)' }}>
              <div className="bz-row" style={{ fontSize: 14, color: 'var(--bz-muted)' }}><span>Subtotal</span><span className="bz-mono">{money(subtotal)}</span></div>
              <div className="bz-row" style={{ fontSize: 14, color: 'var(--bz-muted)' }}><span>Tax {Number((effRate * 100).toFixed(2))}%</span><span className="bz-mono">{money(tax)}</span></div>
              <div className="bz-row" style={{ paddingTop: 8, borderTop: '1px solid var(--bz-line)' }}>
                <span style={{ fontWeight: 800, fontSize: 18 }}>Total</span>
                <span className="bz-mono" style={{ fontSize: 26, fontWeight: 700 }}>{money(total)}</span>
              </div>
              <button type="button" className="bz-btn bz-btn--lime bz-btn--xl bz-btn--block" style={{ marginTop: 6 }} disabled={lines.length === 0 || busy !== null} onClick={() => onCharge('CASH')}>
                {busy === 'charge' ? 'Opening…' : `Charge ${money(total)}`}
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <button type="button" className="bz-btn bz-btn--ink" style={{ height: 48, borderRadius: 14 }} disabled={pending.length === 0 || busy !== null} onClick={onSend}>
                  {busy === 'send' ? 'Sending…' : 'Send to kitchen'}
                </button>
                <button type="button" className="bz-btn bz-btn--outline" style={{ height: 48, borderRadius: 14 }} disabled={!order || pending.length > 0} onClick={() => setSplitOpen(true)} title={pending.length > 0 ? 'Send new items first' : undefined}>
                  Split by seat
                </button>
              </div>
              {lines.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <button type="button" className="bz-btn bz-btn--outline bz-btn--sm" onClick={() => printTicket('bill')}>Print bill</button>
                  <button type="button" className="bz-btn bz-btn--outline bz-btn--sm" onClick={() => printTicket('kot')}>Print KOT</button>
                </div>
              )}
              {(order || lines.length > 0) && (
                <button type="button" className="bz-btn bz-btn--sm" style={{ background: 'transparent', color: 'var(--bz-muted)' }} onClick={() => newCheck()}>
                  Start a new check
                </button>
              )}
            </div>
          </article>

          {/* Take payment */}
          <article className="bz-tile bz-c4 bz-tile--pad-sm">
            <h2 className="bz-title">Take payment</h2>
            <div className="bz-kpis" style={{ gap: 10 }}>
              {[
                { label: 'Cash', sub: 'Works out change', method: 'CASH' as const, ink: true },
                { label: 'Card', sub: 'On the card reader', method: 'CARD' as const },
                { label: 'Split evenly', sub: 'Each guest pays a share', method: 'SPLIT' as const },
                { label: 'Split by seat', sub: 'Move items, print per seat', seats: true },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`bz-paybtn${p.ink ? ' bz-paybtn--ink' : ''}`}
                  disabled={lines.length === 0 || busy !== null || (p.seats && (!order || pending.length > 0))}
                  title={p.seats && pending.length > 0 ? 'Send new items first' : undefined}
                  onClick={() => (p.seats ? setSplitOpen(true) : onCharge(p.method))}
                >
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{p.label}</span>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{p.sub}</span>
                </button>
              ))}
            </div>
          </article>

          {/* Held and open tabs */}
          <article className="bz-tile bz-tile--accent bz-c4 bz-tile--pad-sm" style={{ gap: 10 }}>
            <div className="bz-row">
              <h2 className="bz-title">Held and open tabs</h2>
              <span className="bz-meta">{otherTabs.length}</span>
            </div>
            {otherTabs.length > 0 ? (
              otherTabs.slice(0, 4).map((t) => (
                <button key={t.id} type="button" className="bz-darkrow bz-darkrow--pad" style={{ border: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }} onClick={() => loadOrder(t.id)}>
                  <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{t.label}</span>
                  <span style={{ fontSize: 13, color: '#A1A1AA', whiteSpace: 'nowrap' }}>{durationLabel(minutesBetween(new Date(t.createdAt), now))}</span>
                  <span className="bz-darkrow__amt">{money(t.total)}</span>
                </button>
              ))
            ) : (
              <div className="bz-empty"><strong>No other open checks</strong>Sent orders stay here until paid.</div>
            )}
          </article>
        </section>
      </div>

      {/* Table picker */}
      <dialog ref={tableDialog} className="bz-dialog" aria-labelledby="pick-table" style={{ width: 'min(560px, calc(100vw - 32px))' }}>
        <div className="bz-stack bz-stack--lg">
          <h2 id="pick-table" className="bz-title bz-title--lg">Choose a table</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
            {tables.map((t) => {
              const open = tabs.some((x) => x.tableId === t.id)
              return (
                <button key={t.id} type="button" className={`bz-tablebtn${open ? ' bz-tablebtn--busy' : ''}${t.id === tableId ? ' bz-tablebtn--on' : ''}`} onClick={() => chooseTable(t)}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{t.name}</span>
                  <span style={{ fontSize: 12 }}>{open ? 'Open check' : `${t.capacity} seats`}</span>
                </button>
              )
            })}
          </div>
          {tables.length === 0 && <span className="bz-sub">No tables yet. Add them in Tables and floor.</span>}
          <div className="bz-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="bz-btn bz-btn--outline" onClick={() => tableDialog.current?.close()}>Close</button>
          </div>
        </div>
      </dialog>

      {modItem && (
        <ModifierSelector
          isOpen
          menuItem={modItem}
          onClose={() => setModItem(null)}
          onConfirm={(sel) => {
            addItem(modItem, sel)
            setModItem(null)
          }}
        />
      )}

      {checkoutOpen && order && (
        <BentoCheckout
          initialMethod={checkoutMethod}
          order={{
            id: order.id,
            ref: `#${order.id.slice(-5).toUpperCase()}`,
            place: mode === 'Dine-in' ? order.tableName : mode,
            subtotal: order.subtotal,
            tax: order.tax,
            itemCount: lines.reduce((s, l) => s + l.quantity, 0),
          }}
          onCancel={() => setCheckoutOpen(false)}
          onPaid={(r) => {
            announcePaid(r.total)
            refreshTabs()
          }}
          onDone={() => {
            setCheckoutOpen(false)
            newCheck()
            router.refresh()
          }}
        />
      )}

      {splitOpen && order && (
        <SplitCheckModal
          isOpen
          onClose={() => setSplitOpen(false)}
          orderId={order.id}
          guestCount={order.guestCount}
          items={order.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            priceAtOrder: Number(i.priceAtOrder),
            seatNumber: i.seatNumber ?? 1,
            modifiers: i.modifiers,
            specialNote: i.specialNote,
            status: i.status,
            menuItem: { id: i.menuItem?.id ?? i.menuItemId, name: i.menuItem?.name ?? 'Item', taxRate: Number(i.menuItem?.taxRate ?? 0) },
          }))}
          showToast={(msg, v) => toast[v](msg)}
          onSeatChanged={() => loadOrder(order.id)}
        />
      )}
    </div>
  )
}
