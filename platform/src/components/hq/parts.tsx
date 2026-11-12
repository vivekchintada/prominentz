import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import { badgeClass } from '@/lib/bento/channels'
import { HEALTH_BADGE, STATUS_LABEL, type Tenant } from '@/lib/hq/hq-data'

export const DAY_MS = 24 * 60 * 60 * 1000

/** "₹3,999" or "$50" with no decimals, for list prices. */
export function price(n: number, currency: 'INR' | 'USD' | string) {
  return formatMoney(n, currency, 0)
}

/** MRR across currencies as one line: "₹11,997 + $100". */
export function mrrLine(m: { inr: number; usd: number }) {
  const parts = [m.inr > 0 ? price(m.inr, 'INR') : null, m.usd > 0 ? price(m.usd, 'USD') : null].filter(Boolean)
  return parts.length ? parts.join(' + ') : price(0, 'USD')
}

/** "just now", "3 h ago", "4 d ago", or a date. */
export function ago(d: Date | null, now = Date.now()) {
  if (!d) return 'never'
  const mins = Math.floor((now - d.getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days} d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function shortDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function HealthBadge({ t }: { t: Tenant }) {
  const b = HEALTH_BADGE[t.health]
  return <span className={badgeClass(b.tone)}>{b.label}</span>
}

export function StatusText({ t }: { t: Tenant }) {
  return <>{STATUS_LABEL[t.status]}</>
}

export function TenantName({ t }: { t: Tenant }) {
  return (
    <Link href={`/hq/restaurants/${t.id}`} style={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {t.name}
      {t.city ? <span className="bz-sub" style={{ fontWeight: 500 }}> · {t.city}</span> : null}
    </Link>
  )
}

/** Average orders per day over the last 30 days, one decimal under 10. */
export function perDay(t: Tenant) {
  const v = t.orders.last30 / 30
  return v === 0 ? '0' : v < 10 ? v.toFixed(1) : String(Math.round(v))
}

/** What a trial has set up so far, in words. */
export function setupSoFar(t: Tenant) {
  const done = [t.menuItems > 0 && 'menu', t.tables > 0 && 'tables', t.staff > 1 && 'staff', t.orders.total > 0 && 'orders'].filter(Boolean) as string[]
  if (done.length === 0) return 'nothing yet'
  if (done.length === 4) return 'everything set up'
  return done.join(' + ')
}
