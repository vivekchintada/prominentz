'use client'

import { useEffect } from 'react'

export default function KdsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[KDS] Error:', error)
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
        <div style={{ fontSize: 48 }}>🍳</div>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: 0 }}>Kitchen Display Error</h2>
        <p style={{ fontSize: '0.9375rem', color: '#8E8E93', lineHeight: 1.6, margin: 0 }}>
          The kitchen monitor hit an issue. Ticket data is safe — please reload.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={reset}
            style={{ height: 44, padding: '0 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #5b45f5, #7b68f7)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Reload KDS
          </button>
        </div>
      </div>
    </div>
  )
}
