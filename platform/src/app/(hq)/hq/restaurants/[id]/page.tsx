import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHead, Empty, plural, pct } from '@/components/bento/pages/parts'
import { HealthBadge, ago, price, shortDate } from '@/components/hq/parts'
import { PLAN_LABELS } from '@/lib/plans'
import { STATUS_LABEL, loadAccount, requirePlatformAdmin } from '@/lib/hq/hq-data'

export const metadata = { title: 'Account' }
export const dynamic = 'force-dynamic'

function headlineFor(t: NonNullable<Awaited<ReturnType<typeof loadAccount>>>['tenant']) {
  if (t.status === 'past_due') return `${t.name}: the last payment failed.`
  if (t.health === 'at_risk') return `${t.name} is at risk. Orders are falling.`
  if (t.health === 'quiet') return `${t.name} took no orders this week.`
  if (t.status === 'trial') return t.health === 'stuck' ? `${t.name} is stuck on day ${t.trialDay} of the trial.` : `${t.name} is on day ${t.trialDay} of the trial.`
  if (t.status === 'paying') return `${t.name} is healthy.`
  return `${t.name}: ${t.status === 'cancelled' ? 'cancelled' : 'trial ended without paying'}.`
}

export default async function HqAccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin()
  const { id } = await params
  const data = await loadAccount(id)
  if (!data) notFound()
  const { tenant: t, months, activity, locations } = data

  const maxMonth = Math.max(...months.map((m) => m.n), 0)
  const prev = t.orders.prev23 / 23
  const change = prev > 0 ? pct(t.orders.last7 / 7 - prev, prev) : null
  const since = t.createdAt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const subStatus = t.status === 'paying' ? 'Active' : STATUS_LABEL[t.status]

  return (
    <>
      <PageHead
        eyebrow="Prominentz HQ · account"
        title={headlineFor(t)}
        actions={
          <>
            <Link href="/hq/restaurants" className="bz-btn bz-btn--outline">All restaurants</Link>
            {t.owner && (
              <a href={`mailto:${t.owner.email}?subject=${encodeURIComponent(`Prominentz · ${t.name}`)}`} className="bz-btn bz-btn--ink">
                Email the owner
              </a>
            )}
          </>
        }
      />

      <section className="bz-grid" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c7 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 130 }}>{t.health === 'at_risk' || t.health === 'stuck' ? 'RISK' : 'ACCT'}</span>
          <div className="bz-row" style={{ alignItems: 'flex-start', position: 'relative' }}>
            <div className="bz-stack">
              <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>{t.name}{t.city ? ` · ${t.city}` : ''}</h2>
              <span className="bz-big" style={{ fontSize: 40 }}>
                {t.monthlyPrice ? `${price(t.monthlyPrice, t.priceCurrency)} / mo` : t.status === 'trial' ? `${t.daysLeftInTrial} days left` : 'Not paying'}
              </span>
              <span className="bz-sub">
                {PLAN_LABELS[t.planTier]} · customer since {since}
                {t.owner ? ` · owner ${t.owner.name}` : ''}
              </span>
            </div>
            <span className="bz-badge" style={{ background: '#FFFFFF', borderColor: '#FFFFFF', color: '#141416' }}>{subStatus}</span>
          </div>
          <div className="bz-stack bz-push" style={{ gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bz-on-accent-muted)' }}>Orders per month</span>
            <div className="bz-bars bz-bars--sm" style={{ height: 150 }}>
              {months.map((m, i) => (
                <div className="bz-bar" key={m.label} style={{ gap: 6 }}>
                  <span className="bz-bar__val">{m.n}</span>
                  <div className={`bz-bar__fill${i === months.length - 1 ? ' bz-bar__fill--hi' : ''}`} style={{ height: maxMonth > 0 ? Math.max(6, Math.round((m.n / maxMonth) * 100)) : 6 }} />
                  <span className="bz-bar__label" style={{ color: 'var(--bz-on-accent-muted)' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="bz-sub" style={{ position: 'relative' }}>
            {change === null ? 'Not enough orders yet to show a trend' : change < 0 ? `Orders per day are down ${Math.abs(change)}% this week against the three weeks before` : `Orders per day are up ${change}% this week against the three weeks before`}
          </span>
        </article>

        <article className="bz-tile bz-tile--ink bz-c5">
          <div className="bz-row">
            <h2 className="bz-title">Owner</h2>
            <HealthBadge t={t} />
          </div>
          {t.owner ? (
            <>
              <div className="bz-darkrow bz-darkrow--pad">
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{t.owner.name}</span>
                <span className="bz-darkrow__meta">{t.owner.email}</span>
              </div>
              <div className="bz-row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <a href={`mailto:${t.owner.email}`} className="bz-btn bz-btn--lime">Email</a>
                {t.phone && <a href={`tel:${t.phone.replace(/[^\d+]/g, '')}`} className="bz-btn bz-btn--ghost-light">Call {t.phone}</a>}
              </div>
            </>
          ) : (
            <span style={{ color: '#A1A1AA', fontSize: 14 }}>This restaurant has no owner account.</span>
          )}
        </article>

        <article className="bz-tile bz-c5">
          <div className="bz-row">
            <h2 className="bz-title">Usage</h2>
            <span className="bz-meta">30 days</span>
          </div>
          <div className="bz-kpis">
            <div className="bz-kpi"><span className="bz-kpi__label">Orders</span><span className="bz-kpi__value">{t.orders.last30.toLocaleString('en-IN')}</span><span className="bz-kpi__note">{plural(t.orders.total, 'order')} all time</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label">Last order</span><span className="bz-kpi__value" style={{ fontSize: 18 }}>{ago(t.orders.lastAt)}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label">Staff accounts</span><span className="bz-kpi__value">{t.staff}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label">Menu · tables</span><span className="bz-kpi__value">{t.menuItems} · {t.tables}</span></div>
          </div>
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Billing</h2>
            <span className="bz-meta">{t.gateway === 'DODO' ? 'Dodo Payments' : 'Stripe'}</span>
          </div>
          <div className="bz-dl">
            <span className="bz-sub">Subscription</span><b>{subStatus}</b>
            <span className="bz-sub">Plan</span><b>{PLAN_LABELS[t.planTier]}{t.monthlyPrice ? ` · ${price(t.monthlyPrice, t.priceCurrency)} list` : ''}</b>
            <span className="bz-sub">Trial</span><b>{t.status === 'trial' ? `ends ${shortDate(t.trialEndsAt)} (${t.daysLeftInTrial} days left)` : `ended ${shortDate(t.trialEndsAt)}`}</b>
          </div>
          <span className="bz-sub" style={{ fontSize: 13 }}>Invoices and payment attempts live with the payment provider.</span>
          {t.stripeCustomerId && (
            <a href={`https://dashboard.stripe.com/customers/${encodeURIComponent(t.stripeCustomerId)}`} target="_blank" rel="noreferrer" className="bz-btn bz-btn--outline" style={{ alignSelf: 'flex-start' }}>
              Open in Stripe
            </a>
          )}
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Outlets</h2>
            <span className="bz-meta">{plural(locations.length, 'outlet')}</span>
          </div>
          {locations.length > 0 ? (
            locations.map((l) => (
              <div key={l.id} className="bz-captain-row" style={{ minHeight: 48 }}>
                <span className="bz-grow" style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</span>
                <span className="bz-sub" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{l.address || 'No address'}</span>
              </div>
            ))
          ) : (
            <Empty title="No outlets">The owner has not added a location yet.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c12">
          <div className="bz-row">
            <h2 className="bz-title">Recent changes in this restaurant</h2>
            <span style={{ fontSize: 13, color: '#A1A1AA' }}>from the audit log</span>
          </div>
          {activity.length > 0 ? (
            activity.map((a) => (
              <div key={a.id} className="bz-darkrow bz-darkrow--pad">
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>
                  {a.action.toLowerCase().replace(/_/g, ' ')}
                  {a.targetType ? ` · ${a.targetType.toLowerCase()}` : ''}
                </span>
                <span className="bz-darkrow__meta">{a.actorName || 'staff'} · {ago(a.createdAt)}</span>
              </div>
            ))
          ) : (
            <span style={{ color: '#A1A1AA', fontSize: 14 }}>No voids, refunds, menu or staff changes recorded yet.</span>
          )}
        </article>
      </section>
    </>
  )
}
