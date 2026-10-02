'use client'

import React, { useState, Suspense, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

type PortalRole = 'OWNER' | 'MANAGER' | 'SERVER' | 'KITCHEN'

function LoginForm() {
  const searchParams = useSearchParams()
  const isRegistered = searchParams.get('registered') === 'true'
  const initialPortalParam = (searchParams.get('portal') || searchParams.get('role') || 'OWNER').toUpperCase()

  const [activePortal, setActivePortal] = useState<PortalRole>(
    ['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(initialPortalParam)
      ? (initialPortalParam as PortalRole)
      : 'OWNER'
  )

  const [email, setEmail]               = useState(searchParams.get('email') || '')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showKeypad, setShowKeypad]     = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const router = useRouter()

  useEffect(() => {
    const p = (searchParams.get('portal') || searchParams.get('role'))?.toUpperCase()
    if (p && ['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(p)) {
      setActivePortal(p as PortalRole)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (res?.error) {
        setError('Invalid credentials. Please verify your email and password or PIN.')
        setLoading(false)
        return
      }

      // Look up role reliably via dedicated API endpoint to prevent NextAuth cookie race conditions
      let resolvedRole: string | undefined
      try {
        const roleRes = await fetch('/api/auth/lookup-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        })
        if (roleRes.ok) {
          const roleData = await roleRes.json()
          resolvedRole = roleData.role
        }
      } catch {
        // Fallback to session
      }

      if (!resolvedRole) {
        try {
          const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' })
          const session = await sessionRes.json()
          resolvedRole = session?.user?.role
        } catch {}
      }

      // Dynamic workspace routing
      if (resolvedRole === 'SERVER') {
        window.location.href = '/server'
      } else if (resolvedRole === 'KITCHEN') {
        window.location.href = '/kds'
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('An unexpected connection error occurred. Please try again.')
      setLoading(false)
    }
  }

  const portalMeta: Record<PortalRole, { title: string; subtitle: string; destination: string; badge: string; icon: string }> = {
    OWNER: {
      title: 'Restaurant Owner Portal',
      subtitle: 'Complete enterprise command center, financial reports & settings',
      destination: '/dashboard',
      badge: 'Full Executive Access',
      icon: '👑',
    },
    MANAGER: {
      title: 'Store Operations Manager',
      subtitle: 'Shift scheduling, approvals, drawer cash & live floor controls',
      destination: '/dashboard',
      badge: 'Store Operations',
      icon: '👔',
    },
    SERVER: {
      title: 'Floor Server & POS Terminal',
      subtitle: 'Handheld table assignments, course fire & instant bill splits',
      destination: '/server',
      badge: 'FOH Floor Terminal',
      icon: '🛎️',
    },
    KITCHEN: {
      title: 'Kitchen Display Bump Terminal',
      subtitle: 'High-speed line tickets, station routing & auto-86 dish controls',
      destination: '/kds',
      badge: 'BOH Kitchen Display',
      icon: '🍳',
    },
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainContainer}>
        {/* ── LEFT SHOWCASE: Brand Presentation & Live Metrics ── */}
        <div className={styles.heroShowcase}>
          <div className={styles.brandBadge}>
            <span className={styles.badgeDot} />
            Prominentz Restaurant Operating System
          </div>

          <h1 className={styles.heroTitle}>
            Unified Operating System for{' '}
            <span className={styles.heroTitleGradient}>High-Speed Dining.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Dedicated workspace access for owners, managers, floor servers, and kitchen chefs. Powered by real-time event synchronization.
          </p>

          {/* Active Portal Telemetry Box */}
          <div className={styles.liveMetricsCard}>
            <div className={styles.metricsHeader}>
              <span>{portalMeta[activePortal].title}</span>
              <span className={styles.liveIndicator}>
                <span className={styles.liveIndicatorDot} />
                Live Sync
              </span>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricBox}>
                <span className={styles.metricValue}>{portalMeta[activePortal].badge}</span>
                <span className={styles.metricLabel}>Security Level</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricValue}>{portalMeta[activePortal].destination}</span>
                <span className={styles.metricLabel}>Auto-Routed Workspace</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricValue}>TLS 1.3</span>
                <span className={styles.metricLabel}>Encrypted Session</span>
              </div>
            </div>
          </div>

          {/* Key Feature Badges */}
          <div className={styles.featurePills}>
            <div className={styles.featurePill}>
              <span>🍳</span> Real-time KDS Station Pipeline
            </div>
            <div className={styles.featurePill}>
              <span>📱</span> Mobile &amp; Tablet Handheld POS
            </div>
            <div className={styles.featurePill}>
              <span>⚡</span> Live Floor Status &amp; Split Bills
            </div>
          </div>

          {/* Hospitality quote */}
          <div className={styles.testimonialCard}>
            &ldquo;Prominentz cut our peak rush table turn times by 22% in our very first month.&rdquo;
            <span className={styles.testimonialAuthor}>— Executive Chef Marcus Vance @ The Grand Osteria</span>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Role-Tailored Auth Card ── */}
        <div className={styles.authCardWrapper}>
          <div className={styles.authCard}>
            <div className={styles.cardHeader}>
              <div className={styles.logoRow}>
                <div className={styles.logoIcon}>P</div>
                <div>
                  <div className={styles.logoBrandName}>Prominentz</div>
                  <span className={styles.logoBrandTag}>Role Portal</span>
                </div>
              </div>

              {/* Segmented 4-Role Portal Switcher */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '4px',
                  borderRadius: '10px',
                  margin: '16px 0 12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {(['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'] as PortalRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setActivePortal(r); setError(null) }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: activePortal === r ? '#5b45f5' : 'transparent',
                      color: activePortal === r ? '#ffffff' : 'rgba(255,255,255,0.6)',
                      transition: 'all 150ms ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{portalMeta[r].icon}</span>
                    <span>{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                  </button>
                ))}
              </div>

              <h2 className={styles.cardTitle}>{portalMeta[activePortal].title}</h2>
              <p className={styles.cardSubtitle}>{portalMeta[activePortal].subtitle}</p>
            </div>

            {isRegistered && (
              <div className={styles.successBanner}>
                🎉 Account created! Please sign in with your credentials.
              </div>
            )}

            {error && (
              <div className={styles.errorBanner}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="email">
                  {activePortal === 'OWNER'
                    ? 'Owner Work Email'
                    : activePortal === 'MANAGER'
                    ? 'Manager Email'
                    : activePortal === 'SERVER'
                    ? 'Server Email or ID'
                    : 'Kitchen Team / Cook Email'}
                </label>
                <div className={styles.inputContainer}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    className={styles.customInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      activePortal === 'OWNER'
                        ? 'owner@restaurant.com'
                        : activePortal === 'MANAGER'
                        ? 'manager@restaurant.com'
                        : activePortal === 'SERVER'
                        ? 'server@restaurant.com'
                        : 'kitchen@restaurant.com'
                    }
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="password">
                    {activePortal === 'SERVER' || activePortal === 'KITCHEN'
                      ? 'Password or 4-Digit PIN'
                      : 'Account Password'}
                  </label>
                  <span style={{ fontSize: '11px', color: '#7b68f7', cursor: 'pointer' }}>
                    Need access help?
                  </span>
                </div>
                <div className={styles.inputContainer}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={styles.customInput}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      activePortal === 'SERVER' || activePortal === 'KITCHEN'
                        ? '•••• or 4-digit PIN'
                        : '••••••••••••'
                    }
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggleBtn}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Touch PIN Keypad for Server and Kitchen */}
              {(activePortal === 'SERVER' || activePortal === 'KITCHEN') && (
                <div style={{ marginTop: '-4px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowKeypad(!showKeypad)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a594fd',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '2px 0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🔢</span>
                    <span>{showKeypad ? 'Hide Touch Keypad' : 'Show Touch PIN Keypad (Tablet/POS)'}</span>
                  </button>

                  {showKeypad && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        marginTop: '8px',
                        padding: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            if (k === '⌫') setPassword((prev) => prev.slice(0, -1))
                            else if (k === 'CLR') setPassword('')
                            else setPassword((prev) => (prev.length < 8 ? prev + k : prev))
                          }}
                          style={{
                            padding: '12px 0',
                            fontSize: k === 'CLR' || k === '⌫' ? '12px' : '16px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: k === 'CLR' || k === '⌫' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 100ms ease',
                          }}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading
                  ? 'Authenticating Session...'
                  : `Sign In to ${activePortal.charAt(0) + activePortal.slice(1).toLowerCase()} Workspace →`}
              </button>
            </form>

            <div className={styles.footerRow} style={{ marginTop: '20px', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <div>
                <span>Need a new account? </span>
                <Link
                  href={activePortal === 'OWNER' ? '/signup' : `/signup?role=${activePortal.toLowerCase()}`}
                  className={styles.footerLink}
                >
                  {activePortal === 'OWNER'
                    ? 'Register your restaurant (14-day free trial) →'
                    : `Onboard as ${activePortal.charAt(0) + activePortal.slice(1).toLowerCase()} →`}
                </Link>
              </div>

              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Protected by Prominentz Role-Based Access Control (RBAC)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090e' }} />}>
      <LoginForm />
    </Suspense>
  )
}
