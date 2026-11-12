'use client'

import React, { useState, Suspense, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BentoLogo } from '@/components/bento/BentoLogo'

type PortalRole = 'OWNER' | 'MANAGER' | 'SERVER' | 'KITCHEN'
const PORTALS: PortalRole[] = ['OWNER', 'MANAGER', 'SERVER', 'KITCHEN']

const PORTAL: Record<PortalRole, { name: string; opens: string; email: string; usesPin: boolean }> = {
  OWNER: { name: 'Owner', opens: 'Opens the dashboard: sales, menu, staff and settings.', email: 'Work email', usesPin: false },
  MANAGER: { name: 'Manager', opens: 'Opens the dashboard: today’s floor, shifts and approvals.', email: 'Work email', usesPin: false },
  SERVER: { name: 'Server', opens: 'Opens your tables, orders and guest calls on the phone.', email: 'Email', usesPin: true },
  KITCHEN: { name: 'Kitchen', opens: 'Opens the kitchen display for your station.', email: 'Email', usesPin: true },
}

function LoginForm() {
  const searchParams = useSearchParams()
  const isRegistered = searchParams.get('registered') === 'true'
  const initial = (searchParams.get('portal') || searchParams.get('role') || 'OWNER').toUpperCase()

  const [portal, setPortal] = useState<PortalRole>(PORTALS.includes(initial as PortalRole) ? (initial as PortalRole) : 'OWNER')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const p = (searchParams.get('portal') || searchParams.get('role'))?.toUpperCase()
    if (p && PORTALS.includes(p as PortalRole)) setPortal(p as PortalRole)
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const cleanEmail = email.trim().toLowerCase()

    try {
      const res = await signIn('credentials', { email: cleanEmail, password, redirect: false })
      if (res?.error) {
        setError('That email and password (or PIN) do not match. Check them and try again.')
        setLoading(false)
        return
      }

      // Ask for the role directly; the session cookie can lag a moment behind sign-in.
      let role: string | undefined
      try {
        const r = await fetch('/api/auth/lookup-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        })
        if (r.ok) role = (await r.json()).role
      } catch {
        // Fall back to the session below.
      }
      if (!role) {
        try {
          const s = await fetch('/api/auth/session', { cache: 'no-store' })
          role = (await s.json())?.user?.role
        } catch {
          // Default destination below.
        }
      }

      window.location.href = role === 'SERVER' ? '/server' : role === 'KITCHEN' ? '/kds' : '/dashboard'
    } catch {
      setError('Could not reach Prominentz. Check your connection and try again.')
      setLoading(false)
    }
  }

  const meta = PORTAL[portal]

  return (
    <div className="bz">
      <div className="bz-wrap" style={{ maxWidth: 1280 }}>
        <header className="bz-header">
          <div className="bz-header__left">
            <BentoLogo href="/" />
          </div>
          <div className="bz-header__right">
            <Link href="/signup" className="bz-link" style={{ fontSize: 14, fontWeight: 700 }}>
              New restaurant? Start free
            </Link>
            <Link href="/pricing" className="bz-btn bz-btn--outline bz-hide-sm">
              See pricing
            </Link>
          </div>
        </header>

        <div className="bz-head">
          <div className="bz-head__text">
            <span className="bz-eyebrow">Sign in · your restaurant</span>
            <h1 className="bz-h1">Welcome back.</h1>
          </div>
        </div>

        <section className="bz-grid">
          {/* Sign in */}
          <article className="bz-tile bz-c7 bz-r2" style={{ gap: 18 }} aria-labelledby="signin-title">
            <div className="bz-row">
              <h2 id="signin-title" className="bz-title bz-title--lg">Sign in as</h2>
              <span className="bz-meta">one account per person</span>
            </div>

            <div className="bz-seg" role="group" aria-label="Who is signing in" style={{ background: 'var(--bz-soft)', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
              {PORTALS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={portal === r}
                  className="bz-seg__btn"
                  onClick={() => {
                    setPortal(r)
                    setError(null)
                  }}
                >
                  {PORTAL[r].name}
                </button>
              ))}
            </div>
            <span className="bz-sub">{meta.opens}</span>

            {isRegistered && (
              <div className="bz-pillrow bz-pillrow--ink" role="status" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <span className="bz-dot" aria-hidden="true" />
                Your account is ready. Sign in with the email and password you just chose.
              </div>
            )}

            {error && (
              <div className="bz-error" role="alert">
                <span className="bz-error__title">Sign-in failed</span>
                <span className="bz-error__detail">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="bz-stack bz-stack--lg">
              <label className="bz-field">
                {meta.email}
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  autoComplete="email"
                  required
                />
              </label>

              <div className="bz-field">
                <label htmlFor="password">{meta.usesPin ? 'Password or 4-digit PIN' : 'Password'}</label>
                <div style={{ position: 'relative', display: 'flex' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    inputMode={meta.usesPin && showKeypad ? 'none' : undefined}
                    required
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

              {meta.usesPin && (
                <div className="bz-stack" style={{ gap: 10 }}>
                  <button type="button" className="bz-link" style={{ alignSelf: 'flex-start', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 13 }} onClick={() => setShowKeypad((v) => !v)} aria-expanded={showKeypad}>
                    {showKeypad ? 'Hide the PIN pad' : 'Use the PIN pad (tablet or POS)'}
                  </button>
                  {showKeypad && (
                    <div className="bz-keypad" role="group" aria-label="PIN pad">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          className={`bz-keypad__key${k === 'Clear' || k === '⌫' ? ' bz-keypad__key--util' : ''}`}
                          aria-label={k === '⌫' ? 'Delete' : k}
                          onClick={() => {
                            if (k === '⌫') setPassword((p) => p.slice(0, -1))
                            else if (k === 'Clear') setPassword('')
                            else setPassword((p) => (p.length < 8 ? p + k : p))
                          }}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className="bz-btn bz-btn--ink bz-btn--lg" disabled={loading}>
                {loading ? 'Signing in…' : `Sign in as ${meta.name.toLowerCase()}`}
              </button>
            </form>

            <span className="bz-sub" style={{ fontSize: 13 }}>
              Forgot your password? Ask your restaurant owner or manager to reset it from Staff.
            </span>
          </article>

          {/* New restaurant */}
          <article className="bz-tile bz-tile--accent bz-c5" style={{ gap: 14 }} aria-labelledby="new-title">
            <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 120 }}>START</span>
            <div className="bz-stack" style={{ gap: 8, position: 'relative' }}>
              <h2 id="new-title" style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.1, letterSpacing: '-0.03em' }}>Run your whole dining room on one app.</h2>
              <span style={{ fontSize: 14, color: 'var(--bz-on-accent-muted)' }}>14-day free trial · cancel any time</span>
            </div>
            <ol className="bz-track" style={{ position: 'relative' }}>
              {[
                ['Your restaurant', 'Name, address and time zone'],
                ['Your menu and tables', 'Type it in or import it'],
                ['Your team', 'Invite managers, servers and the kitchen'],
              ].map(([t, s], i) => (
                <li key={t}>
                  <span aria-hidden="true" className="bz-track__dot">{i + 1}</span>
                  <span className="bz-item__body">
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{t}</span>
                    <span style={{ fontSize: 14, color: 'var(--bz-on-accent-muted)' }}>{s}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/signup" className="bz-btn bz-btn--lime bz-btn--lg" style={{ position: 'relative', alignSelf: 'flex-start' }}>
              Start the free trial
            </Link>
          </article>

          {/* What you get */}
          <article className="bz-tile bz-tile--ink bz-c5" style={{ gap: 8 }} aria-labelledby="get-title">
            <div className="bz-row">
              <h2 id="get-title" className="bz-title">What every plan includes</h2>
            </div>
            {[
              ['POS, kitchen display and captain app', 'on your own devices'],
              ['QR ordering at the table', 'orders go straight to the kitchen'],
              ['Reports and day-end close', 'payments, tips and refunds'],
            ].map(([t, s]) => (
              <div key={t} className="bz-darkrow bz-darkrow--pad">
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{t}</span>
                <span style={{ fontSize: 13, color: '#A1A1AA', whiteSpace: 'nowrap' }} className="bz-hide-sm">{s}</span>
              </div>
            ))}
          </article>
        </section>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bz" style={{ minHeight: '100vh' }} />}>
      <LoginForm />
    </Suspense>
  )
}
