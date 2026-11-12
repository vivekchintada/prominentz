import Link from 'next/link'
import { PageHead, Empty, plural } from '@/components/bento/pages/parts'
import { ExportCsvButton } from '@/components/hq/ExportCsvButton'
import { ago } from '@/components/hq/parts'
import { loadLeads, loadTenants, requirePlatformAdmin } from '@/lib/hq/hq-data'

export const metadata = { title: 'Support' }
export const dynamic = 'force-dynamic'

const COLS = 'minmax(0, 1.2fr) minmax(0, 1.6fr) 90px 90px 110px'

export default async function HqSupportPage() {
  await requirePlatformAdmin()
  const [leads, tenants] = await Promise.all([loadLeads(100), loadTenants()])

  const day = 24 * 60 * 60 * 1000
  const now = Date.now()
  const week = leads.filter((l) => now - l.createdAt.getTime() < 7 * day).length
  const today = leads.filter((l) => now - l.createdAt.getTime() < day).length

  // Restaurants that need a hand, most urgent first
  const help = [
    ...tenants.filter((t) => t.status === 'past_due').map((t) => ({ t, why: 'payment failed', rank: 0 })),
    ...tenants.filter((t) => t.status === 'paying' && t.health === 'at_risk').map((t) => ({ t, why: 'orders falling', rank: 1 })),
    ...tenants.filter((t) => t.health === 'stuck').map((t) => ({ t, why: `trial day ${t.trialDay}, no orders this week`, rank: 2 })),
    ...tenants.filter((t) => t.status === 'paying' && t.health === 'quiet').map((t) => ({ t, why: 'no orders in 7 days', rank: 3 })),
  ].sort((a, b) => a.rank - b.rank)

  const sources = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const k = (l.source || 'website').toLowerCase()
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const maxSource = Math.max(...sources.map(([, n]) => n), 0)

  const headline = `${plural(leads.filter((l) => now - l.createdAt.getTime() < 30 * day).length, 'enquiry', 'enquiries')} this month. ${help.length ? `${plural(help.length, 'restaurant')} need a hand.` : 'No restaurant needs a hand.'}`

  return (
    <>
      <PageHead
        eyebrow="Prominentz HQ · support"
        title={headline}
        actions={
          <ExportCsvButton
            label="Export enquiries"
            filename="prominentz-enquiries.csv"
            rows={[
              ['Received', 'Name', 'Email', 'Phone', 'Restaurant', 'Outlets', 'Current POS', 'Source', 'Message'],
              ...leads.map((l) => [l.createdAt.toISOString(), l.name, l.email, l.phone ?? '', l.restaurantName, l.locations ?? '', l.currentPos ?? '', l.source ?? '', l.message ?? '']),
            ]}
          />
        }
      />

      <section className="bz-grid" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c4">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 140 }}>NEW</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>Enquiries</h2>
            <span className="bz-big" style={{ fontSize: 48 }}>{plural(week, 'new', 'new')}</span>
            <span className="bz-sub">this week · from the website forms</span>
          </div>
          <div className="bz-kpis bz-push">
            <div className="bz-kpi"><span className="bz-kpi__label" style={{ color: '#A1A1AA' }}>Today</span><span className="bz-kpi__value">{today}</span></div>
            <div className="bz-kpi"><span className="bz-kpi__label" style={{ color: '#A1A1AA' }}>Need a hand</span><span className="bz-kpi__value">{help.length}</span></div>
          </div>
        </article>

        <article className="bz-tile bz-c8">
          <div className="bz-row">
            <h2 className="bz-title">Inbox</h2>
            <span className="bz-meta">newest first</span>
          </div>
          {leads.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner">
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>From</span><span>Message</span><span>Outlets</span><span>Received</span><span>Reply</span>
                </div>
                {leads.slice(0, 12).map((l) => (
                  <div key={l.id} className="bz-table__row" style={{ gridTemplateColumns: COLS }}>
                    <span style={{ minWidth: 0 }}>
                      <b>{l.restaurantName}</b>
                      <br />
                      <span className="bz-sub" style={{ fontSize: 12 }}>{l.name}</span>
                    </span>
                    <span className="bz-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.message || (l.currentPos ? `Uses ${l.currentPos}` : 'No message')}
                    </span>
                    <span className="bz-mono">{l.locations ?? '–'}</span>
                    <span className="bz-sub">{ago(l.createdAt)}</span>
                    <a href={`mailto:${l.email}?subject=${encodeURIComponent(`Prominentz for ${l.restaurantName}`)}`} className="bz-btn bz-btn--ink bz-btn--sm" style={{ justifySelf: 'start' }}>
                      Email
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="Inbox is empty">Contact and demo requests from the website land here.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c7">
          <div className="bz-row">
            <h2 className="bz-title">Restaurants that need a hand</h2>
            <span style={{ fontSize: 13, color: '#A1A1AA' }}>most urgent first</span>
          </div>
          {help.length > 0 ? (
            help.slice(0, 8).map(({ t, why }) => (
              <div key={t.id} className="bz-darkrow bz-darkrow--pad">
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{t.name}</span>
                <span className="bz-darkrow__meta">{why}</span>
                <Link href={`/hq/restaurants/${t.id}`} className="bz-btn bz-btn--lime bz-btn--sm">Open</Link>
              </div>
            ))
          ) : (
            <span style={{ color: '#A1A1AA', fontSize: 14 }}>No failed payments, falling orders or stuck trials right now.</span>
          )}
        </article>

        <article className="bz-tile bz-c5">
          <h2 className="bz-title">Where enquiries come from</h2>
          {sources.length > 0 ? (
            sources.slice(0, 5).map(([s, n], i) => (
              <div key={s} className="bz-stack" style={{ gap: 6 }}>
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{s.replace(/[-_]/g, ' ')}</span>
                  <span className="bz-sub">{n}</span>
                </div>
                <div className="bz-meter">
                  <div className={`bz-meter__fill${i === 0 ? ' bz-meter__fill--accent' : ''}`} style={{ width: `${maxSource ? Math.round((n / maxSource) * 100) : 0}%` }} />
                </div>
              </div>
            ))
          ) : (
            <Empty title="Nothing yet">The source of each enquiry shows here once they come in.</Empty>
          )}
        </article>
      </section>
    </>
  )
}
