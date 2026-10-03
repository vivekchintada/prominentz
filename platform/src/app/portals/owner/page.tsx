import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Restaurant Owner Operating Portal | Prominentz OS',
  description: 'Enterprise HQ command center for restaurant owners and multi-unit hospitality operators. Unified financials, menu management, and real-time operations.',
}

export default function OwnerPortalLandingPage() {
  const kpis = [
    { label: 'Consolidated Revenue', value: '$148,920', trend: '+18.4% vs last mo', positive: true },
    { label: 'Prime Cost (COGS + Labor)', value: '54.2%', trend: '-3.1% optimized', positive: true },
    { label: 'Sample Active Outlets', value: '6 Locations', trend: '100% online sync', positive: true },
    { label: 'Avg Table Turn Time', value: '41 min', trend: '8 min faster', positive: true },
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
      desc: 'Never run out of key ingredients. Resto AI monitors consumption velocity and automatically suggests purchase orders to approved suppliers.',
    },
    {
      icon: '💳',
      title: 'SaaS Subscription & Billing Transparency',
      desc: 'Flexible monthly or annual plans with zero hidden gateway fees, automated multi-tax rules, and unified merchant settlement.',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#07080B', color: '#ffffff', fontFamily: '-apple-system, Inter, BlinkMacSystemFont, sans-serif' }}>
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(14,15,19,0.85)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" aria-label="Prominentz Home" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              <ProminentzLogo variant="full" size="sm" />
            </Link>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(91,69,245,0.15)', color: '#a594fd', border: '1px solid rgba(91,69,245,0.3)', fontWeight: 700 }}>
              👑 OWNER HQ
            </span>
          </div>

          <nav aria-label="Owner Portal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/portals" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              All Portals
            </Link>
            <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Pricing
            </Link>
            <Link href="/login?portal=owner" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
            <Link
              href="/signup?role=owner"
              style={{
                backgroundColor: '#5b45f5',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(91,69,245,0.4)',
              }}
            >
              Start Free Trial →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content Landmark ─────────────────────────────────────────── */}
      <main id="main-content" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 24px 100px' }}>
        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', backgroundColor: 'rgba(91,69,245,0.12)', border: '1px solid rgba(91,69,245,0.3)', fontSize: '13px', fontWeight: 700, color: '#a594fd', marginBottom: '24px' }}>
            <span>👑</span>
            <span>Executive Command Center for Restaurant Hospitality</span>
          </div>

          <h1 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.15 }}>
            Master your entire restaurant empire with{' '}
            <span style={{ background: 'linear-gradient(135deg, #a594fd 0%, #5b45f5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              complete clarity.
            </span>
          </h1>

          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '680px' }}>
            Consolidate POS revenue, live food cost depletions, multi-store labor, and customer delivery orders into one intuitive executive cockpit.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/signup?role=owner"
              style={{
                backgroundColor: '#5b45f5',
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(91,69,245,0.4)',
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
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
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
          <div style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a594fd', fontWeight: 700 }}>
                  Sample Multi-Unit Dashboard · Demo Data
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>Illustrative Outlet Performance — Not Live Data</h3>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', color: '#30D158', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#30D158', display: 'inline-block' }} />
                PostgreSQL &amp; NextAuth Synced
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {kpis.map((k, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '6px' }}>{k.value}</div>
                  <div style={{ fontSize: '12px', color: '#30D158', fontWeight: 600 }}>{k.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CORE ENTERPRISE CAPABILITIES ── */}
        <section aria-labelledby="capabilities-heading" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <h2 id="capabilities-heading" style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Engineered for High-Volume Operators
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
              Stop juggling disjointed POS terminals, third-party spreadsheets, and delivery tablets. Prominentz unites your entire hospitality stack.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {capabilities.map((c, i) => (
              <div key={i} style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', transition: 'border-color 150ms ease' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{c.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#ffffff' }}>{c.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW ONBOARDING WORKS ── */}
        <section style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px' }}>
              Launch Your Restaurant in 3 Easy Steps
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Zero hardware lock-in. Runs seamlessly on standard iPads, Android tablets, touch monitors, and mobile handhelds.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { step: '01', title: 'Register Your Tenant', desc: 'Create your organization in under 60 seconds with 14 days of unrestricted access.' },
              { step: '02', title: 'Upload Menus & Tables', desc: 'Pre-seeded sample menus and visual table floor plans ready to customize instantly.' },
              { step: '03', title: 'Invite Your Team', desc: 'Generate 4-digit PINs for waitstaff and line cooks. Real-time NextAuth synchronization takes care of the rest.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#5b45f5', marginBottom: '8px' }}>{s.step}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIAL ── */}
        <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '24px', backgroundColor: 'rgba(91,69,245,0.06)', border: '1px solid rgba(91,69,245,0.2)', marginBottom: '80px' }}>
          <p style={{ fontSize: '20px', fontStyle: 'italic', color: '#ffffff', maxWidth: '720px', margin: '0 auto 16px', lineHeight: 1.5 }}>
            &ldquo;Prominentz completely replaced four separate software subscriptions. We scaled from 2 to 7 locations with zero POS downtime and cut our food waste variance by 24%.&rdquo;
          </p>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#a594fd' }}>
            Roberto Bianchi — Managing Partner, The Riviera Hospitality Group
          </div>
        </div>

        {/* ── BOTTOM CTA BANNER ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px', borderRadius: '24px', backgroundColor: 'linear-gradient(180deg, #161528 0%, #101018 100%)', border: '1px solid rgba(91,69,245,0.3)' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px' }}>Ready to elevate your restaurant operations?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: '0 auto 28px', maxWidth: '540px' }}>
            Join premier restaurateurs who trust Prominentz OS for lightning-fast table turns, tight food margins, and enterprise peace of mind.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/signup?role=owner"
              style={{
                backgroundColor: '#5b45f5',
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(91,69,245,0.4)',
              }}
            >
              Start 14-Day Free Owner Trial →
            </Link>
            <Link
              href="/login?portal=owner"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                padding: '14px 24px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign In to Owner HQ
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
