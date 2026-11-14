import Link from 'next/link'
import { PRICING } from '@/lib/pricing'
import s from './Landing.module.css'

// Plain-language bill lines, one per item in PLAN_FEATURES.STARTER (src/lib/pricing.ts), in the same order.
const lines = [
  'POS and table floor plan',
  'Kitchen display with bump to pass',
  'Table and menu QR codes, straight to the kitchen',
  'Menu editor and item modifiers',
  'Cash, card, table-side and split payments',
  'Live table status and seat-by-seat splits',
  'Inventory counts and recipe depletion',
  'Staff shifts and clock in / clock out',
  'Reservations and walk-in waitlist',
  'End-of-day Z-report and daily sales',
  'Delivery app sync (DoorDash, Uber Eats, Zomato, Swiggy)',
]

const PRO_LINES = [
  'Guest CRM and VIP profiles',
  'Loyalty points and rewards',
  'AI operations agent',
  'Multiple locations',
  'Shift scheduling and labour cost',
]

const TOTALS: [string, string][] = [
  ['Share of your sales we take', '0%'],
  ['Devices, staff accounts, tables', 'No extra fees'],
  ['Contract', 'Month to month'],
]

/** The plan, printed as a receipt. `scripted` adds the handles the theatre animates. */
export function PlanBill({ scripted }: { scripted?: boolean }) {
  const plan = PRICING.STARTER
  const h = (id: string) => (scripted ? id : undefined)
  return (
    <div className={s.bill} data-e={h('bCard')}>
      <div className={s.billTop}>
        <div>
          <span className={s.label}>Prominentz · {plan.label}</span>
          <div className={s.billPrice} style={{ marginTop: 14 }}>
            ${plan.monthly}
            <small>per month, per restaurant</small>
          </div>
        </div>
        <span className={s.chipGood}>14 days free</span>
      </div>
      <ul className={s.billLines}>
        {lines.map((l, i) => (
          <li key={l} className={s.billLine} data-e={h(`b${i + 1}`)}>
            <span>{l}</span>
            <span>Included</span>
          </li>
        ))}
      </ul>
      <div className={s.billTotals}>
        {TOTALS.map(([k, v], i) => (
          <div key={k} className={s.billTotal} data-e={h(`bT${i + 1}`)}>
            {k} <b>{v}</b>
          </div>
        ))}
      </div>
      <div className={s.billCta} data-e={h('bCta')}>
        <Link href="/signup?plan=starter" className={`${s.btnSolid} plausible-event-name=Trial+Click`}>
          Start free trial
        </Link>
        <a href="#demo" className={s.btnLine}>
          Book a demo
        </a>
      </div>
    </div>
  )
}

export function OtherTiers() {
  return (
    <div className={s.tiers}>
      <div className={s.tier}>
        <div className={s.tierHead}>
          <h3 className={s.h3}>Pro</h3>
          <span className={s.chip}>Coming soon</span>
        </div>
        <ul>
          {PRO_LINES.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <a href="#demo" className={s.tierLink}>
          Ask to hear when it opens
        </a>
      </div>
      <div className={s.tier}>
        <div className={s.tierHead}>
          <h3 className={s.h3}>Enterprise</h3>
          <span className={s.chip}>Custom</span>
        </div>
        <ul>
          <li>Many outlets under one HQ</li>
          <li>Dedicated database and SLA</li>
          <li>Pricing set with you</li>
        </ul>
        <a href="#demo" className={s.tierLink}>
          Contact us
        </a>
      </div>
    </div>
  )
}
