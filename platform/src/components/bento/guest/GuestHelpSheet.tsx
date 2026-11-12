'use client'

import { useEffect, useRef, useState } from 'react'
import type { AssistanceType } from './types'

const OPTIONS: { type: AssistanceType; label: string; sub: string }[] = [
  { type: 'CALL_WAITER', label: 'Call a server', sub: 'Someone comes to your table' },
  { type: 'REQUEST_BILL', label: 'Ask for the bill', sub: 'Pay at the table' },
  { type: 'WATER', label: 'Water refill', sub: 'Still or sparkling' },
  { type: 'CUTLERY', label: 'Cutlery or napkins', sub: 'Extra plates too' },
  { type: 'OTHER', label: 'Something else', sub: 'Tell us below' },
]

interface Props {
  open: boolean
  sending: boolean
  onClose: () => void
  onSend: (type: AssistanceType, notes: string) => void
}

/** "Call a server" sheet: pick what you need, add an optional note, send. */
export function GuestHelpSheet({ open, sending, onClose, onSend }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [type, setType] = useState<AssistanceType>('CALL_WAITER')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setType('CALL_WAITER')
      setNotes('')
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} className="bz-dialog bz-sheet" aria-labelledby="help-title" onClose={onClose}>
      <form
        className="bz-stack bz-stack--lg"
        onSubmit={(e) => {
          e.preventDefault()
          onSend(type, notes.trim())
        }}
      >
        <h2 id="help-title" className="bz-title bz-title--lg">What do you need?</h2>
        <fieldset className="bz-choice-group">
          <legend className="bz-sr">Request</legend>
          {OPTIONS.map((o) => (
            <label key={o.type} className={`bz-choice${type === o.type ? ' bz-choice--on' : ''}`}>
              <input type="radio" name="help-type" checked={type === o.type} onChange={() => setType(o.type)} />
              <span className="bz-item__body">
                <span style={{ fontWeight: 700, fontSize: 15 }}>{o.label}</span>
                <span className="bz-meta" style={{ fontSize: 12 }}>{o.sub}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="bz-field">
          Note (optional)
          <textarea className="bz-textarea" rows={2} maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra ice, hot water, high chair…" />
        </label>
        <button type="submit" className="bz-btn bz-btn--lime bz-btn--lg" disabled={sending}>
          {sending ? 'Sending…' : 'Send to the team'}
        </button>
        <button type="button" className="bz-btn bz-btn--outline" onClick={onClose}>Cancel</button>
      </form>
    </dialog>
  )
}
