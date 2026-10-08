'use client'

import React from 'react'
import { AnimatedNumber, InView } from '@/components/motion'

interface KpiCardProps {
  label: string
  value: string | number
  /** Raw numeric value for animated count-up. If omitted, value is shown as-is */
  numericValue?: number
  icon: React.ReactNode
  /** Color of top accent bar and icon bg */
  accent?: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  /** Show a live pulsing dot */
  live?: boolean
  prefix?: string
  suffix?: string
}

export default function KpiCard({
  label,
  value,
  numericValue,
  icon,
  accent = '#18181b',
  change,
  changeType = 'neutral',
  live = false,
  prefix = '',
  suffix = '',
}: KpiCardProps) {
  const changeColor =
    changeType === 'positive' ? '#30D158' :
    changeType === 'negative' ? '#FF453A' :
    'rgba(255,255,255,0.4)'

  const changeArrow = changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : ''

  return (
    <InView
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        visible: { opacity: 1, y: 0, scale: 1 },
      }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-strong)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = ''
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)'
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {live && (
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#30D158',
                boxShadow: '0 0 6px #30D158',
                flexShrink: 0,
                animation: 'kpi-live-pulse 2s infinite',
              }} />
            )}
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {label}
            </span>
          </div>

          {/* Icon pill */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-raised)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-primary)',
            fontSize: 15,
          }}>
            {icon}
          </div>
        </div>

        {/* Value — use AnimatedNumber for numeric values */}
        <div style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}>
          {numericValue !== undefined ? (
            <AnimatedNumber
              value={numericValue}
              prefix={prefix}
              suffix={suffix}
              springOptions={{ bounce: 0, duration: 900 }}
            />
          ) : value}
        </div>

        {/* Change indicator */}
        {change && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: changeColor,
          }}>
            {changeArrow && <span>{changeArrow}</span>}
            <span>{change}</span>
          </div>
        )}
      </div>
    </InView>
  )
}
