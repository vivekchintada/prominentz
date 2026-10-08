'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/page.module.css'

function SignupForm() {
  const searchParams = useSearchParams()
  const initialRoleParam = searchParams.get('role')?.toUpperCase()

  const [accountType, setAccountType] = useState<'OWNER' | 'STAFF'>('OWNER')

  // Owner fields
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerName, setOwnerName]           = useState('')
  const [locationName, setLocationName]     = useState('Main Dining Room')

  // Staff fields
  const [staffName, setStaffName]           = useState('')
  const [staffRole, setStaffRole]           = useState<'MANAGER' | 'SERVER' | 'KITCHEN'>(
    ['MANAGER', 'SERVER', 'KITCHEN'].includes(initialRoleParam || '')
      ? (initialRoleParam as 'MANAGER' | 'SERVER' | 'KITCHEN')
      : 'SERVER'
  )
  const [restaurantCode, setRestaurantCode] = useState(searchParams.get('code') || '')

  // Shared fields
  const [email, setEmail]                   = useState(searchParams.get('email') || '')
  const [password, setPassword]             = useState('')
  const [showPassword, setShowPassword]     = useState(false)
  const [phone, setPhone]                   = useState('')

  const [error, setError]                   = useState<string | null>(null)
  const [loading, setLoading]               = useState(false)
  const [createdData, setCreatedData]       = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const r = searchParams.get('role')?.toUpperCase()
    if (r === 'OWNER') {
      setAccountType('OWNER')
    } else if (r && ['MANAGER', 'SERVER', 'KITCHEN'].includes(r)) {
      setAccountType('OWNER')
      setError('Staff accounts must be created by a restaurant owner or manager.')
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = accountType === 'OWNER'
        ? {
            signupType: 'OWNER',
            restaurantName,
            ownerName,
            email,
            password,
            locationName: locationName || 'Main Dining Room',
            phone: phone || undefined,
          }
        : {
            signupType: 'STAFF',
            name: staffName,
            email,
            password,
            role: staffRole,
            restaurantCode,
            phone: phone || undefined,
          }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (typeof data.error === 'object' && data.error.fieldErrors) {
          const firstErr = Object.values(data.error.fieldErrors)[0] as string[]
          throw new Error(firstErr?.[0] || 'Validation error')
        }
        throw new Error(data.error || 'Failed to create account')
      }

      if (accountType === 'OWNER') {
        router.push(`/login?registered=true&portal=owner&email=${encodeURIComponent(email)}`)
        return
      }

      // Staff registration -> redirect to login with query param
      router.push(`/login?registered=true&portal=${staffRole.toLowerCase()}&email=${encodeURIComponent(email)}`)
    } catch (err: unknown) {
      setError(err.message || 'An unexpected registration error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageWrapper}>
      {/* ── Top Header Navigation ── */}
      <header className={styles.topNav}>
        <Link href="/" className={styles.brandLink}>
          <span className={styles.brandMark} aria-hidden="true">R</span>
          <span className={styles.brandName}>Resto</span>
        </Link>
        <Link href="/" className={styles.backHomeLink}>
          <span>&larr;</span>
          <span>Back to Resto</span>
        </Link>
      </header>

      <div className={styles.mainContainer}>
        {/* ── LEFT SHOWCASE: Brand Presentation & Role Overview ── */}
        <div className={styles.heroShowcase}>
          <div className={styles.brandBadge}>
            <span className={styles.badgeDot} />
            Resto Platform Onboarding
          </div>

          <h1 className={styles.heroTitle}>
            {accountType === 'OWNER' ? (
              <>
                Launch your restaurant in{' '}
                <span className={styles.heroTitleGradient}>minutes, not weeks.</span>
              </>
            ) : (
              <>
                Join your restaurant team{' '}
                <span className={styles.heroTitleGradient}>with instant access.</span>
              </>
            )}
          </h1>

          <p className={styles.heroSubtitle}>
            {accountType === 'OWNER'
              ? 'Complete cloud operating system for modern restaurants: Point-of-Sale, Kitchen Display Systems, live floor management, and real-time inventory.'
              : 'Direct-access workspace for floor servers, kitchen lines, and operational managers. Seamless order entry, bump displays, and shift management.'}
          </p>

          {/* Onboarding Highlights Card */}
          <div className={styles.liveMetricsCard}>
            <div className={styles.metricsHeader}>
              <span>{accountType === 'OWNER' ? 'Owner SaaS Privileges' : 'Staff Workspace Access'}</span>
              <span className={styles.liveIndicator}>
                <span className={styles.liveIndicatorDot} />
                Secure Setup
              </span>
            </div>

            <div className={styles.metricsGrid}>
              {accountType === 'OWNER' ? (
                <>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>$0 Due</span>
                    <span className={styles.metricLabel}>14-Day Free Trial</span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>Clean Start</span>
                    <span className={styles.metricLabel}>Custom Menu &amp; Tables</span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>Full Access</span>
                    <span className={styles.metricLabel}>FOH + BOH + HQ</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>
                      {staffRole === 'MANAGER' ? 'Ops' : staffRole === 'SERVER' ? 'Floor' : 'KDS'}
                    </span>
                    <span className={styles.metricLabel}>Role Assigned</span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>Instant</span>
                    <span className={styles.metricLabel}>Terminal Dispatch</span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>PIN / Pass</span>
                    <span className={styles.metricLabel}>Touchscreen Ready</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Key Perks */}
          <div className={styles.featurePills}>
            <div className={styles.featurePill}>
              <span className={styles.featurePillIcon}>✓</span>
              <span>Full front-of-house and kitchen display sync</span>
            </div>
            <div className={styles.featurePill}>
              <span className={styles.featurePillIcon}>✓</span>
              <span>Encrypted cloud sessions with role-based access</span>
            </div>
            <div className={styles.featurePill}>
              <span className={styles.featurePillIcon}>✓</span>
              <span>Mobile handheld and tablet responsive terminals</span>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            &ldquo;Setting up Resto took under ten minutes. The floor team was taking orders on handhelds the same evening.&rdquo;
            <span className={styles.testimonialAuthor}>— Elena Rostova, General Manager @ Atelier Bistro</span>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Registration Form Card ── */}
        <div className={styles.authCardWrapper}>
          <div className={styles.authCard}>
            <div className={styles.cardHeader}>
              <div className={styles.logoRow}>
                <div className={styles.logoBadge}>
                  <div className={styles.logoIcon}>R</div>
                  <div>
                    <div className={styles.logoBrandName}>Resto</div>
                  </div>
                </div>
                <span className={styles.logoBrandTag}>ACCOUNT SETUP</span>
              </div>

              {/* Segmented Account Type Toggle */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  backgroundColor: '#121215',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  margin: '16px 0 16px',
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAccountType('OWNER'); setError(null) }}
                >
                  Restaurant Owner
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAccountType('STAFF')
                    setError('Staff accounts must be created by a restaurant owner or manager.')
                  }}
                >
                  Staff (Invite-Only)
                </Button>
              </div>

              <h2 className={styles.cardTitle}>
                {accountType === 'OWNER' ? 'Register Restaurant' : 'Join Restaurant Team'}
              </h2>
              <p className={styles.cardSubtitle}>
                {accountType === 'OWNER'
                  ? 'Start your 14-day free trial with full platform access'
                  : 'Register your staff profile under an existing restaurant'}
              </p>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <span>&bull;</span>
                <span>{error}</span>
              </div>
            )}

            {createdData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>
                    {createdData.restaurant?.name} is Ready
                  </h2>
                  <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
                    Your restaurant SaaS account and core team roles have been created with your master password:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Owner */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#121215',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>Owner &amp; General Manager</div>
                      <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                        {createdData.user?.email}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600 }}>
                      Dashboard
                    </span>
                  </div>

                  {/* Starter Staff Accounts */}
                  {createdData.starterAccounts?.map((acc: unknown) => (
                    <div
                      key={acc.role}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: '#121215',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                          {acc.email}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#a1a1aa',
                      }}>
                        {acc.portal}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '12px',
                  color: '#10b981',
                  textAlign: 'center',
                }}>
                  All operational accounts are configured with your master password.
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/login?registered=true&portal=owner&email=${encodeURIComponent(createdData.user?.email || email)}`)}
                  className={styles.submitBtn}
                >
                  Proceed to Owner Sign In
                </button>
              </div>
            ) : (
            <form onSubmit={handleSignup} className={styles.form}>
              {/* ── OWNER REGISTRATION FIELDS ── */}
              {accountType === 'OWNER' && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="restaurantName">
                      Restaurant / Business Name *
                    </label>
                    <input
                      id="restaurantName"
                      type="text"
                      className={styles.customInputNoIcon}
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="e.g. Osteria Stella"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="ownerName">
                      Owner / Operator Full Name *
                    </label>
                    <input
                      id="ownerName"
                      type="text"
                      className={styles.customInputNoIcon}
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Marcus Vance"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="locationName">
                      Primary Outlet / Location Name
                    </label>
                    <input
                      id="locationName"
                      type="text"
                      className={styles.customInputNoIcon}
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Downtown Flagship"
                    />
                  </div>
                </>
              )}

              {/* ── STAFF ONBOARDING FIELDS ── */}
              {accountType === 'STAFF' && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="staffRole">
                      Your Restaurant Role *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'SERVER', label: 'Server', desc: 'Floor & POS' },
                        { id: 'KITCHEN', label: 'Kitchen', desc: 'KDS Screens' },
                        { id: 'MANAGER', label: 'Manager', desc: 'Store Ops' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setStaffRole(r.id as any)}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '8px',
                            border: staffRole === r.id ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: staffRole === r.id ? '#27272a' : '#121215',
                            color: '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '12px' }}>{r.label}</div>
                          <div style={{ fontSize: '10px', color: '#71717a' }}>{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="staffName">
                      Your Full Name *
                    </label>
                    <input
                      id="staffName"
                      type="text"
                      className={styles.customInputNoIcon}
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Alex Taylor"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="restaurantCode">
                      Restaurant Store Code / Slug *
                    </label>
                    <input
                      id="restaurantCode"
                      type="text"
                      className={styles.customInputNoIcon}
                      value={restaurantCode}
                      onChange={(e) => setRestaurantCode(e.target.value)}
                      placeholder="e.g. osteria-stella-1042 or store ID"
                      required
                    />
                    <span style={{ fontSize: '11px', color: '#71717a', marginTop: '4px', display: 'block' }}>
                      Provided by your General Manager or shift schedule.
                    </span>
                  </div>
                </>
              )}

              {/* ── SHARED CREDENTIALS ── */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="email">
                  {accountType === 'OWNER' ? 'Work Email Address *' : 'Staff Email Address *'}
                </label>
                <div className={styles.inputContainer}>
                  <span className={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    placeholder="name@restaurant.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="password">
                    {accountType === 'OWNER' ? 'Account Password (min. 6 chars) *' : 'Password or 4-Digit PIN *'}
                  </label>
                </div>
                <div className={styles.inputContainer}>
                  <span className={styles.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    placeholder={accountType === 'OWNER' ? '••••••••••••' : '•••• or 4-digit PIN'}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggleBtn}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="phone">
                  Mobile Phone Number (Optional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={styles.customInputNoIcon}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Starter Staff Inclusion Notice */}
              {accountType === 'OWNER' && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#121215',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginTop: '4px',
                  marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                      Includes Operational Team Accounts
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#71717a', lineHeight: 1.45 }}>
                    Your restaurant automatically configures starter <strong>Manager</strong>, <strong>Server</strong>, and <strong>Kitchen</strong> operational accounts using your master password.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading
                  ? 'Creating Account...'
                  : accountType === 'OWNER'
                  ? 'Start 14-Day Free Trial'
                  : `Complete ${staffRole} Registration`}
              </Button>
            </form>
            )}

            <div className={styles.footerRow}>
              <div>
                <span>Already have an account? </span>
                <Link href="/login" className={styles.footerLink}>
                  Sign in to your portal
                </Link>
              </div>

              <div className={styles.footerSecurityNotice}>
                Protected by Resto Role-Based Access Control
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#000000' }} />}>
      <SignupForm />
    </Suspense>
  )
}
