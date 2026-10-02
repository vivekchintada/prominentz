import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Privacy Policy | Prominentz Restaurant Operating Platform',
  description: 'Learn how Prominentz collects, protects, processes, and respects your business and guest personal data in accordance with GDPR, CCPA, and international privacy standards.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 2, 2026'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0B', color: 'rgba(255,255,255,0.92)', fontFamily: '-apple-system, Inter, BlinkMacSystemFont, sans-serif' }}>
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(18,18,20,0.85)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" aria-label="Prominentz Home" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <ProminentzLogo variant="full" size="sm" />
          </Link>

          <nav aria-label="Legal Navigation" style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 150ms' }}>
              Home
            </Link>
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 150ms' }}>
              Terms of Service
            </Link>
            <Link href="/login" className="btn btn--primary" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none' }}>
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main id="main-content" style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 24px 100px' }}>
        {/* Header Breadcrumb & Title */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#7b68f7', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>Legal Documentation</span>
            <span>•</span>
            <span>Privacy &amp; Data Protection</span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 16px' }}>
            Prominentz Privacy Policy
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            Effective Date: <strong>October 2, 2026</strong> · Last Revised: <strong>{lastUpdated}</strong>
          </p>
        </div>

        {/* Quick Highlights Summary Box */}
        <div style={{ backgroundColor: 'rgba(91,69,245,0.08)', border: '1px solid rgba(91,69,245,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#a594fd', margin: '0 0 12px' }}>
            Privacy Summary at a Glance
          </h2>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
            <li>We process restaurant operator data and diner order information exclusively to facilitate restaurant management, POS, kitchen routing, and payments.</li>
            <li>We do not sell, rent, or monetize your personal or diner data to third-party data brokers or advertisers.</li>
            <li>All payment transactions are tokenized and processed securely via PCI-DSS Level 1 certified partners (Stripe); Prominentz never stores raw credit card numbers.</li>
            <li>You possess full rights to request data export, correction, or deletion under GDPR and CCPA/CPRA guidelines.</li>
          </ul>
        </div>

        {/* Section 1 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="overview" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            1. Overview and Scope
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            Prominentz Inc. (&quot;Prominentz,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a cloud-based restaurant operating system encompassing Point-of-Sale (POS), Kitchen Display Systems (KDS), online table QR ordering, inventory management, and operational analytics.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            This Privacy Policy describes our practices regarding the collection, use, disclosure, and protection of information obtained from: (a) restaurant owners, managers, and staff (&quot;Operators&quot;), (b) restaurant customers and diners utilizing QR codes or online ordering (&quot;Guests&quot;), and (c) visitors to our websites, applications, and APIs.
          </p>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="information-collected" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            2. Information We Collect
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            We collect information strictly necessary to provide reliable hospitality software services:
          </p>
          
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', margin: '16px 0 8px' }}>
            A. Operator &amp; Account Information
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: '0 0 12px' }}>
            When an operator registers an establishment, we collect names, corporate entity details, email addresses, phone numbers, tax identification details, business addresses, and staff roster PINs/roles.
          </p>

          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', margin: '16px 0 8px' }}>
            B. Guest Dining &amp; Order Information
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: '0 0 12px' }}>
            When a guest places an order via table QR code or online ordering, we collect table numbers, item selections, dietary notes, order totals, and optionally the customer&apos;s name, email, or mobile phone number for electronic receipt delivery and order status SMS notifications.
          </p>

          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', margin: '16px 0 8px' }}>
            C. Payment Details
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: '0 0 12px' }}>
            Payments processed through our platform are handled directly by PCI-compliant payment gateways (e.g., Stripe). Prominentz receives only transaction reference tokens, card brand, and the last four digits of payment cards. We never hold unencrypted PAN numbers on our servers.
          </p>

          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', margin: '16px 0 8px' }}>
            D. Technical &amp; Diagnostic Telemetry
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
            To ensure high availability and prevent fraud, our servers log IP addresses, browser user-agents, device screen dimensions, error reports, and websocket latency metrics.
          </p>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="use-of-data" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            3. How We Use Information
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 12px' }}>
            We process collected data under legitimate business interests, contractual obligations, and statutory requirements:
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
            <li>Routing orders in real-time from guest devices and POS terminals to kitchen display monitors (KDS).</li>
            <li>Calculating live inventory depletion, food cost percentages, and auto-86 dish availability.</li>
            <li>Generating Z-reports, tax summaries, and daily revenue reconciliations for operators.</li>
            <li>Transmitting transactional email/SMS receipts and table call notifications via authorized subprocessors.</li>
            <li>Powering optional RestoIQ operational analytics and AI forecasting models using aggregated restaurant metrics without disclosing identifiable diner records.</li>
            <li>Detecting fraud, mitigating cyber security threats, and complying with statutory fiscal record-keeping laws.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="subprocessors" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            4. Third-Party Subprocessors &amp; Disclosures
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 16px' }}>
            We engage vetted third-party service providers bound by strict confidentiality and data protection agreements:
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: '#a594fd', marginBottom: '4px' }}>Stripe Payments</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Payment processing &amp; PCI-DSS Level 1 compliance.</div>
            </div>
            <div style={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: '#a594fd', marginBottom: '4px' }}>Resend Email API</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Encrypted transactional email receipts &amp; dispatch.</div>
            </div>
            <div style={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: '#a594fd', marginBottom: '4px' }}>Pusher Realtime</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Realtime websocket pipeline for instant KDS updates.</div>
            </div>
            <div style={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: '#a594fd', marginBottom: '4px' }}>Supabase / PostgreSQL</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Secure cloud database hosting with encryption at rest.</div>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="cookies" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            5. Cookies &amp; Local Storage Technologies
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 12px' }}>
            Prominentz employs essential and functional cookies, as well as browser localStorage, to maintain your authenticated session, store cart states, remember visual theme preferences (light/dark mode), and record your cookie consent choice.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            We do not use invasive third-party cross-site advertising trackers or sell advertising space. You can manage or reset your cookie preferences at any time using our Cookie Consent Banner or browser privacy settings.
          </p>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="rights" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            6. Your Privacy Rights (GDPR &amp; CCPA/CPRA)
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 12px' }}>
            Depending on your jurisdiction, you enjoy enforceable statutory rights regarding your personal information:
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
            <li><strong>Right of Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Right of Rectification:</strong> Request correction of inaccurate or incomplete records.</li>
            <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request deletion of your personal data where statutory retention obligations do not apply.</li>
            <li><strong>Right to Data Portability:</strong> Export your menu, sales, or customer data in standard CSV/JSON formats.</li>
            <li><strong>Non-Discrimination:</strong> We will never deny services, charge different prices, or degrade quality if you exercise statutory privacy rights.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="security" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            7. Data Security &amp; Retention
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 12px' }}>
            We implement industry-grade technical and organizational safeguards: all web traffic is encrypted via TLS 1.3, internal database connections utilize AES-256 encryption at rest, API credentials are restricted via role-based access control (RBAC), and automated backups run continuously.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            Order records and financial receipts are retained in accordance with local commercial tax compliance mandates (typically 7 years) or until an operator requests account termination and data purge.
          </p>
        </section>

        {/* Section 8 */}
        <section style={{ marginBottom: '56px' }}>
          <h2 id="contact" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            8. Contact Us &amp; Data Protection Officer
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 16px' }}>
            If you have questions, complaints, or wish to exercise your rights under this Privacy Policy, please reach out directly:
          </p>
          
          <div style={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', marginBottom: '8px' }}>
              Prominentz Inc. — Privacy &amp; Data Governance Office
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Email: <a href="mailto:privacy@prominentz.com" style={{ color: '#7b68f7', textDecoration: 'underline' }}>privacy@prominentz.com</a><br />
              Support: <a href="mailto:support@prominentz.com" style={{ color: '#7b68f7', textDecoration: 'underline' }}>support@prominentz.com</a><br />
              Hours: Monday – Friday, 9:00 AM – 6:00 PM EST<br />
              Response SLA: Formal privacy inquiries are acknowledged within 48 business hours.
            </div>
          </div>
        </section>

        {/* Back Link */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/" className="btn btn--secondary" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
            ← Return to Prominentz Home
          </Link>
          <Link href="/terms" style={{ color: '#7b68f7', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  )
}
