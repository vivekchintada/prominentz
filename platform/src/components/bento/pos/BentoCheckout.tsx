'use client'

import { useEffect, useRef, useState } from 'react'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { collectCardOnReader } from '@/lib/terminal-client'

export interface CheckoutOrder {
  id: string
  ref: string
  place: string
  /** Server-stored order totals before any coupon; the payment API checks against these. */
  subtotal: number
  tax: number
  itemCount: number
}

export interface PaidResult {
  paymentId: string
  total: number
  method: 'CASH' | 'CARD' | 'SPLIT'
  change: number
}

interface Props {
  order: CheckoutOrder
  onCancel: () => void
  /** Fires the moment the payment is recorded, so the POS and guest screen update at once. */
  onPaid: (r: PaidResult) => void
  /** The cashier closed the "Paid" screen. */
  onDone: () => void
  initialMethod?: CheckoutMethod
}

export type CheckoutMethod = 'CASH' | 'CARD' | 'SPLIT'
type Method = CheckoutMethod
type Coupon = { code: string; discountType: string; discountAmount: number }
type Share = { guest: string; total: number; tip: number; subtotal: number; method: 'CASH' | 'CARD'; paid: boolean; intentId: string | null }

// Same rounding as /api/payments (toFixed), so the reader is charged exactly what the server expects.
const r2 = (n: number) => Number(n.toFixed(2))
const STEPS: Record<string, number[]> = { INR: [10, 50, 100, 500], JPY: [100, 500, 1000, 5000] }

/** Splits cents so the shares add up to the exact amount. */
function splitCents(amount: number, n: number, i: number) {
  const cents = Math.round(amount * 100)
  return (Math.floor(cents / n) + (i < cents % n ? 1 : 0)) / 100
}

/**
 * POS checkout: cash with change, card on the paired reader, or an even split.
 * Totals follow the payment API's own rule (order tax rate applied after the
 * coupon), so what the cashier sees is exactly what gets recorded.
 */
