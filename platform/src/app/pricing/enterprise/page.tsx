import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata = {
  title: 'Enterprise Plan Features | Resto',
  description: 'Multi-location franchise management, store leaderboards, and dedicated SLA support.',
}

export default function EnterprisePlanPage() {
  const plan = PRICING.ENTERPRISE
  const enterpriseFeatures = PLAN_FEATURES.ENTERPRISE
  const proFeatures = PLAN_FEATURES.PRO
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
            ✦ ENTERPRISE PLAN
          </span>
          <Link href="/dashboard" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Content Container */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Multi-Store Solution</span>
          <h1 style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 12px' }}>Enterprise Plan</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            {plan.tagline} Complete multi-location control and custom reporting.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', padding: '8px 20px', borderRadius: '8px', backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono, monospace)' }}>${plan.monthly}</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/month</span>
          </div>
        </div>

        {/* Enterprise Exclusive Features */}
        <div style={{ backgroundColor: '#0c0c0e', borderRadius: '12px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>✦ Multi-Location & Franchise Suite ({enterpriseFeatures.length})</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>In Development</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {enterpriseFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: '#111114', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 500, lineHeight: 1.3 }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Foundation */}
        <div style={{ backgroundColor: '#0c0c0e', borderRadius: '12px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            ✓ Includes Pro Features ({proFeatures.length}) &amp; Core Foundation ({starterFeatures.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {proFeatures.concat(starterFeatures.slice(0, 4)).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: '#22c55e' }}>✓</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '36px', textAlign: 'center' }}>
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
            Return to Dashboard →
          </Link>
        </div>
      </div>
    </main>
  )
}
