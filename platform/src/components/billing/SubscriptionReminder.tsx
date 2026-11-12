'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type ReminderState = 'trial' | 'expired' | 'past_due'
type ReminderInfo = { state: ReminderState; daysLeftInTrial: number; canSubscribe: boolean }
type Cadence = { since: string; threshold: number }

const STORAGE_KEY = 'prominentz:subscription-reminder'
const POLL_MS = 30_000
const BILLING_PATH = '/dashboard/settings/billing'

/** A fresh gap of 4–8 orders, so the reminder never lands on a predictable beat. */
const nextThreshold = () => 4 + Math.floor(Math.random() * 5)
const freshCadence = (): Cadence => ({ since: new Date().toISOString(), threshold: nextThreshold() })

function readCadence(): Cadence | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.since === 'string' && Number.isFinite(parsed?.threshold)) return parsed
  } catch {
    // storage blocked or corrupt: fall back to the in-memory cadence
  }
  return null
}

function writeCadence(cadence: Cadence) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cadence))
  } catch {
    // private window or blocked storage: the in-memory cadence still works for this visit
  }
}

const COPY: Record<ReminderState, { title: string; body: (days: number) => string }> = {
  trial: {
    title: 'Keep Prominentz running after your trial',
    body: (days) =>
      `Your free trial ends in ${days} day${days === 1 ? '' : 's'}. Subscribe now so POS, kitchen display and online ordering keep working without a break.`,
  },
  expired: {
    title: 'Your free trial has ended',
    body: () => 'Online ordering and card payments are paused until you subscribe. It takes about a minute.',
  },
  past_due: {
    title: 'Your last payment didn’t go through',
    body: () => 'Update your card to keep Prominentz running. Your data and settings are safe.',
  },
}

/**
 * Subscription reminder for owners and managers of a restaurant that isn't on a working paid
 * plan. It shows one message after every 4–8 new orders, then waits for the next gap. The server
 * decides who is eligible and counts the orders; this only tracks when the viewer last saw it.
 */
export function SubscriptionReminder() {
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cadenceRef = useRef<Cadence | null>(null)
  const [info, setInfo] = useState<ReminderInfo | null>(null)
  const [open, setOpen] = useState(false)
  const onBillingPage = pathname?.startsWith(BILLING_PATH) ?? false

  const cadence = useCallback(() => {
    if (!cadenceRef.current) {
      cadenceRef.current = readCadence() ?? freshCadence()
      writeCadence(cadenceRef.current)
    }
    return cadenceRef.current
  }, [])

  const check = useCallback(async () => {
    if (open || onBillingPage || document.visibilityState !== 'visible') return
    const { since, threshold } = cadence()
    try {
      const res = await fetch(`/api/billing/reminder?since=${encodeURIComponent(since)}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (!data?.eligible) return
      if (data.ordersSince >= threshold) {
        setInfo({ state: data.state, daysLeftInTrial: data.daysLeftInTrial ?? 0, canSubscribe: Boolean(data.canSubscribe) })
        setOpen(true)
      }
    } catch {
      // offline or server hiccup: try again on the next tick
    }
  }, [cadence, onBillingPage, open])

  useEffect(() => {
    check()
    const timer = window.setInterval(check, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Start counting the next 4–8 orders from now.
  const dismiss = useCallback(() => {
    cadenceRef.current = freshCadence()
    writeCadence(cadenceRef.current)
    setOpen(false)
  }, [])

  if (!info) return null
  const copy = COPY[info.state]
  const urgent = info.state !== 'trial'

  return (
    <dialog
      ref={dialogRef}
      // "bz" carries the design tokens, so the dialog looks right wherever it's mounted.
      className="bz bz-dialog"
      style={{ minHeight: 0 }}
      aria-labelledby="subscription-reminder-title"
      onCancel={(e) => {
        e.preventDefault()
        dismiss()
      }}
    >
      <div className="bz-stack bz-stack--lg">
        <div className="bz-stack" style={{ gap: 8 }}>
          <span className="bz-eyebrow" style={{ color: urgent ? 'var(--bz-accent)' : undefined }}>
            {info.state === 'trial' ? 'Free trial' : info.state === 'expired' ? 'Trial ended' : 'Payment failed'}
          </span>
          <h2 id="subscription-reminder-title" className="bz-title bz-title--lg">
            {copy.title}
          </h2>
          <p className="bz-sub" style={{ margin: 0 }}>
            {copy.body(info.daysLeftInTrial)}
          </p>
          {!info.canSubscribe && (
            <p className="bz-sub" style={{ margin: 0 }}>
              Only the restaurant owner can subscribe. Let them know so service isn’t interrupted.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {info.canSubscribe ? (
            <>
              <Link href={BILLING_PATH} className="bz-btn bz-btn--lime bz-grow" onClick={dismiss}>
                {info.state === 'past_due' ? 'Update payment' : 'Start subscription'}
              </Link>
              <button type="button" className="bz-btn" onClick={dismiss}>
                Later
              </button>
            </>
          ) : (
            <button type="button" className="bz-btn bz-btn--lime bz-grow" onClick={dismiss}>
              Got it
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