export function BentoCheckout({ order, onCancel, onPaid, onDone, initialMethod = 'CASH' }: Props) {
  const { money, currency } = useMoney()
  const ref = useRef<HTMLDialogElement>(null)
  const abort = useRef<AbortController | null>(null)

  const [method, setMethod] = useState<Method>(initialMethod)
  const [tipPct, setTipPct] = useState<number | 'custom'>(0)
  const [customTip, setCustomTip] = useState('')
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponOpen, setCouponOpen] = useState(false)
  const [tendered, setTendered] = useState('')
  const [splitN, setSplitN] = useState(2)
  const [shares, setShares] = useState<Share[]>([])
  const [busy, setBusy] = useState<null | string>(null)
  const [readerStatus, setReaderStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState<PaidResult | null>(null)
  const [shownChange, setShownChange] = useState(0)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [retryIntent, setRetryIntent] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => abort.current?.abort()
  }, [])

  // ── Totals, mirroring /api/payments ──
  const raw = r2(order.subtotal)
  const rate = order.subtotal > 0 ? order.tax / order.subtotal : 0
  const discount = coupon ? (coupon.discountType === 'PERCENTAGE' ? r2((raw * coupon.discountAmount) / 100) : Math.min(coupon.discountAmount, raw)) : 0
  const net = Math.max(0, r2(raw - discount))
  const tax = r2(net * rate)
  const tip = Math.max(0, tipPct === 'custom' ? r2(Number(customTip) || 0) : r2((net * tipPct) / 100))
  const total = r2(net + tax + tip)
  const ratePct = Number((rate * 100).toFixed(2))

  const cash = tendered === '' ? total : Number(tendered)
  const change = Math.max(0, r2(cash - total))
  const short = cash + 0.004 < total

  // Even split, rebuilt whenever the amounts change and nobody has paid yet
  const anySharePaid = shares.some((s) => s.paid)
  useEffect(() => {
    if (method !== 'SPLIT' || anySharePaid) return
    setShares(
      Array.from({ length: splitN }, (_, i) => ({
        guest: `Guest ${i + 1}`,
        total: splitCents(total, splitN, i),
        tip: splitCents(tip, splitN, i),
        subtotal: splitCents(net, splitN, i),
        method: 'CARD' as const,
        paid: false,
        intentId: null,
      })),
    )
  }, [method, splitN, total, tip, net, anySharePaid])

  // Cash shortcuts: exact, then the next round amounts a guest is likely to hand over
  const steps = STEPS[currency] ?? [1, 5, 10, 20]
  const quick = [...new Set(steps.map((s) => Math.ceil(total / s) * s).filter((v) => v > total + 0.004))].slice(0, 3)

  const finish = async (payment: { id: string }, result: Omit<PaidResult, 'paymentId'>) => {
    const done = { ...result, paymentId: payment.id }
    setPaid(done)
    onPaid(done)
    // Let the check mark land, then roll the change up from zero.
    setTimeout(() => setShownChange(done.change), 350)
    try {
      const r = await fetch(`/api/payments/${payment.id}/receipt`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (r.ok) setReceiptUrl((await r.json()).url ?? `/receipts/${payment.id}`)
    } catch {
      setReceiptUrl(`/receipts/${payment.id}`)
    }
  }

  const record = async (m: 'CASH' | 'CARD', intentId: string | null) => {
    const r = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        method: m,
        subtotal: net,
        tax,
        tip,
        total,
        cashReceived: m === 'CASH' ? r2(cash) : undefined,
        cashChange: m === 'CASH' ? change : undefined,
        stripePaymentIntentId: intentId,
        couponCode: coupon?.code,
        couponDiscount: discount > 0 ? discount : undefined,
      }),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The payment could not be recorded.')
    return body as { id: string }
  }

  const payCash = async () => {
    if (short) {
      setError(`The guest gave ${money(cash)}, which is less than the ${money(total)} due.`)
      return
    }
    setBusy('cash')
    setError(null)
    try {
      const p = await record('CASH', null)
      await finish(p, { total, method: 'CASH', change })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The payment could not be recorded.')
    } finally {
      setBusy(null)
    }
  }

  const readCard = async (amount: number, attempt?: string) => {
    abort.current = new AbortController()
    setReaderStatus('Sending the amount to the reader…')
    try {
      return await collectCardOnReader(order.id, amount, { attempt, signal: abort.current.signal, onStatus: setReaderStatus })
    } finally {
      setReaderStatus(null)
      abort.current = null
    }
  }

  const payCard = async () => {
    setBusy('card')
    setError(null)
    let intent: string | null = null
    try {
      intent = total > 0 ? await readCard(total) : null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The card payment did not go through. Nothing was charged.')
      setBusy(null)
      return
    }
    try {
      const p = await record('CARD', intent)
      await finish(p, { total, method: 'CARD', change: 0 })
    } catch (e) {
      // The card was charged but recording failed: say so plainly so nobody charges twice.
      setError(`The card was charged ${money(total)}, but the order could not be closed: ${e instanceof Error ? e.message : 'unknown error'}. Do not charge again; try "Record card payment" or contact support.`)
      setRetryIntent(intent)
    } finally {
      setBusy(null)
    }
  }

  // If the card went through but recording failed, allow recording the same intent again.
  const retryRecord = async () => {
    if (!retryIntent) return
    setBusy('card')
    setError(null)
    try {
      const p = await record('CARD', retryIntent)
      setRetryIntent(null)
      await finish(p, { total, method: 'CARD', change: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Still could not record the payment.')
    } finally {
      setBusy(null)
    }
  }

  const payShare = async (i: number) => {
    const s = shares[i]
    setBusy(`share-${i}`)
    setError(null)
    try {
      // A fresh attempt key each time, so a retry after a decline starts a new card payment.
      const intentId = s.method === 'CARD' && s.total > 0 ? await readCard(s.total, `split_${i}_${Date.now()}`) : null
      setShares((prev) => prev.map((x, j) => (j === i ? { ...x, paid: true, intentId } : x)))
    } catch (e) {
      setError(`${s.guest}: ${e instanceof Error ? e.message : 'payment did not go through'}`)
    } finally {
      setBusy(null)
    }
  }

  const finishSplit = async () => {
    if (shares.some((s) => !s.paid)) return
    setBusy('split')
    setError(null)
    try {
      const r = await fetch('/api/payments/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          couponCode: coupon?.code,
          couponDiscount: discount > 0 ? discount : undefined,
          splits: shares.map((s) => ({ guestRef: s.guest, method: s.method, subtotal: s.subtotal, tip: s.tip, total: s.total, stripePaymentIntentId: s.intentId })),
        }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The split could not be recorded.')
      await finish(body, { total, method: 'SPLIT', change: 0 })
    } catch (e) {
      setError(`Every guest has paid, but the order could not be closed: ${e instanceof Error ? e.message : 'unknown error'}. Try "Close the bill" again.`)
    } finally {
      setBusy(null)
    }
  }

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase()
    if (!code) return
    setBusy('coupon')
    setError(null)
    try {
      const r = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: raw, orderSubtotal: raw, allowCashierOverride: true }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.valid || !d.coupon) throw new Error(d.error || d.message || `“${code}” is not a valid coupon.`)
      setCoupon({ code: d.coupon.code, discountType: d.coupon.discountType, discountAmount: Number(d.coupon.discountAmount) })
      setCouponCode('')
      setCouponOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That coupon could not be applied.')
    } finally {
      setBusy(null)
    }
  }

  const sendReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paid || !email.trim()) return
    setEmailState('sending')
    try {
      const r = await fetch(`/api/payments/${paid.paymentId}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentTo: email.trim() }),
      })
      setEmailState(r.ok ? 'sent' : 'failed')
    } catch {
      setEmailState('failed')
    }
  }

  const key = (k: string) =>
    setTendered((t) => {
      if (k === 'C') return ''
      if (k === '⌫') return t.slice(0, -1)
      if (k === '.' && t.includes('.')) return t
      const next = (t === '' && k === '.' ? '0' : t) + k
      return /^\d{0,7}(\.\d{0,2})?$/.test(next) ? next : t
    })

  const close = () => {
    if (busy && busy !== 'coupon') return
    if (paid) onDone()
    else onCancel()
  }

  const sharesPaid = shares.filter((s) => s.paid).length
  const locked = anySharePaid || busy !== null

  return (
    <dialog
      ref={ref}
      className="bz-dialog bz-sheet bz-checkout"
      aria-labelledby="checkout-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      {paid ? (
        <div className="bz-stack bz-stack--lg bz-paid" role="status" aria-live="polite">
          <svg className="bz-paid__check" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27l7 7 15-16" />
          </svg>
          <div className="bz-stack" style={{ gap: 4, alignItems: 'center', textAlign: 'center' }}>
            <h2 id="checkout-title" className="bz-title bz-title--lg">Paid</h2>
            <span className="bz-mono" style={{ fontSize: 36, fontWeight: 700 }}>{money(paid.total)}</span>
            <span className="bz-sub">
              {paid.method === 'CASH' ? 'Cash' : paid.method === 'CARD' ? 'Card' : `Split between ${shares.length} guests`} · {order.place} · {order.ref}
            </span>
          </div>

          {paid.method === 'CASH' && (
            <div className={`bz-change${paid.change > 0 ? ' bz-change--due' : ''}`}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{paid.change > 0 ? 'Give back' : 'No change due'}</span>
              {paid.change > 0 && <AnimatedNumber value={shownChange} money className="bz-mono bz-change__amt" />}
            </div>
          )}

          <div className="bz-row" style={{ gap: 10, justifyContent: 'stretch' }}>
            <a
              href={receiptUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="bz-btn bz-btn--outline bz-grow"
              aria-disabled={!receiptUrl}
              onClick={(e) => !receiptUrl && e.preventDefault()}
            >
              {receiptUrl ? 'Print receipt' : 'Preparing receipt…'}
            </a>
          </div>
          <form className="bz-row" style={{ gap: 8 }} onSubmit={sendReceipt}>
            <label className="bz-sr" htmlFor="receipt-email">Email the receipt</label>
            <input id="receipt-email" type="email" className="bz-input bz-grow" placeholder="Guest’s email for the receipt" value={email} onChange={(e) => { setEmail(e.target.value); setEmailState('idle') }} />
            <button type="submit" className="bz-btn bz-btn--ink" disabled={!email.trim() || emailState === 'sending'}>
              {emailState === 'sending' ? 'Sending…' : emailState === 'sent' ? 'Sent' : 'Send'}
            </button>
          </form>
          {emailState === 'failed' && <span className="bz-error__title" style={{ fontSize: 13 }}>The receipt email did not send. Check the address and try again.</span>}
          <button type="button" className="bz-btn bz-btn--lime bz-btn--xl bz-btn--block" onClick={onDone} autoFocus>
            Next order
          </button>
        </div>
      ) : (
        <div className="bz-stack bz-stack--lg">
          <div className="bz-row">
            <div className="bz-stack" style={{ gap: 2 }}>
              <h2 id="checkout-title" className="bz-title bz-title--lg">Take payment</h2>
              <span className="bz-meta">{order.place} · {order.ref} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</span>
            </div>
            <button type="button" className="bz-icon-btn" onClick={close} disabled={!!busy && busy !== 'coupon'} aria-label="Close">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {/* Totals */}
          <div className="bz-tile bz-tile--accent bz-checkout__total">
            <div className="bz-row" style={{ fontSize: 14 }}><span style={{ color: 'var(--bz-on-accent-muted)' }}>Items</span><span className="bz-mono">{money(raw)}</span></div>
            {coupon && (
              <div className="bz-row" style={{ fontSize: 14 }}>
                <span style={{ color: 'var(--bz-on-accent-muted)' }}>Coupon {coupon.code} <button type="button" className="bz-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => setCoupon(null)} disabled={locked}>remove</button></span>
                <span className="bz-mono">−{money(discount)}</span>
              </div>
            )}
            <div className="bz-row" style={{ fontSize: 14 }}><span style={{ color: 'var(--bz-on-accent-muted)' }}>Tax {ratePct}%</span><span className="bz-mono">{money(tax)}</span></div>
            {tip > 0 && <div className="bz-row" style={{ fontSize: 14 }}><span style={{ color: 'var(--bz-on-accent-muted)' }}>Tip</span><span className="bz-mono">{money(tip)}</span></div>}
            <div className="bz-row" style={{ alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Total</span>
              <AnimatedNumber value={total} money className="bz-mono" style={{ fontWeight: 800, fontSize: 34 }} />
            </div>
          </div>

          {/* Tip and coupon */}
          <div className="bz-stack" style={{ gap: 8 }}>
            <span className="bz-kpi__label">Tip</span>
            <div className="bz-seg" role="group" aria-label="Tip" style={{ background: 'var(--bz-soft)', flexWrap: 'wrap' }}>
              {[0, 5, 10, 15].map((p) => (
                <button key={p} type="button" className="bz-seg__btn" aria-pressed={tipPct === p} disabled={locked} onClick={() => setTipPct(p)}>
                  {p === 0 ? 'None' : `${p}%`}
                </button>
              ))}
              <button type="button" className="bz-seg__btn" aria-pressed={tipPct === 'custom'} disabled={locked} onClick={() => setTipPct('custom')}>Amount</button>
            </div>
            {tipPct === 'custom' && (
              <input className="bz-input" inputMode="decimal" placeholder="Tip amount" value={customTip} disabled={locked} onChange={(e) => /^\d{0,6}(\.\d{0,2})?$/.test(e.target.value) && setCustomTip(e.target.value)} aria-label="Tip amount" />
            )}
            {!coupon &&
              (couponOpen ? (
                <form className="bz-row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); applyCoupon() }}>
                  <label className="bz-sr" htmlFor="coupon">Coupon code</label>
                  <input id="coupon" className="bz-input bz-grow" placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} autoFocus />
                  <button type="submit" className="bz-btn bz-btn--ink" disabled={!couponCode.trim() || busy === 'coupon'}>{busy === 'coupon' ? 'Checking…' : 'Apply'}</button>
                </form>
              ) : (
                <button type="button" className="bz-link" style={{ alignSelf: 'flex-start', background: 'none', border: 0, padding: 0, cursor: 'pointer' }} disabled={locked} onClick={() => setCouponOpen(true)}>
                  Add a coupon
                </button>
              ))}
          </div>

          {/* Method */}
          <div className="bz-seg" role="group" aria-label="Payment method" style={{ background: 'var(--bz-soft)' }}>
            {(['CASH', 'CARD', 'SPLIT'] as Method[]).map((m) => (
              <button key={m} type="button" className="bz-seg__btn bz-grow" aria-pressed={method === m} disabled={locked} onClick={() => { setMethod(m); setError(null) }}>
                {m === 'CASH' ? 'Cash' : m === 'CARD' ? 'Card' : 'Split'}
              </button>
            ))}
          </div>

          {method === 'CASH' && (
            <div className="bz-stack" style={{ gap: 10 }}>
              <div className="bz-row" style={{ alignItems: 'flex-end' }}>
                <div className="bz-stack" style={{ gap: 2 }}>
                  <span className="bz-kpi__label">Cash received</span>
                  <span className="bz-mono" style={{ fontSize: 28, fontWeight: 700 }} aria-live="polite">{tendered === '' ? money(total) : money(cash)}</span>
                </div>
                <div className="bz-stack" style={{ gap: 2, alignItems: 'flex-end' }}>
                  <span className="bz-kpi__label">{short ? 'Still due' : 'Change'}</span>
                  <AnimatedNumber value={short ? r2(total - cash) : change} money className={`bz-mono${short ? ' bz-error__title' : ''}`} style={{ fontSize: 28, fontWeight: 700 }} />
                </div>
              </div>
              <div className="bz-cash-quick">
                <button type="button" className="bz-filter bz-filter--card" aria-pressed={tendered === ''} onClick={() => setTendered('')}>Exact</button>
                {quick.map((q) => (
                  <button key={q} type="button" className="bz-filter bz-filter--card" aria-pressed={tendered !== '' && Number(tendered) === q} onClick={() => setTendered(String(q))}>
                    {money(q, 0)}
                  </button>
                ))}
              </div>
              <div className="bz-keypad" role="group" aria-label="Cash received keypad" style={{ maxWidth: 'none' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
                  <button key={k} type="button" className={`bz-keypad__key${k === '⌫' || k === '.' ? ' bz-keypad__key--util' : ''}`} onClick={() => key(k)} aria-label={k === '⌫' ? 'Delete' : k === '.' ? 'Decimal point' : k}>
                    {k}
                  </button>
                ))}
              </div>
              <button type="button" className="bz-btn bz-btn--lime bz-btn--xl bz-btn--block" onClick={payCash} disabled={busy !== null || short}>
                {busy === 'cash' ? 'Recording…' : change > 0 ? `Take ${money(cash)} · give back ${money(change)}` : `Take ${money(total)} cash`}
              </button>
            </div>
          )}

          {method === 'CARD' && (
            <div className="bz-stack" style={{ gap: 10 }}>
              {readerStatus ? (
                <div className="bz-reader" role="status" aria-live="polite">
                  <span className="bz-dot bz-dot--live" aria-hidden="true" />
                  <span className="bz-grow" style={{ fontWeight: 700 }}>{readerStatus}</span>
                  <button type="button" className="bz-btn bz-btn--outline bz-btn--sm" onClick={() => abort.current?.abort()}>Cancel</button>
                </div>
              ) : (
                <span className="bz-sub">The amount goes to the card reader paired with this outlet. The guest taps, inserts or swipes there.</span>
              )}
              {retryIntent ? (
                <button type="button" className="bz-btn bz-btn--ink bz-btn--xl bz-btn--block" onClick={retryRecord} disabled={busy !== null}>
                  {busy === 'card' ? 'Recording…' : 'Record card payment'}
                </button>
              ) : (
                <button type="button" className="bz-btn bz-btn--lime bz-btn--xl bz-btn--block" onClick={payCard} disabled={busy !== null}>
                  {busy === 'card' ? 'Waiting for the card…' : `Charge ${money(total)} on the reader`}
                </button>
              )}
            </div>
          )}

          {method === 'SPLIT' && (
            <div className="bz-stack" style={{ gap: 10 }}>
              <div className="bz-row">
                <span className="bz-kpi__label">Split evenly between</span>
                <div className="bz-stepper" role="group" aria-label="Number of guests">
                  <button type="button" className="bz-step bz-step--minus" onClick={() => setSplitN((n) => Math.max(2, n - 1))} disabled={anySharePaid || splitN <= 2} aria-label="One guest fewer">−</button>
                  <span className="bz-mono bz-stepper__n">{splitN}</span>
                  <button type="button" className="bz-step bz-step--plus" onClick={() => setSplitN((n) => Math.min(12, n + 1))} disabled={anySharePaid || splitN >= 12} aria-label="One guest more">+</button>
                </div>
              </div>
              {shares.map((s, i) => (
                <div key={s.guest} className={`bz-captain-row${s.paid ? ' bz-share--paid' : ''}`} style={{ minHeight: 60 }}>
                  <span className="bz-item__body">
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.guest}</span>
                    <span className="bz-mono" style={{ fontSize: 13 }}>{money(s.total)}</span>
                  </span>
                  {s.paid ? (
                    <span className="bz-badge bz-badge--lime">Paid · {s.method === 'CASH' ? 'cash' : 'card'}</span>
                  ) : (
                    <>
                      <div className="bz-seg" role="group" aria-label={`${s.guest} pays by`} style={{ padding: 3 }}>
                        {(['CASH', 'CARD'] as const).map((m) => (
                          <button key={m} type="button" className="bz-seg__btn" style={{ padding: '6px 10px' }} aria-pressed={s.method === m} disabled={busy !== null} onClick={() => setShares((prev) => prev.map((x, j) => (j === i ? { ...x, method: m } : x)))}>
                            {m === 'CASH' ? 'Cash' : 'Card'}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="bz-btn bz-btn--ink bz-btn--sm" disabled={busy !== null} onClick={() => payShare(i)}>
                        {busy === `share-${i}` ? '…' : s.method === 'CASH' ? 'Cash taken' : 'Charge'}
                      </button>
                    </>
                  )}
                </div>
              ))}
              {readerStatus && (
                <div className="bz-reader" role="status" aria-live="polite">
                  <span className="bz-dot bz-dot--live" aria-hidden="true" />
                  <span className="bz-grow" style={{ fontWeight: 700 }}>{readerStatus}</span>
                  <button type="button" className="bz-btn bz-btn--outline bz-btn--sm" onClick={() => abort.current?.abort()}>Cancel</button>
                </div>
              )}
              <button type="button" className="bz-btn bz-btn--lime bz-btn--xl bz-btn--block" onClick={finishSplit} disabled={busy !== null || sharesPaid < shares.length || shares.length === 0}>
                {busy === 'split' ? 'Closing the bill…' : sharesPaid < shares.length ? `${sharesPaid} of ${shares.length} guests paid` : 'Close the bill'}
              </button>
            </div>
          )}

          {error && (
            <div className="bz-error" role="alert">
              <span className="bz-error__title">Payment not finished</span>
              <span className="bz-error__detail">{error}</span>
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
