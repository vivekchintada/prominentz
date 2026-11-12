import Link from 'next/link'
import { PRICING, PLAN_FEATURES } from '@/lib/pricing'
import { CookieSettingsButton } from '@/components/ui/CookieSettingsButton'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'
import PublicHeader from '@/components/public/PublicHeader'
import styles from '@/components/landing/MiddayMarketing.module.css'

export const metadata = {
  title: 'Pricing | Prominentz — Transparent Restaurant Intelligence',
  description: 'Simple, predictable restaurant operations system. Built for modern hospitality teams. Starting at $50/month.',
}

// Direction C · Across the Room palette (graphite, violet action color)
const C = {
  ground: '#0E1014',
  lifted: '#13161B',
  panel: '#171A20',
  raised: '#262A33',
  border: '#262A33',
  text: '#F3F4F6',
  muted: '#9BA3AF',
  violet: '#6835F9',
  ready: '#34D27B',
}

const CONDENSED = "'Barlow Condensed', 'Barlow', 'Inter', sans-serif"

const CHECK = () => (
  <svg width="22" height="22" viewBox="0 0 16 16" fill="none" role="img" aria-label="Included">
    <rect width="16" height="16" rx="3" fill={C.ready} />
    <path d="M4.5 8.2l2.3 2.3 4.7-4.7" stroke={C.ground} strokeWidth="1.8" strokeLinecap="square" />
  </svg>
)

const CROSS = () => (
  <svg width="22" height="22" viewBox="0 0 16 16" fill="none" role="img" aria-label="Not included">
    <rect width="16" height="16" rx="3" fill={C.raised} />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={C.muted} strokeWidth="1.6" strokeLinecap="square" />
  </svg>
)

export default function PricingPage() {
  const plan = PRICING.STARTER
  const features = PLAN_FEATURES.STARTER

  const featureMatrix: { label: string; included: boolean; note?: string }[] = [
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
  ]

  return (
    <div className={styles.page} id="main-content">
      <PublicHeader />
      <main style={{ minHeight: '100vh', backgroundColor: C.ground, fontFamily: 'var(--font-sans)', color: C.text }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '88px 24px 56px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontFamily: CONDENSED, fontSize: '16px', fontWeight: 600, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>
          ✦ Predictable pricing
        </div>
        <h1 style={{ fontFamily: CONDENSED, fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 24px', lineHeight: 0.92 }}>
          Everything your restaurant needs. <br />
          <span style={{ color: C.muted }}>
            One flat price.
          </span>
        </h1>
        <p style={{ fontSize: '19px', color: C.muted, maxWidth: '560px', margin: '0 auto', lineHeight: 1.55 }}>
          Run high-velocity floor operations with an all-inclusive operating system: POS, KDS, Floor tables, QR ordering, Staff, and Reports.
        </p>
      </div>

      {/* Plan Card */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{
          backgroundColor: C.panel,
          borderRadius: '8px',
          padding: '40px 36px',
          border: `1px solid ${C.border}`,
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: '-14px', left: '32px', backgroundColor: C.violet, color: '#FFFFFF', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '4px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {plan.badge}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
            <div>
              <div style={{ fontFamily: CONDENSED, fontSize: '32px', fontWeight: 800, textTransform: 'uppercase', color: C.text, lineHeight: 1, marginBottom: '8px' }}>
                {plan.label}
              </div>
              <p style={{ fontSize: '16px', color: C.muted, margin: 0, maxWidth: '380px', lineHeight: 1.5 }}>
                {plan.tagline}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: CONDENSED, fontSize: '88px', fontWeight: 800, lineHeight: 0.9 }}>${plan.monthly}</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: C.muted, marginBottom: '8px' }}>/mo</span>
              </div>
              <div style={{ fontSize: '14px', color: C.muted, marginTop: '6px' }}>Billed monthly · ${plan.annual}/yr</div>
            </div>
          </div>

          <Link
            href="/signup?plan=starter"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60px',
              borderRadius: '4px',
              backgroundColor: C.violet,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '18px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              textDecoration: 'none',
              marginBottom: '32px',
              transition: 'background 150ms ease',
            }}
          >
            Start 14-day free trial
          </Link>

          {/* Included Features */}
          <div style={{ fontFamily: CONDENSED, fontSize: '16px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
            Included in the Basic plan
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}><CHECK /></span>
                <span style={{ fontSize: '15px', color: C.text, lineHeight: 1.45 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Breakdown Table */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px 88px' }}>
        <h2 style={{ fontFamily: CONDENSED, textAlign: 'center', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, textTransform: 'uppercase', lineHeight: 0.95, margin: '0 0 28px' }}>
          Detailed feature availability
        </h2>
        <div style={{ backgroundColor: C.panel, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.lifted }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: C.muted, fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Feature</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', backgroundColor: C.violet, color: '#FFFFFF', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Basic plan ($50/mo)
                </th>
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '14px 20px', color: C.text }}>
                    <div>{row.label}</div>
                    {row.note && <div style={{ fontSize: '13px', color: C.muted, marginTop: '2px' }}>{row.note}</div>}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', backgroundColor: 'rgba(104, 53, 249, 0.08)' }}>
                    {row.included ? <CHECK /> : <CROSS />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '32px 40px', backgroundColor: C.lifted }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: C.muted }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: CONDENSED, fontWeight: 800, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.02em', color: C.text }}>Prominentz</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
            <CookieSettingsButton />
            <Link href="/login" style={{ color: C.text, textDecoration: 'none', fontWeight: 700 }}>Sign in</Link>
          </div>
        </div>
      </footer>
        </main>
    </div>
  )
}
