import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'

export const metadata = {
  title: 'Starter Plan Features | Resto AI',
  description: 'Clean, reliable, essential operations for your single-location restaurant.',
}

export default function StarterPlanPage() {
  const plan = PRICING.STARTER
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
          <span style={{ fontSize: '11px', fontWeight: 700, color: plan.color, backgroundColor: plan.color + '18', padding: '3px 10px', borderRadius: '999px', border: `0.5px solid ${plan.color}35` }}>✦ STARTER PLAN</span>
          <Link href="/dashboard" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back to Dashboard</Link>
        </div>
      </nav>

      {/* Content Container */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Current Plan Package</span>
          <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', margin: '8px 0 12px' }}>Starter Plan</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            {plan.tagline} Simple, core restaurant operations without extra noise.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', padding: '8px 20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>${plan.monthly}</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/month</span>
          </div>
        </div>

        {/* Starter Features ONLY */}
        <div style={{ backgroundColor: '#1C1C1E', borderRadius: '20px', padding: '32px', border: '0.5px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Available Features ({starterFeatures.length})</span>
            <span style={{ color: '#30D158', fontSize: '11px' }}>● Active</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {starterFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, lineHeight: 1.3 }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scale / Upgrade Link Footer */}
        <div style={{ marginTop: '36px', textAlign: 'center', padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Need AI, Loyalty or Multi-Outlet management?</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>Explore higher tier plans when your restaurant is ready to scale.</div>
          </div>
          <Link href="/pricing" style={{ height: '38px', padding: '0 18px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.14)', color: '#2563eb', fontWeight: 700, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', border: '0.5px solid rgba(37,99,235,0.3)' }}>
            Compare & Upgrade →
          </Link>
        </div>

      </div>
    </main>
  )
}
