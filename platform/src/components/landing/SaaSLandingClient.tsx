'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export default function SaaSLandingClient() {
  // App Preview Tab State
  const [activeTab, setActiveTab] = useState<'pos' | 'kds' | 'ai'>('pos')

  // ROI Calculator State
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(85000)
  const [wasteReduction, setWasteReduction] = useState<number>(15)

  // Pricing State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')

  // Calculate annual savings: (monthlyRevenue * 12) * (wasteReduction / 100) * 0.12 avg food cost savings
  const annualSavings = Math.round((monthlyRevenue * 12) * (wasteReduction / 100) * 0.18)

  return (
    <div className="landing-root">
      <main id="main-content">
      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="landing-nav" aria-label="Main Navigation">
        <div className="landing-nav__inner">
          <Link href="/" className="landing-logo">
            <ProminentzLogo variant="full" size="sm" />
          </Link>

          <div className="landing-nav__links">
            <a href="#features">Features</a>
            <a href="#calculator">ROI Calculator</a>
            <a href="#pricing">Pricing</a>
            <Link href="/portals">Role Portals</Link>
          </div>

          <div className="landing-nav__actions">
            <Link href="/login" className="btn btn--secondary btn--sm">
              Sign In
            </Link>
            <Link href="/dashboard" className="btn btn--primary btn--sm">
              Open Platform →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <header className="landing-hero">
        <div className="landing-hero__eyebrow">
          <span className="pulse-dot" />
          <span>Prominentz — High-Speed Restaurant Operating System</span>
        </div>

        <h1 className="landing-hero__title">
          Where every <em>order</em> counts.<br />
          Unified POS, KDS &amp; Floor.
        </h1>

        <p className="landing-hero__sub">
          The single operating platform built for high-performance restaurants. Sync POS terminals, kitchen bump displays, floor tables, and staff shifts in real time.
        </p>

        <div className="landing-hero__ctas">
          <Link href="/signup" className="btn btn--primary btn--lg">
            Start 14-Day Free Trial
          </Link>
          <a href="#preview" className="btn btn--secondary btn--lg">
            View Live Interactive Demo
          </a>
        </div>

        {/* Live App Frame Preview */}
        <div id="preview" className="app-preview-frame card--glass">
          <div className="app-preview-header">
            <div className="traffic-lights">
              <span className="traffic-lights__dot traffic-lights__dot--close" />
              <span className="traffic-lights__dot traffic-lights__dot--min" />
              <span className="traffic-lights__dot traffic-lights__dot--expand" />
            </div>
            <div className="app-preview-tabs">
              <button
                className={`app-tab ${activeTab === 'pos' ? 'app-tab--active' : ''}`}
                onClick={() => setActiveTab('pos')}
              >
                🧾 POS Terminal
              </button>
              <button
                className={`app-tab ${activeTab === 'kds' ? 'app-tab--active' : ''}`}
                onClick={() => setActiveTab('kds')}
              >
                🍳 KDS Kitchen Display
              </button>
              <button
                className={`app-tab ${activeTab === 'ai' ? 'app-tab--active' : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                🧠 Resto IQ Assistant
              </button>
            </div>
            <div className="app-preview-status">
              <span className="status-dot status-dot--active" />
              <span className="text-xs text-secondary">Live System</span>
            </div>
          </div>

          <div className="app-preview-body">
            {activeTab === 'pos' && (
              <div className="preview-screen animate-fade-in">
                <div className="preview-grid">
                  <div className="preview-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">Table 4 — Patio</span>
                      <span className="badge badge--success">ACTIVE</span>
                    </div>
                    <p className="text-xs text-secondary mb-3">4 Guests · Server: Sarah M.</p>
                    <div className="text-xs font-mono mb-2">1x Truffle Pasta ($28.00)</div>
                    <div className="text-xs font-mono mb-2">2x Wagyu Burger ($48.00)</div>
                    <div className="text-xs font-mono mb-3">1x Pinot Noir ($18.00)</div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-secondary">Total (inc. tax)</span>
                      <span className="font-bold text-brand">$101.52</span>
                    </div>
                  </div>
                  <div className="preview-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">Bar 2</span>
                      <span className="badge badge--warning">PAYING</span>
                    </div>
                    <p className="text-xs text-secondary mb-3">1 Guest · Server: Alex T.</p>
                    <div className="text-xs font-mono mb-2">1x Smoked Mezcal ($19.00)</div>
                    <div className="text-xs font-mono mb-3">1x Oysters (6pc) ($24.00)</div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-secondary">Total</span>
                      <span className="font-bold text-brand">$46.44</span>
                    </div>
                  </div>
                  <div className="preview-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">Table 12 — Main Room</span>
                      <span className="badge badge--neutral">EMPTY</span>
                    </div>
                    <p className="text-xs text-secondary mb-3">6 Guests Capacity</p>
                    <div className="text-xs text-tertiary">Tap to seat walk-in or reservation</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kds' && (
              <div className="preview-screen animate-fade-in">
                <div className="preview-grid">
                  <div className="preview-card ticket-new">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-warning">#Ticket 402 — HOT STATION</span>
                      <span className="text-xs font-mono">01:42s</span>
                    </div>
                    <p className="text-xs text-secondary mb-2">Table 4 · 4 Items</p>
                    <div className="text-sm font-semibold mb-1">• 2x Wagyu Beef Burger (Medium-Rare)</div>
                    <div className="text-xs text-secondary mb-2">   └ Sub: Truffle Fries</div>
                    <div className="text-sm font-semibold">• 1x Hand-rolled Truffle Pasta</div>
                  </div>

                  <div className="preview-card ticket-in-progress">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-info">#Ticket 401 — COLD STATION</span>
                      <span className="text-xs font-mono">04:15s</span>
                    </div>
                    <p className="text-xs text-secondary mb-2">Table 7 · 2 Items</p>
                    <div className="text-sm font-semibold mb-1">• 1x Burrata & Heirloom Tomato</div>
                    <div className="text-sm font-semibold">• 1x Hamachi Crudo</div>
                  </div>

                  <div className="preview-card ticket-ready">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-success">#Ticket 399 — EXPO</span>
                      <span className="badge badge--success">READY FOR RUNNER</span>
                    </div>
                    <p className="text-xs text-secondary mb-2">Table 2 · All items completed</p>
                    <div className="text-sm font-semibold text-secondary">Placed on heat lamps 45s ago</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="preview-screen animate-fade-in">
                <div className="card card--elevated flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="badge badge--brand">Resto IQ · Llama 3.1</span>
                    <span className="text-xs text-secondary">Real-Time Predictive Directive</span>
                  </div>
                  <h4 className="font-bold text-lg text-primary">
                    📈 Weekend Sales & Stockout Warning
                  </h4>
                  <p className="text-sm text-secondary">
                    &quot;Based on last Friday&apos;s demand (+28% Wagyu Burger sales), stock of <strong>Wagyu Beef Patties</strong> will run out by Saturday 8:30 PM. Recommended action: Draft PO #042 to Metro Wholesalers for +15 kg.&quot;
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="badge badge--warning">Action Ready: 86 Item</span>
                    <span className="badge badge--success">Action Ready: Auto Draft PO</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Bento Grid Features ──────────────────────────────────────────── */}
      <section id="features" className="landing-section">
        <div className="container">
          <div className="text-center mb-12">
            <span className="section-label">Built For Speed &amp; Precision</span>
            <h2 className="section-title">Intelligence in every order.</h2>
          </div>

          <div className="bento-grid">
            {/* Card 1 — Large */}
            <div className="bento-card bento-card--large card--glass">
              <div className="bento-card__badge">⚡ REAL-TIME SYNC</div>
              <h3 className="bento-card__title">Real-Time POS &amp; KDS Event Pipeline</h3>
              <p className="bento-card__desc">
                When a server punches in an order on the floor, kitchen tickets render in real time on KDS monitors with high-speed websocket synchronization to prevent lost orders.
              </p>
              <div className="bento-card__visual">
                <div className="event-pill">
                  <span className="status-dot status-dot--active" />
                  <span>order.created → Table 4</span>
                  <span className="font-mono text-xs text-secondary">12ms</span>
                </div>
                <div className="event-pill">
                  <span className="status-dot status-dot--active" />
                  <span>kds.ticket.sent → Hot Station</span>
                  <span className="font-mono text-xs text-secondary">18ms</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bento-card card--glass">
              <div className="bento-card__badge">🧠 LLAMA 3.1 AI</div>
              <h3 className="bento-card__title">Resto IQ Analytics</h3>
              <p className="bento-card__desc">
                Predict sales trends, analyze labor percentages, and run store audits with zero API markups.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bento-card card--glass">
              <div className="bento-card__badge">📦 AUTO-86 PREVENT</div>
              <h3 className="bento-card__title">Recipe Ingredient Depletion</h3>
              <p className="bento-card__desc">
                Stock deducts automatically per dish sold. Items automatically 86 before kitchen surprises happen.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bento-card bento-card--wide card--glass">
              <div className="bento-card__badge">📍 MULTI-LOCATION HQ</div>
              <h3 className="bento-card__title">Unified Multi-Outlet Command Center</h3>
              <p className="bento-card__desc">
                Manage menus, prices, staff permissions, and financial consolidation across 1 to 100+ restaurant locations seamlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI Savings Calculator ───────────────────────────────────────── */}
      <section id="calculator" className="landing-section">
        <div className="container">
          <div className="card card--glass roi-card">
            <div className="roi-grid">
              <div className="roi-controls">
                <span className="section-label">Interactive ROI Calculator</span>
                <h3 className="section-title mb-4">Calculate your annual savings.</h3>
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary">Average Monthly Store Revenue</span>
                    <span className="font-bold text-brand">${monthlyRevenue.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="300000"
                    step="5000"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary">Target Food Waste &amp; Error Reduction</span>
                    <span className="font-bold text-brand">{wasteReduction}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={wasteReduction}
                    onChange={(e) => setWasteReduction(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>
              </div>

              <div className="roi-result">
                <div className="roi-badge">ESTIMATED ANNUAL RETURN</div>
                <div className="roi-amount">${annualSavings.toLocaleString()}</div>
                <p className="text-xs text-secondary mt-2">
                  Based on automated recipe depletion, reduced kitchen prep delays, and optimized shift scheduling.
                </p>
                <p className="text-xs text-secondary" style={{ fontStyle: 'italic', opacity: 0.8, marginTop: '4px' }}>
                  *Illustrative estimates based on typical industry benchmarks. Actual returns depend on store volume, menu structure, and operational execution.
                </p>
                <Link href="/login" className="btn btn--primary btn--full mt-6">
                  Start Saving Today →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SaaS Pricing Section ─────────────────────────────────────────── */}
      <section id="pricing" className="landing-section">
        <div className="container">
          <div className="text-center mb-8">
            <span className="section-label">Transparent SaaS Plans</span>
            <h2 className="section-title">Simple pricing for restaurants of all sizes.</h2>
            
            <div className="pricing-toggle mt-6">
              <button
                className={`toggle-btn ${billingCycle === 'monthly' ? 'toggle-btn--active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`toggle-btn ${billingCycle === 'annual' ? 'toggle-btn--active' : ''}`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual <span className="discount-badge">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="pricing-grid" style={{ maxWidth: '820px', margin: '0 auto' }}>
            {/* Basic Plan — Featured */}
            <div className="pricing-card pricing-card--featured card--glass">
              <div className="featured-badge">MOST POPULAR · $40/MO</div>
              <div className="pricing-header">
                <h4 className="pricing-title">Basic Plan</h4>
                <p className="pricing-desc">Complete, high-speed restaurant operating foundation.</p>
                <div className="pricing-price">
                  <span className="amount">${billingCycle === 'annual' ? '32' : '40'}</span>
                  <span className="period">/ month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>✓ Full POS Terminal &amp; Floor Management</li>
                <li>✓ Real-Time Kitchen Display System (KDS)</li>
                <li>✓ Table &amp; Menu QR Code Studio (Direct-to-KDS)</li>
                <li>✓ Table Quick Status Switcher &amp; Bill Splitter</li>
                <li>✓ Table-Side Cash &amp; Card Payments</li>
                <li>✓ Inventory Stock &amp; Depletion Tracking</li>
                <li>✓ Staff Clock-In &amp; Shift Management</li>
                <li>✓ End-of-Day Z-Reports &amp; Sales Analytics</li>
              </ul>
              <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.25)', fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: '12px 0' }}>
                <span style={{ color: '#ef4444', fontWeight: 800 }}>✕ Not in Basic:</span> Intelligence (AI Agent), Guest CRM &amp; Loyalty Rewards (in development).
              </div>
              <Link href="/pricing/starter" className="btn btn--primary btn--full mt-4">
                Get Started with Basic ($40/mo)
              </Link>
            </div>

            {/* Enterprise */}
            <div className="pricing-card card--glass">
              <div className="pricing-header">
                <h4 className="pricing-title">Enterprise</h4>
                <p className="pricing-desc">For high-volume chains &amp; franchise operators.</p>
                <div className="pricing-price">
                  <span className="amount">Custom</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>✓ Multi-Location HQ Hierarchy</li>
                <li>✓ Dedicated Database Cluster</li>
                <li>✓ Custom POS Hardware Integrations</li>
                <li>✓ High-Volume Transaction Volume SLA</li>
                <li>✓ 24/7 Dedicated Account Manager</li>
                <li>✓ Priority Engineering Support</li>
              </ul>
              <Link href="/pricing/enterprise" className="btn btn--secondary btn--full mt-6">
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer" aria-label="Site Footer">
        <div className="container flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <ProminentzLogo variant="full" size="sm" />
            <span className="text-xs text-secondary">© 2026 Prominentz Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-5 text-xs text-secondary flex-wrap">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link href="/portals">Workspaces</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('prominentz:open-cookie-settings'))
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Cookie Settings
            </button>
            <Link href="/login">Sign In</Link>
            <span className="flex items-center gap-1">
              <span className="status-dot status-dot--active" /> Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
