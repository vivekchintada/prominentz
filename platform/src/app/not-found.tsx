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
            fontWeight: 900,
            letterSpacing: '-0.06em',
            background: 'linear-gradient(135deg, #7b68f7 0%, #5b45f5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '1.375rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary, #8E8E93)',
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
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #5b45f5 0%, #7b68f7 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 12px rgba(91,69,245,0.3)',
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
