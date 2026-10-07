import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata = {
  title: 'Basic Plan Features | Resto',
  description: 'Clean, reliable, essential operations for your restaurant. $40/month.',
}

export default function StarterPlanPage() {
  const plan = PRICING.STARTER
  const starterFeatures = PLAN_FEATURES.STARTER

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'var(--font-sans)', color: '#ffffff', letterSpacing: '-0.01em' }}>
      {/* Nav Header */}
      <nav style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.88)' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ProminentzLogo size="sm" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ✦ BASIC PLAN
          </span>
          <Link href="/dashboard" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Content Container */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Foundation Plan</span>
          <h1 style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 12px' }}>Basic Plan</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            {plan.tagline} Simple, core restaurant operations without extra noise.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', padding: '8px 20px', borderRadius: '8px', backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono, monospace)' }}>${plan.monthly}</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/month</span>
          </div>
        </div>

        {/* Feature List */}
        <div style={{ backgroundColor: '#0c0c0e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '32px', marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>
            Included Capabilities:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {starterFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 700 }}>✓</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>{f.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Link */}
        <div style={{ textAlign: 'center' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Go to Active Workspace →
          </Link>
        </div>
      </div>
    </main>
  )
}
