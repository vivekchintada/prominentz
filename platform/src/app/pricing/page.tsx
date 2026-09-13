import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'

export const metadata = {
  title: 'Pricing | Resto AI',
  description: 'Simple, transparent pricing for restaurants. Choose Starter or Professional.',
}

const CHECK = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="8" fill="rgba(16,185,129,0.16)" />
    <path d="M5 8l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CROSS = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="8" fill="rgba(255,255,255,0.06)" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function PricingPage() {
  const plans = [
    { tier: 'STARTER' as const, href: '/pricing/starter' },
    { tier: 'PRO' as const,     href: '/pricing/pro' },
  ]

  // All features for comparison table
  const allFeatures = [
    { label: 'POS + Kitchen Display Screen (KDS)', starter: true, pro: true },
    { label: 'Menu Management & Modifiers', starter: true, pro: true },
    { label: 'Inventory Management & Stock Count', starter: true, pro: true },
    { label: 'Staff Management & Clock-In (Up to 5)', starter: true, pro: true },
    { label: 'Reservations & Walk-in Waitlist', starter: true, pro: true },
    { label: 'End-of-Day Z-Reports & Cash Reconciliation', starter: true, pro: true },
    { label: 'Cash, Card, Split & QR Payments', starter: true, pro: true },
    { label: 'Table & Food Menu QR Code Studio (Direct-to-KDS)', starter: false, pro: true },
    { label: 'Guest CRM & VIP Guest Intelligence', starter: false, pro: true },
    { label: 'Automatic Loyalty Points & Rewards Engine', starter: false, pro: true },
    { label: 'Multi-Location Switching & Outlets', starter: false, pro: true },
    { label: 'UrbanPiper Aggregators (Zomato / Swiggy / DoorDash)', starter: false, pro: true },
    { label: 'Deputy HR Shift Scheduling & Labor Cost %', starter: false, pro: true },
    { label: 'RestoIQ AI Conversational Analytics', starter: false, pro: true },
    { label: 'ESC/POS Direct Network Thermal Printing', starter: false, pro: true },
  ]

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0A0A0B', fontFamily: '-apple-system, Inter, sans-serif', color: 'rgba(255,255,255,0.92)' }}>
      {/* Nav */}
      <nav style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.04em' }}>Resto</span>
          <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563eb', backgroundColor: 'rgba(37,99,235,0.12)', border: '0.5px solid rgba(37,99,235,0.3)', padding: '2px 6px', borderRadius: '5px', letterSpacing: '0.06em' }}>AI</span>
        </Link>
        <Link href="/login" className="btn btn--primary" style={{ height: '34px', padding: '0 20px', fontSize: '13px', textDecoration: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          Sign In →
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '999px', backgroundColor: 'rgba(37,99,235,0.10)', border: '0.5px solid rgba(37,99,235,0.25)', fontSize: '12px', fontWeight: 700, color: '#2563eb', marginBottom: '20px' }}>
          ✦ Clear, transparent pricing
        </div>
        <h1 style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>
          Everything your restaurant needs.<br />
          <span style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Two simple, powerful plans.</span>
        </h1>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.5)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
          Run your restaurant smoothly with Starter, or unlock the complete AI &amp; multi-outlet digital suite with Professional.
        </p>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', maxWidth: '860px', margin: '0 auto', padding: '0 24px 64px' }}>
        {plans.map(({ tier, href }) => {
          const plan = PRICING[tier]
          const features = PLAN_FEATURES[tier]
          const isPro = tier === 'PRO'
          return (
            <div key={tier} style={{
              backgroundColor: isPro ? 'rgba(37,99,235,0.08)' : '#18181d',
              borderRadius: '24px',
              padding: '36px 30px',
              border: isPro ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.08)',
              position: 'relative',
              boxShadow: isPro ? '0 16px 40px rgba(37,99,235,0.22)' : '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 14px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                  ✦ {plan.badge}
                </div>
              )}
              <div style={{ fontSize: '13px', fontWeight: 800, color: isPro ? '#2563eb' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                {plan.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'monospace' }}>${plan.monthly}</span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>/mo</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Billed monthly · ${plan.annual}/yr (save 2 months)</div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '24px', lineHeight: 1.5, minHeight: '40px' }}>{plan.tagline}</p>

              <Link href={href} style={{
                display: 'block',
                textAlign: 'center',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: isPro ? '#2563eb' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '14px',
                textDecoration: 'none',
                marginBottom: '28px',
                boxShadow: isPro ? '0 6px 20px rgba(37,99,235,0.35)' : 'none',
                transition: 'all 150ms ease',
              }}>
                Get Started with {plan.label} →
              </Link>

              {/* Included features */}
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                {tier === 'STARTER' ? 'Included in Starter:' : 'Everything in Starter, plus:'}
              </div>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '15px' }}>{f.icon}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{f.label}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Comparison Table */}
      <div style={{ maxWidth: '860px', margin: '0 auto 80px', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '28px' }}>Full feature comparison</h2>
        <div style={{ backgroundColor: '#18181d', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#121216' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '12px' }}>Feature</th>
                {plans.map(({ tier }) => (
                  <th key={tier} style={{ padding: '16px 20px', textAlign: 'center', color: tier === 'PRO' ? '#2563eb' : '#9ca3af', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {PRICING[tier].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ padding: '12px 20px', color: 'rgba(255,255,255,0.75)' }}>{row.label}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center' }}>{row.starter ? <CHECK /> : <CROSS />}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center' }}>{row.pro ? <CHECK /> : <CROSS />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
