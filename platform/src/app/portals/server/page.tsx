import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Floor Server & Handheld POS Portal | Resto',
  description: 'Handheld tableside ordering, course firing, and split payment terminal for restaurant waitstaff and floor servers.',
}

export default function ServerPortalLandingPage() {
  const serverKpis = [
    { label: 'Avg Table Turnover', value: '38 min', trend: '7 min faster tonight' },
    { label: 'Avg Tips / Shift', value: '$184.50', trend: '+14% with digital split' },
    { label: 'Kitchen Firing Latency', value: '< 200 ms', trend: 'Direct KDS sync' },
    { label: 'Active Assigned Tables', value: '5 Tables', trend: 'Section Patio A' },
  ]

  const serverTools = [
    {
      icon: '📱',
      title: 'Handheld Tableside Ordering',
      desc: 'Take orders directly at the table on any smartphone or tablet. Modifier options, allergies, and temperature presets appear automatically.',
    },
    {
      icon: '🔥',
      title: 'Hold & Fire Course Sequencing',
      desc: 'Send appetizers to the hot station immediately while placing entrees on hold. Fire the next course with one tap when guests finish starters.',
    },
    {
      icon: '💳',
      title: 'Flexible Bill Splitting by Seat',
      desc: 'Split evenly across N cards, split by individual seat, or drag specific shared dishes across split checks in under five seconds.',
    },
    {
      icon: '⚡',
      title: 'Direct-to-KDS Real-Time Dispatch',
      desc: 'No more running back to a crowded terminal. The instant you hit send, tickets print or bump on line cooks’ screens without delay.',
    },
    {
      icon: '🔔',
      title: 'Ready for Pickup Expo Vibrations',
      desc: 'Receive instant visual alerts when hot dishes are plated and waiting under heat lamps at the expo window.',
    },
    {
      icon: '📊',
      title: 'Personal Sales & Tip Ledger',
      desc: 'Track your shift sales volume, tip percentage averages, and cash-in-hand totals transparently at any moment during service.',
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
              FLOOR SERVER
            </span>
          </div>

          <nav aria-label="Server Portal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/portals" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              All Portals
            </Link>
            <Link href="/login?portal=server" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 500 }}>
              Sign In
            </Link>
            <Link
              href="/signup?role=server"
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
              Join as Server →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main id="main-content" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 24px 100px' }}>
        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '24px' }}>
            ✦ Front-of-House Handheld Terminal
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 54px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.15 }}>
            Spend more time with guests,{' '}
            <span style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>
              less time at the register.
            </span>
          </h1>

          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '640px' }}>
            Handheld tableside ordering, course firing, instant bill splits, and sub-second PIN access designed specifically for busy floor waitstaff.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=server"
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
              <span>Open Server Floor Terminal</span>
              <span>→</span>
            </Link>
            <Link
              href="/signup?role=server"
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
              Join as Server
            </Link>
          </div>
        </div>

        {/* ── LIVE TELEMETRY ── */}
        <section aria-labelledby="server-kpis-heading" style={{ marginBottom: '80px' }}>
          <h2 id="server-kpis-heading" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Server Shift Overview
          </h2>
          <div style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '32px', boxShadow: '0 20px 48px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  Active Shift Dashboard
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0' }}>Table &amp; Section Metrics</h3>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                Instant PIN Switcher
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {serverKpis.map((k, i) => (
                <div key={i} style={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '6px', fontFamily: 'var(--font-mono, monospace)' }}>{k.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{k.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TOOLS GRID ── */}
        <section aria-labelledby="server-tools-heading" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <h2 id="server-tools-heading" style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Built for Frontline Floor Waitstaff
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
              Designed to eliminate trips to a fixed terminal and streamline tableside ordering with zero lag.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {serverTools.map((t, i) => (
              <div key={i} style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '28px' }}>
                <div style={{ fontSize: '24px', marginBottom: '14px' }}>{t.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', color: '#ffffff' }}>{t.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px', borderRadius: '14px', backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 16px' }}>Ready to launch your server terminal?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', margin: '0 auto 28px', maxWidth: '540px' }}>
            Sign in with your server email or PIN to access your assigned tables.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=server"
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
              Sign In to Server Terminal →
            </Link>
            <Link
              href="/signup?role=server"
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
              Onboard New Server
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
