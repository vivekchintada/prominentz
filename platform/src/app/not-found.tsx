import Link from 'next/link'

export default function NotFound() {
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
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--color-text-primary, #171717)',
            lineHeight: 1,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '1.375rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
            color: 'var(--color-text-primary, #171717)',
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary, #595959)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Link
            href="/dashboard"
            style={{
              height: 40,
              padding: '0 24px',
              borderRadius: 8,
              border: '1px solid #18181B',
              background: '#18181B',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
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
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
