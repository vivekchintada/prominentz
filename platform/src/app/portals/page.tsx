import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Operating Portals | Prominentz Restaurant Operating System',
  description: 'Choose your workspace: Dedicated portals and sign-in experiences for Restaurant Owners, Store Managers, Floor Servers, and Kitchen Chefs.',
}

export default function PortalsPage() {
  const portals = [
    {
      role: 'OWNER',
      title: 'Restaurant Owner & Executive HQ',
      subtitle: 'Complete enterprise command center, multi-location consolidation, subscription billing & governance.',
      icon: '👑',
      badge: 'Executive HQ',
      color: '#5b45f5',
      features: [
        'Multi-Outlet & Franchise HQ Management',
        'Real-time P&L, Sales & Labor Analytics',
        'Stripe SaaS Subscription & Billing Controls',
        'Menu Engineering & Master Catalog Publishing',
        'AI Operations Forecasting & Audit Tools',
      ],
      landingUrl: '/portals/owner',
      signInUrl: '/login?portal=owner',
      signUpUrl: '/signup?role=owner',
      signUpLabel: 'Register New Restaurant (14-Day Free Trial)',
      primaryActionLabel: 'Open Owner Console →',
    },
    {
      role: 'MANAGER',
      title: 'Store Operations Manager',
      subtitle: 'Day-to-day restaurant execution, shift scheduling, staff approvals, and end-of-day cash settlement.',
      icon: '👔',
      badge: 'Store Operations',
      color: '#007AFF',
      features: [
        'Live Shift Scheduling & Swap Approvals',
        'Geofenced Clock-In & Timecard Audits',
        'Cash Drawer Balancing & End-of-Day Z-Reports',
        'Live Floor Occupancy & VIP Reservations',
        'Daily Inventory Waste & Variance Logging',
      ],
      landingUrl: '/portals/manager',
      signInUrl: '/login?portal=manager',
      signUpUrl: '/signup?role=manager',
      signUpLabel: 'Onboard as Store Manager',
      primaryActionLabel: 'Open Manager Portal →',
    },
    {
      role: 'SERVER',
      title: 'Floor Server & Handheld POS',
      subtitle: 'High-speed tableside ordering, course firing, seat-based bill splitting, and instant card payments.',
      icon: '🛎️',
      badge: 'Front-of-House',
      color: '#30D158',
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
      signUpLabel: 'Join as Floor Server',
      primaryActionLabel: 'Open Server Terminal →',
    },
    {
      role: 'KITCHEN',
      title: 'Kitchen Display System (KDS)',
      subtitle: 'Distraction-free kitchen bump displays for line cooks, grill masters, bartenders, and expo runners.',
      icon: '🍳',
      badge: 'Back-of-House',
      color: '#FF9F0A',
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
      signUpLabel: 'Onboard Kitchen Cook',
      primaryActionLabel: 'Launch KDS Terminal →',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0B', color: '#ffffff', fontFamily: '-apple-system, Inter, BlinkMacSystemFont, sans-serif' }}>
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(18,18,20,0.85)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" aria-label="Prominentz Home" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <ProminentzLogo variant="full" size="sm" />
          </Link>

          <nav aria-label="Portals Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Home
            </Link>
            <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Pricing
            </Link>
            <Link href="/login" className="btn btn--primary" style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none' }}>
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content Landmark ─────────────────────────────────────────── */}
      <main id="main-content" style={{ maxWidth: '1160px', margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* Title & Introduction */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '999px', backgroundColor: 'rgba(91,69,245,0.12)', border: '1px solid rgba(91,69,245,0.3)', fontSize: '12px', fontWeight: 700, color: '#a594fd', marginBottom: '16px' }}>
            ✦ Purpose-Built Restaurant Workspaces
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.15 }}>
            Select your operating portal.
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
            Every role in your restaurant operates through a tailored workspace designed for zero lag, role-based security, and live floor-to-kitchen synchronization.
          </p>
        </div>

        {/* 4-Card Responsive Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {portals.map((p) => (
            <div
              key={p.role}
              style={{
                backgroundColor: '#141418',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 16px 36px rgba(0,0,0,0.4)',
                position: 'relative',
                transition: 'transform 200ms ease, border-color 200ms ease',
              }}
            >
              <div>
                {/* Header Icon & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '32px' }}>{p.icon}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: p.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {p.badge}
                  </span>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                  {p.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, margin: '0 0 20px' }}>
                  {p.subtitle}
                </p>

                {/* Features List */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {p.features.map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                      <span style={{ color: p.color, fontWeight: 700 }}>✓</span>
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
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '12px',
                    textDecoration: 'none',
                    marginBottom: '4px',
                  }}
                >
                  <span>Explore Role Tour</span>
                  <span style={{ color: p.color }}>→</span>
                </Link>

                <Link
                  href={p.signInUrl}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: p.color,
                    color: p.role === 'SERVER' || p.role === 'KITCHEN' ? '#000000' : '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  {p.primaryActionLabel}
                </Link>

                <Link
                  href={p.signUpUrl}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {p.signUpLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px', backgroundColor: '#121216', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>© 2026 Prominentz Inc. Multi-Role Operating Platform.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
