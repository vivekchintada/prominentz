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
  isPopular?: boolean
  onSelect: (tier: PlanTier) => void
  loadingTier: PlanTier | null
}

function PlanCard({
  tier,
  title,
  price,
  description,
  features,
  isCurrent,
  isPopular,
  onSelect,
  loadingTier,
}: PlanCardProps) {
  const isLoading = loadingTier === tier

  return (
    <div
      className="card card--elevated animate-fade-in"
      style={{
        backgroundColor: isPopular ? 'var(--brand-tint)' : 'var(--color-bg-card)',
        border: isPopular ? '2px solid var(--brand)' : '1px solid var(--color-border)',
        borderRadius: '20px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: isPopular ? '0 16px 40px rgba(37,99,235,0.2)' : 'var(--shadow-md)',
      }}
    >
      {isPopular && (
        <span
          style={{
            position: 'absolute',
            top: '-12px',
            right: '24px',
            backgroundColor: 'var(--brand)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 900,
            padding: '4px 12px',
            borderRadius: '999px',
            letterSpacing: '0.04em',
            boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
          }}
        >
          RECOMMENDED FOR RESTAURANTS
        </span>
      )}

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, minHeight: '36px' }}>{description}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
        <span style={{ fontSize: '40px', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>${price}</span>
        <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>/ month</span>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '28px', flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          What&apos;s Included:
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {features.map((feat, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 900, fontSize: '14px' }}>✓</span>
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onSelect(tier)}
        disabled={isCurrent || isLoading}
        className={isCurrent ? 'btn btn--secondary' : 'btn btn--primary'}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          fontWeight: 800,
          fontSize: '14px',
          cursor: isCurrent ? 'default' : 'pointer',
        }}
      >
        {isCurrent ? '● Current Plan' : isLoading ? 'Redirecting to Stripe...' : `Upgrade to ${title}`}
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
  const [switchingDirect, setSwitchingDirect] = useState(false)

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
      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === 'true') {
        const upgradedPlan = params.get('plan') as PlanTier
        if (upgradedPlan) {
          // Immediately ensure plan is persisted in database
          fetch('/api/billing/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planTier: upgradedPlan }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success) {
                setCurrentPlan(upgradedPlan)
                setMessage(`🎉 Successfully subscribed to ${upgradedPlan === 'PRO' ? 'Professional' : 'Starter'} Plan! All features are updated.`)
                // Clean up URL without full page reload
                window.history.replaceState({}, '', window.location.pathname)
              }
            })
            .catch((e) => console.error(e))
        }
      }
    }
  }, [])

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
        alert(data.error || 'Failed to initiate Stripe checkout')
      }
    } catch (err: any) {
      alert(err?.message || 'Error connecting to billing service')
    } finally {
      setLoadingTier(null)
    }
  }

  // Instant one-click switch for development testing and direct tier activation
  const handleInstantSwitch = async (tier: PlanTier) => {
    setSwitchingDirect(true)
    try {
      const res = await fetch('/api/billing/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentPlan(tier)
        setMessage(`⚡ Successfully switched restaurant to ${tier === 'PRO' ? 'Professional' : 'Starter'} plan!`)
      } else {
        alert(data.error || 'Failed to switch plan')
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating plan')
    } finally {
      setSwitchingDirect(false)
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {message && (
        <div
          style={{
            backgroundColor: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '24px',
            color: '#10b981',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{message}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Active Subscription Overview Banner */}
      <div
        className="card card--elevated animate-fade-in"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
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
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Current Active Plan
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)' }}>
              {currentPlan === 'STARTER' ? 'Basic Plan' : 'Custom Enterprise Plan'}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 900,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              ● ACTIVE MONTHLY
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
            Automatic renewal with Stripe billing security for <strong>{restaurantName}</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Monthly Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
              ${currentPlan === 'STARTER' ? '40' : '129'}
              <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>/mo</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleOpenPortal}
              disabled={portalLoading}
              className="btn btn--secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
            >
              <span>🧾</span> {portalLoading ? 'Opening...' : 'Stripe Invoices ↗'}
            </button>
          </div>
        </div>
      </div>

      {/* Plan Details & Transparency Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', marginBottom: '40px' }}>
        {/* Active Basic Plan ($40/mo) */}
        <div
          className="card card--elevated animate-fade-in"
          style={{
            backgroundColor: 'var(--brand-tint)',
            border: '2px solid var(--brand)',
            borderRadius: '20px',
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 16px 40px rgba(37,99,235,0.2)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '-12px',
              right: '24px',
              backgroundColor: 'var(--brand)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 900,
              padding: '4px 12px',
              borderRadius: '999px',
              letterSpacing: '0.04em',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
            }}
          >
            ACTIVE PLAN · $40/MO
          </span>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>Basic Plan</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, minHeight: '36px' }}>
              Affordable, rock-solid operating foundation for restaurants, cafes, and bistros.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
            <span style={{ fontSize: '44px', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>$40</span>
            <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>/ month</span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '28px', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              What&apos;s Included in Basic Plan:
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {[
                'Point of Sale (POS) Terminal & Floor Layout',
                'Real-Time Kitchen Display System (KDS)',
                'Table & Menu QR Code Studio (Direct-to-KDS)',
                'Table Quick Status Switcher & Action Sheets',
                'Split Bill Calculator (Even N-Way & By-Seat)',
                'Table-Side Cash & Card Payment Settlement',
                'Reservations & Walk-In Waitlist Management',
                'Inventory Stock Count & Recipe Depletion Tracking',
                'Staff Accounts & Shift Timeclock',
                'End-of-Day Z-Reports & Daily Sales Analytics',
              ].map((feat, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 900, fontSize: '14px' }}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            disabled={true}
            className="btn btn--secondary"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'default',
              backgroundColor: 'rgba(91,69,245,0.15)',
              color: '#7b68f7',
              border: '1px solid rgba(91,69,245,0.3)',
            }}
          >
            ● Current Active Plan ($40/mo)
          </button>
        </div>

        {/* Not Included in Basic Plan / Future Tier Info */}
        <div
          className="card card--elevated animate-fade-in"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            opacity: 0.9,
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '3px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
                marginBottom: '10px',
              }}
            >
              NOT INCLUDED IN BASIC
            </span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              Advanced Tiers (In Development)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, minHeight: '36px' }}>
              The Pro plan is currently not ready and has been removed. The following advanced features are not part of the Basic Plan:
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '28px', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-tertiary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Features Excluded From Basic Plan:
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { name: 'RestoIQ AI Operations Agent & Intelligence', desc: 'Autonomous intelligence is not included in the Basic Plan.' },
                { name: 'Guest CRM & VIP Profiles', desc: 'Customer directory and spend rankings are not included in the Basic Plan.' },
                { name: 'Loyalty Rewards & Points Engine', desc: 'Customer loyalty point accrual and redemption are not included in the Basic Plan.' },
                { name: 'Multi-Location Outlets', desc: 'Multiple franchise branches are not included in the Basic Plan.' },
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '14px', marginTop: '1px' }}>✕</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            🔒 Pro Plan is in development. Need high-volume customizations? Contact us for Enterprise solutions.
          </div>
        </div>
      </div>


      {/* Footer Assurance */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          color: 'var(--color-text-tertiary)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔒</span>
          <span>Encrypted via Stripe 256-bit SSL infrastructure.</span>
        </div>
        <div>No contracts or hidden cancellation fees.</div>
      </div>
    </div>
  )
}
