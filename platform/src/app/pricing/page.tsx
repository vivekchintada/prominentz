import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'
import { CookieSettingsButton } from '@/components/ui/CookieSettingsButton'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata = {
  title: 'Pricing | Resto — Transparent Restaurant Intelligence',
  description: 'Simple, predictable restaurant operations system. Built for modern hospitality teams. Starting at $40/month.',
}

const CHECK = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7.5" stroke="rgba(255,255,255,0.25)" fill="rgba(255,255,255,0.06)" />
    <path d="M5 8l2 2 4-4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CROSS = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7.5" stroke="rgba(255,255,255,0.1)" />
    <path d="M6 6l4 4M10 6l-4 4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

export default function PricingPage() {
  const plan = PRICING.STARTER
  const features = PLAN_FEATURES.STARTER

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
    { label: 'RestoIQ AI Autonomous Operations Agent & Intelligence', included: false, note: 'Coming soon in Pro Tier' },
    { label: 'Guest CRM & VIP Spend Intelligence', included: false, note: 'Coming soon in Pro Tier' },
    { label: 'Automatic Loyalty Points & Customer Rewards Engine', included: false, note: 'Coming soon in Pro Tier' },
    { label: 'Multi-Location Outlets & Aggregator Integrations', included: false, note: 'Coming soon in Enterprise Tier' },
  ]

  return (
    <main id="main-content" style={{ minHeight: '100vh', backgroundColor: '#000000', fontFamily: 'var(--font-sans)', color: '#ffffff', letterSpacing: '-0.01em' }}>
      {/* Top Navigation */}
      <nav style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ProminentzLogo size="sm" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/portals" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontWeight: 500 }}>
            Portals
          </Link>
          <Link href="/login" style={{ height: '32px', padding: '0 16px', fontSize: '13px', textDecoration: 'none', borderRadius: '6px', background: '#ffffff', color: '#000000', fontWeight: 600, display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            Sign In →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 24px 48px', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '24px' }}>
          ✦ Predictable Pricing
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.1 }}>
          Everything your restaurant needs. <br />
          <span style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>
            Clear, transparent, and simple.
          </span>
        </h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
          Run high-velocity floor operations with an all-inclusive operating system: POS, KDS, Floor tables, QR ordering, Staff, and Reports.
        </p>
      </div>

      {/* Plan Card */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{
          backgroundColor: '#0c0c0e',
          borderRadius: '12px',
          padding: '40px 36px',
          border: '1px solid rgba(255,255,255,0.14)',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
        }}>
          <div style={{ position: 'absolute', top: '-11px', left: '32px', backgroundColor: '#ffffff', color: '#000000', fontSize: '10px', fontWeight: 700, padding: '3px 12px', borderRadius: '999px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {plan.badge}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                {plan.label}
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: '380px', lineHeight: 1.5 }}>
                {plan.tagline}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>${plan.monthly}</span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>/mo</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Billed monthly · ${plan.annual}/yr</div>
            </div>
          </div>

          <Link
            href="/signup?plan=starter"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '32px',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'background 150ms ease',
            }}
          >
            Start 14-Day Free Trial →
          </Link>

          {/* Included Features */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Included in Basic Plan:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>✓</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Excluded notice */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Enterprise Add-ons (In Development):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>• RestoIQ AI Operations Agent &amp; Conversational Intelligence</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>• Guest CRM &amp; VIP Dining Spend Intelligence</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>• Automatic Customer Loyalty Points &amp; Rewards Engine</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Breakdown Table */}
      <div style={{ maxWidth: '820px', margin: '0 auto 80px', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '28px' }}>
          Detailed Feature Availability
        </h2>
        <div style={{ backgroundColor: '#09090b', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#111114' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '12px' }}>Feature Capability</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', color: '#ffffff', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Basic Plan ($40/mo)
                </th>
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ padding: '13px 20px', color: 'rgba(255,255,255,0.85)' }}>
                    <div>{row.label}</div>
                    {row.note && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{row.note}</div>}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    {row.included ? <CHECK /> : <CROSS />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '32px 40px', backgroundColor: '#000000' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Resto</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
            <CookieSettingsButton />
            <Link href="/login" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
