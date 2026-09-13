import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'

export const metadata = {
  title: 'Pro Plan Features | Resto AI',
  description: 'AI intelligence, customer loyalty, table QR ordering and growth tools for scaling restaurants.',
}

export default function ProPlanPage() {
  const plan = PRICING.PRO
  const proFeatures = PLAN_FEATURES.PRO
  const starterFeatures = PLAN_FEATURES.STARTER

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0A0A0B', fontFamily: '-apple-system, Inter, sans-serif', color: 'rgba(255,255,255,0.92)' }}>

      {/* Nav Header */}
      <nav style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(10,10,11,0.88)' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.04em' }}>Resto</span>
          <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563eb', backgroundColor: 'rgba(37,99,235,0.12)', border: '0.5px solid rgba(37,99,235,0.3)', padding: '2px 6px', borderRadius: '5px', letterSpacing: '0.06em' }}>AI</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: plan.color, backgroundColor: plan.color + '18', padding: '3px 10px', borderRadius: '999px', border: `0.5px solid ${plan.color}35` }}>✦ PRO PLAN</span>
          <Link href="/dashboard" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back to Dashboard</Link>
        </div>
      </nav>

      {/* Content Container */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Most Popular Package</span>
          <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', margin: '8px 0 12px' }}>Pro Plan</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            {plan.tagline}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', padding: '8px 20px', borderRadius: '12px', backgroundColor: 'rgba(139,92,246,0.10)', border: '0.5px solid rgba(139,92,246,0.25)' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6', letterSpacing: '-0.03em' }}>${plan.monthly}</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/month</span>
          </div>
        </div>

        {/* Pro Exclusive Features */}
        <div style={{ backgroundColor: 'rgba(139,92,246,0.06)', borderRadius: '20px', padding: '32px', border: '0.5px solid rgba(139,92,246,0.20)', marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>✦ Pro Intelligence & Growth Suite ({proFeatures.length})</span>
            <span style={{ color: '#30D158', fontSize: '11px' }}>● Active</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {proFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '0.5px solid rgba(139,92,246,0.15)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.90)', fontWeight: 600, lineHeight: 1.3 }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Included Core Foundation */}
        <div style={{ backgroundColor: '#1C1C1E', borderRadius: '20px', padding: '28px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            ✓ Includes Core Restaurant Foundation ({starterFeatures.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {starterFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px' }}>{f.icon}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade Footer */}
        <div style={{ marginTop: '36px', textAlign: 'center', padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Need multi-location franchise management?</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>Check out Enterprise tier for store leaderboards and multi-unit controls.</div>
          </div>
          <Link href="/pricing" style={{ height: '38px', padding: '0 18px', borderRadius: '10px', backgroundColor: 'rgba(139,92,246,0.18)', color: '#8b5cf6', fontWeight: 700, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', border: '0.5px solid rgba(139,92,246,0.35)' }}>
            Compare & Upgrade →
          </Link>
        </div>

      </div>
    </main>
  )
}
