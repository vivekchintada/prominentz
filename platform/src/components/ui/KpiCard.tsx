'use client'

import React, { useEffect, useRef, useState } from 'react'

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

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return count
}

export default function KpiCard({
  label,
  value,
  numericValue,
  icon,
  accent = '#2563eb',
  change,
  changeType = 'neutral',
  live = false,
  prefix = '',
  suffix = '',
}: KpiCardProps) {
  const animated = useCountUp(numericValue ?? 0)
  const displayValue = numericValue !== undefined
    ? `${prefix}${animated.toLocaleString()}${suffix}`
    : value

  const changeColor =
    changeType === 'positive' ? '#30D158' :
    changeType === 'negative' ? '#FF453A' :
    'rgba(255,255,255,0.4)'

  const changeArrow = changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : ''

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-5)',
        boxShadow: 'inset 0 0 0 0.5px var(--color-border)',
        borderTop: `3px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = `var(--shadow-md), inset 0 0 0 0.5px var(--color-border-strong), 0 0 0 1px ${accent}22`
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = ''
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'inset 0 0 0 0.5px var(--color-border)'
      }}
    >
      {/* Subtle accent glow in top-right corner */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

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
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          fontSize: 15,
        }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 'var(--text-3xl)',
        fontWeight: 800,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}>
        {displayValue}
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
  )
}
