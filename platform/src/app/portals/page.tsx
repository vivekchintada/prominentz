import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Operating Portals | Resto — Role-Based Hospitality Workspaces',
  description: 'Choose your workspace: Dedicated portals and sign-in experiences for Restaurant Owners, Store Managers, Floor Servers, and Kitchen Chefs.',
}

export default function PortalsPage() {
  const portals = [
    {
      role: 'OWNER',
      title: 'Executive HQ & Owner',
      subtitle: 'Multi-location consolidation, real-time margins, subscription controls, and AI audit governance.',
      badge: 'Executive HQ',
      features: [
        'Multi-Outlet & Franchise Consolidated View',
        'Real-time P&L, Revenue & Labor Margins',
        'Stripe SaaS Billing & Enterprise Governance',
        'Master Menu Engineering & Catalog Publishing',
        'Autonomous Operations Forecasting & Audits',
      ],
      landingUrl: '/portals/owner',
      signInUrl: '/login?portal=owner',
      signUpUrl: '/signup?role=owner',
      signUpLabel: 'Start Free Trial',
      primaryActionLabel: 'Launch Owner Console →',
    },
    {
      role: 'MANAGER',
      title: 'Store Operations Manager',
      subtitle: 'Day-to-day restaurant execution, shift scheduling, staff approvals, and end-of-day cash settlement.',
      badge: 'Store Ops',
      features: [
        'Live Shift Scheduling & Swap Approvals',
        'Geofenced Clock-In & Timecard Audits',
        'Cash Drawer Balancing & Z-Report Settlement',
        'Live Floor Occupancy & VIP Reservations',
        'Daily Inventory Waste & Variance Logging',
      ],
      landingUrl: '/portals/manager',
      signInUrl: '/login?portal=manager',
      signUpUrl: '/signup?role=manager',
      signUpLabel: 'Onboard Manager',
      primaryActionLabel: 'Open Manager Portal →',
    },
    {
      role: 'SERVER',
      title: 'Floor Server & Handheld POS',
      subtitle: 'High-speed tableside ordering, course firing, seat-based bill splitting, and instant card payments.',
      badge: 'Front-of-House',
      features: [
        'Handheld Floor Map & Table Quick Switcher',
        'Instant Direct-to-KDS Order Dispatch',
        'Split Bills (Even N-Way & By Diner Seat)',
        'Table-Side Cash & Card Payment Settlement',
        'Live Server Tips & Daily Sales Summary',
      ],
      landingUrl: '/portals/server',
      signInUrl: '/login?portal=server',
      signUpUrl: '/signup?role=server',
      signUpLabel: 'Server Terminal Access',
      primaryActionLabel: 'Open Server Terminal →',
    },
    {
      role: 'KITCHEN',
      title: 'Kitchen Display System (KDS)',
      subtitle: 'Distraction-free kitchen bump displays for line cooks, grill masters, bartenders, and expo runners.',
      badge: 'Back-of-House',
      features: [
        'Real-time WebSocket Ticket Pipeline (<100ms)',
        'Station Filters: Hot, Cold, Bar, and Expo',
        'Order Preparation Timers & Rush Indicators',
        'One-Tap Item Recall & Ticket Bumping',
        'Automatic 86 Dish Depletion Alerts',
      ],
      landingUrl: '/portals/kitchen',
      signInUrl: '/login?portal=kitchen',
      signUpUrl: '/signup?role=kitchen',
      signUpLabel: 'Kitchen Terminal Access',
      primaryActionLabel: 'Launch KDS Terminal →',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>
      {/* ── Top Header ── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" aria-label="Resto Home" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <ProminentzLogo size="sm" />
          </Link>

          <nav aria-label="Portals Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              Home
            </Link>
            <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              Pricing
            </Link>
            <Link href="/login" style={{ height: '32px', padding: '0 16px', fontSize: '12px', textDecoration: 'none', borderRadius: '6px', background: '#ffffff', color: '#000000', fontWeight: 600, display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main id="main-content" style={{ maxWidth: '1160px', margin: '0 auto', padding: '64px 24px 96px' }}>
        {/* Title & Introduction */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '20px' }}>
            ✦ Purpose-Built Roles
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.15 }}>
            Select your operating portal. <br />
            <span style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>
              Built for speed at every station.
            </span>
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
            Every role in your restaurant operates through a tailored workspace designed for zero lag, role-based security, and live floor-to-kitchen synchronization.
          </p>
        </div>

        {/* 4-Card Responsive Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {portals.map((p) => (
            <div
              key={p.role}
              style={{
                backgroundColor: '#0c0c0e',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                position: 'relative',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}
            >
              <div>
                {/* Header Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.9)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {p.badge}
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, monospace)' }}>
                    ROLE/{p.role}
                  </span>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.02em', color: '#ffffff' }}>
                  {p.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '0 0 20px' }}>
                  {p.subtitle}
                </p>

                {/* Features List */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {p.features.map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link
                  href={p.landingUrl}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 500,
                    fontSize: '12px',
                    textDecoration: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <span>Explore Workspace Tour</span>
                  <span>→</span>
                </Link>

                <Link
                  href={p.signInUrl}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'background 150ms ease',
                  }}
                >
                  {p.primaryActionLabel}
                </Link>

                <Link
                  href={p.signUpUrl}
                  style={{
                    textAlign: 'center',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.45)',
                    textDecoration: 'none',
                    padding: '4px 0',
                    transition: 'color 150ms ease',
                  }}
                >
                  {p.signUpLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '32px 40px', backgroundColor: '#000000' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Resto</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <Link href="/pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/login" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
