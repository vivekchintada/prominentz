'use client'

import React, { useCallback, useEffect, useState } from 'react'

type ConnectStatus = {
  connected: boolean
  chargesEnabled: boolean
  simulated?: boolean
  mode?: 'live' | 'test'
  keyLast4?: string
  accountName?: string | null
  country?: string | null
  onlineOrdersReady?: boolean
}
type Reader = { id: string; label: string | null; status: string | null } | null

/**
 * Owner-facing setup for taking card payments:
 *   1. Save the restaurant's own Stripe secret key (payments and payouts stay in their account).
 *   2. Pair a Stripe card reader for in-person payments at this location.
 */
export function PaymentsSetupCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [reader, setReader] = useState<Reader>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [form, setForm] = useState({ registrationCode: '', label: 'Front counter', line1: '', city: '', state: '', postalCode: '' })

  const load = useCallback(async () => {
    const s = await fetch('/api/payments/connect').then((r) => r.json()).catch(() => null)
    setStatus(s)
    if (s?.chargesEnabled) {
      const r = await fetch('/api/payments/terminal/readers').then((x) => x.json()).catch(() => null)
      setReader(r?.reader ?? null)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/payments/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: secretKey.trim() }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not save the Stripe key')
      setSecretKey('')
      setReplacing(false)
      setStatus(body)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Stop taking card payments and remove your Stripe key from Prominentz?')) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/payments/connect', { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) setError('Could not remove the key. Try again.')
    setReader(null)
    await load()
    setBusy(false)
  }

  const pairReader = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/payments/terminal/readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationCode: form.registrationCode.trim(),
          label: form.label,
          address: { line1: form.line1, city: form.city, state: form.state, postalCode: form.postalCode },
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Check the reader code and address')
      setReader(body.reader)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const unpair = async () => {
    setBusy(true)
    await fetch('/api/payments/terminal/readers', { method: 'DELETE' }).catch(() => {})
    setReader(null)
    setBusy(false)
  }

  const showKeyForm = status && (!status.connected || replacing)

  return (
    <section className="card" style={{ padding: 'var(--space-6, 24px)', marginBottom: 'var(--space-6, 24px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--color-text-primary)' }}>Card payments</h2>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Guests pay into <strong>your own Stripe account</strong>. Payouts go straight to your bank. Prominentz takes 0% of your sales.
          </p>
        </div>
        {status && (
          <span className={`badge ${!status.connected ? 'badge--neutral' : status.mode === 'test' ? 'badge--pending' : 'badge--success'}`}>
            {!status.connected ? 'Not connected' : status.mode === 'test' ? 'Test mode' : 'Accepting cards'}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--color-error, #ef4444)', fontSize: 14, marginTop: 12 }}>
          {error}
        </p>
      )}

      {status?.connected && !replacing && (
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>
            {status.accountName ? <strong>{status.accountName}</strong> : 'Your Stripe account'}
            {status.country ? ` · ${status.country}` : ''} · key ending <code>{status.keyLast4}</code>
          </p>
          {status.mode === 'test' && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              This is a test key: no real money moves. Use Stripe test cards, then switch to your live key when you&apos;re ready.
            </p>
          )}
          {!status.onlineOrdersReady && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Online order payments aren&apos;t confirmed automatically yet. Save the key again from the live site to finish setup.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--secondary btn--sm" onClick={() => setReplacing(true)} disabled={busy}>
              Replace key
            </button>
            <button className="btn btn--secondary btn--sm" onClick={disconnect} disabled={busy}>
              Disconnect
            </button>
          </div>
        </div>
      )}

      {showKeyForm && (
        <form onSubmit={saveKey} style={{ display: 'grid', gap: 10, marginTop: 16, maxWidth: 560 }}>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--color-text-secondary)', display: 'grid', gap: 4 }}>
            <li>
              Sign in to your Stripe account (or create one at{' '}
              <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer">stripe.com</a>) and finish activating it.
            </li>
            <li>
              Open <strong>Developers → API keys</strong> and copy the <strong>Secret key</strong> (starts with <code>sk_live_</code>).
              A restricted key (<code>rk_live_</code>) works too.
            </li>
            <li>Paste it below. We store it encrypted and set up the online-order webhook in your account for you.</li>
          </ol>
          <label className="label">
            Stripe secret key
            <input
              className="input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="sk_live_…"
            />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" type="submit" disabled={busy || secretKey.trim().length < 20}>
              {busy ? 'Checking with Stripe…' : 'Save and connect'}
            </button>
            {replacing && (
              <button className="btn btn--secondary" type="button" onClick={() => setReplacing(false)} disabled={busy}>
                Cancel
              </button>
            )}
          </div>
          {status?.simulated && !status.connected && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Development: until a key is saved, card payments are simulated.
            </p>
          )}
        </form>
      )}

      {status?.chargesEnabled && (
        <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: 'var(--color-text-primary)' }}>In-person card reader</h3>
          {reader ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>
                {reader.label || reader.id} · {reader.status === 'online' ? '🟢 online' : '⚪ offline'}
              </span>
              <button className="btn btn--secondary btn--sm" onClick={unpair} disabled={busy}>
                Unpair
              </button>
            </div>
          ) : (
            <form onSubmit={pairReader} style={{ display: 'grid', gap: 10, marginTop: 10, maxWidth: 520 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Works with Stripe smart readers (Stripe Reader S700, BBPOS WisePOS E). On the reader, open Settings and
                generate a pairing code.
              </p>
              <label className="label">
                Pairing code
                <input className="input" required value={form.registrationCode} onChange={(e) => setForm({ ...form, registrationCode: e.target.value })} placeholder="e.g. simulated-wpe" />
              </label>
              <label className="label">
                Reader name
                <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </label>
              <label className="label">
                Restaurant street address
                <input className="input" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                <input className="input" required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <input className="input" placeholder="State / province" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <input className="input" required placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </div>
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Pairing…' : 'Pair reader'}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
