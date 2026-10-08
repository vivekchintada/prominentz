'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlanTier, PRICING, getUpgradeFeatures, getUpgradeMessage } from '@/lib/pricing'

interface UpgradeModalProps {
  requiredTier: PlanTier
  featureName: string
  currentPlan?: PlanTier
  onClose: () => void
}

export function UpgradeModal({ requiredTier, featureName, currentPlan = 'STARTER', onClose }: UpgradeModalProps) {
  const router = useRouter()
  const required = PRICING[requiredTier]
  const upgradeFeatures = getUpgradeFeatures(currentPlan, requiredTier)
  const { from, to, delta, savings } = getUpgradeMessage(currentPlan, requiredTier)

  // Pricing memory — remember last locked feature the customer tried to access
  useEffect(() => {
    try {
      sessionStorage.setItem('resto_last_locked_feature', featureName)
      sessionStorage.setItem('resto_last_locked_tier', requiredTier)
    } catch {}
  }, [featureName, requiredTier])

  const handleUpgradeClick = () => {
    onClose()
    router.push('/dashboard/settings/billing')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 180ms ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          animation: 'slideInBottom 220ms cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--color-border)',
          padding: '24px 24px 20px',
        }}>
          {/* Tier badge */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'rgba(239,68,68,0.12)',
              color: '#ef4444',
              border: '0.5px solid rgba(239,68,68,0.25)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              🔒 Not in Basic Plan
            </span>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
            {featureName}
          </h2>

          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Intelligence, Guest CRM, and Loyalty Rewards are not included in the $40/mo Basic Plan. These features will launch in upcoming advanced tiers.
          </p>
        </div>

        {/* Features list */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Features Not Included in Basic Plan:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {[
              { icon: '🧠', label: 'RestoIQ AI Operations Agent & Intelligence' },
              { icon: '👥', label: 'Guest CRM & VIP Dining Histories' },
              { icon: '⭐', label: 'Automatic Loyalty Points & Rewards Engine' },
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0,
                }}>
                  {feature.icon}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{feature.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: '4px' }}>
                  COMING SOON
                </span>
              </div>
            ))}
          </div>

          {/* Basic plan reminder */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>ℹ️</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Your <strong style={{ color: 'var(--color-text-primary)' }}>Basic Plan ($40/mo)</strong> covers complete POS, KDS, Floor Tables, QR Studio, and Sales Reports.
            </span>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleUpgradeClick}
              className="btn btn--primary btn--full"
              style={{ height: '40px', fontSize: '13px' }}
            >
              View Basic Plan Details ($40/mo)
            </button>
            <button
              onClick={onClose}
              className="btn btn--ghost btn--full"
              style={{ height: '36px', fontSize: '13px' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
