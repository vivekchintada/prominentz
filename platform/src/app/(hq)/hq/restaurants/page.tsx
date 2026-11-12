import Link from 'next/link'
import { PageHead, Empty, plural } from '@/components/bento/pages/parts'
import { ExportCsvButton } from '@/components/hq/ExportCsvButton'
import { HealthBadge, TenantName, ago, perDay, price } from '@/components/hq/parts'
import { PLAN_LABELS } from '@/lib/plans'
import { STATUS_LABEL, loadTenants, requirePlatformAdmin, type TenantStatus } from '@/lib/hq/hq-data'

export const metadata = { title: 'Restaurants' }
export const dynamic = 'force-dynamic'

const COLS = 'minmax(0, 1.6fr) minmax(0, 1.2fr) 120px 80px 70px 110px 120px'
const FILTERS: { key: 'all' | TenantStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paying', label: 'Paying' },
  { key: 'trial', label: 'On trial' },
  { key: 'past_due', label: 'Payment failed' },
  { key: 'expired', label: 'Trial ended' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default async function HqRestaurantsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requirePlatformAdmin()
  const [{ q = '', status = 'all' }, tenants] = await Promise.all([searchParams, loadTenants()])

  const needle = q.trim().toLowerCase()
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, f.key === 'all' ? tenants.length : tenants.filter((t) => t.status === f.key).length]))
  const shown = tenants.filter(
    (t) =>
      (status === 'all' || t.status === status) &&
      (!needle || [t.name, t.city, t.owner?.name, t.owner?.email].some((v) => v?.toLowerCase().includes(needle))),
  )
  const href = (s: string) => `/hq/restaurants?${new URLSearchParams({ ...(needle ? { q } : {}), ...(s !== 'all' ? { status: s } : {}) })}`

  return (
    <>
      <PageHead
        eyebrow="Prominentz HQ · restaurants"
        title={needle ? `${plural(shown.length, 'match', 'matches')} for “${q.trim()}”.` : `${plural(tenants.length, 'restaurant')} on the platform.`}
        actions={
          <>
            <form action="/hq/restaurants" className="bz-search" role="search" style={{ background: 'var(--bz-card)' }}>
              <label className="bz-sr" htmlFor="hq-q">Find a restaurant or owner</label>
              <input id="hq-q" name="q" type="search" defaultValue={q} placeholder="Name, city or owner email" />
              {status !== 'all' && <input type="hidden" name="status" value={status} />}
            </form>
            <ExportCsvButton
              filename="prominentz-restaurants.csv"
              rows={[
                ['Restaurant', 'City', 'Owner', 'Owner email', 'Status', 'Plan', 'List price / mo', 'Orders 30d', 'Staff', 'Signed up'],
                ...shown.map((t) => [t.name, t.city ?? '', t.owner?.name ?? '', t.owner?.email ?? '', STATUS_LABEL[t.status], PLAN_LABELS[t.planTier], t.monthlyPrice ? price(t.monthlyPrice, t.priceCurrency) : '', t.orders.last30, t.staff, t.createdAt.toISOString().slice(0, 10)]),
              ]}
            />
          </>
        }
      />

      <nav aria-label="Filter by status" className="bz-filters" style={{ marginTop: 16 }}>
        {FILTERS.map((f) => (
          <Link key={f.key} href={href(f.key)} className={`bz-filter bz-filter--card${status === f.key ? ' bz-filter--on' : ''}`} aria-current={status === f.key ? 'page' : undefined}>
            {f.label} <span className="bz-filter__n">{counts[f.key]}</span>
          </Link>
        ))}
      </nav>

      <section className="bz-grid" style={{ marginTop: 16 }}>
        <article className="bz-tile bz-c12">
          {shown.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner" style={{ minWidth: 900 }}>
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>Restaurant</span><span>Owner</span><span>Status</span><span>Orders / day</span><span>Staff</span><span>Last order</span><span>Health</span>
                </div>
                {shown.map((t) => (
                  <div key={t.id} className="bz-table__row" style={{ gridTemplateColumns: COLS }}>
                    <TenantName t={t} />
                    <span className="bz-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.owner ? `${t.owner.name} · ${t.owner.email}` : 'No owner account'}</span>
                    <span>{t.status === 'trial' ? `Trial · day ${t.trialDay}` : STATUS_LABEL[t.status]}</span>
                    <span className="bz-mono">{perDay(t)}</span>
                    <span className="bz-mono">{t.staff}</span>
                    <span className="bz-sub">{ago(t.orders.lastAt)}</span>
                    <HealthBadge t={t} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No restaurants match">Try another name, city or email, or clear the filter.</Empty>
          )}
        </article>
      </section>
    </>
  )
}
