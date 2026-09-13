'use client'

import React, { useState, useEffect } from 'react'

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down'
  latencyMs: number
  detail?: string
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: Record<string, HealthCheck>
}

const SERVICE_LABELS: Record<string, string> = {
  database: 'PostgreSQL Database',
  redis: 'Redis (SSE Pub-Sub)',
  auth: 'NextAuth Authentication',
  stripe: 'Stripe Payments',
  email: 'Resend Email Service',
}

interface SystemStatusModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SystemStatusModal({ isOpen, onClose }: SystemStatusModalProps) {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/health')
      const data = await res.json().catch(() => null)
      if (data) setHealth(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchHealth()
      const interval = setInterval(fetchHealth, 10000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isHealthy = health?.status === 'healthy'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '0.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isHealthy ? 'rgba(48,209,88,0.06)' : 'rgba(255,69,58,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 24 }}>{isHealthy ? '🟢' : '⚠️'}</span>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0 }}>
                System Infrastructure Status
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                {loading ? 'Checking subsystems...' : `Overall Status: ${health?.status?.toUpperCase() ?? 'UNKNOWN'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-tertiary)',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Subsystems List */}
        <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading && !health ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : (
            Object.entries(health?.checks ?? {}).map(([key, check]) => {
              const ok = check.status === 'ok'
              const color = ok ? '#30D158' : check.status === 'degraded' ? '#FF9F0A' : '#FF453A'
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-bg-raised)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                        {SERVICE_LABELS[key] ?? key}
                      </div>
                      {check.detail && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                          {check.detail}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {check.status}
                    </span>
                    {check.latencyMs > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {check.latencyMs}ms
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '0.5px solid var(--color-border)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <span>Server Uptime: {Math.floor((health?.uptime ?? 0) / 60)} mins</span>
          <button
            onClick={fetchHealth}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            ↻ Re-check Diagnostics
          </button>
        </div>
      </div>
    </div>
  )
}
