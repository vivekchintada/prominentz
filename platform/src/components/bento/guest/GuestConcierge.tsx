'use client'

import { useEffect, useRef, useState } from 'react'
import { useMoney } from '@/components/providers/CurrencyProvider'

interface DishCard {
  id: string
  name: string
  price: number
  is86d: boolean
}

interface Message {
  from: 'guest' | 'menu'
  text: string
  dishes?: DishCard[]
  pills?: string[]
}

const START: Message = {
  from: 'menu',
  text: 'Ask about allergens, what is vegetarian, or what goes well together. Answers come from this restaurant’s menu.',
  pills: ['Vegetarian options', 'Gluten-free dishes', 'What is popular today?'],
}

interface Props {
  open: boolean
  locationId: string
  tableId: string
  onClose: () => void
  onPickDish: (id: string) => void
}

/** Menu questions answered by the restaurant's assistant, with dishes you can open and add. */
export function GuestConcierge({ open, locationId, tableId, onClose, onPickDish }: Props) {
  const { money } = useMoney()
  const ref = useRef<HTMLDialogElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([START])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy])

  const ask = async (q: string) => {
    const text = q.trim()
    if (!text || busy) return
    setMessages((m) => [...m, { from: 'guest', text }])
    setDraft('')
    setBusy(true)
    try {
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, locationId, tableId, mode: 'customer' }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error()
      setMessages((m) => [
        ...m,
        {
          from: 'menu',
          text: String(d.message || 'Here is what I found on the menu.').replace(/\*\*/g, ''),
          dishes: Array.isArray(d.actionableDishCards) ? d.actionableDishCards : [],
          pills: Array.isArray(d.suggestedPills) ? d.suggestedPills : undefined,
        },
      ])
    } catch {
      setMessages((m) => [...m, { from: 'menu', text: 'The menu assistant is not answering right now. Please ask your server.' }])
    } finally {
      setBusy(false)
    }
  }

  const last = messages[messages.length - 1]

  return (
    <dialog ref={ref} className="bz-dialog bz-sheet" aria-labelledby="ask-title" onClose={onClose}>
      <div className="bz-stack bz-stack--lg">
        <div className="bz-row">
          <h2 id="ask-title" className="bz-title bz-title--lg">Ask about the menu</h2>
          <button type="button" className="bz-icon-btn" onClick={onClose} aria-label="Close">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="bz-chat" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`bz-chat__msg bz-chat__msg--${m.from}`}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>
              {m.dishes && m.dishes.length > 0 && (
                <div className="bz-stack" style={{ gap: 6, marginTop: 8 }}>
                  {m.dishes.map((d) => (
                    <button key={d.id} type="button" className="bz-captain-row" disabled={d.is86d} onClick={() => onPickDish(d.id)} style={{ border: 0, cursor: d.is86d ? 'default' : 'pointer', textAlign: 'left' }}>
                      <span className="bz-grow" style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</span>
                      <span className="bz-mono" style={{ fontSize: 13 }}>{d.is86d ? 'Sold out' : money(Number(d.price))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="bz-chat__msg bz-chat__msg--menu bz-meta">Checking the menu…</div>}
          <div ref={endRef} />
        </div>

        {last.pills && !busy && (
          <div className="bz-cats">
            {last.pills.map((p) => (
              <button key={p} type="button" className="bz-filter" onClick={() => ask(p)}>{p}</button>
            ))}
          </div>
        )}

        <form
          className="bz-row"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
        >
          <label className="bz-sr" htmlFor="ask-input">Your question</label>
          <input id="ask-input" className="bz-input bz-grow" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} placeholder="Is the dal nut-free?" autoComplete="off" />
          <button type="submit" className="bz-btn bz-btn--ink" disabled={busy || !draft.trim()}>Ask</button>
        </form>
      </div>
    </dialog>
  )
}
