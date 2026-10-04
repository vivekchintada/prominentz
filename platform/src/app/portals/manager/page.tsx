import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Store Manager Operations Portal | Prominentz OS',
  description: 'Shift scheduling, timecards, cash drawer reconciliation, live table status, and daily inventory logs for restaurant general managers.',
}

export default function ManagerPortalLandingPage() {
  const managerKpis = [
    { label: 'Active Shift Staff', value: '14 Clocked In', trend: 'Full FOH & BOH Coverage', positive: true },
    { label: 'Cash Drawers Status', value: '$1,250.00', trend: '100% Balanced ($0 variance)', positive: true },
    { label: 'Pending Approvals', value: '0 Pending', trend: 'All comps & voids cleared', positive: true },
    { label: 'Avg Ticket Time', value: '14.2 min', trend: 'Under 18m rush target', positive: true },
  ]

  const managerTools = [
    {
      icon: '📅',
      title: 'Shift Scheduling & Swap Approvals',
      desc: 'Build weekly schedules with automated overtime alerts. Staff can request shift trades directly through their portal, requiring one-tap manager sign-off.',
    },
    {
      icon: '⏱️',
      title: 'Geofenced Clock-In & Timecards',
      desc: 'Prevent buddy punching. Enforce strict geofencing or terminal IP verification on employee clock-ins with instant audit trails.',
    },
    {
      icon: '💵',
      title: 'Cash Drawer Balancing & Z-Reports',
      desc: 'Count starting cash floats, log paid-outs, and execute blind cash drops at shift close. Auto-generate compliant End-of-Day reconciliation summaries.',
    },
    {
      icon: '🛑',
      title: 'Live 86-Item & Waste Logging',
      desc: 'One-tap item depletions instantly reflect across POS terminals and online ordering menus. Track spoiled or spilled inventory with direct reason codes.',
    },
    {
      icon: '🗺️',
      title: 'Real-Time Floor & Table Velocity',
      desc: 'Monitor section occupancy, dwell times, and table turn velocity. Reallocate server sections dynamically during unexpected peak rushes.',
    },
    {
      icon: '📋',
      title: 'Digital Shift Log & Handover Notes',
      desc: 'Keep opening and closing managers perfectly aligned. Document customer feedback, maintenance requests, and VIP visits in secure digital logs.',
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
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(0,122,255,0.15)', color: '#64b5f6', border: '1px solid rgba(0,122,255,0.3)', fontWeight: 700 }}>
              👔 STORE OPERATIONS
            </span>
          </div>

          <nav aria-label="Manager Portal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/portals" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              All Portals
            </Link>
            <Link href="/login?portal=manager" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
            <Link
              href="/signup?role=manager"
              style={{
                backgroundColor: '#007AFF',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,122,255,0.4)',
              }}
            >
              Join Management →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content Landmark ─────────────────────────────────────────── */}
      <main id="main-content" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 24px 100px' }}>
        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', backgroundColor: 'rgba(0,122,255,0.12)', border: '1px solid rgba(0,122,255,0.3)', fontSize: '13px', fontWeight: 700, color: '#64b5f6', marginBottom: '24px' }}>
            <span>👔</span>
            <span>Store Operations &amp; Shift Execution Portal</span>
          </div>

          <h1 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.15 }}>
            Run flawlessly synchronized shifts from{' '}
            <span style={{ background: 'linear-gradient(135deg, #64b5f6 0%, #007AFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              open to close.
            </span>
          </h1>

          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '680px' }}>
            Everything general managers and shift leads need to supervise floor waiters, kitchen tickets, timecards, cash drawers, and live inventory.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=manager"
              style={{
                backgroundColor: '#007AFF',
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(0,122,255,0.4)',
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
              Onboard as Manager
            </Link>
          </div>
        </div>

        {/* ── LIVE SHIFT TELEMETRY ── */}
        <section aria-labelledby="shift-kpis-heading" style={{ marginBottom: '80px' }}>
          <h2 id="shift-kpis-heading" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Sample Shift Dashboard · Demo Data
          </h2>
          <div style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64b5f6', fontWeight: 700 }}>
                  Active Shift Dashboard
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>Illustrative Dinner Service — Not Live Data</h3>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,122,255,0.12)', border: '1px solid rgba(0,122,255,0.3)', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', color: '#64b5f6', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#007AFF', display: 'inline-block' }} />
                Instant Manager Pin Approval Active
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {managerKpis.map((k, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '6px' }}>{k.value}</div>
                  <div style={{ fontSize: '12px', color: '#64b5f6', fontWeight: 600 }}>{k.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MANAGER OPERATIONS SUITE ── */}
        <section aria-labelledby="tools-heading" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <h2 id="tools-heading" style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Built for Frontline Restaurant Managers
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
              From fast-moving lunch rushes to late-night drawer closing, every operational task is streamlined into zero-friction workflows.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {managerTools.map((t, i) => (
              <div key={i} style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{t.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#ffffff' }}>{t.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MANAGER SECURITY & ONBOARDING ── */}
        <section style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px' }}>
              How Manager Onboarding Works
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Quickly join your restaurant’s team using your Store Code or Owner Invite.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { step: '01', title: 'Enter Store Code', desc: 'Obtain your store slug or ID from your Owner and register with your email.' },
              { step: '02', title: 'Set Manager PIN', desc: 'Configure your secure 4-digit manager authorization PIN for fast floor approvals.' },
              { step: '03', title: 'Take Control', desc: 'Access real-time employee timecards, table section assignments, and register floats.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#007AFF', marginBottom: '8px' }}>{s.step}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px', borderRadius: '24px', backgroundColor: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.25)' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px' }}>Ready to optimize store operations?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: '0 auto 28px', maxWidth: '540px' }}>
            Sign in to start your shift or register with your restaurant store code.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=manager"
              style={{
                backgroundColor: '#007AFF',
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(0,122,255,0.4)',
              }}
            >
              Sign In to Manager Portal →
            </Link>
            <Link
              href="/signup?role=manager"
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
              Onboard as Manager
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
