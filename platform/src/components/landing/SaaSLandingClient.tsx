'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './MiddayMarketing.module.css'
import ProminentzLogo from '@/components/brand/ProminentzLogo'

export default function SaaSLandingClient() {
  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Role tab state (Server | Kitchen | Manager)
  const [activeRole, setActiveRole] = useState<'server' | 'kitchen' | 'manager'>('server')

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  // Interactive ROI Savings Calculator state for small to mid-scale restaurants
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(45000)
  const [terminalsCount, setTerminalsCount] = useState<number>(3)

  // Calculation logic:
  // Prominentz: $50/mo flat * 12 = $600/year (all terminals & KDS included)
  const prominentzAnnual = 50 * 12

  // Typical Legacy POS (Toast, TouchBistro, Clover):
  // - Base software: $110/mo
  // - Extra terminal licenses: $65/mo per terminal beyond 1
  // - KDS screens: $45/mo per screen (assumed at least 1-2 for 3+ terminals)
  // - QR / Online dining add-on: $75/mo
  // - 0.45% hidden take-rate / processing penalty on volume
  const legacyKdsScreens = Math.max(1, Math.round(terminalsCount / 2))
  const legacyBaseAnnual = 110 * 12
  const legacyExtraTerminalsAnnual = Math.max(0, terminalsCount - 1) * 65 * 12
  const legacyKdsAnnual = legacyKdsScreens * 45 * 12
  const legacyQrAnnual = 75 * 12
  const legacyProcessingMarkupAnnual = monthlyRevenue * 12 * 0.0045 // 0.45% extra fee
  const legacyAnnualTotal = Math.round(
    legacyBaseAnnual + legacyExtraTerminalsAnnual + legacyKdsAnnual + legacyQrAnnual + legacyProcessingMarkupAnnual
  )
  const annualSavings = Math.max(0, legacyAnnualTotal - prominentzAnnual)

  // Ensure body background is pristine white on public marketing page
  useEffect(() => {
    document.body.style.backgroundColor = '#FFFFFF'
    document.body.style.color = '#171717'
    return () => {
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
    }
  }, [])

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  return (
    <div className={styles.page}>
      {/* ── 1. STICKY HEADER NAVIGATION ───────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.navInner}>
            {/* Brand Logo */}
            <Link href="/" className={styles.brand} aria-label="Prominentz Platform Home">
              <ProminentzLogo variant="app-icon" size={32} />
              <span className={styles.brandName}>Prominentz</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className={styles.navLinks} aria-label="Primary Navigation">
              <a href="#why-independent" className={styles.navLink}>Why Prominentz</a>
              <a href="#showcase" className={styles.navLink}>Live Demo</a>
              <a href="#roles" className={styles.navLink}>Roles</a>
              <a href="#hardware" className={styles.navLink}>Hardware</a>
              <a href="#comparison" className={styles.navLink}>Compare</a>
              <a href="#calculator" className={styles.navLink}>Calculator</a>
              <a href="#pricing" className={styles.navLink}>Pricing</a>
              <a href="#faq" className={styles.navLink}>FAQ</a>
            </nav>

            {/* Desktop Navigation Actions */}
            <div className={styles.navActions}>
              <Link href="/login" className={styles.signInLink}>
                Sign in
              </Link>
              <Link href="/signup" className={styles.btnPrimary}>
                Start Free Trial &mdash; $50/mo
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div
          id="mobile-nav-panel"
          className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}
        >
          <div className={styles.mobileNavLinks}>
            <a href="#why-independent" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Why Prominentz</a>
            <a href="#showcase" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Live Demo</a>
            <a href="#roles" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Roles &amp; Workflow</a>
            <a href="#hardware" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Hardware &amp; Printers</a>
            <a href="#comparison" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Comparison</a>
            <a href="#calculator" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Savings Calculator</a>
            <a href="#pricing" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          </div>
          <div className={styles.mobileActions}>
            <Link href="/login" className={styles.btnSecondary} onClick={() => setMobileMenuOpen(false)}>
              Sign in
            </Link>
            <Link href="/signup" className={styles.btnPrimary} onClick={() => setMobileMenuOpen(false)}>
              Start Free Trial &mdash; $50/mo
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ──────────────────────────────────────────────── */}
      <section className={styles.hero} aria-label="Introduction">
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>✦ Engineered for Independent &amp; Mid-Scale Restaurants</span>
            <h1 className={styles.heroTitle}>
              Stop paying $400/month for locked POS terminals. Run your dining room for $50 flat.
            </h1>
            <p className={styles.heroDescription}>
              Unify front-of-house point of sale, multi-station kitchen display systems (KDS), contactless QR table ordering, and WebUSB thermal printing on devices you already own. Zero hardware lock-in, zero take-rate on your food sales, and unbroken offline continuity.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/signup" className={styles.btnPrimary}>
                Start 14-Day Free Trial &mdash; $50/mo
              </Link>
              <a href="#calculator" className={styles.btnSecondary}>
                Calculate your annual savings &darr;
              </a>
            </div>

            {/* Feature Pills */}
            <div className={styles.heroPillRow}>
              <span className={styles.heroPill}>⚡ &lt; 1.2s Ticket Sync</span>
              <span className={styles.heroPill}>💰 0% Platform Take-Rate</span>
              <span className={styles.heroPill}>📱 BYOD: Any iPad, Tablet or PC</span>
              <span className={styles.heroPill}>📶 100% Offline Queue Continuity</span>
              <span className={styles.heroPill}>🖨️ Universal ESC/POS Thermal Direct</span>
              <span className={styles.heroPill}>💳 Direct Stripe Payouts</span>
            </div>
          </div>

          {/* Operational Metrics HUD */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>&lt; 1.2s</div>
              <div className={styles.kpiLabel}>Ticket Dispatch Latency</div>
              <div className={styles.kpiSub}>Instant sync from table to line</div>
            </div>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>0%</div>
              <div className={styles.kpiLabel}>Platform Take-Rate</div>
              <div className={styles.kpiSub}>Keep 100% of your food &amp; bar sales</div>
            </div>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>$0</div>
              <div className={styles.kpiLabel}>Proprietary Hardware Mandate</div>
              <div className={styles.kpiSub}>Use any iPad, Android, or laptop</div>
            </div>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>$50/mo</div>
              <div className={styles.kpiLabel}>All-Inclusive Predictable Rate</div>
              <div className={styles.kpiSub}>Unlimited terminals, tables &amp; staff</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. PAIN POINTS & PRACTICAL SOLUTIONS FOR OWNERS ──────────────── */}
      <section id="why-independent" className={styles.painSection} aria-label="Why Switch to Prominentz">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Built for Real Dining Rooms</span>
            <h2 className={styles.sectionTitle}>Why independent restaurant owners are ditching legacy POS.</h2>
            <p className={styles.sectionDesc}>
              Small to mid-scale restaurants operate on razor-thin margins. Legacy systems lock you into expensive contracts, take cuts of your sales, and charge per-screen fees. Prominentz changes that.
            </p>
          </div>

          <div className={styles.painGrid}>
            {/* Pain 1 */}
            <div className={styles.painCard}>
              <div className={styles.painTagOld}>✕ The Legacy Trap: Terminal Extortion</div>
              <h3 className={styles.painTitle}>Forced $1,500 proprietary hardware bundles</h3>
              <p className={styles.painOldText}>
                Legacy providers force you to buy expensive locked terminals, charging $60&ndash;$80/month for each additional screen and refusing to let you use tablets you already own.
              </p>
              <div className={styles.painTagNew}>✓ Prominentz Solution</div>
              <p className={styles.painNewText}>
                <strong>Bring Your Own Device (BYOD):</strong> Run Prominentz on any iPad, Samsung tablet, cheap Android handheld, or existing PC touchscreen. Connect unlimited screens at no extra fee.
              </p>
            </div>

            {/* Pain 2 */}
            <div className={styles.painCard}>
              <div className={styles.painTagOld}>✕ The Legacy Trap: Sneaky Take-Rates</div>
              <h3 className={styles.painTitle}>Siphoning 0.99% to 3.5% of your food revenue</h3>
              <p className={styles.painOldText}>
                Hidden &ldquo;order processing fees&rdquo;, mandatory online ordering add-ons, and payment markups quietly extract thousands from your bank account every quarter.
              </p>
              <div className={styles.painTagNew}>✓ Prominentz Solution</div>
              <p className={styles.painNewText}>
                <strong>0% Platform Take-Rate:</strong> We never touch your food sales. Connect your own direct Stripe account, keep 100% of your earnings, and get direct deposits on your normal payout schedule.
              </p>
            </div>

            {/* Pain 3 */}
            <div className={styles.painCard}>
              <div className={styles.painTagOld}>✕ The Legacy Trap: Saturday Night Blackouts</div>
              <h3 className={styles.painTitle}>Cloud-only POS systems that freeze when Wi-Fi drops</h3>
              <p className={styles.painOldText}>
                When your neighborhood internet cuts out during a 7:30 PM Saturday rush, legacy cloud terminals stop firing orders to the kitchen and leave servers helpless.
              </p>
              <div className={styles.painTagNew}>✓ Prominentz Solution</div>
              <p className={styles.painNewText}>
                <strong>Local Queue Continuity:</strong> Prominentz caches menu data and orders locally in the browser. Thermal tickets keep printing, checks stay open, and orders sync automatically once back online.
              </p>
            </div>

            {/* Pain 4 */}
            <div className={styles.painCard}>
              <div className={styles.painTagOld}>✕ The Legacy Trap: Multi-Year Hostage Contracts</div>
              <h3 className={styles.painTitle}>2 to 3-year contracts with brutal cancellation penalties</h3>
              <p className={styles.painOldText}>
                Try leaving a legacy POS and you are hit with $3,000+ early termination fees, locked hardware you cannot resell, and hostile customer retention tactics.
              </p>
              <div className={styles.painTagNew}>✓ Prominentz Solution</div>
              <p className={styles.painNewText}>
                <strong>Month-to-Month Freedom:</strong> No contracts. No termination fees. Cancel anytime in one click and export all your customer records, menus, and sales history in standard CSV format.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. LIVE PRODUCT SHOWCASE ──────────────────────────────────────── */}
      <section id="showcase" className={styles.showcaseSection} aria-label="Product Demonstration">
        <div className={styles.container}>
          <div className={styles.showcaseFrame}>
            {/* Header Meta Row */}
            <div className={styles.showcaseHeader}>
              <div className={styles.showcaseTitleGroup}>
                <span className={styles.showcaseDot} aria-hidden="true" />
                <span className={styles.showcaseLocation}>Main Dining Room &amp; Kitchen Line &middot; Service Live</span>
              </div>
              <span className={styles.showcaseBadge}>Dinner Rush &middot; Zero Latency</span>
            </div>

            {/* Operational Telemetry HUD */}
            <div className={styles.telemetryGrid}>
              <div className={styles.telemetryCell}>
                <div className={styles.telemetryLabel}>Active Covers</div>
                <div className={styles.telemetryValue}>54</div>
                <div className={styles.telemetrySub}>18 Tables Seated</div>
              </div>
              <div className={styles.telemetryCell}>
                <div className={styles.telemetryLabel}>Open Orders</div>
                <div className={styles.telemetryValue}>14 Checks</div>
                <div className={styles.telemetrySub}>8 in Kitchen Prep</div>
              </div>
              <div className={styles.telemetryCell}>
                <div className={styles.telemetryLabel}>Avg Ticket Time</div>
                <div className={styles.telemetryValue}>11.4 min</div>
                <div className={styles.telemetrySub}>Pacing on Target</div>
              </div>
              <div className={styles.telemetryCell}>
                <div className={styles.telemetryLabel}>Shift Net Sales</div>
                <div className={styles.telemetryValue}>$4,820.00</div>
                <div className={styles.telemetrySub}>0% Platform Commission</div>
              </div>
            </div>

            {/* Dual Column Operational Split */}
            <div className={styles.showcaseBody}>
              {/* Left Column: Floor Checks */}
              <div className={styles.showcaseLeft}>
                <div className={styles.panelHeading}>
                  <span>Active Floor Checks</span>
                  <span>3 of 14 Shown</span>
                </div>
                <div className={styles.orderCards}>
                  {/* Check 1 */}
                  <div className={styles.orderCard}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.orderTable}>Table 4 (Patio) &middot; 4 Guests</span>
                      <span className={styles.orderBadgeReady}>Fired to Line</span>
                    </div>
                    <div className={styles.orderCardItems}>
                      <span>2x Wagyu Burger (Med-Rare) &middot; 1x Truffle Fries &middot; 2x IPA</span>
                    </div>
                    <div className={styles.orderCardBottom}>
                      <span className={styles.orderServer}>Server: Jordan M.</span>
                      <span className={styles.orderTotal}>$102.00</span>
                    </div>
                  </div>

                  {/* Check 2 */}
                  <div className={styles.orderCard}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.orderTable}>Table 12 (Main) &middot; 2 Guests</span>
                      <span className={styles.orderBadgePrep}>Prep in Kitchen</span>
                    </div>
                    <div className={styles.orderCardItems}>
                      <span>1x Handmade Truffle Tagliatelle &middot; 1x Ribeye Steak &middot; 1x Barolo</span>
                    </div>
                    <div className={styles.orderCardBottom}>
                      <span className={styles.orderServer}>QR Dine-In Pay</span>
                      <span className={styles.orderTotal}>$148.50</span>
                    </div>
                  </div>

                  {/* Check 3 */}
                  <div className={styles.orderCard}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.orderTable}>Bar 3 &middot; 1 Guest</span>
                      <span className={styles.orderBadgeReady}>Tendered &middot; Split Check</span>
                    </div>
                    <div className={styles.orderCardItems}>
                      <span>2x Mezcal Paloma &middot; 1x Crispy Calamari</span>
                    </div>
                    <div className={styles.orderCardBottom}>
                      <span className={styles.orderServer}>Server: Elena K.</span>
                      <span className={styles.orderTotal}>$46.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Multi-Station KDS */}
              <div className={styles.showcaseRight}>
                <div className={styles.panelHeading}>
                  <span>Kitchen Line Station (Grill &amp; Sauté)</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>Sync &lt; 1.2s</span>
                </div>
                <div className={styles.kdsChitList}>
                  {/* Chit 1 */}
                  <div className={styles.kdsChit}>
                    <div className={styles.kdsChitTop}>
                      <span className={styles.kdsChitNumber}>CHIT #104 &middot; TBL 4</span>
                      <span className={styles.kdsChitTimer}>06:22</span>
                    </div>
                    <div className={styles.kdsChitItems}>
                      <div className={styles.kdsChitItem}>
                        <span>2x Wagyu Burger</span>
                        <span className={styles.kdsChitMod}>MED-RARE &middot; NO ONION</span>
                      </div>
                      <div className={styles.kdsChitItem}>
                        <span>1x Truffle Fries</span>
                        <span className={styles.kdsChitMod}>EXTRA CRISPY</span>
                      </div>
                    </div>
                    <div className={styles.kdsChitActions}>
                      <button type="button" className={styles.kdsChitBtnDone}>Bump Item</button>
                      <button type="button" className={styles.kdsChitBtnExpedite}>Expedite</button>
                    </div>
                  </div>

                  {/* Chit 2 */}
                  <div className={styles.kdsChit}>
                    <div className={styles.kdsChitTop}>
                      <span className={styles.kdsChitNumber}>CHIT #105 &middot; TBL 12</span>
                      <span className={styles.kdsChitTimer}>02:40</span>
                    </div>
                    <div className={styles.kdsChitItems}>
                      <div className={styles.kdsChitItem}>
                        <span>1x Truffle Tagliatelle</span>
                        <span className={styles.kdsChitMod}>ALLERGY: NUT-FREE</span>
                      </div>
                      <div className={styles.kdsChitItem}>
                        <span>1x Dry-Aged Ribeye</span>
                        <span className={styles.kdsChitMod}>MEDIUM &middot; CHIMICHURRI</span>
                      </div>
                    </div>
                    <div className={styles.kdsChitActions}>
                      <button type="button" className={styles.kdsChitBtnDone}>Bump Item</button>
                      <button type="button" className={styles.kdsChitBtnExpedite}>Expedite</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. INTERACTIVE SAVINGS CALCULATOR ─────────────────────────────── */}
      <section id="calculator" className={styles.calculatorSection} aria-label="Cost Savings Calculator">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Real Economics</span>
            <h2 className={styles.sectionTitle}>See how much you save every year with Prominentz.</h2>
            <p className={styles.sectionDesc}>
              Compare your actual costs against typical bundles from Toast, TouchBistro, Clover, and Square.
            </p>
          </div>

          <div className={styles.calculatorCard}>
            <div className={styles.calcControls}>
              {/* Control 1: Monthly Sales */}
              <div className={styles.calcGroup}>
                <div className={styles.calcLabelRow}>
                  <label htmlFor="revenue-slider" className={styles.calcLabel}>Estimated Monthly Food &amp; Beverage Sales</label>
                  <span className={styles.calcValueBadge}>${monthlyRevenue.toLocaleString()} / mo</span>
                </div>
                <input
                  id="revenue-slider"
                  type="range"
                  min={15000}
                  max={150000}
                  step={5000}
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className={styles.calcRange}
                  aria-label="Monthly sales revenue"
                />
                <div className={styles.calcButtonGroup}>
                  {[25000, 45000, 75000, 110000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`${styles.calcPillBtn} ${monthlyRevenue === val ? styles.calcPillBtnActive : ''}`}
                      onClick={() => setMonthlyRevenue(val)}
                    >
                      ${val / 1000}k/mo
                    </button>
                  ))}
                </div>
              </div>

              {/* Control 2: Terminals Count */}
              <div className={styles.calcGroup}>
                <div className={styles.calcLabelRow}>
                  <label htmlFor="terminals-slider" className={styles.calcLabel}>Active Terminals &amp; Kitchen Screens</label>
                  <span className={styles.calcValueBadge}>{terminalsCount} Screens</span>
                </div>
                <input
                  id="terminals-slider"
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={terminalsCount}
                  onChange={(e) => setTerminalsCount(Number(e.target.value))}
                  className={styles.calcRange}
                  aria-label="Number of terminals"
                />
                <div className={styles.calcButtonGroup}>
                  {[2, 3, 5, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`${styles.calcPillBtn} ${terminalsCount === count ? styles.calcPillBtnActive : ''}`}
                      onClick={() => setTerminalsCount(count)}
                    >
                      {count} Terminals
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Box */}
            <div className={styles.calcResultBox}>
              <div className={styles.calcSavingsLabel}>Your Estimated Annual Savings</div>
              <div className={styles.calcSavingsNumber}>
                ${annualSavings.toLocaleString()}
              </div>
              <div className={styles.calcSavingsSub}>saved every single year</div>

              <div className={styles.calcBreakdownList}>
                <div className={styles.calcBreakdownRow}>
                  <span>Prominentz Annual:</span>
                  <span style={{ fontWeight: 700, color: '#00E599' }}>${prominentzAnnual.toLocaleString()} / yr</span>
                </div>
                <div className={styles.calcBreakdownRow}>
                  <span>Typical Toast/Clover bill:</span>
                  <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>${legacyAnnualTotal.toLocaleString()} / yr</span>
                </div>
                <div className={styles.calcBreakdownRow}>
                  <span>Hardware upfront savings:</span>
                  <span style={{ color: '#FCD34D' }}>Save ~$1,500/terminal</span>
                </div>
              </div>

              <Link href="/signup" className={styles.btnWhite} style={{ width: '100%' }}>
                Claim Your $50/mo Rate &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. ROLE WORKFLOW TABS ────────────────────────────────────────── */}
      <section id="roles" className={styles.sectionRoles} aria-label="Role Experiences">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Every Role Synchronized</span>
            <h2 className={styles.sectionTitle}>Purpose-built interfaces for every station.</h2>
            <p className={styles.sectionDesc}>
              No convoluted multi-level menus. Servers, line cooks, and managers get tailored screens designed for 5-minute training.
            </p>
          </div>

          {/* Role Tabs */}
          <div className={styles.roleTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeRole === 'server'}
              aria-controls="panel-server"
              id="tab-server"
              tabIndex={activeRole === 'server' ? 0 : -1}
              className={`${styles.roleTab} ${activeRole === 'server' ? styles.roleTabActive : ''}`}
              onClick={() => setActiveRole('server')}
            >
              FOH Server Station
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeRole === 'kitchen'}
              aria-controls="panel-kitchen"
              id="tab-kitchen"
              tabIndex={activeRole === 'kitchen' ? 0 : -1}
              className={`${styles.roleTab} ${activeRole === 'kitchen' ? styles.roleTabActive : ''}`}
              onClick={() => setActiveRole('kitchen')}
            >
              BOH Kitchen KDS
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeRole === 'manager'}
              aria-controls="panel-manager"
              id="tab-manager"
              tabIndex={activeRole === 'manager' ? 0 : -1}
              className={`${styles.roleTab} ${activeRole === 'manager' ? styles.roleTabActive : ''}`}
              onClick={() => setActiveRole('manager')}
            >
              Owner &amp; Manager Control
            </button>
          </div>

          {/* Role Tab Panels */}
          <div className={styles.rolePanelContainer}>
            {activeRole === 'server' && (
              <div id="panel-server" role="tabpanel" aria-labelledby="tab-server" className={styles.rolePanel}>
                <div className={styles.rolePanelGrid}>
                  <div className={styles.rolePanelText}>
                    <h3 className={styles.rolePanelHeading}>Table-side speed that turns tables 12 minutes faster.</h3>
                    <p className={styles.rolePanelDesc}>
                      Designed for fast handheld order entry on phone or tablet. Fast-fire courses, seat-by-seat guest allocation, allergen tagging, and 3-tap split billing at the table.
                    </p>
                    <ul className={styles.roleFeatureList}>
                      <li>Seat-by-seat guest checks with one-touch bill splitting</li>
                      <li>Instant course pacing (Fire Appetizers, Hold Entrees)</li>
                      <li>Dietary tags (Nut-Free, Gluten-Free, Vegan) sent directly to kitchen line</li>
                      <li>PIN-protected quick server switching in under 1 second</li>
                    </ul>
                  </div>
                  <div className={styles.rolePanelVisual}>
                    <div className={styles.previewBox}>
                      <div className={styles.previewHeader}>
                        <span>Server Handheld &middot; Table 4</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>Active</span>
                      </div>
                      <div className={styles.previewItems}>
                        <div className={styles.previewRow}>
                          <span>Seat 1 &middot; Wagyu Burger (MR)</span>
                          <strong>$28.00</strong>
                        </div>
                        <div className={styles.previewRow}>
                          <span>Seat 2 &middot; Truffle Tagliatelle</span>
                          <strong>$26.00</strong>
                        </div>
                        <div className={styles.previewRow}>
                          <span>Seat 3 &middot; Crispy Calamari</span>
                          <strong>$18.00</strong>
                        </div>
                      </div>
                      <div className={styles.previewFooter}>
                        <button type="button" className={styles.btnSecondary} style={{ width: '48%', fontSize: '12px' }}>Split by Seat</button>
                        <button type="button" className={styles.btnPrimary} style={{ width: '48%', fontSize: '12px' }}>Fire to Kitchen</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === 'kitchen' && (
              <div id="panel-kitchen" role="tabpanel" aria-labelledby="tab-kitchen" className={styles.rolePanel}>
                <div className={styles.rolePanelGrid}>
                  <div className={styles.rolePanelText}>
                    <h3 className={styles.rolePanelHeading}>Kitchen display with real station routing &amp; 86 management.</h3>
                    <p className={styles.rolePanelDesc}>
                      Eliminate paper chit chaos. Automatically route orders to Grill, Sauté, Raw, or Bar stations with elapsed timers and color-coded pacing alerts.
                    </p>
                    <ul className={styles.roleFeatureList}>
                      <li>Automated station routing (Grill, Saute, Fryer, Cold, Bar)</li>
                      <li>One-tap item 86ing that instantly updates all server handhelds &amp; QR menus</li>
                      <li>Audible chimes &amp; visual alerts for rush tickets</li>
                      <li>Works on any touch screen, budget Android TV, or tablet</li>
                    </ul>
                  </div>
                  <div className={styles.rolePanelVisual}>
                    <div className={styles.previewBox}>
                      <div className={styles.previewHeader}>
                        <span>Station: Hot Line (Grill &amp; Fryer)</span>
                        <span style={{ color: '#D97706', fontWeight: 600 }}>Rush Pacing</span>
                      </div>
                      <div className={styles.previewItems}>
                        <div className={styles.previewRow}>
                          <span>Ticket #104 &middot; Table 4</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: '#059669' }}>04:12</span>
                        </div>
                        <div className={styles.previewRow}>
                          <span>Ticket #105 &middot; Table 12</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: '#D97706' }}>11:45</span>
                        </div>
                      </div>
                      <div className={styles.previewFooter}>
                        <button type="button" className={styles.btnSecondary} style={{ width: '48%', fontSize: '12px' }}>86 Item</button>
                        <button type="button" className={styles.btnPrimary} style={{ width: '48%', fontSize: '12px' }}>Bump Chit</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === 'manager' && (
              <div id="panel-manager" role="tabpanel" aria-labelledby="tab-manager" className={styles.rolePanel}>
                <div className={styles.rolePanelGrid}>
                  <div className={styles.rolePanelText}>
                    <h3 className={styles.rolePanelHeading}>Real-time telemetry, void audits, and automatic Z-reports.</h3>
                    <p className={styles.rolePanelDesc}>
                      Know your numbers from anywhere. Monitor live covers, hourly labor percentage, void/comp tracking with staff accountability, and automated end-of-shift reconciliation.
                    </p>
                    <ul className={styles.roleFeatureList}>
                      <li>Auditable void, comp, and discount tracking with mandatory manager PINs</li>
                      <li>Live shift labor-to-sales ratios updated every 60 seconds</li>
                      <li>Automated end-of-day Z-reports and cash drawer drawer reconciliations</li>
                      <li>Direct Stripe payout monitoring with 0% platform deductions</li>
                    </ul>
                  </div>
                  <div className={styles.rolePanelVisual}>
                    <div className={styles.previewBox}>
                      <div className={styles.previewHeader}>
                        <span>Shift Audit &middot; Live Floor Telemetry</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>Balanced</span>
                      </div>
                      <div className={styles.previewItems}>
                        <div className={styles.previewRow}>
                          <span>Net Food &amp; Beverage</span>
                          <strong>$4,820.00</strong>
                        </div>
                        <div className={styles.previewRow}>
                          <span>Card Payments (Stripe Direct)</span>
                          <strong>$4,210.00</strong>
                        </div>
                        <div className={styles.previewRow}>
                          <span>Cash in Drawer</span>
                          <strong>$610.00</strong>
                        </div>
                        <div className={styles.previewRow}>
                          <span>Manager Comps / Voids</span>
                          <span style={{ color: '#6B7280' }}>$24.00 (2 logged)</span>
                        </div>
                      </div>
                      <div className={styles.previewFooter}>
                        <button type="button" className={styles.btnSecondary} style={{ width: '100%', fontSize: '12px' }}>Generate Shift Z-Report</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 7. HARDWARE FREEDOM (BYOD) ────────────────────────────────────── */}
      <section id="hardware" className={styles.hardwareSection} aria-label="Hardware Freedom">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Zero Hardware Lock-In</span>
            <h2 className={styles.sectionTitle}>Use what you already own. Save thousands upfront.</h2>
            <p className={styles.sectionDesc}>
              No expensive proprietary terminals. Prominentz runs smoothly in any modern browser on hardware you already have.
            </p>
          </div>

          <div className={styles.hardwareGrid}>
            <div className={styles.hardwareCard}>
              <div className={styles.hardwareIcon}>📱</div>
              <h3 className={styles.hardwareTitle}>Tablets &amp; iPads</h3>
              <p className={styles.hardwareDesc}>Use any iPad (5th Gen+), iPad Air, iPad Mini, Samsung Galaxy Tab, or budget Lenovo Android tablet.</p>
              <ul className={styles.hardwareList}>
                <li>Apple iOS &amp; iPadOS</li>
                <li>Android 10+ Tablets</li>
                <li>Mounts to any standard stand</li>
              </ul>
            </div>

            <div className={styles.hardwareCard}>
              <div className={styles.hardwareIcon}>🖨️</div>
              <h3 className={styles.hardwareTitle}>Thermal ESC/POS Printers</h3>
              <p className={styles.hardwareDesc}>Direct WebUSB and LAN printing. Works with industry-standard 80mm and 58mm receipt printers.</p>
              <ul className={styles.hardwareList}>
                <li>Epson TM-T88 &amp; TM-T20</li>
                <li>Star Micronics TSP143</li>
                <li>Munbyn, Xprinter, Generic ESC/POS</li>
              </ul>
            </div>

            <div className={styles.hardwareCard}>
              <div className={styles.hardwareIcon}>💵</div>
              <h3 className={styles.hardwareTitle}>Cash Drawers</h3>
              <p className={styles.hardwareDesc}>Standard RJ11 cash drawer kick line connects directly to your thermal printer for automatic drawer open on cash tender.</p>
              <ul className={styles.hardwareList}>
                <li>Standard 24V RJ11 kick ports</li>
                <li>APG, Star, generic drawers</li>
                <li>Manual key override supported</li>
              </ul>
            </div>

            <div className={styles.hardwareCard}>
              <div className={styles.hardwareIcon}>💳</div>
              <h3 className={styles.hardwareTitle}>Card Readers &amp; QR Pay</h3>
              <p className={styles.hardwareDesc}>Seamless Stripe Terminal integration for contactless tap, chip, Apple Pay, plus instant table QR payment.</p>
              <ul className={styles.hardwareList}>
                <li>Stripe BBPOS WisePOS E</li>
                <li>Stripe Reader S700</li>
                <li>Contactless Table QR pay</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. HONEST COMPARISON: PROMINENTZ VS LEGACY POS ────────────────── */}
      <section id="comparison" className={styles.comparisonSection} aria-label="POS Comparison">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Transparent Economics</span>
            <h2 className={styles.sectionTitle}>Built to liberate restaurants from legacy POS lock-in.</h2>
            <p className={styles.sectionDesc}>
              Compare Prominentz against legacy systems like Toast, Square, Clover, and TouchBistro.
            </p>
          </div>

          <div className={styles.comparisonWrapper}>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th>Platform Feature</th>
                  <th>Prominentz</th>
                  <th>Toast POS</th>
                  <th>Square for Restaurants</th>
                  <th>Clover POS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Software Cost</td>
                  <td><span className={styles.tableCheck}>✓ $50 / mo Flat (All-Inclusive)</span></td>
                  <td><span className={styles.tableCross}>$69 &ndash; $165+ / mo base</span></td>
                  <td><span className={styles.tableCross}>$60+ / mo + add-on fees</span></td>
                  <td><span className={styles.tableCross}>$90 &ndash; $250+ / mo</span></td>
                </tr>
                <tr>
                  <td>Hardware Mandate</td>
                  <td><span className={styles.tableCheck}>✓ BYOD: Any iPad, Tablet, PC, Phone</span></td>
                  <td><span className={styles.tableCross}>$1,500+ Proprietary Hardware</span></td>
                  <td><span className={styles.tableCross}>Proprietary Register or iPads</span></td>
                  <td><span className={styles.tableCross}>$1,800+ Proprietary Station</span></td>
                </tr>
                <tr>
                  <td>Kitchen Display (KDS)</td>
                  <td><span className={styles.tableCheck}>✓ Included Free (Unlimited Screens)</span></td>
                  <td><span className={styles.tableCross}>$40 &ndash; $50 / mo per screen</span></td>
                  <td><span className={styles.tableCross}>$20 / mo per screen</span></td>
                  <td><span className={styles.tableCross}>$30 &ndash; $45 / mo per screen</span></td>
                </tr>
                <tr>
                  <td>Contactless QR Table Ordering</td>
                  <td><span className={styles.tableCheck}>✓ Included Free (Table Studio)</span></td>
                  <td><span className={styles.tableCross}>$50 &ndash; $100 / mo or $0.99 fee</span></td>
                  <td><span className={styles.tableCross}>$60 / mo add-on module</span></td>
                  <td><span className={styles.tableCross}>Requires 3rd party add-on</span></td>
                </tr>
                <tr>
                  <td>Thermal ESC/POS Printing</td>
                  <td><span className={styles.tableCheck}>✓ Native WebUSB (Epson, Star, Xprinter)</span></td>
                  <td><span className={styles.tableCross}>Proprietary Cloud Hub only</span></td>
                  <td><span className={styles.tableCross}>Limited supported hardware</span></td>
                  <td><span className={styles.tableCross}>Clover printers only</span></td>
                </tr>
                <tr>
                  <td>Platform Order Take-Rate</td>
                  <td><span className={styles.tableCheck}>✓ 0% Take-Rate on Food Sales</span></td>
                  <td><span className={styles.tableCross}>Hidden fees &amp; take-rates</span></td>
                  <td><span className={styles.tableCross}>Higher per-transaction rates</span></td>
                  <td><span className={styles.tableCross}>Card volume surcharges</span></td>
                </tr>
                <tr>
                  <td>Contracts &amp; Commitments</td>
                  <td><span className={styles.tableCheck}>✓ Month-to-Month &middot; Cancel Anytime</span></td>
                  <td><span className={styles.tableCross}>2&ndash;3 Year Inflexible Contracts</span></td>
                  <td><span className={styles.tableCross}>Month-to-month</span></td>
                  <td><span className={styles.tableCross}>3-Year Locked Lease</span></td>
                </tr>
                <tr>
                  <td>Offline Queue Resilience</td>
                  <td><span className={styles.tableCheck}>✓ Built-in Local Buffer Continuity</span></td>
                  <td><span className={styles.tableCross}>Intermittent or frozen lines</span></td>
                  <td><span className={styles.tableCross}>Limited offline mode</span></td>
                  <td><span className={styles.tableCross}>Degraded station mode</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 9. ZERO-RISK HOSPITALITY GUARANTEE ────────────────────────────── */}
      <section className={styles.guaranteeSection} aria-label="Hospitality Guarantees">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Operator Peace of Mind</span>
            <h2 className={styles.sectionTitle}>The Prominentz Zero-Risk Hospitality Guarantee.</h2>
            <p className={styles.sectionDesc}>
              We earn your business every month. No predatory sales contracts, no proprietary lock-ins, and no surprises.
            </p>
          </div>

          <div className={styles.guaranteeGrid}>
            <div className={styles.guaranteeCard}>
              <div className={styles.guaranteeBadge}>🛡️</div>
              <h3 className={styles.guaranteeTitle}>14-Day Full Unrestricted Trial</h3>
              <p className={styles.guaranteeDesc}>
                Set up your menu, connect your thermal printers, and run real shifts with zero payment information required upfront.
              </p>
            </div>

            <div className={styles.guaranteeCard}>
              <div className={styles.guaranteeBadge}>💰</div>
              <h3 className={styles.guaranteeTitle}>0% Platform Take-Rate Guarantee</h3>
              <p className={styles.guaranteeDesc}>
                We never touch a penny of your food or bar sales. Connect your own direct Stripe account and keep 100% of your customer revenue.
              </p>
            </div>

            <div className={styles.guaranteeCard}>
              <div className={styles.guaranteeBadge}>📋</div>
              <h3 className={styles.guaranteeTitle}>Complimentary 24h Menu Import</h3>
              <p className={styles.guaranteeDesc}>
                Send us a photo or PDF of your current restaurant menu, and our team will build your categories, modifiers, and pricing into your account.
              </p>
            </div>

            <div className={styles.guaranteeCard}>
              <div className={styles.guaranteeBadge}>🔓</div>
              <h3 className={styles.guaranteeTitle}>Month-to-Month &middot; Zero Exit Penalties</h3>
              <p className={styles.guaranteeDesc}>
                Cancel anytime in one click. We never hold your restaurant hostage with multi-year leases or early termination penalties.
              </p>
            </div>

            <div className={styles.guaranteeCard}>
              <div className={styles.guaranteeBadge}>📦</div>
              <h3 className={styles.guaranteeTitle}>100% Data Portability</h3>
              <p className={styles.guaranteeDesc}>
                Your data belongs to you. Export your complete order history, sales telemetry, and customer lists anytime in clean CSV format.
              </p>
            </div>

            <div className={styles.guaranteeCard}>
              <div className={styles.guaranteeBadge}>⚡</div>
              <h3 className={styles.guaranteeTitle}>Instant 5-Minute Staff Onboarding</h3>
              <p className={styles.guaranteeDesc}>
                Intuitive interfaces with 4-digit PIN authentication mean high-turnover front-of-house staff can be trained in under 5 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. TRANSPARENT PRICING SPOTLIGHT ─────────────────────────────── */}
      <section id="pricing" className={styles.pricingSection} aria-label="Transparent Pricing">
        <div className={styles.container}>
          <div className={styles.pricingBanner}>
            <div>
              <span className={styles.eyebrow} style={{ color: 'rgba(255,255,255,0.7)' }}>Single Predictable Plan</span>
              <h2 className={styles.pricingBannerTitle}>Everything your restaurant needs. One honest price.</h2>
              <p className={styles.pricingBannerDesc}>
                No terminal licensing fees. No kitchen screen surcharges. No hidden surprise add-ons at the end of the month.
              </p>
              <div className={styles.pricingFeatureList}>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Unlimited POS Terminals
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Unlimited Kitchen KDS Screens
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> QR Dine-In &amp; Digital Menus
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> WebUSB &amp; LAN Thermal Printing
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Local Offline Queue Continuity
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Split Bills &amp; Table Pacing
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Live Telemetry &amp; Shift Z-Reports
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> 24/7 Priority Support
                </div>
              </div>
            </div>

            <div className={styles.pricingPriceBox}>
              <div className={styles.pricingMonthly}>$50</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', marginBottom: '20px' }}>
                per month &middot; billed monthly ($500/yr annual)
              </div>
              <Link href="/signup" className={styles.btnWhite} style={{ width: '100%' }}>
                Start 14-Day Free Trial &rarr;
              </Link>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>
                Zero setup fees &middot; No credit card required &middot; Instant activation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FAQ ACCORDION ─────────────────────────────────────────────── */}
      <section id="faq" className={styles.sectionFaq} aria-label="Frequently Asked Questions">
        <div className={styles.container}>
          <div className={styles.faqContainer}>
            <div className={styles.sectionHeaderCenter}>
              <span className={styles.eyebrow}>Questions &amp; Answers</span>
              <h2 className={styles.sectionTitle}>Frequently asked questions by restaurant owners.</h2>
              <p className={styles.sectionDesc}>
                Direct answers to common questions about hardware, thermal printing, offline mode, and migration.
              </p>
            </div>

            <div className={styles.faqList}>
              {/* FAQ 1: Thermal Printing */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(0)}
                  aria-expanded={openFaqIndex === 0}
                  aria-controls="faq-ans-0"
                >
                  <span>Will Prominentz automatically print thermal receipts and kick open our cash drawer?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 0 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                <div
                  id="faq-ans-0"
                  className={`${styles.faqAnswer} ${openFaqIndex === 0 ? styles.faqAnswerOpen : ''}`}
                >
                  <p>
                    Yes. Prominentz communicates directly with thermal printers using native WebUSB and ESC/POS protocol. Connect standard Epson, Star Micronics, Munbyn, or generic 80mm printers directly to your tablet or PC via USB. Receipts print instantly and the cash drawer kicks open via the standard RJ11 connector without cloud delays.
                  </p>
                </div>
              </div>

              {/* FAQ 2: Hardware */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(1)}
                  aria-expanded={openFaqIndex === 1}
                  aria-controls="faq-ans-1"
                >
                  <span>Do I have to buy expensive hardware from Prominentz?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 1 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                <div
                  id="faq-ans-1"
                  className={`${styles.faqAnswer} ${openFaqIndex === 1 ? styles.faqAnswerOpen : ''}`}
                >
                  <p>
                    No. We believe locking restaurants into proprietary hardware is unethical. Prominentz works on any iPad (iOS 14+), Android tablet, Windows PC, Mac, or smartphone. You can use hardware you already own or buy affordable commercial tablets on Amazon.
                  </p>
                </div>
              </div>

              {/* FAQ 3: Offline Mode */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(2)}
                  aria-expanded={openFaqIndex === 2}
                  aria-controls="faq-ans-2"
                >
                  <span>What happens if our restaurant internet goes down during a rush?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 2 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                <div
                  id="faq-ans-2"
                  className={`${styles.faqAnswer} ${openFaqIndex === 2 ? styles.faqAnswerOpen : ''}`}
                >
                  <p>
                    Prominentz has an integrated IndexedDB offline queue. If your Wi-Fi drops, servers can still enter orders, checks remain editable, and orders buffer locally. Once internet connectivity is restored, all buffered records automatically synchronize with your cloud database with zero data loss.
                  </p>
                </div>
              </div>

              {/* FAQ 4: Payments & Take-Rate */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(3)}
                  aria-expanded={openFaqIndex === 3}
                  aria-controls="faq-ans-3"
                >
                  <span>How does payment processing work? Do you take a cut of our sales?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 3 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                <div
                  id="faq-ans-3"
                  className={`${styles.faqAnswer} ${openFaqIndex === 3 ? styles.faqAnswerOpen : ''}`}
                >
                  <p>
                    We have a strict 0% platform take-rate policy. You connect your own Stripe account with a single click. Customer payments deposit directly into your bank account on your normal schedule. You only pay standard Stripe processing fees with zero markups or technology surcharges from us.
                  </p>
                </div>
              </div>

              {/* FAQ 5: Switching from Toast */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(4)}
                  aria-expanded={openFaqIndex === 4}
                  aria-controls="faq-ans-4"
                >
                  <span>How difficult is it to switch from Toast, Square, or TouchBistro?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 4 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                <div
                  id="faq-ans-4"
                  className={`${styles.faqAnswer} ${openFaqIndex === 4 ? styles.faqAnswerOpen : ''}`}
                >
                  <p>
                    Most restaurants switch over in less than 24 hours. Send us your menu PDF or photo, and our onboarding team loads your categories, modifier groups, and pricing into your account for free. Since Prominentz runs in the browser, there are no proprietary software installations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. FINAL CALL TO ACTION ──────────────────────────────────────── */}
      <section className={styles.sectionCta} aria-label="Get Started">
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <h2 className={styles.ctaTitle}>Ready to run your restaurant on your own terms?</h2>
            <p className={styles.ctaDesc}>
              Join hundreds of independent dining rooms saving thousands every year with Prominentz.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/signup" className={styles.btnPrimary}>
                Start 14-Day Free Trial &mdash; $50/mo
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                Sign in to existing account
              </Link>
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '16px' }}>
              No credit card required &middot; 0% take-rate &middot; Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* ── 13. FOOTER ────────────────────────────────────────────────────── */}
      <footer className={styles.footer} aria-label="Site Footer">
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ProminentzLogo variant="app-icon" size={24} />
                <span style={{ fontWeight: 700, fontSize: '16px' }}>Prominentz</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, maxWidth: '300px', margin: 0 }}>
                The high-velocity restaurant operating system. Point of sale, KDS, QR dining, and thermal printing in one unified platform.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12px', color: '#059669', background: 'rgba(5, 150, 105, 0.08)', padding: '6px 12px', borderRadius: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
                <span>All Systems Operational &middot; 99.99% Uptime</span>
              </div>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Platform</div>
              <a href="#showcase" className={styles.footerLink}>Live Demo</a>
              <a href="#roles" className={styles.footerLink}>FOH &amp; BOH Roles</a>
              <a href="#hardware" className={styles.footerLink}>Hardware &amp; Printers</a>
              <a href="#comparison" className={styles.footerLink}>Toast Comparison</a>
              <Link href="/pricing" className={styles.footerLink}>Pricing</Link>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Solutions</div>
              <Link href="/portals/pos" className={styles.footerLink}>POS Terminal</Link>
              <Link href="/portals/kds" className={styles.footerLink}>Kitchen Display (KDS)</Link>
              <Link href="/menu" className={styles.footerLink}>QR Table Ordering</Link>
              <Link href="/portals/manager" className={styles.footerLink}>Manager Telemetry</Link>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Legal &amp; Security</div>
              <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
              <span className={styles.footerLink} style={{ color: '#9CA3AF' }}>PCI-DSS Level 1 via Stripe</span>
              <span className={styles.footerLink} style={{ color: '#9CA3AF' }}>Tenant Data Isolation</span>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div>&copy; {new Date().getFullYear()} Prominentz Technologies Inc. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
              <Link href="/terms" className={styles.footerLink}>Terms</Link>
              <Link href="/login" className={styles.footerLink}>Operator Portal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
