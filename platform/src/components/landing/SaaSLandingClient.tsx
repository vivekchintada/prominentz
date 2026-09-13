'use client'

import React, { useState } from 'react'
import Link from 'next/link'

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
      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav__inner">
          <Link href="/" className="landing-logo">
            <span className="landing-logo__mark">R</span>
            <span className="landing-logo__text">Resto</span>
            <span className="landing-logo__badge">AI</span>
          </Link>

          <div className="landing-nav__links">
            <a href="#features">Features</a>
            <a href="#intelligence">Resto IQ</a>
            <a href="#calculator">ROI Calculator</a>
            <a href="#pricing">Pricing</a>
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
          <span>Resto AI 2.0 is Live — Powered by Llama 3.1</span>
        </div>

        <h1 className="landing-hero__title">
          Where every <em>detail</em> matters.<br />
          Unified FOH + BOH + AI.
        </h1>

        <p className="landing-hero__sub">
          The single operating platform built for modern restaurant groups. Sync POS, kitchen displays, inventory depletion, and predictive analytics in real time.
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
              <div className="bento-card__badge">⚡ SUB-100MS SYNC</div>
              <h3 className="bento-card__title">Real-Time POS &amp; KDS Event Pipeline</h3>
              <p className="bento-card__desc">
                When a server punches in an order on the floor, kitchen tickets render instantly on KDS monitors. Zero lag, zero lost paper chits.
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

          <div className="pricing-grid">
            {/* Starter */}
            <div className="pricing-card card--glass">
              <div className="pricing-header">
                <h4 className="pricing-title">Starter</h4>
                <p className="pricing-desc">For single-location bistros and cafes.</p>
                <div className="pricing-price">
                  <span className="amount">${billingCycle === 'annual' ? '39' : '49'}</span>
                  <span className="period">/ month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>✓ 1 Location</li>
                <li>✓ POS Terminal Interface</li>
                <li>✓ Basic KDS Monitor</li>
                <li>✓ Up to 5 Employee Profiles</li>
                <li>✓ Standard Sales Reporting</li>
              </ul>
              <Link href="/pricing/starter" className="btn btn--secondary btn--full mt-6">
                Get Starter Plan
              </Link>
            </div>

            {/* Pro — Featured */}
            <div className="pricing-card pricing-card--featured card--glass">
              <div className="featured-badge">MOST POPULAR</div>
              <div className="pricing-header">
                <h4 className="pricing-title">Pro Plan</h4>
                <p className="pricing-desc">For high-volume restaurants and multi-outlets.</p>
                <div className="pricing-price">
                  <span className="amount">${billingCycle === 'annual' ? '119' : '149'}</span>
                  <span className="period">/ month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>✓ Up to 3 Locations</li>
                <li>✓ Unlimited POS &amp; KDS Terminals</li>
                <li>✓ Resto IQ Llama 3.1 AI Intelligence</li>
                <li>✓ Automated 86 Stock &amp; Recipe Depletion</li>
                <li>✓ Labor Shifts &amp; Leave Approvals</li>
                <li>✓ Stripe Split Checkout</li>
              </ul>
              <Link href="/pricing/pro" className="btn btn--primary btn--full mt-6">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="pricing-card card--glass">
              <div className="pricing-header">
                <h4 className="pricing-title">Enterprise</h4>
                <p className="pricing-desc">For national chains &amp; franchise operators.</p>
                <div className="pricing-price">
                  <span className="amount">Custom</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>✓ Unlimited Outlets &amp; HQ Hierarchy</li>
                <li>✓ Dedicated Database Cluster</li>
                <li>✓ Custom POS Hardware Integrations</li>
                <li>✓ 24/7 Dedicated Account Manager</li>
                <li>✓ Custom SLA &amp; Uptime Guarantee</li>
              </ul>
              <Link href="/pricing/enterprise" className="btn btn--secondary btn--full mt-6">
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="container flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="landing-logo__mark">R</span>
            <span className="text-sm font-bold">Resto AI</span>
            <span className="text-xs text-secondary">© 2026 Resto AI Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-secondary">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login">Sign In</Link>
            <span className="flex items-center gap-1">
              <span className="status-dot status-dot--active" /> All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
