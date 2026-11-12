'use client'

import React, { useCallback, useEffect, useState } from 'react'

type ConnectStatus = {
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  mock?: boolean
  country?: string | null
  countries?: { code: string; name: string }[]
  suggestedCountry?: string | null
}
type Reader = { id: string; label: string | null; status: string | null } | null

/**
 * Owner-facing setup for taking card payments:
 *   1. Connect the restaurant's own Stripe account (payouts go to their bank).
 *   2. Pair a Stripe card reader for in-person payments at this location.
 */
export function PaymentsSetupCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [reader, setReader] = useState<Reader>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [country, setCountry] = useState('')
  const [form, setForm] = useState({ registrationCode: '', label: 'Front counter', line1: '', city: '', state: '', postalCode: '' })

  const load = useCallback(async () => {
    const s = await fetch('/api/payments/connect').then((r) => r.json()).catch(() => null)
    setStatus(s)
    setCountry((current) => current || s?.country || s?.suggestedCountry || '')
    if (s?.chargesEnabled) {
      const r = await fetch('/api/payments/terminal/readers').then((x) => x.json()).catch(() => null)
      setReader(r?.reader ?? null)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const connect = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/payments/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: country || undefined }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not start Stripe onboarding')
      window.location.href = body.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusy(false)
    }
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
          <span className={`badge ${status.chargesEnabled ? 'badge--success' : status.connected ? 'badge--pending' : 'badge--neutral'}`}>
            {status.chargesEnabled ? 'Accepting cards' : status.connected ? 'Finish Stripe setup' : 'Not connected'}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--color-error, #ef4444)', fontSize: 14, marginTop: 12 }}>
          {error}
        </p>
      )}

      {status && !status.chargesEnabled && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {/* Stripe fixes an account's country when it's opened, so this is only editable before
              the owner has submitted their business details. */}
          {!status.detailsSubmitted && status.countries && status.countries.length > 0 && (
            <label className="label" style={{ margin: 0, minWidth: 240 }}>
              Country your bank account is in
              <select className="input" value={country} onChange={(e) => setCountry(e.target.value)} disabled={busy}>
                <option value="" disabled>
                  Choose a country
                </option>
                {status.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="btn btn--primary"
            onClick={connect}
            disabled={busy || (!status.connected && !country)}
          >
            {busy ? 'Opening Stripe…' : status.connected ? 'Continue Stripe setup' : 'Connect Stripe'}
          </button>
        </div>
      )}
      {status && !status.chargesEnabled && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Payouts go to a bank account in the country you choose, in its local currency.
        </p>
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
