/**
 * The counter display is a second browser window (usually on a guest-facing
 * monitor) that mirrors the POS check. The two windows talk over a
 * BroadcastChannel, so nothing leaves the till machine and there is no lag.
 * The last state is also kept in localStorage so a reloaded display catches up.
 */

export type CounterStage = 'idle' | 'ordering' | 'paying' | 'paid'

export interface CounterLine {
  name: string
  quantity: number
  amount: number
}

export interface CounterState {
  stage: CounterStage
  ref: string | null
  place: string
  lines: CounterLine[]
  subtotal: number
  tax: number
  taxLabel: string
  total: number
  /** Milliseconds since epoch; the display ignores anything older than the last state it showed. */
  at: number
}

type Message = { kind: 'state'; state: CounterState } | { kind: 'hello' }

const CHANNEL = 'pz-counter-display'
const STORE = 'pz-counter-display:last'

export const IDLE_STATE: CounterState = { stage: 'idle', ref: null, place: '', lines: [], subtotal: 0, tax: 0, taxLabel: 'Tax', total: 0, at: 0 }

function channel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(CHANNEL)
  } catch {
    return null
  }
}

/** POS side: send the current check. Returns a cleanup that closes the channel. */
export function openCounterPublisher(getState: () => CounterState) {
  const ch = channel()
  const publish = (state: CounterState) => {
    try {
      window.localStorage.setItem(STORE, JSON.stringify(state))
    } catch {
      // Storage blocked: the live channel still works.
    }
    ch?.postMessage({ kind: 'state', state } satisfies Message)
  }
  // A display that opens later asks for the current check.
  if (ch) ch.onmessage = (e: MessageEvent<Message>) => e.data?.kind === 'hello' && publish(getState())
  return { publish, close: () => ch?.close() }
}

/** Display side: listen for checks. Calls back with the stored state first. */
export function openCounterListener(onState: (s: CounterState) => void) {
  try {
    const raw = window.localStorage.getItem(STORE)
    if (raw) onState(JSON.parse(raw) as CounterState)
  } catch {
    // Nothing stored yet.
  }
  const ch = channel()
  if (ch) {
    ch.onmessage = (e: MessageEvent<Message>) => e.data?.kind === 'state' && onState(e.data.state)
    ch.postMessage({ kind: 'hello' } satisfies Message)
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORE || !e.newValue) return
    try {
      onState(JSON.parse(e.newValue) as CounterState)
    } catch {
      // Ignore a half-written value.
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    ch?.close()
    window.removeEventListener('storage', onStorage)
  }
}
