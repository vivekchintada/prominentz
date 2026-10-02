import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Kitchen Display System (KDS) Portal | Prominentz OS',
  description: 'Ultra-fast back-of-house kitchen display screens, station routing, preparation timers, and one-tap ticket bumping for culinary line cooks.',
}

export default function KitchenPortalLandingPage() {
  const kdsKpis = [
    { label: 'Active Line Tickets', value: '8 In Progress', trend: 'Hot + Grill + Expo', positive: true },
    { label: 'Average Prep Time', value: '11.4 min', trend: 'Under 15 min benchmark', positive: true },
    { label: 'WebSocket Dispatch', value: '< 80 ms', trend: 'Zero-delay kitchen fire', positive: true },
    { label: 'Station Routing', value: '100% Filtered', trend: 'Hot, Cold, Bar & Expo', positive: true },
  ]

  const kdsFeatures = [
    {
      icon: '🔥',
      title: 'Precision Station Routing (Hot, Cold, Bar, Expo)',
      desc: 'Never crowd cook stations with irrelevant dishes. Grill cooks see steaks and burgers; pantry cooks see salads and cold starters; expo runners see consolidated orders.',
    },
    {
      icon: '⚡',
      title: 'Sub-100ms WebSocket Ticket Dispatch',
      desc: 'The moment a server taps "Fire" or a diner submits a QR order, tickets materialize instantly on kitchen displays with audible chime indicators.',
    },
    {
      icon: '⏱️',
      title: 'Elapsed Prep Timers & Urgency Colors',
      desc: 'Tickets automatically shift from fresh Green (0-8m) to Amber warning (9-14m) to urgent Red (15m+), ensuring no customer order is forgotten during peak service.',
    },
    {
      icon: '👆',
      title: 'One-Tap Ticket Bumping & Quick Recall',
      desc: 'Bump finished dishes with a single tap or hardware bump bar. Accidental bump? Tap the Recall button to restore the previous ticket immediately.',
    },
    {
      icon: '🛑',
      title: 'Direct 86 Ingredient Depletion',
      desc: 'Run out of salmon or ribeye during rush? Mark it 86 directly from the KDS screen. The item is instantly disabled across floor POS and mobile ordering apps.',
    },
    {
      icon: '🛡️',
      title: 'High-Contrast, Heat-Resistant Design',
      desc: 'Crafted with bold typography, high color contrast, and large touch targets designed to be clearly legible across steamy cook lines and prep stations.',
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
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,159,10,0.15)', color: '#FF9F0A', border: '1px solid rgba(255,159,10,0.3)', fontWeight: 700 }}>
              🍳 KITCHEN KDS
            </span>
          </div>

          <nav aria-label="Kitchen Portal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/portals" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              All Portals
            </Link>
            <Link href="/login?portal=kitchen" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
            <Link
              href="/signup?role=kitchen"
              style={{
                backgroundColor: '#FF9F0A',
                color: '#000000',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(255,159,10,0.3)',
              }}
            >
              Join Kitchen Team →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content Landmark ─────────────────────────────────────────── */}
      <main id="main-content" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 24px 100px' }}>
        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', backgroundColor: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', fontSize: '13px', fontWeight: 700, color: '#FF9F0A', marginBottom: '24px' }}>
            <span>🍳</span>
            <span>Back-of-House Kitchen Display Bump Terminal</span>
          </div>

          <h1 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.15 }}>
            Zero lost paper tickets,{' '}
            <span style={{ background: 'linear-gradient(135deg, #FF9F0A 0%, #ff7700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              pure kitchen velocity.
            </span>
          </h1>

          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '680px' }}>
            Transform your line cooks, sous chefs, and expo runners into a cohesive culinary machine with sub-second digital bump displays and station filters.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=kitchen"
              style={{
                backgroundColor: '#FF9F0A',
                color: '#000000',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(255,159,10,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Launch Kitchen Bump Terminal</span>
              <span>→</span>
            </Link>
            <Link
              href="/signup?role=kitchen"
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
              Onboard Kitchen Cook
            </Link>
          </div>
        </div>

        {/* ── LIVE KDS TELEMETRY ── */}
        <section aria-labelledby="kds-kpis-heading" style={{ marginBottom: '80px' }}>
          <h2 id="kds-kpis-heading" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Live Kitchen Telemetry
          </h2>
          <div style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FF9F0A', fontWeight: 700 }}>
                  Live BOH Service Pipeline
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>Main Hot Line + Grill Station — Rush Stream</h3>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', color: '#FF9F0A', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF9F0A', display: 'inline-block' }} />
                WebSocket Ticket Feed Connected
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {kdsKpis.map((k, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{k.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '6px' }}>{k.value}</div>
                  <div style={{ fontSize: '12px', color: '#FF9F0A', fontWeight: 600 }}>{k.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── KDS FEATURES GRID ── */}
        <section aria-labelledby="kds-features-heading" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <h2 id="kds-features-heading" style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Engineered for High-Pressure Kitchen Lines
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
              Eliminate misread thermal paper slips, lost orders, and cold food waiting at the pass.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {kdsFeatures.map((f, i) => (
              <div key={i} style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: '#ffffff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── KITCHEN ONBOARDING STEPS ── */}
        <section style={{ backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px' }}>
              Fast Cook Onboarding
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Set up your kitchen station display in 3 simple steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { step: '01', title: 'Enter Restaurant Code', desc: 'Input your store slug or ID and register your kitchen cook account.' },
              { step: '02', title: 'Select Cook Station', desc: 'Choose your station filter: Hot, Cold, Bar, Grill, or Expo Runner.' },
              { step: '03', title: 'Fire & Bump', desc: 'Watch orders appear in real-time, prepare dishes, and bump completed tickets with one tap.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF9F0A', marginBottom: '8px' }}>{s.step}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px', borderRadius: '24px', backgroundColor: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px' }}>Ready to launch your kitchen station?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: '0 auto 28px', maxWidth: '540px' }}>
            Sign in to start receiving live tickets or onboard with your store code.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/login?portal=kitchen"
              style={{
                backgroundColor: '#FF9F0A',
                color: '#000000',
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(255,159,10,0.3)',
              }}
            >
              Sign In to Kitchen KDS →
            </Link>
            <Link
              href="/signup?role=kitchen"
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
              Onboard Kitchen Cook
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
