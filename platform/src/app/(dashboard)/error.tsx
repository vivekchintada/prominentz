'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard] Error:', error)
  }, [error])

  return (
    <main className="main-content">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: 'var(--space-8)',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255, 69, 58, 0.12)',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Dashboard Error</h2>
          <p className="text-secondary text-sm">
            Something went wrong loading this section. Your data is safe.
          </p>
          {error.digest && (
            <code className="text-xs font-mono" style={{ color: 'var(--color-text-tertiary)', background: 'rgba(255,255,255,0.04)', padding: '4px 12px', borderRadius: 6 }}>
              {error.digest}
            </code>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={reset} className="btn btn--primary">Try Again</button>
            <a href="/dashboard" className="btn btn--secondary">Reload Dashboard</a>
          </div>
        </div>
      </div>
    </main>
  )
}
