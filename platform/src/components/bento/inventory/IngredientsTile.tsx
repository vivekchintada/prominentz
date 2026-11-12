'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useMoney } from '@/components/providers/CurrencyProvider'
import type { IngredientRow, StockStatus } from '@/lib/bento/inventory-overview'

const STATUS_LABEL: Record<StockStatus, string> = { reorder: 'Reorder', near: 'Near par', ok: 'OK' }
const STATUS_CLASS: Record<StockStatus, string> = { reorder: 'bz-badge bz-badge--accent', near: 'bz-badge', ok: 'bz-badge bz-badge--quiet' }
const COLS = '1.6fr 1fr 1fr 1fr 1fr 140px'

type Filter = { key: string; label: string; test: (r: IngredientRow) => boolean }

function qty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0)
}

export function IngredientsTile({ rows }: { rows: IngredientRow[] }) {
  const { money } = useMoney()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [filterKey, setFilterKey] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<IngredientRow | null>(null)
  const [mode, setMode] = useState<'STOCK_IN' | 'WASTE'>('STOCK_IN')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const filters: Filter[] = useMemo(() => {
    const cats = new Map<string, number>()
    for (const r of rows) if (r.category) cats.set(r.category, (cats.get(r.category) ?? 0) + 1)
    const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c)
    return [
      { key: 'all', label: 'All', test: () => true },
      { key: 'reorder', label: 'Reorder', test: (r: IngredientRow) => r.status === 'reorder' },
      { key: 'near', label: 'Near par', test: (r: IngredientRow) => r.status === 'near' },
      ...topCats.map((c) => ({ key: `cat:${c}`, label: c, test: (r: IngredientRow) => r.category === c })),
    ]
  }, [rows])

  const active = filters.find((f) => f.key === filterKey) ?? filters[0]
  const q = query.trim().toLowerCase()
  const visible = rows.filter((r) => active.test(r) && (!q || r.name.toLowerCase().includes(q)))

  const open = (r: IngredientRow) => {
    setEditing(r)
    setMode('STOCK_IN')
    setAmount('')
    setNote('')
    dialogRef.current?.showModal()
  }
  const close = () => dialogRef.current?.close()

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter an amount above zero')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: editing.id,
          type: mode,
          quantity: n,
          notes: note || (mode === 'STOCK_IN' ? `Received ${n} ${editing.unit}` : `Wasted ${n} ${editing.unit}`),
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Could not update stock')
      toast.success(mode === 'STOCK_IN' ? `Added ${n} ${editing.unit} of ${editing.name}` : `Logged ${n} ${editing.unit} of ${editing.name} as waste`)
      close()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="bz-tile bz-c12" id="ingredients">
      <div className="bz-row bz-row--center bz-row--wrap">
        <h2 className="bz-title">Ingredients</h2>
        <div className="bz-row bz-row--center bz-row--wrap" style={{ gap: 10 }}>
          <label className="bz-search" style={{ height: 40 }}>
            <span className="bz-sr">Search ingredients</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input type="search" placeholder="Find an ingredient" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 160 }} />
          </label>
          <div className="bz-filters" role="group" aria-label="Filter ingredients">
            {filters.map((f) => (
              <button key={f.key} type="button" className="bz-filter" aria-pressed={f.key === active.key} onClick={() => setFilterKey(f.key)}>
                {f.label}
                <span className="bz-filter__n">{rows.filter(f.test).length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bz-empty">
          <strong>No ingredients yet</strong>
          <span>
            Add them on the <Link className="bz-link" href="/dashboard/inventory/items">full item list</Link> to track stock and get reorder alerts.
          </span>
        </div>
      ) : (
        <div className="bz-table">
          <div className="bz-table__inner" style={{ minWidth: 760 }}>
            <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
              <span>Item</span><span>On hand</span><span>Par</span><span>Unit cost</span><span>Status</span><span />
            </div>
            {visible.map((r) => (
              <div key={r.id} className="bz-table__row" style={{ gridTemplateColumns: COLS }}>
                <span className="bz-stack" style={{ gap: 0 }}>
                  <span style={{ fontWeight: 700 }}>{r.name}</span>
                  {r.category && <span style={{ fontSize: 12, color: 'var(--bz-muted)' }}>{r.category}</span>}
                </span>
                <span className="bz-mono">{qty(r.onHand)} {r.unit}</span>
                <span className="bz-mono" style={{ color: 'var(--bz-muted)' }}>{r.par > 0 ? `${qty(r.par)} ${r.unit}` : '–'}</span>
                <span className="bz-mono">{money(r.unitCost)}/{r.unit}</span>
                <span className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status]}</span>
                <button type="button" className="bz-btn bz-btn--outline bz-btn--sm" onClick={() => open(r)} aria-label={`Adjust ${r.name}`}>
                  Adjust
                </button>
              </div>
            ))}
            {visible.length === 0 && <div className="bz-empty" style={{ marginTop: 12 }}>Nothing matches this filter.</div>}
          </div>
        </div>
      )}

      <dialog ref={dialogRef} className="bz-dialog" aria-labelledby="adjust-title" onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={save} className="bz-stack bz-stack--lg">
            <div className="bz-stack" style={{ gap: 2 }}>
              <h2 id="adjust-title" className="bz-title bz-title--lg">{editing.name}</h2>
              <span className="bz-sub">On hand now: {qty(editing.onHand)} {editing.unit}</span>
            </div>
            <div className="bz-seg" role="group" aria-label="What happened" style={{ background: 'var(--bz-soft)' }}>
              <button type="button" className="bz-seg__btn" aria-pressed={mode === 'STOCK_IN'} onClick={() => setMode('STOCK_IN')}>Received</button>
              <button type="button" className="bz-seg__btn" aria-pressed={mode === 'WASTE'} onClick={() => setMode('WASTE')}>Wasted</button>
            </div>
            <label className="bz-field">
              <span>Amount, in {editing.unit}</span>
              <input inputMode="decimal" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
            </label>
            <label className="bz-field">
              <span>Note (optional)</span>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'STOCK_IN' ? 'Supplier, invoice number' : 'Why it was thrown out'} />
            </label>
            <div className="bz-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="bz-btn bz-btn--outline" onClick={close}>Cancel</button>
              <button type="submit" className="bz-btn bz-btn--lime" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </dialog>
    </article>
  )
}
