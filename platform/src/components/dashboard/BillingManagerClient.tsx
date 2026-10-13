'use client'

import React, { useState, useEffect } from 'react'
import { PlanTier } from '@/lib/plans'

interface PlanCardProps {
  tier: PlanTier
  title: string
  price: number
  description: string
  features: string[]
  isCurrent: boolean
  isPaidSubscription?: boolean
  onSelect: (tier: PlanTier) => void
  loadingTier: PlanTier | null
}

function PlanCard({
  tier,
  title,
  price,
  description,
  features,
  isPaidSubscription,
  onSelect,
  loadingTier,
}: PlanCardProps) {
  const isLoading = loadingTier === tier

  return (
    <div
      style={{
        backgroundColor: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            {title}
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono, monospace)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: 'rgba(255, 255, 255, 0.85)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {isPaidSubscription ? 'Active' : 'Standard'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
        <span style={{ fontSize: '38px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono, monospace)' }}>
          ${price}
        </span>
        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>/month</span>
      </div>

      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px', marginBottom: '28px', flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Included Features
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {features.map((feat, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px' }}>—</span>
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onSelect(tier)}
        disabled={isLoading || isPaidSubscription}
        style={{
          width: '100%',
          padding: '12px 18px',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: isPaidSubscription ? 'default' : isLoading ? 'wait' : 'pointer',
          backgroundColor: isPaidSubscription ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
          color: isPaidSubscription ? 'rgba(255, 255, 255, 0.65)' : '#000000',
          border: isPaidSubscription ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
          transition: 'all 150ms ease',
        }}
      >
        {isLoading
          ? 'Connecting Cashfree...'
          : isPaidSubscription
          ? '✓ Active Subscription ($50/mo)'
          : `Activate Subscription ($${price}/mo)`}
      </button>
    </div>
  )
}

export function BillingManagerClient() {
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('STARTER')
  const [restaurantName, setRestaurantName] = useState('My Restaurant')
  const [loading, setLoading] = useState(true)
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponStatus, setCouponStatus] = useState<string | null>(null)
  const [couponValidating, setCouponValidating] = useState(false)
  const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [isPaidSubscription, setIsPaidSubscription] = useState(false)

  const reloadPlanInfo = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        const rName = data.name || data.restaurant?.name || data.settings?.store?.name || 'My Restaurant'
        const rPlan = data.planTier || data.restaurant?.planTier || 'STARTER'
        setRestaurantName(rName)
        setCurrentPlan(rPlan as PlanTier)
      }
    } catch (err) {
      console.error('Failed to load restaurant settings', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadPlanInfo()

    if (typeof window !== 'undefined') {
      if (localStorage.getItem('prominentz_subscription_paid') === 'true') {
        setIsPaidSubscription(true)
      }

      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === 'true') {
        const upgradedPlan = (params.get('plan') as PlanTier) || 'STARTER'
        fetch('/api/billing/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planTier: upgradedPlan }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.success) {
              setCurrentPlan(upgradedPlan)
              setIsPaidSubscription(true)
              setShowThankYouModal(true)
              localStorage.setItem('prominentz_subscription_paid', 'true')
              setMessage(`Subscription active. All capabilities unlocked for ${restaurantName}.`)
              window.history.replaceState({}, '', window.location.pathname)
            }
          })
          .catch((e) => console.error(e))
      }
    }
  }, [restaurantName])

  const handleSubscribe = async (tier: PlanTier) => {
    setLoadingTier(tier)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
      })

      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to initiate payment gateway checkout')
      }
    } catch (err: any) {
      alert(err?.message || 'Error connecting to payment gateway')
    } finally {
      setLoadingTier(null)
    }
  }

  const handleOpenPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to open customer portal')
      }
    } catch (err: any) {
      alert(err?.message || 'Error opening portal')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', position: 'relative' }}>
      {/* ── Midday Minimalist Confirmation Modal ────────────────────── */}
      {showThankYouModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono, monospace)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                Subscription Confirmed
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Thank you, {restaurantName}
            </h2>

            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', margin: '0 0 24px 0', lineHeight: 1.6 }}>
              Your subscription is active and verified through Cashfree. All operational floor modules and POS terminals are unlocked.
            </p>

            {/* Unlocked Capabilities List */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '16px 18px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Active Capabilities
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  'POS Terminal & Register',
                  'Kitchen Display (KDS)',
                  'QR Table Studio & Menu',
                  'Tableside Split Checks',
                  'Inventory & Recipe Sync',
                  'Daily Sales Analytics',
                  'Staff Accounts & Clock',
                  'Floor Layout Visualizer',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="/pos"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Launch POS Terminal
              </a>

              <a
                href="/kds"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                Kitchen KDS
              </a>

              <button
                onClick={() => setShowThankYouModal(false)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{message}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Midday Obsidian Overview Card ───────────────────────────── */}
      <div
        style={{
          backgroundColor: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
              color: 'rgba(255, 255, 255, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            Subscription
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Basic Plan
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono, monospace)',
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                letterSpacing: '0.04em',
              }}
            >
              ● {isPaidSubscription ? 'ACTIVE' : 'TRIAL'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', marginTop: '4px' }}>
            {isPaidSubscription
              ? `Subscribed and active for ${restaurantName}. All modules unlocked.`
              : `14-day evaluation active for ${restaurantName}.`
            }
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255, 255, 255, 0.4)' }}>Rate</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono, monospace)' }}>
              $50
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400 }}>/mo</span>
            </div>
          </div>

          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            style={{
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'transparent',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {portalLoading ? 'Opening...' : 'Receipts & Details ↗'}
          </button>
        </div>
      </div>

      {/* ── Single Basic Plan Display ───────────────────────────────── */}
      <div style={{ maxWidth: '480px', margin: '0 auto 40px' }}>
        <PlanCard
          tier="STARTER"
          title="Basic Plan"
          price={50}
          isPaidSubscription={isPaidSubscription}
          description="POS, KDS, inventory, and floor operations for your restaurant."
          isCurrent={currentPlan === 'STARTER'}
          onSelect={handleSubscribe}
          loadingTier={loadingTier}
          features={[
            'Full POS Terminal & Order Entry',
            'Real-Time Kitchen Display System (KDS)',
            'Table & Menu QR Code Studio (Direct-to-KDS)',
            'Table-Side Settlement & Split Checks',
            'Inventory Stock Count & Recipe Tracking',
            'Staff Accounts & Clock-In/Clock-Out',
            'End-of-Day Z-Reports & Daily Analytics',
            'Reservations & Walk-In Waitlist',
          ]}
        />
      </div>

      {/* ── Modular Add-ons ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
            Modular Extensions
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
            Expand floor capabilities as your operations scale.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { name: 'RestoIQ Copilot', price: '$29/mo', desc: 'Continuous telemetry & inventory suggestions', active: true },
            { name: 'Offline Handhelds', price: '$19/mo', desc: 'IndexedDB mesh sync for low connectivity', active: true },
            { name: 'Extra KDS Screen', price: '$15/mo', desc: 'Secondary expo passes or bar monitors', active: false },
            { name: 'Delivery Hub', price: '$39/mo', desc: 'Two-way integration for online orders', active: false },
          ].map((addon) => (
            <div
              key={addon.name}
              style={{
                padding: '16px 18px',
                borderRadius: '8px',
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>{addon.name}</div>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255, 255, 255, 0.7)' }}>{addon.price}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', lineHeight: 1.4 }}>{addon.desc}</div>
              </div>
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>
                  {addon.active ? 'Included' : 'Available'}
                </span>
                {!addon.active && (
                  <button
                    onClick={handleOpenPortal}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Coupon Code ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: '10px',
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>
            Promotion Code
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px' }}>
            Apply partner vouchers or early-access discounts.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)',
              width: '120px',
              outline: 'none',
            }}
          />
          <button
            onClick={async () => {
              if (!couponCode.trim()) return
              setCouponValidating(true)
              try {
                const res = await fetch('/api/coupons/validate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: couponCode.trim(), subtotal: 50 }),
                })
                const data = await res.json()
                if (data.valid) {
                  setCouponStatus(`Coupon applied: ${data.coupon?.code || couponCode}`)
                } else {
                  setCouponStatus(data.message || 'Invalid coupon code')
                }
              } catch {
                setCouponStatus('Error verifying coupon')
              } finally {
                setCouponValidating(false)
              }
            }}
            disabled={couponValidating || !couponCode.trim()}
            style={{
              fontSize: '12px',
              padding: '7px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {couponValidating ? '...' : 'Apply'}
          </button>
        </div>
        {couponStatus && (
          <div style={{ width: '100%', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
            {couponStatus}
          </div>
        )}
      </div>

      {/* Footer Assurance */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          color: 'rgba(255, 255, 255, 0.35)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        <div>Encrypted via Cashfree PCI-DSS Level 1.</div>
        <div>No locked contracts · Cancel anytime</div>
      </div>
    </div>
  )
}
