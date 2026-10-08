'use client'

import React from 'react'
import Link from 'next/link'

interface PlanGateCardProps {
  title: string
  description: string
  badge?: string
  features?: string[]
}

export function PlanGateCard({
  title,
  description,
  badge = 'Not Included in Basic Plan',
  features = [
    'Resto IQ Autonomous Operations Agent',
    'Real-time Multi-Location Outlets & Switching',
    'Guest CRM & Customer Spend Profiles',
    'Automated Loyalty Points & Rewards Engine',
    'Aggregator Menu Syncing & Delivery Recon',
  ],
}: PlanGateCardProps) {
  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '40px auto',
        padding: '40px 32px',
        borderRadius: '16px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          background: 'var(--color-bg-raised, #F0F0EE)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          margin: '0 auto 20px',
        }}
      >
        🔒
      </div>

      <span
        style={{
          display: 'inline-block',
          fontSize: '11px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '4px 12px',
          borderRadius: '999px',
          backgroundColor: 'rgba(239,68,68,0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.25)',
          marginBottom: '16px',
        }}
      >
        {badge}
      </span>

      <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>
        {title}
      </h2>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          maxWidth: '520px',
          margin: '0 auto 28px',
          lineHeight: '1.6',
        }}
      >
        {description || 'This feature (Intelligence, Guest CRM, and Loyalty Rewards) is not included in the $40/mo Basic Plan and will be made available in future advanced tiers.'}
      </p>

      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '20px 24px',
          textAlign: 'left',
          marginBottom: '32px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
          Excluded from Basic Plan (In Development for Future Tiers):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
          {features.map((feat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <span style={{ color: '#ef4444', fontWeight: 900 }}>✕</span>
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/dashboard"
          className="btn btn--primary"
          style={{
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: 800,
            borderRadius: '12px',
            textDecoration: 'none',
          }}
        >
          ← Back to Dashboard
        </Link>
        <Link
          href="/dashboard/settings/billing"
          className="btn btn--secondary"
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '12px',
            textDecoration: 'none',
          }}
        >
          View Basic Plan ($40/mo)
        </Link>
      </div>
    </div>
  )
}
