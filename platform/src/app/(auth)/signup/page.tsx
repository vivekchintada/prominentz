'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BentoLogo } from '@/components/bento/BentoLogo'

const STEPS: [string, string][] = [
  ['Your restaurant', 'Name, first outlet and your account'],
  ['Menu and tables', 'Add them in the setup guide after you sign in'],
  ['Your team', 'Invite managers, servers and the kitchen'],
]

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const askedForStaff = ['MANAGER', 'SERVER', 'KITCHEN'].includes(searchParams.get('role')?.toUpperCase() ?? '')

  const [restaurantName, setRestaurantName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [locationName, setLocationName] = useState('')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filled = [restaurantName.trim().length >= 2 && ownerName.trim().length >= 2, email.includes('@') && password.length >= 8].filter(Boolean).length

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupType: 'OWNER',
          restaurantName: restaurantName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          password,
          locationName: locationName.trim() || 'Main outlet',
          phone: phone.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.error && typeof data.error === 'object' && data.error.fieldErrors) {
          const [field, msgs] = Object.entries(data.error.fieldErrors as Record<string, string[]>)[0] ?? []
          throw new Error(field ? `${field}: ${msgs?.[0] ?? 'check this field'}` : 'Check the form and try again.')
        }
        throw new Error(typeof data?.error === 'string' ? data.error : 'Your account could not be created. Please try again.')
      }
      router.push(`/login?registered=true&portal=owner&email=${encodeURIComponent(email.trim())}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your account could not be created. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bz">
      <div className="bz-wrap" style={{ maxWidth: 1280 }}>
        <header className="bz-header">
          <div className="bz-header__left">
            <BentoLogo href="/" />
          </div>
          <div className="bz-header__right">
            <Link href="/login" className="bz-link" style={{ fontSize: 14, fontWeight: 700 }}>
              Already set up? Sign in
            </Link>
            <Link href="/pricing" className="bz-btn bz-btn--outline bz-hide-sm">
              See pricing
            </Link>
          </div>
        </header>

        <div className="bz-head">
          <div className="bz-head__text">
            <span className="bz-eyebrow">New restaurant · onboarding</span>
            <h1 className="bz-h1">Set up a restaurant in three steps.</h1>
          </div>
        </div>

        <section className="bz-grid">
          <article className="bz-tile bz-tile--accent bz-c5 bz-r2" style={{ gap: 18, justifyContent: 'space-between' }}>
            <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 120 }}>START</span>
            <div className="bz-stack" style={{ gap: 10, position: 'relative' }}>
              <span style={{ fontWeight: 800, fontSize: 30, letterSpacing: '-0.04em' }}>
                prominent<span className="bz-logo__z">z</span>
              </span>
              <h2 style={{ fontWeight: 800, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.03em' }}>Run your whole dining room on one app.</h2>
              <span style={{ fontSize: 14, color: 'var(--bz-on-accent-muted)' }}>14-day free trial · no card needed · cancel any time</span>
            </div>
            <ol className="bz-track" style={{ position: 'relative' }}>
              {STEPS.map(([t, s], i) => (
                <li key={t}>
                  <span aria-hidden="true" className={i < filled ? 'bz-track__dot bz-track__dot--done' : 'bz-track__dot'}>{i < filled ? '✓' : i + 1}</span>
                  <span className="bz-item__body">
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{t}</span>
                    <span style={{ fontSize: 14, color: 'var(--bz-on-accent-muted)' }}>{s}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="bz-stack" style={{ gap: 8, position: 'relative' }}>
              <div className="bz-row" style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>This form</span>
                <span style={{ color: 'var(--bz-on-accent-muted)' }}>{filled === 2 ? 'ready to create' : `${filled} of 2 parts filled`}</span>
              </div>
              <div className="bz-meter" style={{ background: '#141416' }} aria-hidden="true">
                <div className="bz-meter__fill bz-meter__fill--lime" style={{ width: `${(filled / 2) * 100}%` }} />
              </div>
            </div>
          </article>

          <article className="bz-tile bz-c7 bz-r2" style={{ gap: 16 }} aria-labelledby="form-title">
            <div className="bz-row">
              <h2 id="form-title" className="bz-title bz-title--lg">Step 1 · Your restaurant</h2>
              <span className="bz-meta bz-hide-sm">takes a minute</span>
            </div>

            {askedForStaff && (
              <div className="bz-pillrow" role="status" style={{ justifyContent: 'flex-start' }}>
                Joining a team? Staff accounts are created by the restaurant owner or a manager from Staff. Ask them for an invite.
              </div>
            )}
            {error && (
              <div className="bz-error" role="alert">
                <span className="bz-error__title">Account not created</span>
                <span className="bz-error__detail">{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="bz-stack bz-stack--lg">
              <div className="bz-form-grid">
                <label className="bz-field">
                  Restaurant name
                  <input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} minLength={2} maxLength={100} required autoComplete="organization" />
                </label>
                <label className="bz-field">
                  Your name
                  <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} minLength={2} maxLength={100} required autoComplete="name" />
                </label>
                <label className="bz-field">
                  <span>First outlet <span style={{ fontWeight: 500 }}>(optional)</span></span>
                  <input value={locationName} onChange={(e) => setLocationName(e.target.value)} maxLength={100} placeholder="Main outlet" />
                </label>
                <label className="bz-field">
                  <span>Phone <span style={{ fontWeight: 500 }}>(optional)</span></span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" inputMode="tel" />
                </label>
                <label className="bz-field">
                  Work email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </label>
                <div className="bz-field">
                  <label htmlFor="new-password">Password, at least 8 characters</label>
                  <div style={{ position: 'relative', display: 'flex' }}>
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      maxLength={100}
                      required
                      autoComplete="new-password"
                      style={{ flex: 1, paddingRight: 72 }}
                    />
                    <button
                      type="button"
                      className="bz-btn bz-btn--sm"
                      style={{ position: 'absolute', right: 6, top: 6, height: 36, background: 'transparent' }}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <label className="bz-toggle-row" style={{ cursor: 'pointer' }}>
                <span className="bz-item__body">
                  <span style={{ fontWeight: 700, fontSize: 14 }}>I agree to the terms</span>
                  <span className="bz-sub" style={{ fontSize: 13 }}>
                    Read the <Link href="/terms" target="_blank" className="bz-link">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="bz-link">Privacy Policy</Link>. Pick a plan any time before the trial ends.
                  </span>
                </span>
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--bz-accent)', flexShrink: 0 }} />
              </label>

              <div className="bz-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <Link href="/login" className="bz-btn bz-btn--outline bz-btn--lg">Back</Link>
                <button type="submit" className="bz-btn bz-btn--ink bz-btn--lg" disabled={loading || !termsAccepted}>
                  {loading ? 'Creating your restaurant…' : 'Start 14-day trial'}
                </button>
              </div>
            </form>
          </article>

          <article className="bz-tile bz-tile--ink bz-c6" style={{ gap: 8 }} aria-labelledby="get-title">
            <div className="bz-row">
              <h2 id="get-title" className="bz-title">What you get</h2>
              <span style={{ fontSize: 13, color: '#A1A1AA' }}>on day one</span>
            </div>
            {[
              ['POS, kitchen display and captain app', 'your own devices'],
              ['QR ordering at the table', 'straight to the kitchen'],
              ['Reports and day-end close', 'payments, tips, refunds'],
            ].map(([t, s]) => (
              <div key={t} className="bz-darkrow bz-darkrow--pad">
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{t}</span>
                <span style={{ fontSize: 13, color: '#A1A1AA', whiteSpace: 'nowrap' }} className="bz-hide-sm">{s}</span>
              </div>
            ))}
          </article>

          <article className="bz-tile bz-c6" style={{ gap: 12 }} aria-labelledby="have-title">
            <div className="bz-row">
              <h2 id="have-title" className="bz-title">Sign in instead</h2>
              <span className="bz-meta">existing restaurant</span>
            </div>
            <span className="bz-sub">Owners, managers, servers and the kitchen all sign in from the same page.</span>
            <Link href="/login" className="bz-btn bz-btn--ink" style={{ alignSelf: 'flex-start' }}>Go to sign in</Link>
          </article>
        </section>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="bz" style={{ minHeight: '100vh' }} />}>
      <SignupForm />
    </Suspense>
  )
}
