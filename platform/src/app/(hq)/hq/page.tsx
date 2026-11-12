import Link from 'next/link'
import { PageHead, Empty, plural, pct } from '@/components/bento/pages/parts'
import { ExportCsvButton } from '@/components/hq/ExportCsvButton'
import { HealthBadge, TenantName, ago, mrrLine, perDay } from '@/components/hq/parts'
import { PLAN_LABELS } from '@/lib/plans'
import { loadLeads, loadTenants, mrrOf, requirePlatformAdmin, signupsByMonth, type Tenant } from '@/lib/hq/hq-data'

export const metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

const WATCH_COLS = 'minmax(0, 1.6fr) 100px 90px 90px 110px 120px'
const WATCH_RANK: Record<Tenant['health'], number> = { at_risk: 0, stuck: 1, quiet: 2, early: 3, converting: 4, healthy: 5, lapsed: 6 }

export default async function HqOverviewPage() {
  await requirePlatformAdmin()
  const [tenants, leads] = await Promise.all([loadTenants(), loadLeads(3)])

  const mrr = mrrOf(tenants)
  const by = (s: Tenant['status']) => tenants.filter((t) => t.status === s).length
  const paying = by('paying')
  const trial = by('trial')
  const pastDue = by('past_due')
  const lapsed = by('expired') + by('cancelled')
  const signups = signupsByMonth(tenants, 8)
  const maxSign = Math.max(...signups.map((s) => s.n), 0)

  // Trial funnel: restaurants that signed up in the last 30 days
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = tenants.filter((t) => t.createdAt.getTime() >= since)
  const recentOrdered = recent.filter((t) => t.orders.total > 0).length
  const recentPaying = recent.filter((t) => t.status === 'paying').length
  const settled = tenants.filter((t) => t.status === 'paying' || t.status === 'expired' || t.status === 'cancelled')
  const conversion = pct(tenants.filter((t) => t.status === 'paying').length, settled.length)

  const orders7 = tenants.reduce((s, t) => s + t.orders.last7, 0)
  const staff = tenants.reduce((s, t) => s + t.staff, 0)
  const locations = tenants.reduce((s, t) => s + t.locations, 0)

  const watch = [...tenants]
    .filter((t) => t.status !== 'expired' && t.status !== 'cancelled')
    .sort((a, b) => WATCH_RANK[a.health] - WATCH_RANK[b.health] || b.orders.last30 - a.orders.last30)
    .slice(0, 8)

  const inr = tenants.filter((t) => t.currency === 'INR').length
  const tiers = (['STARTER', 'PRO', 'ENTERPRISE'] as const).map((p) => ({ p, n: tenants.filter((t) => t.planTier === p).length }))

  const headline = tenants.length === 0 ? 'No restaurants yet.' : `${plural(tenants.length, 'restaurant')} run on Prominentz today.`

  return (
    <>
      <PageHead
        eyebrow="Prominentz team · SaaS admin"
        title={headline}
        actions={
          <form action="/hq/restaurants" className="bz-search" role="search" style={{ background: 'var(--bz-card)' }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <label className="bz-sr" htmlFor="hq-q">Find a restaurant or owner</label>
            <input id="hq-q" name="q" type="search" placeholder="Find a restaurant or owner" />
          </form>
        }
      />

      <section className="bz-grid" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c8 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 160 }}>MRR</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 20 }}>Monthly recurring revenue</h2>
            <span className="bz-big" style={{ fontSize: 52 }}>{mrrLine(mrr)}</span>
            <span className="bz-sub">
              {mrr.inrCount > 0 || mrr.usdCount > 0
                ? [mrr.inrCount > 0 && `${mrr.inrCount} paying in rupees`, mrr.usdCount > 0 && `${mrr.usdCount} paying in dollars`].filter(Boolean).join(' · ') + ' · at list price'
                : 'No paying restaurants yet'}
            </span>
          </div>
          <div className="bz-stack bz-push" style={{ gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bz-on-accent-muted)' }}>Sign-ups per month</span>
            <div className="bz-bars bz-bars--sm" style={{ height: 150 }}>
              {signups.map((s, i) => (
                <div className="bz-bar" key={s.key} style={{ gap: 6 }}>
                  <span className="bz-bar__val">{s.n}</span>
                  <div className={`bz-bar__fill${i === signups.length - 1 ? ' bz-bar__fill--hi' : ''}`} style={{ height: maxSign > 0 ? Math.max(6, Math.round((s.n / maxSign) * 100)) : 6 }} />
                  <span className="bz-bar__label" style={{ color: 'var(--bz-on-accent-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="bz-tile bz-c4">
          <h2 className="bz-title">Restaurants</h2>
          {[
            { label: 'Paying', n: paying, cls: 'bz-pillrow bz-pillrow--ink' },
            { label: 'On trial', n: trial, cls: 'bz-pillrow' },
            { label: 'Payment failed', n: pastDue, cls: 'bz-pillrow' },
            { label: 'Trial ended or cancelled', n: lapsed, cls: 'bz-pillrow' },
          ].map((r) => (
            <Link key={r.label} href="/hq/restaurants" className={r.cls} style={{ textDecoration: 'none' }}>
              <span className="bz-grow" style={{ fontWeight: 700, fontSize: 15 }}>{r.label}</span>
              <span className="bz-pillrow__n">{r.n}</span>
            </Link>
          ))}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <h2 className="bz-title">Trial to paid · last 30 days</h2>
          {[
            { label: 'Signed up', n: recent.length },
            { label: 'Took a first order', n: recentOrdered },
            { label: 'Paying now', n: recentPaying },
          ].map((f) => (
            <div key={f.label} className="bz-stack" style={{ gap: 6 }}>
              <div className="bz-row" style={{ fontSize: 14 }}>
                <span>{f.label}</span>
                <span className="bz-mono" style={{ fontWeight: 700 }}>{f.n}</span>
              </div>
              <div className="bz-meter">
                <div className="bz-meter__fill bz-meter__fill--lime" style={{ width: `${recent.length ? Math.round((f.n / recent.length) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
          <span style={{ fontSize: 13, color: '#A1A1AA' }}>
            {conversion === null ? 'No trials have finished yet' : `${conversion}% of finished trials became paying restaurants`}
          </span>
        </article>

        <article className="bz-tile bz-tile--accent bz-c6">
          <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>Platform, live</h2>
          <div className="bz-kpis">
            <div className="bz-kpi"><span className="bz-kpi__label" style={{ color: '#A1A1AA' }}>Orders, last 7 days</span><span className="bz-kpi__value">{orders7.toLocaleString('en-IN')}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label" style={{ color: '#A1A1AA' }}>Outlets</span><span className="bz-kpi__value">{locations}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label" style={{ color: '#A1A1AA' }}>Active staff accounts</span><span className="bz-kpi__value">{staff}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label" style={{ color: '#A1A1AA' }}>Payment failed</span><span className={`bz-kpi__value${pastDue === 0 ? ' bz-kpi__value--lime' : ''}`}>{pastDue}</span></div>
          </div>
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Enquiries</h2>
            <Link href="/hq/support" className="bz-link">Inbox</Link>
          </div>
          {leads.length > 0 ? (
            leads.map((l) => (
              <div key={l.id} className="bz-captain-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '10px 14px' }}>
                <div className="bz-row">
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{l.restaurantName} · {l.name}</span>
                  <span className="bz-meta" style={{ fontSize: 12 }}>{ago(l.createdAt)}</span>
                </div>
                <span className="bz-sub" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.message || [l.locations && plural(l.locations, 'outlet'), l.currentPos && `uses ${l.currentPos}`].filter(Boolean).join(' · ') || 'No message'}
                </span>
              </div>
            ))
          ) : (
            <Empty title="No enquiries yet">Requests from the website’s contact and demo forms land here.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c8">
          <div className="bz-row">
            <h2 className="bz-title">Accounts to watch</h2>
            <ExportCsvButton
              filename="prominentz-accounts.csv"
              rows={[
                ['Restaurant', 'City', 'Status', 'Plan', 'Orders/day (30d)', 'Last order', 'Health', 'Owner email'],
                ...tenants.map((t) => [t.name, t.city ?? '', t.status, PLAN_LABELS[t.planTier], perDay(t), t.orders.lastAt ? t.orders.lastAt.toISOString() : '', t.health, t.owner?.email ?? '']),
              ]}
            />
          </div>
          {watch.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner">
                <div className="bz-table__head" style={{ gridTemplateColumns: WATCH_COLS }}>
                  <span>Restaurant</span><span>Plan</span><span>Orders / day</span><span>Staff</span><span>Last order</span><span>Health</span>
                </div>
                {watch.map((t) => (
                  <div key={t.id} className="bz-table__row" style={{ gridTemplateColumns: WATCH_COLS }}>
                    <TenantName t={t} />
                    <span>{t.status === 'trial' ? `Trial · day ${t.trialDay}` : PLAN_LABELS[t.planTier]}</span>
                    <span className="bz-mono">{perDay(t)}</span>
                    <span className="bz-mono">{t.staff}</span>
                    <span className="bz-sub">{ago(t.orders.lastAt)}</span>
                    <HealthBadge t={t} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="Nothing to watch">Paying and trial restaurants appear here, the ones that need help first.</Empty>
          )}
        </article>

        <article className="bz-tile bz-c4">
          <h2 className="bz-title">Plan mix</h2>
          <div className="bz-stack" style={{ gap: 8 }}>
            <span className="bz-kpi__label">Region (by restaurant currency)</span>
            <div className="bz-split" aria-label={`India ${inr}, elsewhere ${tenants.length - inr}`}>
              {inr > 0 && <span style={{ flex: inr, background: 'var(--bz-accent)', color: '#FFFFFF' }}>India {inr}</span>}
              {tenants.length - inr > 0 && <span style={{ flex: tenants.length - inr, background: 'var(--bz-line)' }}>Elsewhere {tenants.length - inr}</span>}
              {tenants.length === 0 && <span style={{ flex: 1, background: 'var(--bz-soft)' }}>No restaurants yet</span>}
            </div>
          </div>
          <div className="bz-stack" style={{ gap: 8 }}>
            <span className="bz-kpi__label">Plan</span>
            {tiers.map(({ p, n }) => (
              <div key={p} className="bz-row" style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>{PLAN_LABELS[p]}</span>
                <span className="bz-mono">{n}</span>
              </div>
            ))}
          </div>
          <span className="bz-sub" style={{ fontSize: 13 }}>{lapsed > 0 ? `${plural(lapsed, 'restaurant')} ended a trial or cancelled` : 'No cancellations'}</span>
        </article>
      </section>
    </>
  )
}
