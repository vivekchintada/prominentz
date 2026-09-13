'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Resto AI] Unhandled error:', error)
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
      <div
        style={{
          maxWidth: 480,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255, 69, 58, 0.12)',
            border: '1px solid rgba(255, 69, 58, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary, #8E8E93)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          An unexpected error occurred. This has been logged automatically.
          Please try again or contact support if the issue persists.
        </p>

        {error.digest && (
          <code
            style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary, #636366)',
              background: 'rgba(255,255,255,0.04)',
              padding: '4px 12px',
              borderRadius: 6,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Error ID: {error.digest}
          </code>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={reset}
            style={{
              height: 40,
              padding: '0 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(37,99,235,0.3)',
            }}
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            style={{
              height: 40,
              padding: '0 24px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--color-text-primary, #F5F5F7)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
