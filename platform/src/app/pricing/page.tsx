import { Check } from 'lucide-react'
import { PublicShell, CloseBand } from '@/components/landing/SiteChrome'
import { PlanBill, OtherTiers } from '@/components/landing/PlanBill'
import { Faq } from '@/components/landing/FaqDemo'
import { landingFontVars } from '@/components/landing/fonts'
import { PRICING } from '@/lib/pricing'
import s from '@/components/landing/Landing.module.css'

export const metadata = {
  title: 'Pricing | Prominentz — $50/month restaurant POS & kitchen display',
  description:
    'One flat price for POS, kitchen display, QR and online ordering, inventory, staff and end-of-day reports. $50/month per restaurant, 0% of your sales, 14-day free trial.',
  alternates: { canonical: '/pricing' },
}

// What the Basic plan includes vs. what is still in development (Pro).
const MATRIX: { label: string; basic: boolean; pro: boolean }[] = [
  { label: 'POS, table floor plan and order entry', basic: true, pro: true },
  { label: 'Kitchen display with stations, timers and bump to pass', basic: true, pro: true },
  { label: 'Table QR ordering and your own online ordering page', basic: true, pro: true },
  { label: 'Split checks by seat, item or evenly; cash and card', basic: true, pro: true },
  { label: 'Inventory counts and recipe depletion', basic: true, pro: true },
  { label: 'Staff board and clock in / clock out', basic: true, pro: true },
  { label: 'Reservations and walk-in waitlist', basic: true, pro: true },
  { label: 'End-of-day Z-report and daily sales', basic: true, pro: true },
  { label: 'Delivery aggregator sync', basic: true, pro: true },
  { label: 'Guest CRM and loyalty rewards', basic: false, pro: true },
  { label: 'AI operations agent', basic: false, pro: true },
  { label: 'Multiple locations and labour scheduling', basic: false, pro: true },
]

export default function PricingPage() {
  return (
    <div className={landingFontVars}>
      <PublicShell>
        <main id="main-content">
          <section className={`${s.paper}`} data-ground="light" aria-labelledby="pricing-title">
            <div className={s.pricingHero}>
              <h1 id="pricing-title" className={s.h1} style={{ maxWidth: '11em' }}>
                One restaurant. One price. ${PRICING.STARTER.monthly} a month.
              </h1>
              <p className={s.lede}>
                Everything it takes to run a service, from the first order to the Z-report, on the devices you already own.
                No contract, no hardware to buy, and 0% of your sales.
              </p>
            </div>
            <div className={s.billSection} style={{ paddingTop: 0 }}>
              <div className={s.billGrid}>
                <div className={s.billIntro}>
                  <h2 className={s.h2}>What&apos;s on the bill.</h2>
                  <p className={s.body}>
                    The Basic plan is the whole operating system for a single restaurant, cafe or bistro. Try every part of it
                    free for 14 days.
                  </p>
                </div>
                <PlanBill />
                <div className={s.billTiers}>
                  <OtherTiers />
                </div>
              </div>
            </div>
          </section>

          <section className={`${s.faq} ${s.light}`} data-ground="light" aria-labelledby="matrix-title">
            <div className={s.faqGrid}>
              <div>
                <h2 id="matrix-title" className={s.h2}>
                  Basic today, Pro when it&apos;s ready.
                </h2>
                <p className={s.body}>
                  Pro is in development. It adds the guest and multi-location layer on top of everything in Basic.
                </p>
              </div>
              <div className={s.panel}>
                <table className={s.matrix}>
                  <thead>
                    <tr>
                      <th scope="col">Feature</th>
                      <th scope="col">Basic</th>
                      <th scope="col">Pro · soon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td data-label="Basic">
                          {r.basic ? (
                            <Check className={s.yes} size={18} strokeWidth={2.25} aria-label="Included" />
                          ) : (
                            <span className={s.no}>No</span>
                          )}
                        </td>
                        <td data-label="Pro · soon">
                          {r.pro ? (
                            <Check className={s.yes} size={18} strokeWidth={2.25} aria-label="Included" />
                          ) : (
                            <span className={s.no}>No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`${s.faq} ${s.paper}`} data-ground="light" aria-labelledby="faq-title">
            <div className={s.faqGrid}>
              <h2 id="faq-title" className={s.h2}>
                Questions about the bill.
              </h2>
              <Faq />
            </div>
          </section>

          <CloseBand title="Start with tonight's service." />
        </main>
      </PublicShell>
    </div>
  )
}
