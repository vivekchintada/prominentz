'use client'

import { useEffect, useState } from 'react'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { IDLE_STATE, openCounterListener, type CounterState } from '@/lib/bento/counter-display'

interface Props {
  restaurantName: string
}

/** Guest · counter display: the POS check, mirrored live on a screen facing the guest. */
export function CounterDisplay({ restaurantName }: Props) {
  const { money } = useMoney()
  const [state, setState] = useState<CounterState>(IDLE_STATE)

  useEffect(
    () =>
      openCounterListener((next) => {
        setState((prev) => (next.at >= prev.at ? next : prev))
      }),
    [],
  )

  // A paid check thanks the guest for a moment, then the screen rests.
  useEffect(() => {
    if (state.stage !== 'paid') return
    const t = setTimeout(() => setState((s) => (s.stage === 'paid' ? { ...IDLE_STATE, at: s.at } : s)), 12000)
    return () => clearTimeout(t)
  }, [state.stage])

  const hasCheck = state.stage !== 'idle' && state.lines.length > 0
  const headline =
    state.stage === 'paid' ? 'Thank you! Enjoy your day' : hasCheck ? `Thanks for visiting ${restaurantName}` : `Welcome to ${restaurantName}`
  const sub =
    state.stage === 'paid'
      ? 'Your payment went through. Please take your receipt.'
      : state.stage === 'paying'
        ? 'Tap or insert your card on the reader, or pay the cashier by cash or UPI.'
        : hasCheck
          ? 'Your order appears here as it is rung up. Check it before you pay.'
          : 'Your order will appear here as soon as the cashier starts it.'

  return (
    <div className="bz bz-counter">
      <section className="bz-counter__hello" aria-live="polite">
        <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 170 }}>{state.stage === 'paid' ? 'THANKS' : 'HELLO'}</span>
        <span className="bz-counter__brand">
          prominent<span className="bz-logo__z">z</span>
        </span>
        <div className="bz-stack" style={{ gap: 12, position: 'relative' }}>
          <h1 className="bz-counter__headline">{headline}</h1>
          <p style={{ fontSize: 17, color: 'var(--bz-on-accent-muted)', lineHeight: 1.45, margin: 0 }}>{sub}</p>
        </div>
      </section>

      <section className="bz-counter__check" aria-label="Your order">
        <div className="bz-counter__order">
          <div className="bz-row" style={{ alignItems: 'baseline' }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Your order</h2>
            <span className="bz-meta" style={{ fontSize: 14 }}>{[state.ref, state.place].filter(Boolean).join(' · ')}</span>
          </div>

          {hasCheck ? (
            <ul className="bz-counter__lines">
              {state.lines.map((l, i) => (
                <li key={`${l.name}-${i}`}>
                  <span style={{ fontWeight: 600 }}>
                    <span style={{ fontWeight: 700, color: 'var(--bz-accent)' }}>{l.quantity}×</span> {l.name}
                  </span>
                  <span className="bz-mono">{money(l.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bz-empty" style={{ flex: 1 }}>
              <strong>No order yet</strong>
              <span>Items show up here as they are added.</span>
            </div>
          )}

          {hasCheck && (
            <div className="bz-stack" style={{ gap: 6, borderTop: '1px solid var(--bz-line)', paddingTop: 14 }}>
              <div className="bz-row" style={{ fontSize: 15, color: 'var(--bz-muted)' }}>
                <span>Subtotal</span>
                <span className="bz-mono">{money(state.subtotal)}</span>
              </div>
              <div className="bz-row" style={{ fontSize: 15, color: 'var(--bz-muted)' }}>
                <span>{state.taxLabel}</span>
                <span className="bz-mono">{money(state.tax)}</span>
              </div>
              <div className="bz-row" style={{ alignItems: 'baseline' }}>
                <span style={{ fontWeight: 800, fontSize: 24 }}>Total</span>
                <span className="bz-mono" style={{ fontWeight: 800, fontSize: 40 }}>{money(state.total)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bz-counter__pay">
          {state.stage === 'paid' ? (
            <>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Paid</span>
              <span className="bz-mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--bz-lime)' }}>{money(state.total)}</span>
              <span style={{ fontSize: 13, color: '#A1A1AA' }}>Thank you for visiting</span>
            </>
          ) : state.stage === 'paying' ? (
            <>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Ready to pay</span>
              <span className="bz-mono" style={{ fontSize: 34, fontWeight: 700 }}>{money(state.total)}</span>
              <span style={{ fontSize: 13, color: '#A1A1AA' }}>Card, cash or UPI at the counter</span>
              <span className="bz-chip" style={{ background: 'var(--bz-lime)', color: '#141416', alignSelf: 'stretch', justifyContent: 'center' }}>
                <span className="bz-dot bz-dot--live" style={{ background: '#141416' }} aria-hidden="true" /> Waiting for payment…
              </span>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 800, fontSize: 17 }}>{hasCheck ? 'Being rung up' : 'Next guest'}</span>
              <span style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.45 }}>
                {hasCheck ? 'The cashier is adding your items. The total updates as they go.' : 'Step up to the counter when you are ready to order.'}
              </span>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
