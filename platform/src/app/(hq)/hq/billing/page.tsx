import Link from 'next/link'
import { PageHead, Empty, plural, pct } from '@/components/bento/pages/parts'
import { ExportCsvButton } from '@/components/hq/ExportCsvButton'
import { HealthBadge, TenantName, mrrLine, price, shortDate } from '@/components/hq/parts'
import { PLAN_LABELS } from '@/lib/plans'
import { PRICING } from '@/lib/pricing'
import { STATUS_LABEL, loadTenants, mrrOf, requirePlatformAdmin } from '@/lib/hq/hq-data'

export const metadata = { title: 'Billing' }
export const dynamic = 'force-dynamic'

const COLS = '80px minmax(0, 1.6fr) 130px 110px 120px'

export default async function HqBillingPage() {
  await requirePlatformAdmin()
  const tenants = await loadTenants()

  const mrr = mrrOf(tenants)
  const paying = tenants.filter((t) => t.status === 'paying')
  const failed = tenants.filter((t) => t.status === 'past_due')
  const finished = tenants.filter((t) => t.status === 'paying' || t.status === 'expired' || t.status === 'cancelled' || t.status === 'past_due')
  const conversion = pct(paying.length, finished.length)
  const collection = pct(paying.length, paying.length + failed.length)
  const now = Date.now()
  const in14 = now + 14 * 24 * 60 * 60 * 1000
  const ending = tenants
    .filter((t) => t.status === 'trial' && t.trialEndsAt.getTime() <= in14)
    .sort((a, b) => a.trialEndsAt.getTime() - b.trialEndsAt.getTime())
  const cancelled = tenants.filter((t) => t.status === 'cancelled').length
  const total = mrr.inrCount + mrr.usdCount

  const headline =
    total === 0 ? 'No paying restaurants yet.' : `MRR ${mrrLine(mrr)}.${failed.length ? ` ${plural(failed.length, 'payment')} to chase.` : ' Nothing to chase.'}`

  return (
    <>
      <PageHead
        eyebrow="Prominentz HQ · billing"
        title={headline}
        actions={
          <ExportCsvButton
            label="Export paying accounts"
            filename="prominentz-paying.csv"
            rows={[
              ['Restaurant', 'Owner email', 'Gateway', 'Plan', 'List price / mo', 'Status'],
              ...[...paying, ...failed].map((t) => [t.name, t.owner?.email ?? '', t.gateway, PLAN_LABELS[t.planTier], price(t.monthlyPrice, t.priceCurrency), STATUS_LABEL[t.status]]),
            ]}
          />
        }
      />

      <section className="bz-grid" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c6 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 150 }}>MRR</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>Monthly recurring revenue</h2>
            <span className="bz-big" style={{ fontSize: 48 }}>{mrrLine(mrr)}</span>
            <span className="bz-sub">At list price per month. Rupee and dollar plans are kept apart, with no exchange rate applied.</span>
          </div>
          <div className="bz-stack bz-push" style={{ gap: 14 }}>
            {[
              { label: `India · ${plural(mrr.inrCount, 'restaurant')}`, value: price(mrr.inr, 'INR'), n: mrr.inrCount },
              { label: `Elsewhere · ${plural(mrr.usdCount, 'restaurant')}`, value: price(mrr.usd, 'USD'), n: mrr.usdCount },
              { label: `Cancelled · ${plural(cancelled, 'account')}`, value: '', n: cancelled },
            ].map((r) => (
              <div key={r.label} className="bz-stack" style={{ gap: 6 }}>
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{r.label}</span>
                  <span className="bz-mono" style={{ color: 'var(--bz-on-accent-muted)' }}>{r.value}</span>
                </div>
                <div className="bz-meter" style={{ background: '#141416' }}>
                  <div className="bz-meter__fill bz-meter__fill--lime" style={{ width: `${total + cancelled ? Math.round((r.n / (total + cancelled)) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="bz-tile bz-tile--ink bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Failed payments</h2>
            <span style={{ fontSize: 13, color: '#A1A1AA' }}>{failed.length ? 'chase today' : 'none'}</span>
          </div>
          {failed.length > 0 ? (
            failed.map((t) => (
              <div key={t.id} className="bz-darkrow bz-darkrow--pad">
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{t.name} · {price(t.monthlyPrice, t.priceCurrency)}</span>
                <span className="bz-darkrow__meta">{t.gateway === 'DODO' ? 'Dodo' : 'Stripe'}</span>
                {t.owner ? (
                  <a href={`mailto:${t.owner.email}?subject=${encodeURIComponent('Your Prominentz payment did not go through')}`} className="bz-btn bz-btn--lime bz-btn--sm">Email owner</a>
                ) : (
                  <Link href={`/hq/restaurants/${t.id}`} className="bz-btn bz-btn--lime bz-btn--sm">Open</Link>
                )}
              </div>
            ))
          ) : (
            <span style={{ color: '#A1A1AA', fontSize: 14 }}>Every paying restaurant’s last charge went through.</span>
          )}
          <span style={{ fontSize: 13, color: '#A1A1AA' }}>The payment provider retries failed charges on its own schedule. The restaurant keeps access while the charge is being retried.</span>
        </article>

        <article className="bz-tile bz-c6">
          <h2 className="bz-title">Unit numbers</h2>
          <div className="bz-kpis">
            <div className="bz-kpi"><span className="bz-kpi__label">Paying restaurants</span><span className="bz-kpi__value">{paying.length}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label">Last charge succeeded</span><span className="bz-kpi__value">{collection === null ? '–' : `${collection}%`}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label">Trials that paid</span><span className="bz-kpi__value">{conversion === null ? '–' : `${conversion}%`}</span><span className="bz-kpi__note">of finished trials</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label">Trials ending in 14 days</span><span className="bz-kpi__value">{ending.length}</span></div>
          </div>
        </article>

        <article className="bz-tile bz-c12">
          <div className="bz-row">
            <h2 className="bz-title">Trials ending soon</h2>
            <span className="bz-meta">next 14 days</span>
          </div>
          {ending.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner">
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>Ends</span><span>Restaurant</span><span>Would pay</span><span>Orders so far</span><span>Health</span>
                </div>
                {ending.map((t) => (
                  <div key={t.id} className="bz-table__row" style={{ gridTemplateColumns: COLS }}>
                    <span className="bz-sub">{shortDate(t.trialEndsAt)}</span>
                    <TenantName t={t} />
                    <span className="bz-mono">{price(t.priceCurrency === 'INR' ? PRICING[t.planTier].monthlyINR : PRICING[t.planTier].monthly, t.priceCurrency)}</span>
                    <span className="bz-mono">{t.orders.total}</span>
                    <HealthBadge t={t} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No trials end in the next two weeks">New sign-ups show up here as their trial gets close to the end.</Empty>
          )}
        </article>
      </section>
    </>
  )
}
