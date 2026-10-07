import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Executive HQ & Owner Portal | Resto',
  description: 'Enterprise command center for restaurant owners and multi-unit hospitality operators. Unified financials, menu management, and real-time operations.',
}

export default function OwnerPortalLandingPage() {
  const kpis = [
    { label: 'Consolidated Revenue', value: '$148,920', trend: '+18.4% vs last mo' },
    { label: 'Prime Cost (COGS + Labor)', value: '54.2%', trend: '-3.1% optimized' },
    { label: 'Active Outlets', value: '6 Locations', trend: '100% online sync' },
    { label: 'Avg Table Turn Time', value: '41 min', trend: '8 min faster' },
  ]

  const capabilities = [
    {
      icon: '🏢',
      title: 'Multi-Location & Franchise Consolidation',
      desc: 'Seamlessly govern 1 to 50+ restaurant locations from a single dashboard. Synchronize catalog prices, employee permissions, and cross-outlet inventory in real-time.',
    },
    {
      icon: '📈',
      title: 'Automated P&L & Prime Cost Auditing',
      desc: 'Connect live POS ticket fires to automated inventory recipe depletion. Know your exact gross margins and food cost percentage on every dish instantly.',
    },
    {
      icon: '⚡',
      title: 'Central Master Menu Engineering',
      desc: 'Publish menu variations, dynamic seasonal items, and promotional pricing across all outlets, QR tables, and delivery aggregators with one click.',
    },
    {
      icon: '🛡️',
      title: 'Enterprise RBAC & Audit Logs',
      desc: 'Strict role separation between Owners, General Managers, Floor Waiters, and Kitchen Line Cooks with biometric, PIN, or encrypted session tokens.',
    },
    {
      icon: '📦',
      title: 'Automated Purchase Orders & Par Levels',
      desc: 'Never run out of key ingredients. Resto monitors consumption velocity and automatically suggests purchase orders to approved suppliers.',
    },
    {
      icon: '💳',
      title: 'SaaS Subscription & Billing Transparency',
      desc: 'Flexible monthly or annual plans with zero hidden gateway fees, automated multi-tax rules, and unified merchant settlement.',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>
      {/* ── Top Header ── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" aria-label="Resto Home" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              <ProminentzLogo size="sm" />
            </Link>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600, letterSpacing: '0.04em' }}>
              OWNER HQ
            </span>
          </div>

          <nav aria-label="Owner Portal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/portals" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              All Portals
            </Link>
            <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              Pricing
            </Link>
            <Link href="/login?portal=owner" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 500 }}>
              Sign In
            </Link>
            <Link
              href="/signup?role=owner"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Start Free Trial →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main id="main-content" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 24px 100px' }}>
        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '24px' }}>
            ✦ Executive Command Center
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 54px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.15 }}>
            Master your entire restaurant network with{' '}
            <span style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>
              complete clarity.
            </span>
          </h1>

          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '640px' }}>
            Consolidate POS revenue, live food cost depletions, multi-store labor, and customer delivery orders into one intuitive executive cockpit.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/signup?role=owner"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '12px 28px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Register New Restaurant (14 Days Free)</span>
              <span>→</span>
            </Link>
            <Link
              href="/login?portal=owner"
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.14)',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Owner HQ Sign In
            </Link>
          </div>
        </div>

        {/* ── LIVE KPI SIMULATOR COCKPIT ── */}
        <section aria-labelledby="kpis-heading" style={{ marginBottom: '80px' }}>
          <h2 id="kpis-heading" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Executive KPI Overview
          </h2>
          <div style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '32px', boxShadow: '0 20px 48px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  Consolidated Multi-Unit Performance
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0' }}>Executive Metrics Engine</h3>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                Real-Time Telemetry
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {kpis.map((k, i) => (
                <div key={i} style={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '6px', fontFamily: 'var(--font-mono, monospace)' }}>{k.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{k.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CORE ENTERPRISE CAPABILITIES ── */}
        <section aria-labelledby="capabilities-heading" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <h2 id="capabilities-heading" style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Engineered for High-Volume Operators
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
              Stop juggling disjointed POS terminals, third-party spreadsheets, and delivery tablets. Resto unites your entire hospitality stack.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {capabilities.map((c, i) => (
              <div key={i} style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '28px' }}>
                <div style={{ fontSize: '24px', marginBottom: '14px' }}>{c.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', color: '#ffffff' }}>{c.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW ONBOARDING WORKS ── */}
        <section style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '40px', marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 12px' }}>
              Launch Your Restaurant in 3 Easy Steps
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Zero hardware lock-in. Runs seamlessly on standard iPads, Android tablets, touch monitors, and mobile handhelds.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              { step: '01', title: 'Register Your Tenant', desc: 'Create your organization in under 60 seconds with 14 days of unrestricted access.' },
              { step: '02', title: 'Upload Menus & Tables', desc: 'Start with a clean workspace, then add your real menus and floor layout.' },
              { step: '03', title: 'Invite Your Team', desc: 'Generate 4-digit PINs for waitstaff and line cooks. Real-time NextAuth synchronization takes care of the rest.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '10px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '8px', fontFamily: 'var(--font-mono, monospace)' }}>{s.step}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA BANNER ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px', borderRadius: '14px', backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 16px' }}>Ready to elevate your restaurant operations?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', margin: '0 auto 28px', maxWidth: '540px' }}>
            Join premier restaurateurs who trust Resto for lightning-fast table turns, tight food margins, and enterprise peace of mind.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/signup?role=owner"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '12px 28px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Start 14-Day Free Trial →
            </Link>
            <Link
              href="/login?portal=owner"
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.14)',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Sign In to Owner HQ
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '32px 40px', backgroundColor: '#000000' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Resto</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <Link href="/pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/portals" style={{ color: 'inherit', textDecoration: 'none' }}>Portals</Link>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
