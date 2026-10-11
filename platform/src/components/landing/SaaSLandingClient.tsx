'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './MiddayMarketing.module.css'

export default function SaaSLandingClient() {
  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Role tab state (Server | Kitchen | Manager)
  const [activeRole, setActiveRole] = useState<'server' | 'kitchen' | 'manager'>('server')

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

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

  // Keyboard navigation for role tabs (ArrowLeft / ArrowRight)
  const roleTabs: Array<'server' | 'kitchen' | 'manager'> = ['server', 'kitchen', 'manager']
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIndex = (index + 1) % roleTabs.length
      setActiveRole(roleTabs[nextIndex])
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevIndex = (index - 1 + roleTabs.length) % roleTabs.length
      setActiveRole(roleTabs[prevIndex])
    }
  }

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  return (
    <div className={styles.page}>
      {/* ── 1. NAVIGATION ─────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.navInner}>
            {/* Brand Logo */}
            <Link href="/" className={styles.brand} aria-label="Prominentz Platform Home">
              <span className={styles.brandMark} aria-hidden="true">P</span>
              <span className={styles.brandName}>Prominentz</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className={styles.navLinks} aria-label="Primary Navigation">
              <a href="#showcase" className={styles.navLink}>Live Demo</a>
              <a href="#roles" className={styles.navLink}>Roles</a>
              <a href="#hardware" className={styles.navLink}>Hardware &amp; Printers</a>
              <a href="#qr-dining" className={styles.navLink}>QR Dining</a>
              <a href="#features" className={styles.navLink}>Features</a>
              <a href="#comparison" className={styles.navLink}>Comparison</a>
              <Link href="/pricing" className={styles.navLink}>Pricing ($40/mo)</Link>
              <a href="#faq" className={styles.navLink}>FAQ</a>
            </nav>

            {/* Desktop Navigation Actions */}
            <div className={styles.navActions}>
              <Link href="/login" className={styles.signInLink}>
                Sign in
              </Link>
              <Link href="/signup" className={styles.btnPrimary}>
                Get started — $40/mo
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
            <a href="#showcase" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Live Demo</a>
            <a href="#roles" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Roles</a>
            <a href="#hardware" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Hardware &amp; Printers</a>
            <a href="#qr-dining" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>QR Dining</a>
            <a href="#features" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#comparison" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Comparison</a>
            <Link href="/pricing" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Pricing ($40/mo)</Link>
            <a href="#faq" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          </div>
          <div className={styles.mobileActions}>
            <Link href="/login" className={styles.btnSecondary} onClick={() => setMobileMenuOpen(false)}>
              Sign in
            </Link>
            <Link href="/signup" className={styles.btnPrimary} onClick={() => setMobileMenuOpen(false)}>
              Get started — $40/mo
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ──────────────────────────────────────────────── */}
      <section className={styles.hero} aria-label="Introduction">
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>✦ Next-Generation Restaurant OS</span>
            <h1 className={styles.heroTitle}>
              The all-in-one operating system engineered for modern dining rooms.
            </h1>
            <p className={styles.heroDescription}>
              Unify front-of-house point of sale, multi-station kitchen display systems (KDS), contactless QR table ordering, WebUSB thermal printing, and live floor telemetry in one seamless workspace.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/signup" className={styles.btnPrimary}>
                Get started — $40/mo
              </Link>
              <a href="#showcase" className={styles.btnSecondary}>
                Explore live demo
              </a>
            </div>

            {/* Feature Pills */}
            <div className={styles.heroPillRow}>
              <span className={styles.heroPill}>⚡ &lt; 1.2s KDS Sync</span>
              <span className={styles.heroPill}>🖨️ WebUSB &amp; ESC/POS Thermal Direct</span>
              <span className={styles.heroPill}>📱 Contactless QR Table Dine-In</span>
              <span className={styles.heroPill}>🤖 Prominentz AI Concierge</span>
              <span className={styles.heroPill}>💳 Split-Check &amp; Stripe Direct</span>
              <span className={styles.heroPill}>📶 Offline Queue Continuity</span>
            </div>
          </div>

          {/* Live Operational Metrics HUD — Symmetrical Container Alignment */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>&lt; 1.2s</div>
              <div className={styles.kpiLabel}>Ticket Dispatch Latency</div>
              <div className={styles.kpiSub}>Instant sync from table to line</div>
            </div>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>99.99%</div>
              <div className={styles.kpiLabel}>Service Uptime &amp; Offline Queue</div>
              <div className={styles.kpiSub}>Continuous orders during Wi-Fi drops</div>
            </div>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>0%</div>
              <div className={styles.kpiLabel}>Platform Take-Rate</div>
              <div className={styles.kpiSub}>Keep 100% of your food sales</div>
            </div>
            <div className={styles.kpiCell}>
              <div className={styles.kpiValue}>$40/mo</div>
              <div className={styles.kpiLabel}>All-Inclusive Predictable Rate</div>
              <div className={styles.kpiSub}>Unlimited terminals, tables &amp; staff</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. LARGE PRODUCT SHOWCASE ─────────────────────────────────────── */}
      <section id="showcase" className={styles.showcaseSection} aria-label="Product Demonstration">
        <div className={styles.container}>
          <div className={styles.showcaseFrame}>
            {/* Header Meta Row */}
            <div className={styles.showcaseHeader}>
              <div className={styles.showcaseTitleGroup}>
                <span className={styles.showcaseDot} aria-hidden="true" />
                <span className={styles.showcaseLocation}>The Audrey &amp; Co. · Main Dining &amp; Line</span>
              </div>
              <span className={styles.showcaseBadge}>Dinner Service · Live Feed</span>
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
                <div className={styles.telemetrySub}>Within Target Pacing</div>
              </div>
              <div className={styles.telemetryCell}>
                <div className={styles.telemetryLabel}>Shift Net Sales</div>
                <div className={styles.telemetryValue}>$4,820.00</div>
                <div className={styles.telemetrySub}>Tendered &amp; Open</div>
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
                      <span className={styles.orderTable}>Table 4 (Patio) · 4 Guests</span>
                      <span className={`${styles.orderStatus} ${styles.orderStatusKitchen}`}>In Kitchen</span>
                    </div>
                    <div className={styles.orderMeta}>Server: Sarah M. · Fired 8m ago</div>
                    <div className={styles.orderItems}>
                      <div className={styles.orderItemRow}>
                        <span>2x Wagyu Sirloin (Med-Rare)</span>
                        <span>$96.00</span>
                      </div>
                      <div className={styles.orderItemRow}>
                        <span>1x Truffle Tagliatelle (No Parm)</span>
                        <span>$28.00</span>
                      </div>
                      <div className={styles.orderItemRow}>
                        <span>1x Hamachi Crudo (GF)</span>
                        <span>$22.00</span>
                      </div>
                      <div className={styles.orderItemRow}>
                        <span>2x Nebbiolo di Barolo</span>
                        <span>$36.00</span>
                      </div>
                    </div>
                    <div className={styles.orderCardFooter}>
                      <span>Check Total (inc. tax)</span>
                      <span className={styles.orderTotal}>$182.00</span>
                    </div>
                  </div>

                  {/* Check 2 */}
                  <div className={styles.orderCard}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.orderTable}>Table 9 (Booth) · 2 Guests</span>
                      <span className={`${styles.orderStatus} ${styles.orderStatusServed}`}>Served</span>
                    </div>
                    <div className={styles.orderMeta}>Server: Alex T. · Fired 24m ago</div>
                    <div className={styles.orderItems}>
                      <div className={styles.orderItemRow}>
                        <span>1x Roasted Atlantic Halibut</span>
                        <span>$38.00</span>
                      </div>
                      <div className={styles.orderItemRow}>
                        <span>1x Dry-Aged Ribeye (Medium)</span>
                        <span>$54.00</span>
                      </div>
                      <div className={styles.orderItemRow}>
                        <span>1x Domaine Vacheron Sancerre</span>
                        <span>$24.00</span>
                      </div>
                    </div>
                    <div className={styles.orderCardFooter}>
                      <span>Check Total (inc. tax)</span>
                      <span className={styles.orderTotal}>$116.00</span>
                    </div>
                  </div>

                  {/* Check 3 */}
                  <div className={styles.orderCard}>
                    <div className={styles.orderCardTop}>
                      <span className={styles.orderTable}>Bar 3 (High Top) · 1 Guest</span>
                      <span className={`${styles.orderStatus} ${styles.orderStatusPay}`}>Settling Check</span>
                    </div>
                    <div className={styles.orderMeta}>Server: Elena R. · Split Tender</div>
                    <div className={styles.orderItems}>
                      <div className={styles.orderItemRow}>
                        <span>1x Smoked Mezcal Negroni</span>
                        <span>$18.00</span>
                      </div>
                      <div className={styles.orderItemRow}>
                        <span>1x Oysters (Half Dozen)</span>
                        <span>$24.00</span>
                      </div>
                    </div>
                    <div className={styles.orderCardFooter}>
                      <span>Check Total (inc. tax)</span>
                      <span className={styles.orderTotal}>$42.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Station Routing */}
              <div className={styles.showcaseRight}>
                <div className={styles.panelHeading}>
                  <span>Kitchen Station Routing</span>
                  <span>Real-Time KDS</span>
                </div>
                <div className={styles.stationList}>
                  {/* Grill Station */}
                  <div className={styles.stationCard}>
                    <div className={styles.stationTop}>
                      <span className={styles.stationName}>Grill Station</span>
                      <span className={styles.stationPace}>4 chits · 9m avg</span>
                    </div>
                    <div className={styles.stationItems}>
                      <div className={styles.stationTicket}>
                        <span>#104 · Table 4: 2x Wagyu Sirloin (Med-Rare)</span>
                        <span>07:40</span>
                      </div>
                      <div className={styles.stationTicket}>
                        <span>#107 · Table 9: 1x Dry-Aged Ribeye (Medium)</span>
                        <span>04:15</span>
                      </div>
                    </div>
                  </div>

                  {/* Sauté Station */}
                  <div className={styles.stationCard}>
                    <div className={styles.stationTop}>
                      <span className={styles.stationName}>Sauté &amp; Pasta Station</span>
                      <span className={styles.stationPace}>3 chits · 7m avg</span>
                    </div>
                    <div className={styles.stationItems}>
                      <div className={styles.stationTicket}>
                        <span>#104 · Table 4: 1x Truffle Tagliatelle</span>
                        <span>06:50</span>
                      </div>
                      <div className={`${styles.stationTicket} ${styles.stationTicketAlert}`}>
                        <span>#106 · Table 12: 2x Wild Mushroom Risotto</span>
                        <span>12:10</span>
                      </div>
                    </div>
                  </div>

                  {/* Cold & Pantry Station */}
                  <div className={styles.stationCard}>
                    <div className={styles.stationTop}>
                      <span className={styles.stationName}>Cold &amp; Raw Bar</span>
                      <span className={styles.stationPace}>1 chit · 3m avg</span>
                    </div>
                    <div className={styles.stationItems}>
                      <div className={styles.stationTicket}>
                        <span>#108 · Table 4: 1x Hamachi Crudo (GF)</span>
                        <span>02:30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Showcase Footer Note */}
            <div className={styles.showcaseFooter}>
              <span>Illustrative operational preview · Sanitized sample data for demonstration</span>
              <span>All modules synchronized in real time</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HARDWARE FREEDOM & THERMAL PRINTING ───────────────────────── */}
      <section id="hardware" className={styles.hardwareSection} aria-label="Hardware & Printing">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Hardware Freedom &amp; Thermal Printing</span>
            <h2 className={styles.sectionTitle}>No locked-in $2,000 terminals. Bring any device and printer.</h2>
            <p className={styles.sectionDesc}>
              Prominentz runs natively in any modern browser on iPads, Android tablets, touchscreen monitors, and PC workstations with zero proprietary driver bloat.
            </p>
          </div>

          <div className={styles.hardwareGrid}>
            {/* Card 1 */}
            <div className={styles.hardwareCard}>
              <div>
                <div className={styles.hardwareIconBox}>🖨️</div>
                <h3 className={styles.hardwareTitle}>WebUSB ESC/POS Thermal Direct</h3>
                <p className={styles.hardwareDesc}>
                  Direct binary spooling for Epson, Star Micronics, TVS-E, and Xprinter thermal printers (80mm &amp; 58mm). Automatic paper cutting, formatted bills, and zero external print bridge software.
                </p>
              </div>
              <div className={styles.hardwareBadge}>
                <span>PROTOCOL: RAW ESC/POS BULK USB</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className={styles.hardwareCard}>
              <div>
                <div className={styles.hardwareIconBox}>⚡</div>
                <h3 className={styles.hardwareTitle}>Auto-Spool &amp; Drawer Kick</h3>
                <p className={styles.hardwareDesc}>
                  Configurable solenoid pulse kicks the RJ11/RJ12 cash drawer open automatically upon cash checkout. Kiosk &amp; Table QR orders bypass manual cashier clicks and auto-spool straight to prep lines.
                </p>
              </div>
              <div className={styles.hardwareBadge}>
                <span>TRIGGER: SOLENOID RJ11/RJ12 KICK</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className={styles.hardwareCard}>
              <div>
                <div className={styles.hardwareIconBox}>📱</div>
                <h3 className={styles.hardwareTitle}>Any Screen, Any Station</h3>
                <p className={styles.hardwareDesc}>
                  Use standard consumer hardware. Turn an iPad into a host stand, smartphones into server handhelds, and wall-mounted commercial monitors into kitchen display screens.
                </p>
              </div>
              <div className={styles.hardwareBadge}>
                <span>PLATFORMS: IOS · ANDROID · MACOS · WINDOWS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. CONTACTLESS QR TABLE ORDERING & AI CONCIERGE ──────────────── */}
      <section id="qr-dining" className={styles.qrSection} aria-label="Contactless QR Dining">
        <div className={styles.container}>
          <div className={styles.qrGrid}>
            <div className={styles.qrCopy}>
              <span className={styles.eyebrow}>Self-Service Hospitality</span>
              <h2 className={styles.sectionTitle}>Turn every table into an interactive digital concierge.</h2>
              <p className={styles.sectionDesc}>
                Guests scan high-resolution dynamic QR codes on their tables to browse your live menu with real-time stock sync, dietary filters, intelligent wine pairings, and instant tableside checkout.
              </p>
              <div className={styles.roleFeatures} style={{ marginTop: '24px' }}>
                <div className={styles.roleFeatureItem}>
                  <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Prominentz AI Concierge:</strong> Smart wine pairings, dietary allergen filtering, and upsell suggestions.</span>
                </div>
                <div className={styles.roleFeatureItem}>
                  <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Direct-to-KDS Routing:</strong> Table orders fire straight to line stations without waiting for server availability.</span>
                </div>
                <div className={styles.roleFeatureItem}>
                  <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Instant Mobile Checkout:</strong> Apple Pay, Google Pay, and card settlement directly at the table.</span>
                </div>
              </div>
            </div>

            {/* Visual Mock of Guest Phone Interface */}
            <div className={styles.qrMockupWrapper}>
              <div className={styles.guestPhoneMock}>
                <div className={styles.guestPhoneHeader}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>The Audrey &amp; Co.</div>
                    <div style={{ fontSize: '11px', color: '#595959' }}>Table 7 · Patio Dining</div>
                  </div>
                  <span className={styles.aiPillBadge}>✦ AI Concierge Active</span>
                </div>
                <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: '#3730a3', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                  💡 <em>Prominentz AI Recommendation:</em> Guests who enjoy Wagyu Sirloin frequently pair it with our 2021 Barolo and Truffle Fries.
                </div>
                <div>
                  <div className={styles.dishRow}>
                    <div className={styles.dishInfo}>
                      <span className={styles.dishName}>Wagyu Sirloin (8oz)</span>
                      <span className={styles.dishSub}>Gluten-Free · Truffle Butter Glaze</span>
                    </div>
                    <span className={styles.dishPrice}>$48.00</span>
                  </div>
                  <div className={styles.dishRow}>
                    <div className={styles.dishInfo}>
                      <span className={styles.dishName}>Truffle Tagliatelle</span>
                      <span className={styles.dishSub}>Fresh Pasta · Shaved Black Truffle</span>
                    </div>
                    <span className={styles.dishPrice}>$28.00</span>
                  </div>
                  <div className={styles.dishRow}>
                    <div className={styles.dishInfo}>
                      <span className={styles.dishName}>2021 Nebbiolo di Barolo</span>
                      <span className={styles.dishSub}>By the Glass · Sommelier Selection</span>
                    </div>
                    <span className={styles.dishPrice}>$18.00</span>
                  </div>
                </div>
                <div style={{ paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Order Total: $94.00</div>
                  <button type="button" className={styles.btnPrimary} style={{ padding: '8px 16px', fontSize: '12px' }}>
                    Pay with Apple Pay 
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. “ONE PLATFORM. EVERY ROLE.” ───────────────────────────────── */}
      <section id="roles" className={styles.sectionRoles} aria-label="Role-Based Workspaces">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Role-Based Architecture</span>
            <h2 className={styles.sectionTitle}>One platform. Every role.</h2>
            <p className={styles.sectionDesc}>
              Purpose-built interfaces designed for the distinct, high-tempo workflows of front-of-house, kitchen lines, and operational managers.
            </p>
          </div>

          {/* Semantic Tab Buttons */}
          <div className={styles.tabList} role="tablist" aria-label="Platform Roles">
            <button
              id="tab-server"
              role="tab"
              type="button"
              className={`${styles.tabBtn} ${activeRole === 'server' ? styles.tabBtnActive : ''}`}
              aria-selected={activeRole === 'server'}
              aria-controls="panel-server"
              tabIndex={activeRole === 'server' ? 0 : -1}
              onClick={() => setActiveRole('server')}
              onKeyDown={(e) => handleTabKeyDown(e, 0)}
            >
              Server
            </button>
            <button
              id="tab-kitchen"
              role="tab"
              type="button"
              className={`${styles.tabBtn} ${activeRole === 'kitchen' ? styles.tabBtnActive : ''}`}
              aria-selected={activeRole === 'kitchen'}
              aria-controls="panel-kitchen"
              tabIndex={activeRole === 'kitchen' ? 0 : -1}
              onClick={() => setActiveRole('kitchen')}
              onKeyDown={(e) => handleTabKeyDown(e, 1)}
            >
              Kitchen
            </button>
            <button
              id="tab-manager"
              role="tab"
              type="button"
              className={`${styles.tabBtn} ${activeRole === 'manager' ? styles.tabBtnActive : ''}`}
              aria-selected={activeRole === 'manager'}
              aria-controls="panel-manager"
              tabIndex={activeRole === 'manager' ? 0 : -1}
              onClick={() => setActiveRole('manager')}
              onKeyDown={(e) => handleTabKeyDown(e, 2)}
            >
              Manager
            </button>
          </div>

          {/* Tab Panel: SERVER */}
          {activeRole === 'server' && (
            <div
              id="panel-server"
              role="tabpanel"
              aria-labelledby="tab-server"
              className={styles.roleGrid}
            >
              <div className={styles.roleCopy}>
                <h3 className={styles.roleHeading}>Tableside speed and seat-level precision.</h3>
                <p className={styles.roleParagraph}>
                  Servers capture orders seat-by-seat, attach dietary notes in two taps, and fire courses directly to prep stations without leaving guest tables.
                </p>
                <div className={styles.roleFeatures}>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Seat-by-seat guest checks with course pacing (Appetizer, Entree, Dessert)</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Immediate dietary and cooking modifiers (Temperatures, Allergens, Substitutions)</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Split-check settlement by seat number or equal distribution</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Local offline queue for continuous order entry through patio deadzones</span>
                  </div>
                </div>
              </div>

              {/* Purpose-Built Handheld POS Device Preview */}
              <div className={styles.rolePreviewContainer}>
                <div className={styles.serverDevice}>
                  <div className={styles.deviceTop}>
                    <span className={styles.deviceTitle}>Table 7 · Patio · 4 Guests</span>
                    <span className={styles.deviceBadge}>Active Order</span>
                  </div>
                  <div className={styles.seatGroup}>
                    <div className={styles.seatItem}>
                      <div className={styles.seatHeader}>
                        <span>Seat 1: Wagyu Burger ($28.00)</span>
                        <span>Course 2</span>
                      </div>
                      <div className={styles.seatMod}>
                        <span className={styles.modTag}>Med-Rare</span>
                        <span className={styles.modTag}>Sub Truffle Fries</span>
                      </div>
                    </div>
                    <div className={styles.seatItem}>
                      <div className={styles.seatHeader}>
                        <span>Seat 2: Wild Mushroom Risotto ($26.00)</span>
                        <span>Course 2</span>
                      </div>
                      <div className={styles.seatMod}>
                        <span className={styles.modTag}>Gluten-Free</span>
                        <span className={styles.modTag}>No Dairy</span>
                      </div>
                    </div>
                    <div className={styles.seatItem}>
                      <div className={styles.seatHeader}>
                        <span>Seat 3: Pan-Seared Salmon ($32.00)</span>
                        <span>Course 2</span>
                      </div>
                      <div className={styles.seatMod}>
                        <span className={styles.modTag}>Sauce on Side</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.serverActionRow}>
                    <button type="button" className={styles.serverBtnAlt}>Split by Seat</button>
                    <button type="button" className={styles.serverBtn}>Fire to Kitchen →</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Panel: KITCHEN */}
          {activeRole === 'kitchen' && (
            <div
              id="panel-kitchen"
              role="tabpanel"
              aria-labelledby="tab-kitchen"
              className={styles.roleGrid}
            >
              <div className={styles.roleCopy}>
                <h3 className={styles.roleHeading}>Station routing and ticket aging visibility.</h3>
                <p className={styles.roleParagraph}>
                  Kitchen display screens organize tickets by station urgency, track cook elapsed times with color thresholds, and synchronize line bumps across prep stations.
                </p>
                <div className={styles.roleFeatures}>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Station-based item splitting (Grill, Sauté, Cold, Expediter)</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>3-tier aging threshold alerts (Green &lt;10m, Amber 10–20m, Red &gt;20m)</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Item-level strike-through as line cooks finish individual components</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Instant undo recall bar to restore accidentally bumped orders</span>
                  </div>
                </div>
              </div>

              {/* Purpose-Built KDS Monitor Preview */}
              <div className={styles.rolePreviewContainer}>
                <div className={styles.kdsScreen}>
                  <div className={styles.kdsTicket}>
                    <div className={styles.kdsTicketTop}>
                      <span>#142 · Table 4 (Patio)</span>
                      <span className={styles.kdsTimer}>06:45</span>
                    </div>
                    <div className={styles.kdsItems}>
                      <span className={styles.kdsStrike}>1x Hamachi Crudo (GF) [Done]</span>
                      <span>2x Wagyu Sirloin (Med-Rare)</span>
                      <span>1x Truffle Tagliatelle</span>
                    </div>
                    <button type="button" className={styles.kdsBumpBtn}>Bump Ticket (Space)</button>
                  </div>
                  <div className={`${styles.kdsTicket} ${styles.kdsTicketAmber}`}>
                    <div className={styles.kdsTicketTop}>
                      <span>#139 · Table 11 (Booth)</span>
                      <span className={styles.kdsTimer}>14:20</span>
                    </div>
                    <div className={styles.kdsItems}>
                      <span>1x Roasted Atlantic Halibut</span>
                      <span>1x Dry-Aged Ribeye (Medium)</span>
                      <span>1x Pommes Puree</span>
                    </div>
                    <button type="button" className={styles.kdsBumpBtn}>Bump Ticket (Space)</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Panel: MANAGER */}
          {activeRole === 'manager' && (
            <div
              id="panel-manager"
              role="tabpanel"
              aria-labelledby="tab-manager"
              className={styles.roleGrid}
            >
              <div className={styles.roleCopy}>
                <h3 className={styles.roleHeading}>Real-time floor control and operational auditing.</h3>
                <p className={styles.roleParagraph}>
                  Managers maintain continuous oversight over live labor-to-sales ratios, table turnover rates, comp and void authorizations, and instant 86 item availability.
                </p>
                <div className={styles.roleFeatures}>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Live shift sales velocity and labor-to-sales tracking HUD</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Instant 86-item toggle broadcasting to all server handhelds in real time</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Timestamped audit trail for comp, discount, and void approvals</span>
                  </div>
                  <div className={styles.roleFeatureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Daily end-of-shift tender reconciliation and category breakdown</span>
                  </div>
                </div>
              </div>

              {/* Purpose-Built Manager HUD Preview */}
              <div className={styles.rolePreviewContainer}>
                <div className={styles.managerHud}>
                  <div className={styles.hudMetrics}>
                    <div className={styles.hudMetricBox}>
                      <div className={styles.hudMetricLabel}>Shift Sales</div>
                      <div className={styles.hudMetricVal}>$7,420</div>
                    </div>
                    <div className={styles.hudMetricBox}>
                      <div className={styles.hudMetricLabel}>Labor %</div>
                      <div className={styles.hudMetricVal}>21.4%</div>
                    </div>
                    <div className={styles.hudMetricBox}>
                      <div className={styles.hudMetricLabel}>Turn Rate</div>
                      <div className={styles.hudMetricVal}>2.4x</div>
                    </div>
                  </div>
                  <div className={styles.hudFloorGrid}>
                    <div className={`${styles.hudTableBox} ${styles.hudTableActive}`}>T1 · Active</div>
                    <div className={`${styles.hudTableBox} ${styles.hudTableActive}`}>T2 · Active</div>
                    <div className={`${styles.hudTableBox} ${styles.hudTablePay}`}>T3 · Paying</div>
                    <div className={`${styles.hudTableBox} ${styles.hudTableActive}`}>T4 · Active</div>
                    <div className={`${styles.hudTableBox} ${styles.hudTableActive}`}>T5 · Active</div>
                    <div className={`${styles.hudTableBox} ${styles.hudTablePay}`}>T6 · Paying</div>
                    <div className={`${styles.hudTableBox} ${styles.hudTableActive}`}>T7 · Active</div>
                    <div className={`${styles.hudTableBox}`}>T8 · Empty</div>
                  </div>
                  <div className={styles.hudControls}>
                    <button type="button" className={styles.hudActionChip}>86 Wagyu Ribeye</button>
                    <button type="button" className={styles.hudActionChip}>Approve Comp (Table 6)</button>
                    <button type="button" className={styles.hudActionChip}>Shift Summary</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 5. FEATURE GRID ──────────────────────────────────────────────── */}
      <section id="features" className={styles.sectionFeatures} aria-label="System Capabilities">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Core Capabilities</span>
            <h2 className={styles.sectionTitle}>Built for the demands of live service.</h2>
            <p className={styles.sectionDesc}>
              Six interconnected modules engineered to handle peak dinner rush velocity without system failure.
            </p>
          </div>

          <div className={styles.gridSix}>
            {/* 1. Orders */}
            <div className={styles.featureCell}>
              <div className={styles.featureIconBox} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Orders</h3>
              <p className={styles.featureText}>
                Tableside order entry, course pacing, and dietary modifier routing with instant station dispatch.
              </p>
            </div>

            {/* 2. Floor */}
            <div className={styles.featureCell}>
              <div className={styles.featureIconBox} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Floor</h3>
              <p className={styles.featureText}>
                Live table status maps, section assignments, turnover velocity, and real-time guest occupancy tracking.
              </p>
            </div>

            {/* 3. Kitchen */}
            <div className={styles.featureCell}>
              <div className={styles.featureIconBox} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Kitchen</h3>
              <p className={styles.featureText}>
                Station-specific KDS monitors, ticket aging alerts, prep bump bars, and multi-cook synchronization.
              </p>
            </div>

            {/* 4. Staff */}
            <div className={styles.featureCell}>
              <div className={styles.featureIconBox} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Staff</h3>
              <p className={styles.featureText}>
                Role-scoped permissions, shift schedules, overtime threshold alerts, and attendance auditing.
              </p>
            </div>

            {/* 5. Reports */}
            <div className={styles.featureCell}>
              <div className={styles.featureIconBox} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Reports</h3>
              <p className={styles.featureText}>
                Real-time tender breakdown, server performance leaderboards, category mix, and daily close reconciliation.
              </p>
            </div>

            {/* 6. Inventory & 86 */}
            <div className={styles.featureCell}>
              <div className={styles.featureIconBox} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <h3 className={styles.featureName}>Inventory &amp; 86</h3>
              <p className={styles.featureText}>
                Immediate item availability toggling, low-stock warnings, and cross-terminal 86 broadcast.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. WORKFLOW SECTION ──────────────────────────────────────────── */}
      <section id="how-it-works" className={styles.sectionWorkflow} aria-label="Operational Workflow">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Operational Workflow</span>
            <h2 className={styles.sectionTitle}>From order capture to kitchen bump to shift close.</h2>
            <p className={styles.sectionDesc}>
              Three synchronized steps that keep front-of-house and back-of-house operating in complete harmony.
            </p>
          </div>

          <div className={styles.workflowGrid}>
            {/* Step 1 */}
            <div className={styles.workflowCard}>
              <div>
                <div className={styles.workflowStepNum}>STAGE 01</div>
                <h3 className={styles.workflowStepTitle}>Front-of-House Capture</h3>
                <p className={styles.workflowStepDesc}>
                  Servers enter orders seat-by-seat on handhelds. Dietary notes and preparation modifiers attach immediately.
                </p>
              </div>
              <div className={styles.workflowFragment}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Table 4 · Seat 1</strong>
                  <span style={{ color: '#059669', fontWeight: 600 }}>READY</span>
                </div>
                <div style={{ color: '#595959', fontSize: '11px', display: 'flex', gap: '6px' }}>
                  <span>Tag: Nut-Free</span>
                  <span>·</span>
                  <span>Temp: Med-Rare</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={styles.workflowCard}>
              <div>
                <div className={styles.workflowStepNum}>STAGE 02</div>
                <h3 className={styles.workflowStepTitle}>Back-of-House Dispatch</h3>
                <p className={styles.workflowStepDesc}>
                  Courses route directly to grill, sauté, and cold stations on KDS displays with elapsed timer tracking.
                </p>
              </div>
              <div className={styles.workflowFragment}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Chit #104 · Grill Station</strong>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#D97706' }}>08:12</span>
                </div>
                <div style={{ color: '#595959', fontSize: '11px' }}>
                  2x Wagyu Sirloin · Fired on Line
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={styles.workflowCard}>
              <div>
                <div className={styles.workflowStepNum}>STAGE 03</div>
                <h3 className={styles.workflowStepTitle}>Executive Shift Close</h3>
                <p className={styles.workflowStepDesc}>
                  Managers audit all comps, monitor live labor ratios, and close the day with full tender reconciliation.
                </p>
              </div>
              <div className={styles.workflowFragment}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Net Shift Reconciled</strong>
                  <span style={{ fontWeight: 600 }}>$8,490.00</span>
                </div>
                <div style={{ color: '#595959', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Card: $7,290</span>
                  <span>Cash: $1,200</span>
                  <span>Comps: $42</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. OPERATIONAL BENEFITS ───────────────────────────────────────── */}
      <section className={styles.sectionBenefits} aria-label="Operational Benefits">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>System Design</span>
            <h2 className={styles.sectionTitle}>Engineered for uninterrupted dining room execution.</h2>
            <p className={styles.sectionDesc}>
              Qualitative advantages delivered through unified data flow and resilient architecture.
            </p>
          </div>

          <div className={styles.benefitsGrid}>
            <div className={styles.benefitItem}>
              <h3 className={styles.benefitTitle}>Unified Operations</h3>
              <p className={styles.benefitText}>
                Replaces disconnected paper chits, separate third-party printers, and standalone terminals with a single real-time platform.
              </p>
            </div>

            <div className={styles.benefitItem}>
              <h3 className={styles.benefitTitle}>Direct FOH to BOH Sync</h3>
              <p className={styles.benefitText}>
                Eliminates communication lag between servers and line cooks, reducing misheard modifications and forgotten course fires.
              </p>
            </div>

            <div className={styles.benefitItem}>
              <h3 className={styles.benefitTitle}>Auditable Floor Approvals</h3>
              <p className={styles.benefitText}>
                Every void, discount, and manager comp is tracked with timestamped logs, preventing shrinkage and unexplained check edits.
              </p>
            </div>

            <div className={styles.benefitItem}>
              <h3 className={styles.benefitTitle}>Resilient Offline Continuity</h3>
              <p className={styles.benefitText}>
                Handheld server stations buffer orders locally during temporary Wi-Fi drops and synchronize immediately when reconnected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. PROMINENTZ VS LEGACY POS ─────────────────────────────────── */}
      <section id="comparison" className={styles.comparisonSection} aria-label="POS Comparison">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Transparent Economics</span>
            <h2 className={styles.sectionTitle}>Built to liberate restaurants from legacy POS lock-in.</h2>
            <p className={styles.sectionDesc}>
              Compare Prominentz against traditional legacy systems like Toast, Square, and Micros.
            </p>
          </div>

          <div className={styles.comparisonWrapper}>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th>Platform Feature</th>
                  <th>Prominentz</th>
                  <th>Legacy POS (Toast / Micros / Clover)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Software Cost</td>
                  <td><span className={styles.tableCheck}>✓ $40 / month (Flat, All-Inclusive)</span></td>
                  <td><span className={styles.tableCross}>$150 – $350+ / month per station</span></td>
                </tr>
                <tr>
                  <td>Hardware Freedom</td>
                  <td><span className={styles.tableCheck}>✓ Any iPad, Android Tablet, PC, Phone</span></td>
                  <td><span className={styles.tableCross}>$1,500+ Locked Proprietary Hardware</span></td>
                </tr>
                <tr>
                  <td>Kitchen Display System (KDS)</td>
                  <td><span className={styles.tableCheck}>✓ Included Free (Unlimited Screens)</span></td>
                  <td><span className={styles.tableCross}>$40 – $50 / month per kitchen screen</span></td>
                </tr>
                <tr>
                  <td>Contactless QR Table Ordering</td>
                  <td><span className={styles.tableCheck}>✓ Included Free (Table Studio)</span></td>
                  <td><span className={styles.tableCross}>$50 – $100 / month add-on module</span></td>
                </tr>
                <tr>
                  <td>Thermal ESC/POS Printing</td>
                  <td><span className={styles.tableCheck}>✓ Native WebUSB (Epson, Star, Xprinter)</span></td>
                  <td><span className={styles.tableCross}>Proprietary Cloud Print Adapters</span></td>
                </tr>
                <tr>
                  <td>Platform Order Take-Rate</td>
                  <td><span className={styles.tableCheck}>✓ 0% Take-Rate on Food Sales</span></td>
                  <td><span className={styles.tableCross}>2.9% – 3.5% + Percentage Markups</span></td>
                </tr>
                <tr>
                  <td>Contracts &amp; Commitments</td>
                  <td><span className={styles.tableCheck}>✓ Month-to-Month · Cancel Anytime</span></td>
                  <td><span className={styles.tableCross}>2–3 Year Inflexible Contracts</span></td>
                </tr>
                <tr>
                  <td>Offline Queue Resilience</td>
                  <td><span className={styles.tableCheck}>✓ Built-in Local Buffer Continuity</span></td>
                  <td><span className={styles.tableCross}>Partial or Station Freezes</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 9. ALL-INCLUSIVE PRICING SPOTLIGHT ───────────────────────────── */}
      <section id="pricing" className={styles.pricingSection} aria-label="Transparent Pricing">
        <div className={styles.container}>
          <div className={styles.pricingBanner}>
            <div>
              <span className={styles.eyebrow} style={{ color: 'rgba(255,255,255,0.7)' }}>Single Predictable Plan</span>
              <h2 className={styles.pricingBannerTitle}>Everything your restaurant needs. One honest price.</h2>
              <p className={styles.pricingBannerDesc}>
                No terminal licensing fees. No kitchen screen surcharges. No hidden surprises at the end of the month.
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
                  <span>✓</span> WebUSB Thermal Printing
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Prominentz AI Concierge
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Split Bills &amp; Table Pacing
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> Live Telemetry &amp; Z-Reports
                </div>
                <div className={styles.pricingFeatureItem}>
                  <span>✓</span> 24/7 Priority Support
                </div>
              </div>
            </div>

            <div className={styles.pricingPriceBox}>
              <div className={styles.pricingMonthly}>$40</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', marginBottom: '20px' }}>
                per month · billed monthly ($400/yr annual)
              </div>
              <Link href="/signup" className={styles.btnPrimary} style={{ width: '100%', backgroundColor: '#FFFFFF', color: '#171717', fontWeight: 600 }}>
                Start 14-Day Free Trial →
              </Link>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>
                Zero setup fees · Instant activation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className={styles.testimonialSection} aria-label="Testimonials">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCenter}>
            <span className={styles.eyebrow}>Hospitality Tested</span>
            <h2 className={styles.sectionTitle}>Trusted by fast-paced dining rooms.</h2>
            <p className={styles.sectionDesc}>
              Hear how high-tempo restaurants run smoother services with Prominentz.
            </p>
          </div>

          <div className={styles.testimonialGrid}>
            <div className={styles.testimonialCard}>
              <p className={styles.testimonialQuote}>
                &ldquo;Switching from Toast saved us over $600 a month in terminal fees alone. The WebUSB thermal printer integration works seamlessly with our existing Epson printers.&rdquo;
              </p>
              <div>
                <div className={styles.testimonialAuthor}>Marcus Vance</div>
                <div className={styles.testimonialRole}>Owner &amp; General Manager · Osteria Vance</div>
              </div>
            </div>

            <div className={styles.testimonialCard}>
              <p className={styles.testimonialQuote}>
                &ldquo;Our kitchen line ticket pacing improved by 4 minutes during Friday rushes. Station-routing and the color-coded bump timers keep the line calm and synchronized.&rdquo;
              </p>
              <div>
                <div className={styles.testimonialAuthor}>Chef Camille Laurent</div>
                <div className={styles.testimonialRole}>Executive Chef · Brasserie Laurent</div>
              </div>
            </div>

            <div className={styles.testimonialCard}>
              <p className={styles.testimonialQuote}>
                &ldquo;The QR table ordering with Prominentz AI wine suggestions increased our beverage spend by 18%. Guests love splitting checks seat-by-seat without waiting for servers.&rdquo;
              </p>
              <div>
                <div className={styles.testimonialAuthor}>Sofia Reyes</div>
                <div className={styles.testimonialRole}>Director of Operations · Sol &amp; Luna Group</div>
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
              <h2 className={styles.sectionTitle}>Frequently asked questions.</h2>
              <p className={styles.sectionDesc}>
                Common questions regarding the platform, architecture, thermal printing, and deployment.
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
                  <span>Will Prominentz automatically print thermal receipts and kick open the cash drawer?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 0 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaqIndex === 0 && (
                  <div id="faq-ans-0" className={styles.faqAnswer}>
                    Yes. Prominentz features native WebUSB ESC/POS thermal printing for Epson, Star Micronics, TVS-E, and Xprinter devices (80mm &amp; 58mm). Cash settlements automatically trigger the RJ11/RJ12 drawer kick solenoid. In Chrome Kiosk Mode (<code>--kiosk-printing</code>), receipts print silently with zero popups or manual confirmations.
                  </div>
                )}
              </div>

              {/* FAQ 2: Hardware freedom */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(1)}
                  aria-expanded={openFaqIndex === 1}
                  aria-controls="faq-ans-1"
                >
                  <span>Can I use my existing tablets, iPads, and PCs without buying new hardware?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 1 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaqIndex === 1 && (
                  <div id="faq-ans-1" className={styles.faqAnswer}>
                    Yes. Unlike legacy POS systems that lock you into buying proprietary terminals for thousands of dollars, Prominentz is cloud-native and runs inside modern browsers across iPads, Android tablets, Mac, Windows PCs, and smartphones.
                  </div>
                )}
              </div>

              {/* FAQ 3: FOH to BOH */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(2)}
                  aria-expanded={openFaqIndex === 2}
                  aria-controls="faq-ans-2"
                >
                  <span>How does Prominentz connect front-of-house servers with kitchen line stations?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 2 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaqIndex === 2 && (
                  <div id="faq-ans-2" className={styles.faqAnswer}>
                    Orders captured on server handhelds, POS terminals, or guest QR scans route instantly to designated kitchen stations (KDS screens) via real-time WebSocket feeds, categorizing dishes by station (Grill, Sauté, Cold Bar) with color-coded elapsed cooking timers.
                  </div>
                )}
              </div>

              {/* FAQ 4: Offline drops */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(3)}
                  aria-expanded={openFaqIndex === 3}
                  aria-controls="faq-ans-3"
                >
                  <span>What happens if the restaurant’s internet connection drops during service?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 3 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaqIndex === 3 && (
                  <div id="faq-ans-3" className={styles.faqAnswer}>
                    Prominentz’s handheld and terminal clients include local queue buffering. Orders taken while offline are safely held in the browser storage and automatically dispatched to kitchen monitors as soon as connectivity resumes.
                  </div>
                )}
              </div>

              {/* FAQ 5: Bill splitting */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(4)}
                  aria-expanded={openFaqIndex === 4}
                  aria-controls="faq-ans-4"
                >
                  <span>Does the platform support seat-level bill splitting and partial tenders?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 4 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaqIndex === 4 && (
                  <div id="faq-ans-4" className={styles.faqAnswer}>
                    Yes. Servers can divide checks evenly across guests or split items individually by seat number, accepting mixed payment tenders including cash, cards (via Stripe), Apple Pay, Google Pay, and coupons.
                  </div>
                )}
              </div>

              {/* FAQ 6: Role permissions */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(5)}
                  aria-expanded={openFaqIndex === 5}
                  aria-controls="faq-ans-5"
                >
                  <span>How are permissions and access managed across staff roles?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 5 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaqIndex === 5 && (
                  <div id="faq-ans-5" className={styles.faqAnswer}>
                    Prominentz enforces strict role-based access control. Line cooks see only active kitchen tickets, servers access table ordering, and managers hold override privileges for voids, comps, 86-lists, and financial reporting.
                  </div>
                )}
              </div>

              {/* FAQ 7: 86 items */}
              <div className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(6)}
                  aria-expanded={openFaqIndex === 6}
                  aria-controls="faq-ans-6"
                >
                  <span>How do managers manage out-of-stock items during high-tempo service?</span>
                  <span className={`${styles.faqIcon} ${openFaqIndex === 6 ? styles.faqIconExpanded : ''}`} aria-hidden="true">+</span>
                </button>
                {openFaqIndex === 6 && (
                  <div id="faq-ans-6" className={styles.faqAnswer}>
                    Managers can 86 any menu item in two clicks from the manager operations bar. The item is instantly grayed out across all server handhelds and customer QR menus to prevent servers from ringing up unavailable dishes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. FINAL CTA & FOOTER ────────────────────────────────────────── */}
      <section className={styles.sectionFinalCta} aria-label="Get Started">
        <div className={styles.container}>
          <div className={styles.finalCtaBox}>
            <h2 className={styles.finalCtaTitle}>Ready to streamline your restaurant operations?</h2>
            <p className={styles.finalCtaDesc}>
              Equip your floor and kitchen teams with a unified workspace built for high-velocity dining rooms.
            </p>
            <div className={styles.finalCtaActions}>
              <Link href="/signup" className={styles.btnPrimary}>
                Get started
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minimalist Bordered Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrandCol}>
              <div className={styles.brand}>
                <span className={styles.brandMark} aria-hidden="true">P</span>
                <span className={styles.brandName}>Prominentz</span>
              </div>
              <p className={styles.footerBrandDesc}>
                The operating system for modern restaurants. Front-of-house, kitchen bump bars, and manager controls in one unified platform.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <div className={styles.footerHeading}>Product</div>
              <a href="#showcase" className={styles.footerLink}>Overview</a>
              <a href="#roles" className={styles.footerLink}>Roles</a>
              <a href="#how-it-works" className={styles.footerLink}>Workflow</a>
              <a href="#features" className={styles.footerLink}>Features</a>
              <Link href="/pricing" className={styles.footerLink}>Pricing</Link>
            </div>

            <div className={styles.footerLinks}>
              <div className={styles.footerHeading}>Platform</div>
              <Link href="/login" className={styles.footerLink}>Sign in</Link>
              <Link href="/signup" className={styles.footerLink}>Get started</Link>
              <Link href="/portals" className={styles.footerLink}>Role Portals</Link>
              <a href="#faq" className={styles.footerLink}>FAQ</a>
            </div>

            <div className={styles.footerLinks}>
              <div className={styles.footerHeading}>Legal</div>
              <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div>&copy; 2026 Prominentz Platform. All rights reserved.</div>
            <div>Built for high-performance dining rooms.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
