import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export const metadata: Metadata = {
  title: 'Terms of Service | Prominentz Restaurant Operating Platform',
  description: 'Understand the terms, rights, subscription guidelines, and merchant responsibilities governing your use of Prominentz POS, KDS, and restaurant management platform.',
}

export default function TermsOfServicePage() {
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
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 150ms' }}>
              Privacy Policy
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
            <span>Master Service Agreement</span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 16px' }}>
            Prominentz Terms of Service
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            Effective Date: <strong>October 2, 2026</strong> · Last Revised: <strong>{lastUpdated}</strong>
          </p>
        </div>

        {/* Quick Highlights Summary Box */}
        <div style={{ backgroundColor: 'rgba(91,69,245,0.08)', border: '1px solid rgba(91,69,245,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#a594fd', margin: '0 0 12px' }}>
            Key Terms &amp; Commercial Highlights
          </h2>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
            <li>Prominentz provides software as a service (SaaS) on a monthly or annual subscription basis.</li>
            <li>Restaurant operators retain full ownership of their menu data, customer lists, and financial records.</li>
            <li>Restaurants act as the merchant of record for diner transactions and are responsible for accurate menu pricing, sales taxes, and tip settlements.</li>
            <li>Subscriptions can be cancelled at any time prior to the next billing cycle via the dashboard settings.</li>
          </ul>
        </div>

        {/* Section 1 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="acceptance" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;Customer,&quot; &quot;Operator,&quot; &quot;you,&quot; or &quot;your&quot;) and Prominentz Inc. (&quot;Prominentz,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, accessing, or using our POS, KDS, online ordering, or related APIs, you affirm that you have read, understood, and agree to be bound by these Terms.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            If you represent a corporate entity, restaurant group, or franchise, you warrant that you hold sufficient corporate authority to bind that entity to these Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="service-description" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            2. Platform Description &amp; License Grant
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            Prominentz grants you a non-exclusive, non-transferable, revocable license to access and operate the software for your internal restaurant business operations during the term of your active subscription.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            You may authorize staff members to access designated modules (such as the POS terminal, server view, or KDS display) using individual access credentials or staff PINs. You remain responsible for all activities conducted under your account credentials.
          </p>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="subscription-billing" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            3. Subscription Plans, Billing &amp; Taxes
          </h2>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
            <li><strong>Recurring Billing:</strong> Subscriptions are billed in advance on a recurring monthly or annual cycle. Fees are non-refundable except where mandated by applicable consumer protection laws.</li>
            <li><strong>Plan Tiers:</strong> Features, terminal allowances, and location limits are governed by the selected plan (e.g., Basic Plan at $40/month or custom Enterprise Plan).</li>
            <li><strong>Price Changes:</strong> Prominentz reserves the right to modify subscription pricing with a minimum of 30 days prior written notice before renewal.</li>
            <li><strong>Taxes:</strong> All listed fees are exclusive of applicable federal, state, local, VAT, or sales taxes, which will be added where required by statute.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="merchant-responsibilities" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            4. Merchant Responsibilities &amp; Guest Transactions
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            You acknowledge and agree that:
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
            <li>You are the sole merchant of record for all food, beverage, and service sales transacted through your establishment.</li>
            <li>You are solely responsible for ensuring the accuracy of menu prices, allergen disclosures, beverage licensing laws, and mandatory tax rates configured in your portal.</li>
            <li>Prominentz is not responsible for chargebacks, customer refunds, food quality disputes, or payment provider processing fees incurred through third-party processors.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="acceptable-use" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            5. Acceptable Use &amp; Restrictions
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 12px' }}>
            You agree not to:
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
            <li>Decompile, reverse-engineer, disassemble, or attempt to derive the source code of any Prominentz component.</li>
            <li>Resell, sublicense, lease, or distribute the platform to unauthorized third parties without express written authorization.</li>
            <li>Use automated bots, scrapers, or excessive API calls that impair server stability, KDS websocket responsiveness, or database integrity.</li>
            <li>Transmit malicious code, exploit vulnerabilities, or process fraudulent payment information.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="service-availability" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            6. Availability, SLA &amp; Offline Continuity
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            We target 99.9% uptime for core POS and KDS real-time event services. However, uninterrupted transmission cannot be guaranteed due to public internet routing, local Wi-Fi disruptions, or third-party outages.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            Scheduled maintenance will be announced with advance notice via the dashboard or email, scheduled during typical off-peak restaurant hours whenever feasible.
          </p>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="intellectual-property" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            7. Intellectual Property Rights &amp; Customer Data
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            <strong>Our Property:</strong> Prominentz and its licensors retain all right, title, and interest in and to the platform, including proprietary UI designs, algorithms, brand logos, and documentation.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            <strong>Your Data:</strong> You retain complete ownership of your restaurant content, menu assets, logos, and diner order histories. You grant Prominentz a limited license to host and process this data strictly to deliver platform services.
          </p>
        </section>

        {/* Section 8 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="disclaimers" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            8. Disclaimer of Warranties &amp; Limitation of Liability
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            IN NO EVENT SHALL PROMINENTZ OR ITS AFFILIATES BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, BUSINESS INTERRUPTION, OR DATA LOSS. OUR AGGREGATE LIABILITY FOR ALL CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO PROMINENTZ DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </section>

        {/* Section 9 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 id="termination" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            9. Termination &amp; Data Export
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 14px' }}>
            You may terminate your subscription at any time via your dashboard billing settings. Upon termination, access to operational terminals will cease at the conclusion of your pre-paid billing period.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            You may request an export of your historical sales and menu data within thirty (30) days following termination, after which your account data will be permanently decommissioned in accordance with our data retention schedule.
          </p>
        </section>

        {/* Section 10 */}
        <section style={{ marginBottom: '56px' }}>
          <h2 id="governing-law" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            10. Governing Law &amp; Dispute Resolution
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: '0 0 16px' }}>
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without giving effect to conflicts of law principles. Any dispute arising out of or related to these Terms shall be resolved by binding arbitration in accordance with the American Arbitration Association (AAA) commercial arbitration rules.
          </p>

          <div style={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', marginBottom: '8px' }}>
              Prominentz Inc. — Legal Inquiries &amp; Contract Administration
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Legal Department: <a href="mailto:legal@prominentz.com" style={{ color: '#7b68f7', textDecoration: 'underline' }}>legal@prominentz.com</a><br />
              General Inquiries: <a href="mailto:support@prominentz.com" style={{ color: '#7b68f7', textDecoration: 'underline' }}>support@prominentz.com</a><br />
              Address: Prominentz Inc., 100 Innovation Way, Suite 400, Wilmington, DE 19801
            </div>
          </div>
        </section>

        {/* Back Link */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/" className="btn btn--secondary" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
            ← Return to Prominentz Home
          </Link>
          <Link href="/privacy" style={{ color: '#7b68f7', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            Read Privacy Policy →
          </Link>
        </div>
      </main>
    </div>
  )
}
