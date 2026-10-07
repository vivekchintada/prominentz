import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Store Operations Manager Portal | Resto',
  description: 'Floor management and daily shift control for Restaurant Managers, General Managers, and Head Shift Supervisors.',
}

export default function ManagerPortalLandingPage() {
  const managerKpis = [
    { label: 'Active Shift Waitstaff', value: '8 On Duty', trend: '100% clocked in' },
    { label: 'Floor Occupancy Rate', value: '88%', trend: 'Peak dinner rush' },
    { label: 'Avg Ticket Fulfillment', value: '14.2 min', trend: 'Under 18 min target' },
    { label: 'Pending Approvals', value: '0 Items', trend: 'All shifts cleared' },
  ]

  const managerTools = [
    {
      icon: '⏱️',
      title: 'Geofenced Timecards & Shift Approvals',
      desc: 'Verify shift clock-ins with optional GPS or local network geofencing. Approve early clock-outs, break deductions, and shift swaps in one tap.',
    },
    {
      icon: '💵',
      title: 'Cash Drawer Balancing & Z-Reports',
      desc: 'Enforce dual-blind cash counts at shift close. Resto automatically calculates cash float variances and outputs digital end-of-day Z-Reports.',
    },
    {
      icon: '🪑',
      title: 'Floor Sectioning & Server Cut Lists',
      desc: 'Dynamically assign tables to server sections as dinner rushes swell. Release servers with automated cut list notifications when volume cools.',
    },
    {
      icon: '🍽️',
      title: 'Real-time Item Comp & Void Controls',
      desc: 'Authorize discounts, food comps, and kitchen error voids directly from any handheld or station using your 4-digit manager PIN.',
    },
    {
      icon: '🔔',
      title: 'KDS Bottleneck & Rush Alerts',
      desc: 'Get proactive alerts when grill or sauté tickets exceed target prep times. Dispatch runners or reroute items before guests notice a delay.',
    },
    {
      icon: '📋',
      title: 'Daily Waste & Spillage Auditing',
      desc: 'Log broken bottles, burnt steaks, and spoiled produce immediately. Feed raw waste variances into back-office recipe margin audits.',
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
              STORE OPS
            </span>
          </div>

          <nav aria-label="Manager Portal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/portals" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              All Portals
            </Link>
            <Link href="/login?portal=manager" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 500 }}>
              Sign In
            </Link>
            <Link
              href="/signup?role=manager"
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
              Join Management →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main id="main-content" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 24px 100px' }}>
        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '24px' }}>
            ✦ Shift Execution Portal
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 54px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.15 }}>
            Run flawlessly synchronized shifts from{' '}
            <span style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>
              open to close.
            </span>
          </h1>

          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '640px' }}>
            Everything general managers and shift leads need to supervise floor waiters, kitchen tickets, timecards, cash drawers, and live inventory.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=manager"
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
              <span>Open Store Manager Console</span>
              <span>→</span>
            </Link>
            <Link
              href="/signup?role=manager"
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
              Onboard as Manager
            </Link>
          </div>
        </div>

        {/* ── LIVE SHIFT TELEMETRY ── */}
        <section aria-labelledby="shift-kpis-heading" style={{ marginBottom: '80px' }}>
          <h2 id="shift-kpis-heading" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Shift Performance Overview
          </h2>
          <div style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '32px', boxShadow: '0 20px 48px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  Active Shift Dashboard
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0' }}>Dinner Service Real-Time Metrics</h3>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                PIN Approval Active
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {managerKpis.map((k, i) => (
                <div key={i} style={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '6px', fontFamily: 'var(--font-mono, monospace)' }}>{k.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{k.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MANAGER OPERATIONS SUITE ── */}
        <section aria-labelledby="tools-heading" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <h2 id="tools-heading" style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Built for Frontline Restaurant Managers
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
              From fast-moving lunch rushes to late-night drawer closing, every operational task is streamlined into zero-friction workflows.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {managerTools.map((t, i) => (
              <div key={i} style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '28px' }}>
                <div style={{ fontSize: '24px', marginBottom: '14px' }}>{t.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', color: '#ffffff' }}>{t.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MANAGER SECURITY & ONBOARDING ── */}
        <section style={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '40px', marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 12px' }}>
              How Manager Onboarding Works
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Quickly join your restaurant’s team using your Store Code or Owner Invite.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              { step: '01', title: 'Enter Store Code', desc: 'Obtain your store slug or ID from your Owner and register with your email.' },
              { step: '02', title: 'Set Manager PIN', desc: 'Configure your secure 4-digit manager authorization PIN for fast floor approvals.' },
              { step: '03', title: 'Take Control', desc: 'Access real-time employee timecards, table section assignments, and register floats.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '10px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '8px', fontFamily: 'var(--font-mono, monospace)' }}>{s.step}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px', borderRadius: '14px', backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 16px' }}>Ready to optimize store operations?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', margin: '0 auto 28px', maxWidth: '540px' }}>
            Sign in to start your shift or register with your restaurant store code.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=manager"
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
              Sign In to Manager Portal →
            </Link>
            <Link
              href="/signup?role=manager"
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
              Onboard as Manager
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
