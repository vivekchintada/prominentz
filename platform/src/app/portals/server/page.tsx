import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Floor Server & Handheld POS Portal | Prominentz OS',
  description: 'Fast handheld tableside ordering, course firing, seat-based bill splitting, and instant PIN login for restaurant floor waitstaff.',
}

export default function ServerPortalLandingPage() {
  const serverKpis = [
    { label: 'Assigned Tables', value: '5 Active Tables', trend: 'Section: Patio & Dining', positive: true },
    { label: 'Shift Tips Accumulated', value: '$184.50', trend: '21.4% avg tip rate', positive: true },
    { label: 'Avg Order-to-Kitchen', value: '< 100 ms', trend: 'Zero lag WebSocket fire', positive: true },
    { label: 'Avg Table Turn', value: '38 min', trend: 'Optimal turn pace', positive: true },
  ]

  const serverFeatures = [
    {
      icon: '📱',
      title: 'Handheld Floor Map & Table Quick Switch',
      desc: 'Optimized for mobile phones and lightweight tablets. Color-coded table statuses let you see seated, ordering, fired, and paying tables at a glance.',
    },
    {
      icon: '🔥',
      title: 'Precision Course Firing (Apps / Mains / Desserts)',
      desc: 'Take the full dining order upfront, then fire individual courses with a single tap when guests finish their appetizers. No double trips to fixed terminals.',
    },
    {
      icon: '💳',
      title: 'Flexible Bill Splitting (By Seat or N-Way)',
      desc: 'Split checks effortlessly by guest seat numbers, even division, or separate bar drinks from entrees. Handle combined cash and card payments in seconds.',
    },
    {
      icon: '🔢',
      title: 'Instant 4-Digit Touch PIN Sign-In',
      desc: 'Switch between servers in half a second on shared terminals. Just tap your 4-digit PIN to punch orders, avoiding cumbersome password typing.',
    },
    {
      icon: '💰',
      title: 'Real-Time Tips & Shift Summary',
      desc: 'See your accumulated credit card tips, cash tips owed, and total sales volume updated in real time throughout your shift.',
    },
    {
      icon: '🛑',
      title: 'Instant 86 Dish Depletion Alerts',
      desc: 'Never order an out-of-stock special. When the kitchen runs out of an item, it is grayed out immediately with live remaining portion counts.',
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
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(48,209,88,0.15)', color: '#30D158', border: '1px solid rgba(48,209,88,0.3)', fontWeight: 700 }}>
              🛎️ FLOOR SERVER
            </span>
          </div>

          <nav aria-label="Server Portal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/portals" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              All Portals
            </Link>
            <Link href="/login?portal=server" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
            <Link
              href="/signup?role=server"
              style={{
                backgroundColor: '#30D158',
                color: '#000000',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(48,209,88,0.3)',
              }}
            >
              Join as Server →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content Landmark ─────────────────────────────────────────── */}
      <main id="main-content" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 24px 100px' }}>
        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', backgroundColor: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', fontSize: '13px', fontWeight: 700, color: '#30D158', marginBottom: '24px' }}>
            <span>🛎️</span>
            <span>Handheld Floor POS &amp; Tableside Terminal</span>
          </div>

          <h1 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.15 }}>
            Spend more time with guests,{' '}
            <span style={{ background: 'linear-gradient(135deg, #30D158 0%, #20c997 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              less time at the register.
            </span>
          </h1>

          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '680px' }}>
            Handheld tableside ordering, course firing, instant bill splits, and sub-second PIN access designed specifically for busy floor waitstaff.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=server"
              style={{
                backgroundColor: '#30D158',
                color: '#000000',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(48,209,88,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Open Server Floor Terminal</span>
              <span>→</span>
            </Link>
            <Link
              href="/signup?role=server"
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
              Register Server Profile
            </Link>
          </div>
        </div>

        {/* ── LIVE FLOOR TELEMETRY ── */}
        <section aria-labelledby="server-kpis-heading" style={{ marginBottom: '80px' }}>
          <h2 id="server-kpis-heading" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Live Floor Server Telemetry
          </h2>
          <div style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#30D158', fontWeight: 700 }}>
                  Active Shift Status
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>Floor Section: Main Dining + Terrace</h3>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', color: '#30D158', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#30D158', display: 'inline-block' }} />
                Instant PIN Ready
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {serverKpis.map((k, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '6px' }}>{k.value}</div>
                  <div style={{ fontSize: '12px', color: '#30D158', fontWeight: 600 }}>{k.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVER FEATURES GRID ── */}
        <section aria-labelledby="server-features-heading" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <h2 id="server-features-heading" style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Built for Front-of-House Speed
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
              Say goodbye to handwriting guest checks or waiting in line behind other waiters at a single clunky cash register.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {serverFeatures.map((f, i) => (
              <div key={i} style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#ffffff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAST SERVER ONBOARDING ── */}
        <section style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px' }}>
              Get Started in Under 2 Minutes
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Join your restaurant’s waitstaff team with your restaurant store code.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { step: '01', title: 'Enter Store Code', desc: 'Ask your shift manager for your restaurant store code and register your email.' },
              { step: '02', title: 'Pick 4-Digit PIN', desc: 'Set a rapid PIN code so you can unlock handhelds or wall terminals instantly.' },
              { step: '03', title: 'Punch & Fire', desc: 'Open tables, take modifier requests, and fire appetizers directly to the kitchen line.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#30D158', marginBottom: '8px' }}>{s.step}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px', borderRadius: '24px', backgroundColor: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.25)' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px' }}>Ready to serve your floor tables?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: '0 auto 28px', maxWidth: '540px' }}>
            Sign in to start punch-ins or onboard with your store code.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=server"
              style={{
                backgroundColor: '#30D158',
                color: '#000000',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(48,209,88,0.3)',
              }}
            >
              Sign In to Server Terminal →
            </Link>
            <Link
              href="/signup?role=server"
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
              Join as Floor Server
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
