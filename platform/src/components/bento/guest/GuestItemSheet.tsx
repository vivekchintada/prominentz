'use client'

import { useEffect, useRef, useState } from 'react'
import { useMoney } from '@/components/providers/CurrencyProvider'
import type { GuestMenuItem, GuestModifierGroup, GuestModifierOption } from './types'

interface Props {
  item: GuestMenuItem | null
  onClose: () => void
  onAdd: (item: GuestMenuItem, mods: GuestModifierOption[], note: string, qty: number) => void
}

/**
 * Bottom sheet for one dish: choices, a kitchen note and how many.
 * Groups that allow one choice behave like radio buttons; required groups must
 * be answered before the dish can be added.
 */
export function GuestItemSheet({ item, onClose, onAdd }: Props) {
  const { money } = useMoney()
  const ref = useRef<HTMLDialogElement>(null)
  const [mods, setMods] = useState<GuestModifierOption[]>([])
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (item) {
      setMods([])
      setNote('')
      setQty(1)
      setTried(false)
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
    }
  }, [item])

  if (!item) return <dialog ref={ref} className="bz-dialog bz-sheet" aria-label="Dish" onClose={onClose} />

  const chosenIn = (g: GuestModifierGroup) => mods.filter((m) => g.options.some((o) => o.id === m.id))
  const missing = item.modifiers.filter((g) => g.isRequired && g.options.length > 0 && chosenIn(g).length === 0)
  const unit = item.price + mods.reduce((s, m) => s + m.priceAdjustment, 0)

  const toggle = (g: GuestModifierGroup, o: GuestModifierOption) => {
    setMods((prev) => {
      if (prev.some((m) => m.id === o.id)) return prev.filter((m) => m.id !== o.id)
      const inGroup = prev.filter((m) => g.options.some((x) => x.id === m.id))
      if (g.maxSelect <= 1) return [...prev.filter((m) => !inGroup.includes(m)), o]
      if (inGroup.length >= g.maxSelect) return prev
      return [...prev, o]
    })
  }

  const add = () => {
    if (missing.length > 0) {
      setTried(true)
      return
    }
    onAdd(item, mods, note.trim(), qty)
    onClose()
  }

  return (
    <dialog ref={ref} className="bz-dialog bz-sheet" aria-labelledby="dish-title" onClose={onClose}>
      <div className="bz-stack bz-stack--lg">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- menu photos come from any host the restaurant uses
          <img src={item.imageUrl} alt="" className="bz-sheet__photo" onError={(e) => (e.currentTarget.style.display = 'none')} />
        )}
        <div className="bz-row" style={{ alignItems: 'flex-start' }}>
          <h2 id="dish-title" className="bz-title bz-title--lg">{item.name}</h2>
          <span className="bz-mono" style={{ fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap' }}>{money(item.price)}</span>
        </div>
        {item.description && <p className="bz-sub" style={{ lineHeight: 1.5 }}>{item.description}</p>}

        {item.modifiers.map((g) => {
          const chosen = chosenIn(g)
          const showError = tried && missing.includes(g)
          const single = g.maxSelect <= 1
          return (
            <fieldset key={g.id} className="bz-choice-group">
              <legend className="bz-row" style={{ width: '100%' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{g.name}</span>
                <span className={showError ? 'bz-error__title' : 'bz-meta'} style={{ fontSize: 12 }}>
                  {g.isRequired ? (showError ? 'Choose one to continue' : 'Required') : single ? 'Optional' : `Up to ${g.maxSelect}`}
                </span>
              </legend>
              {g.options.map((o) => {
                const on = chosen.some((m) => m.id === o.id)
                return (
                  <label key={o.id} className={`bz-choice${on ? ' bz-choice--on' : ''}`}>
                    <input type={single ? 'radio' : 'checkbox'} name={`grp-${g.id}`} checked={on} onChange={() => toggle(g, o)} />
                    <span className="bz-grow">{o.name}</span>
                    {o.priceAdjustment !== 0 && (
                      <span className="bz-mono" style={{ fontSize: 13 }}>
                        {o.priceAdjustment > 0 ? '+' : '−'}
                        {money(Math.abs(o.priceAdjustment))}
                      </span>
                    )}
                  </label>
                )
              })}
            </fieldset>
          )
        })}

        <label className="bz-field">
          Note for the kitchen
          <textarea className="bz-textarea" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergies, less spicy, no onion…" />
        </label>

        <div className="bz-row bz-row--center" style={{ gap: 12 }}>
          <div className="bz-stepper" role="group" aria-label="How many">
            <button type="button" className="bz-step bz-step--minus" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer" disabled={qty <= 1}>−</button>
            <span className="bz-mono bz-stepper__n" aria-live="polite">{qty}</span>
            <button type="button" className="bz-step bz-step--plus" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="One more">+</button>
          </div>
          {/* Focus lands here, not on the note, so phones don't open the keyboard */}
          <button type="button" className="bz-btn bz-btn--lime bz-btn--lg bz-grow" onClick={add} autoFocus>
            Add · {money(unit * qty)}
          </button>
        </div>
        <button type="button" className="bz-btn bz-btn--outline" onClick={onClose}>Cancel</button>
      </div>
    </dialog>
  )
}
