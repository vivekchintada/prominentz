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
        backgroundColor: isPopular ? 'rgba(91, 69, 245, 0.05)' : 'var(--color-bg-card)',
        border: isPopular ? '2px solid #5b45f5' : '1px solid var(--color-border)',
        borderRadius: '20px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: isPopular ? '0 16px 40px rgba(91, 69, 245, 0.18)' : 'var(--shadow-md)',
      }}
    >
      {isPopular && (
        <span
          style={{
            position: 'absolute',
            top: '-12px',
            right: '24px',
            backgroundColor: '#5b45f5',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 900,
            padding: '4px 12px',
            borderRadius: '999px',
            letterSpacing: '0.04em',
            boxShadow: '0 4px 14px rgba(91, 69, 245, 0.4)',
          }}
        >
          ★ POPULAR
        </span>
      )}

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
          {title}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, minHeight: '36px' }}>
          {description}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
        <span style={{ fontSize: '44px', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
          ${price}
        </span>
        <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>/ month</span>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '28px', flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          What&apos;s Included:
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {features.map((feat, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
              <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '14px' }}>✓</span>
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onSelect(tier)}
        disabled={isCurrent || isLoading}
        className={isPopular ? 'btn btn--primary' : 'btn btn--secondary'}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          fontWeight: 800,
          fontSize: '14px',
          cursor: isCurrent ? 'default' : 'pointer',
        }}
      >
        {isLoading
          ? 'Connecting Gateway...'
          : isCurrent
          ? `● Current Active Plan ($${price}/mo)`
          : tier === 'PRO'
          ? `Upgrade to Professional ($${price}/mo)`
          : `Switch to Starter ($${price}/mo)`}
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
        const upgradedPlan = (params.get('plan') as PlanTier) || 'PRO'
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
              window.history.replaceState({}, '', window.location.pathname)
            }
          })
          .catch((e) => console.error(e))
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
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
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
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '4px',
            }}
          >
            Current Active Plan
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)' }}>
              {currentPlan === 'STARTER' ? 'Starter Plan' : 'Professional Plan (All Features)'}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Monthly Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
              ${currentPlan === 'STARTER' ? '49' : '129'}
              <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>/mo</span>
            </div>
          </div>

          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="btn btn--secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 700 }}
          >
            <span>🧾</span> {portalLoading ? 'Opening Portal...' : 'Stripe Invoices & Cards ↗'}
          </button>
        </div>
      </div>

      {/* 2-Tier Pricing Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '40px' }}>
        <PlanCard
          tier="STARTER"
          title="Starter Plan"
          price={49}
          description="Everything single-location restaurants and cafes need for day-to-day operations."
          isCurrent={currentPlan === 'STARTER'}
          onSelect={handleSubscribe}
          loadingTier={loadingTier}
          features={[
            '1 Single Location',
            'Full POS Terminal & Order Entry',
            'Thermal Receipt & Kitchen Printer Integration (USB, LAN & Bluetooth)',
            'Real-Time Kitchen Display System (KDS)',
            'Table & Menu QR Code Studio (Direct-to-KDS)',
            'Up to 5 Staff User Accounts',
            'End-of-Day Z-Reports & Daily Sales Analytics',
            'Reservations & Walk-In Waitlist',
          ]}
        />

        <PlanCard
          tier="PRO"
          title="Professional Plan"
          price={129}
          description="The complete high-performance restaurant suite with QR ordering, CRM, and AI."
          isCurrent={currentPlan === 'PRO' || currentPlan === 'ENTERPRISE'}
          isPopular={true}
          onSelect={handleSubscribe}
          loadingTier={loadingTier}
          features={[
            'Multi-Location Switching & Outlets',
            'Automated Self-Service Kiosk & Direct-to-Printer Hub',
            'Table & Food Menu QR Code Studio (Direct-to-KDS)',
            'Guest CRM & Automatic Loyalty Accrual',
            'Recipe Costing & Real-time Inventory Depletion',
            'UrbanPiper Aggregators (Zomato / Swiggy / DoorDash)',
            'Deputy HR Staff Shift Scheduling & Timeclock',
            'RestoIQ AI Conversational Analytics',
            'POS Seat-by-Seat Split Checks & ESC/POS Printing',
          ]}
        />
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
