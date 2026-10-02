import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'
import { CookieSettingsButton } from '@/components/ui/CookieSettingsButton'

export const metadata = {
  title: 'Pricing | Prominentz - Basic Plan $40/mo',
  description: 'Affordable, rock-solid restaurant operations system. Starting at just $40/month.',
}

const CHECK = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="8" fill="rgba(16,185,129,0.16)" />
    <path d="M5 8l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CROSS = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="8" fill="rgba(239,68,68,0.12)" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function PricingPage() {
  const plan = PRICING.STARTER
  const features = PLAN_FEATURES.STARTER

  // Comparison items with clear exclusions
  const featureMatrix = [
    { label: 'Point of Sale (POS) & Order Entry', included: true },
    { label: 'Real-Time Kitchen Display System (KDS)', included: true },
    { label: 'Table & Food Menu QR Code Studio (Direct-to-KDS)', included: true },
    { label: 'Table Status Quick Switcher & Action Sheets', included: true },
    { label: 'Split Bill Calculator (Even N-Way & By Seat)', included: true },
    { label: 'Table-Side Cash & Card Payment Settlement', included: true },
    { label: 'Inventory Stock Count & Recipe Depletion', included: true },
    { label: 'Staff Management & Clock-In/Clock-Out', included: true },
    { label: 'Reservations & Walk-In Waitlist', included: true },
    { label: 'End-of-Day Z-Reports & Daily Sales Analytics', included: true },
    { label: 'RestoIQ AI Autonomous Operations Agent & Intelligence', included: false, note: 'Not in Basic (In Development)' },
    { label: 'Guest CRM & VIP Spend Intelligence', included: false, note: 'Not in Basic (In Development)' },
    { label: 'Automatic Loyalty Points & Customer Rewards Engine', included: false, note: 'Not in Basic (In Development)' },
    { label: 'Multi-Location Outlets & Aggregator Integrations', included: false, note: 'Not in Basic (In Development)' },
  ]

  return (
    <main id="main-content" style={{ minHeight: '100vh', backgroundColor: '#0A0A0B', fontFamily: '-apple-system, Inter, sans-serif', color: 'rgba(255,255,255,0.92)' }}>
      {/* Nav */}
      <nav style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, background: 'linear-gradient(135deg, #7b68f7, #5b45f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.04em' }}>Prominentz</span>
          <span style={{ fontSize: '9px', fontWeight: 800, color: '#5b45f5', backgroundColor: 'rgba(91,69,245,0.12)', border: '0.5px solid rgba(91,69,245,0.3)', padding: '2px 6px', borderRadius: '5px', letterSpacing: '0.06em' }}>OS</span>
        </Link>
        <Link href="/login" className="btn btn--primary" style={{ height: '34px', padding: '0 20px', fontSize: '13px', textDecoration: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #5b45f5, #7b68f7)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          Sign In →
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 24px 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '999px', backgroundColor: 'rgba(37,99,235,0.10)', border: '0.5px solid rgba(37,99,235,0.25)', fontSize: '12px', fontWeight: 700, color: '#7b68f7', marginBottom: '20px' }}>
          ✦ Clear, affordable restaurant pricing
        </div>
        <h1 style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.15 }}>
          Everything your restaurant needs.<br />
          <span style={{ background: 'linear-gradient(135deg, #7b68f7, #5b45f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Starting at just $40/month.
          </span>
        </h1>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.5)', maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
          Run your restaurant smoothly with the Basic Plan: POS, KDS, Floor tables, QR ordering, Staff, and Reports.
        </p>
      </div>

      {/* Plan Card (Focused Single Card) */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{
          backgroundColor: '#18181d',
          borderRadius: '24px',
          padding: '40px 36px',
          border: '2px solid #5b45f5',
          position: 'relative',
          boxShadow: '0 20px 50px rgba(37,99,235,0.25)',
        }}>
          <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#5b45f5', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 16px', borderRadius: '999px', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
            ✦ {plan.badge}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#7b68f7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                {plan.label}
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: '380px', lineHeight: 1.5 }}>
                {plan.tagline}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '52px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'monospace' }}>${plan.monthly}</span>
                <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>/mo</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Billed monthly · ${plan.annual}/yr</div>
            </div>
          </div>

          <Link
            href="/login"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#5b45f5',
              color: '#fff',
              fontWeight: 800,
              fontSize: '15px',
              textDecoration: 'none',
              marginBottom: '32px',
              boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
              transition: 'all 150ms ease',
            }}
          >
            Get Started with Basic Plan ($40/mo) →
          </Link>

          {/* Included Features */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Included in Basic Plan:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px' }}>{f.icon}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Excluded notice */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              ✕ Not Included in Basic Plan:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>• RestoIQ AI Operations Agent &amp; Conversational Intelligence</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>• Guest CRM &amp; VIP Dining Spend Intelligence</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>• Automatic Customer Loyalty Points &amp; Rewards Engine</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Breakdown Table */}
      <div style={{ maxWidth: '860px', margin: '0 auto 80px', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '28px' }}>
          Detailed Feature Availability
        </h2>
        <div style={{ backgroundColor: '#18181d', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#121216' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '12px' }}>Feature Capability</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', color: '#7b68f7', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Basic Plan ($40/mo)
                </th>
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.85)' }}>
                    <div>{row.label}</div>
                    {row.note && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>{row.note}</div>}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {row.included ? <CHECK /> : <CROSS />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '28px 40px', backgroundColor: '#121216' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
          <div>© 2026 Prominentz Inc. All rights reserved.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
            <CookieSettingsButton />
            <Link href="/login" style={{ color: '#7b68f7', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}


