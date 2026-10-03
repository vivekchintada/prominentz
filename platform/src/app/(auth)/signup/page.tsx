'use client'

import React, { useState, useEffect, Suspense } from 'react'
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
    } catch (err: any) {
      setError(err.message || 'An unexpected registration error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainContainer}>
        {/* ── LEFT SHOWCASE: Brand Presentation & Role Overview ── */}
        <div className={styles.heroShowcase}>
          <div className={styles.brandBadge}>
            <span className={styles.badgeDot} />
            Prominentz Platform Onboarding
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
                <span className={styles.heroTitleGradient}>with high-speed access.</span>
              </>
            )}
          </h1>

          <p className={styles.heroSubtitle}>
            {accountType === 'OWNER'
              ? 'Complete cloud operating system for restaurant groups: Point-of-Sale, Kitchen Display Systems, floor tables, QR ordering, and live inventory.'
              : 'Direct-access portal for managers, floor servers, and kitchen line cooks. Seamless order entry, bump displays, and shift management.'}
          </p>

          {/* Onboarding Highlights Card */}
          <div className={styles.liveMetricsCard}>
            <div className={styles.metricsHeader}>
              <span>{accountType === 'OWNER' ? 'Owner SaaS Privileges' : 'Staff Workspace Access'}</span>
              <span className={styles.liveIndicator}>
                <span className={styles.liveIndicatorDot} />
                Live Setup
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
                    <span className={styles.metricValue}>Pre-seeded</span>
                    <span className={styles.metricLabel}>Menu &amp; Tables Ready</span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>All Access</span>
                    <span className={styles.metricLabel}>FOH + BOH + HQ</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>
                      {staffRole === 'MANAGER' ? '👔 Ops' : staffRole === 'SERVER' ? '🛎️ Floor' : '🍳 KDS'}
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
              <span>⚡</span> Real-time KDS Kitchen Pipeline
            </div>
            <div className={styles.featurePill}>
              <span>🔒</span> Encrypted Cloud Sessions
            </div>
            <div className={styles.featurePill}>
              <span>📱</span> Mobile Handheld &amp; Tablet Ready
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Registration Form Card ── */}
        <div className={styles.authCardWrapper}>
          <div className={styles.authCard}>
            <div className={styles.cardHeader}>
              <div className={styles.logoRow}>
                <div className={styles.logoIcon}>P</div>
                <div>
                  <div className={styles.logoBrandName}>Prominentz</div>
                  <span className={styles.logoBrandTag}>Account Setup</span>
                </div>
              </div>

              {/* Segmented Account Type Toggle */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  padding: '4px',
                  borderRadius: '10px',
                  margin: '16px 0 8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => { setAccountType('OWNER'); setError(null) }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: accountType === 'OWNER' ? '#5b45f5' : 'transparent',
                    color: accountType === 'OWNER' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    transition: 'all 150ms ease',
                  }}
                >
                  👑 New Restaurant Owner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('OWNER')
                    setError('Staff accounts must be created by a restaurant owner or manager.')
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: accountType === 'STAFF' ? '#5b45f5' : 'transparent',
                    color: accountType === 'STAFF' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    transition: 'all 150ms ease',
                  }}
                >
                  👥 Staff Member Onboarding
                </button>
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
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {createdData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '42px', marginBottom: '6px' }}>🎉</div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {createdData.restaurant?.name} is Ready!
                  </h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '6px 0 0' }}>
                    Your restaurant SaaS account and core team roles have been created with your master password:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Owner */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(91, 69, 245, 0.12)',
                    border: '1px solid rgba(91, 69, 245, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>👑</span>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>Owner & General Manager</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                        {createdData.user?.email}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#7b68f7', fontWeight: 700 }}>
                      Dashboard Console
                    </span>
                  </div>

                  {/* Starter Staff Accounts (Manager, Server, Kitchen) */}
                  {createdData.starterAccounts?.map((acc: any) => (
                    <div
                      key={acc.role}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>
                            {acc.role === 'MANAGER' ? '💼' : acc.role === 'SERVER' ? '🍽️' : '🍳'}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                            {acc.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                          {acc.email}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(91, 69, 245, 0.15)',
                        color: '#7b68f7',
                        border: '1px solid rgba(91, 69, 245, 0.3)',
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
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '11px',
                  color: '#34d399',
                  textAlign: 'center',
                }}>
                  🔑 All operational accounts are pre-configured with the master password you just set.
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/login?registered=true&portal=owner&email=${encodeURIComponent(createdData.user?.email || email)}`)}
                  className={styles.submitBtn}
                  style={{ marginTop: '8px' }}
                >
                  Proceed to Owner Sign In →
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
                      className={styles.customInput}
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
                      className={styles.customInput}
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
                      className={styles.customInput}
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'SERVER', label: '🛎️ Server', desc: 'Floor & POS' },
                        { id: 'KITCHEN', label: '🍳 Kitchen', desc: 'KDS Screens' },
                        { id: 'MANAGER', label: '👔 Manager', desc: 'Store Ops' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setStaffRole(r.id as any)}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            border: staffRole === r.id ? '1.5px solid #7b68f7' : '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: staffRole === r.id ? 'rgba(91,69,245,0.2)' : 'rgba(255,255,255,0.03)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '12px' }}>{r.label}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{r.desc}</div>
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
                      className={styles.customInput}
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
                      className={styles.customInput}
                      value={restaurantCode}
                      onChange={(e) => setRestaurantCode(e.target.value)}
                      placeholder="e.g. osteria-stella-1042 or store ID"
                      required
                    />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', display: 'block' }}>
                      Provided by your General Manager or on your shift schedule.
                    </span>
                  </div>
                </>
              )}

              {/* ── SHARED CREDENTIALS ── */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="email">
                  {accountType === 'OWNER' ? 'Work Email Address *' : 'Staff Email Address *'}
                </label>
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

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="password">
                    {accountType === 'OWNER' ? 'Account Password (min. 6 chars) *' : 'Password or 4-Digit PIN *'}
                  </label>
                </div>
                <div className={styles.inputContainer}>
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
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '🔒'}
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
                  className={styles.customInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Starter Staff Inclusion Notice */}
              {accountType === 'OWNER' && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(91, 69, 245, 0.08)',
                  border: '1px solid rgba(91, 69, 245, 0.25)',
                  marginTop: '12px',
                  marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px' }}>✨</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#7b68f7' }}>
                      Included Core Operational Staff
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.45 }}>
                    Your restaurant automatically includes pre-configured <strong>Manager</strong>, <strong>Server</strong>, and <strong>Kitchen</strong> operational accounts using your master password so your floor, kitchen, and management teams can start immediately.
                  </p>
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading
                  ? 'Creating Account...'
                  : accountType === 'OWNER'
                  ? 'Launch Restaurant OS (14 Days Free) →'
                  : `Complete ${staffRole} Registration →`}
              </button>
            </form>
            )}

            <div className={styles.footerRow}>
              <span>Already have an account? </span>
              <Link href="/login" className={styles.footerLink}>
                Sign in to your portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090e' }} />}>
      <SignupForm />
    </Suspense>
  )
}
