'use client'

import { useEffect } from 'react'

export default function PosError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[POS] Error:', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg, #0D0D0F)',
        color: 'var(--color-text-primary, #F5F5F7)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 440, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ fontSize: 48 }}>🧾</div>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: 0 }}>POS Terminal Error</h2>
        <p style={{ fontSize: '0.9375rem', color: '#8E8E93', lineHeight: 1.6, margin: 0 }}>
          The terminal encountered an issue. No orders were affected.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={reset}
            style={{ height: 44, padding: '0 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--brand), var(--color-text-primary))', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Reload POS
          </button>
          <a
            href="/dashboard"
            style={{ height: 44, padding: '0 28px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#F5F5F7', fontWeight: 600, fontSize: 15, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
