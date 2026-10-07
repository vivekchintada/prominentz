import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata = {
  title: 'Pro Plan Features | Resto',
  description: 'AI intelligence, customer loyalty, table QR ordering and growth tools for scaling restaurants.',
}

export default function ProPlanPage() {
  const plan = PRICING.PRO
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
            ✦ PRO PLAN
          </span>
          <Link href="/dashboard" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Content Container */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Advanced Package</span>
          <h1 style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 12px' }}>Pro Plan</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            {plan.tagline}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', padding: '8px 20px', borderRadius: '8px', backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono, monospace)' }}>${plan.monthly}</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/month</span>
          </div>
        </div>

        {/* Pro Exclusive Features */}
        <div style={{ backgroundColor: '#0c0c0e', borderRadius: '12px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>✦ Pro Intelligence & Growth Suite ({proFeatures.length})</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>In Development</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {proFeatures.map((f, i) => (
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

        {/* Included Core Foundation */}
        <div style={{ backgroundColor: '#0c0c0e', borderRadius: '12px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            ✓ Includes Core Restaurant Foundation ({starterFeatures.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {starterFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: '#22c55e' }}>✓</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade Footer */}
        <div style={{ marginTop: '36px', textAlign: 'center', padding: '24px', backgroundColor: '#0c0c0e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>Need multi-location franchise management?</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Check out Enterprise tier for store leaderboards and multi-unit controls.</div>
          </div>
          <Link href="/pricing" style={{ height: '36px', padding: '0 16px', borderRadius: '6px', backgroundColor: '#ffffff', color: '#000000', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            Compare & Upgrade →
          </Link>
        </div>
      </div>
    </main>
  )
}
