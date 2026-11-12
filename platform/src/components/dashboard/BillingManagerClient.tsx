'use client'

import React, { useState, useEffect } from 'react'
import { PlanTier } from '@/lib/plans'

function formatBillingDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

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
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
        borderRadius: '12px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            {title}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono, monospace)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-text-primary) 4%, transparent)',
            color: 'var(--color-text-primary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {isPaidSubscription ? 'Active' : 'Standard'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
        <span style={{ fontSize: '38px', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono, monospace)' }}>
          ${price}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>/month</span>
      </div>

      <div style={{ borderTop: '1px solid color-mix(in srgb, var(--color-text-primary) 8%, transparent)', paddingTop: '20px', marginBottom: '28px', flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Included Features
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {features.map((feat, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>—</span>
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary call to action. It used the card's own background with no border, so it read as
          plain text and owners couldn't find how to subscribe. */}
      <button
        type="button"
        onClick={() => onSelect(tier)}
        disabled={isLoading || isPaidSubscription}
        className={isPaidSubscription ? 'bz-btn bz-btn--block' : 'bz-btn bz-btn--lime bz-btn--block'}
        style={{
          padding: '14px 18px',
          fontSize: '14px',
          cursor: isPaidSubscription ? 'default' : isLoading ? 'wait' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading
          ? 'Connecting...'
          : isPaidSubscription
          ? '✓ Active Subscription ($50/mo)'
          : `Start subscription · $${price}/mo`}
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('INACTIVE')
  const [testMode, setTestMode] = useState(false)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)

  const reloadPlanInfo = async () => {
    try {
      // Paid status comes from the recurring subscription itself, not the plan tier —
      // Basic (STARTER) is both the trial tier and the paid $50/mo plan.
      const res = await fetch('/api/billing/subscription')
      if (res.ok) {
        const data = await res.json()
        setRestaurantName(data.restaurantName || 'My Restaurant')
        setCurrentPlan((data.planTier || 'STARTER') as PlanTier)
        setSubscriptionStatus(data.status || 'INACTIVE')
        setTestMode(Boolean(data.testMode))
        setIsPaidSubscription(data.status === 'ACTIVE' || data.status === 'BILLING_ISSUE' || data.status === 'PAUSED')
        setCurrentPeriodEnd(data.currentPeriodEnd || null)
        setCancelAtPeriodEnd(Boolean(data.cancelAtPeriodEnd))
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
      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === 'true') {
        setMessage('Confirming your payment with Dodo Payments…')
        // Ask the server to re-check Dodo now (the webhook may lag), then reload from DB.
        // Dodo appends subscription_id to the return URL. The confirmation only shows once
        // the server has actually seen an active subscription.
        fetch('/api/billing/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId: params.get('subscription_id') || undefined }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.synced && data.status === 'active') {
              setMessage(null)
              setShowThankYouModal(true)
            } else {
              setMessage('Payment received. Confirmation can take a minute; refresh this page shortly.')
            }
          })
          .catch(() => setMessage('Payment received. Confirmation can take a minute; refresh this page shortly.'))
          .finally(() => reloadPlanInfo())
        window.history.replaceState({}, '', window.location.pathname)
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
      {/* ── Subscription confirmed modal ── */}
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
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
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
                  backgroundColor: 'var(--color-bg-card)',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono, monospace)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Subscription Confirmed
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Thank you, {restaurantName}
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 24px 0', lineHeight: 1.6 }}>
              Your subscription is active and verified through Dodo Payments. All operational floor modules and POS terminals are unlocked.
            </p>

            {/* Unlocked Capabilities List */}
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-text-primary) 2%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-text-primary) 6%, transparent)',
                borderRadius: '8px',
                padding: '16px 18px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
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
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}>✓</span>
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
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
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
                  color: 'var(--color-text-primary)',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
                }}
              >
                Kitchen KDS
              </a>

              <button
                onClick={() => setShowThankYouModal(false)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-tertiary)',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  border: '1px solid color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
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
            backgroundColor: 'color-mix(in srgb, var(--color-text-primary) 4%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{message}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Midday Obsidian Overview Card ───────────────────────────── */}
      <div
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
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
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            Subscription
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Basic Plan
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono, monospace)',
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)',
                color: 'var(--color-text-primary)',
                border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
                letterSpacing: '0.04em',
              }}
            >
              ● {subscriptionStatus === 'BILLING_ISSUE'
                ? 'PAYMENT DUE'
                : subscriptionStatus === 'PAUSED'
                ? 'PAUSED'
                : isPaidSubscription
                ? cancelAtPeriodEnd ? 'ENDING' : 'ACTIVE'
                : 'TRIAL'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {subscriptionStatus === 'BILLING_ISSUE'
              ? `Your last renewal payment failed. Update your card under "Manage Subscription" to keep ${restaurantName} running.`
              : !isPaidSubscription
              ? `14-day evaluation active for ${restaurantName}.`
              : cancelAtPeriodEnd && currentPeriodEnd
              ? `Cancelled — access continues until ${formatBillingDate(currentPeriodEnd)}, then won't renew.`
              : currentPeriodEnd
              ? `Renews monthly. Next charge on ${formatBillingDate(currentPeriodEnd)}.`
              : `Subscribed and active for ${restaurantName}. All modules unlocked.`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-tertiary)' }}>Rate</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
              $50
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>/mo</span>
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
              color: 'var(--color-text-primary)',
              border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {portalLoading ? 'Opening...' : isPaidSubscription ? 'Manage Subscription ↗' : 'Receipts & Details ↗'}
          </button>
        </div>
      </div>

      {testMode && (
        <div
          role="status"
          className="bz-tile"
          style={{ maxWidth: 480, margin: '0 auto 16px', padding: '14px 18px', border: '2px dashed var(--bz-accent)' }}
        >
          <strong>Test mode: no real charges.</strong> Checkout uses Dodo&apos;s test cards. Subscriptions made now stop
          counting when billing switches to live.
        </div>
      )}

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
            'Delivery Aggregator Sync (DoorDash, UberEats, UrbanPiper)',
          ]}
        />
      </div>

      {/* ── Modular Add-ons ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Modular Extensions
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            Expand floor capabilities as your operations scale.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { name: 'RestoIQ Copilot', price: '$29/mo', desc: 'Continuous telemetry & inventory suggestions', active: true },
            { name: 'Offline Handhelds', price: '$19/mo', desc: 'IndexedDB mesh sync for low connectivity', active: true },
            { name: 'Extra KDS Screen', price: '$15/mo', desc: 'Secondary expo passes or bar monitors', active: false },
            { name: 'Delivery Hub', price: 'Included', desc: 'DoorDash, UberEats & UrbanPiper sync — already on your plan', active: true },
          ].map((addon) => (
            <div
              key={addon.name}
              style={{
                padding: '16px 18px',
                borderRadius: '8px',
                background: 'var(--color-bg-card)',
                border: '1px solid color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>{addon.name}</div>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-secondary)' }}>{addon.price}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>{addon.desc}</div>
              </div>
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid color-mix(in srgb, var(--color-text-primary) 6%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  {addon.active ? 'Included' : 'Available'}
                </span>
                {!addon.active && (
                  <button
                    onClick={handleOpenPortal}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-text-primary) 10%, transparent)',
                      color: 'var(--color-text-primary)',
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
          background: 'var(--color-bg-card)',
          border: '1px solid color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>
            Promotion Code
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
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
              background: 'var(--color-bg)',
              border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
              color: 'var(--color-text-primary)',
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
              background: 'color-mix(in srgb, var(--color-text-primary) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-text-primary) 12%, transparent)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            {couponValidating ? '...' : 'Apply'}
          </button>
        </div>
        {couponStatus && (
          <div style={{ width: '100%', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {couponStatus}
          </div>
        )}
      </div>

      {/* Footer Assurance */}
      <div
        style={{
          borderTop: '1px solid color-mix(in srgb, var(--color-text-primary) 6%, transparent)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          color: 'var(--color-text-tertiary)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        <div>Card details are handled by Dodo Payments and never touch our servers.</div>
        <div>No locked contracts · Cancel anytime</div>
      </div>
    </div>
  )
}
