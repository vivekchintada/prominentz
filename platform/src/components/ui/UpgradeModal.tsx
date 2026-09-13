'use client'

import React, { useEffect } from 'react'
import { PlanTier, PRICING, getUpgradeFeatures, getUpgradeMessage } from '@/lib/pricing'

interface UpgradeModalProps {
  requiredTier: PlanTier
  featureName: string
  currentPlan?: PlanTier
  onClose: () => void
}

export function UpgradeModal({ requiredTier, featureName, currentPlan = 'STARTER', onClose }: UpgradeModalProps) {
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
          backgroundColor: '#1C1C1E',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 32px 64px rgba(0,0,0,0.8), inset 0 0 0 0.5px rgba(255,255,255,0.10)',
          overflow: 'hidden',
          animation: 'slideInBottom 220ms cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Gradient Header */}
        <div style={{
          background: `linear-gradient(135deg, ${required.color}28 0%, ${required.color}10 100%)`,
          borderBottom: `0.5px solid ${required.color}30`,
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
              fontWeight: 800,
              backgroundColor: required.color + '22',
              color: required.color,
              border: `0.5px solid ${required.color}44`,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              🔒 {required.label} Feature
            </span>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>
            Unlock {featureName}
          </h2>

          {/* Current → Required pricing callout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '10px',
            padding: '10px 14px',
            backgroundColor: 'rgba(0,0,0,0.30)',
            borderRadius: '10px',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{from}</span>
            <span style={{ color: required.color, fontSize: '14px' }}>→</span>
            <span style={{ fontSize: '13px', color: required.color, fontWeight: 700 }}>{to}</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
              +${delta}/mo
            </span>
          </div>
        </div>

        {/* Features gained */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            What you unlock on {required.label}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {upgradeFeatures.map((feature: { icon: string; label: string }, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  backgroundColor: required.color + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  flexShrink: 0,
                }}>
                  {feature.icon}
                </span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>{feature.label}</span>
                {i === 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: required.color, backgroundColor: required.color + '18', padding: '2px 6px', borderRadius: '4px' }}>
                    JUST TRIED
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Annual savings callout */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(48,209,88,0.08)',
            border: '0.5px solid rgba(48,209,88,0.2)',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>💡</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.4 }}>
              Switch to annual billing and <strong style={{ color: '#30D158' }}>save ${savings}</strong> — 2 months free.
            </span>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                height: '44px',
                background: `linear-gradient(135deg, ${required.color} 0%, ${required.color}CC 100%)`,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                boxShadow: `0 4px 16px ${required.color}40`,
                transition: 'all 150ms ease',
              }}
            >
              ⬆ Upgrade to {required.label} — ${required.monthly}/mo
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                height: '36px',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.35)',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
