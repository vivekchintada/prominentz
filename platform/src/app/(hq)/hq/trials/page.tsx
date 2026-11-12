import Link from 'next/link'
import { PageHead, Empty, plural, pct } from '@/components/bento/pages/parts'
import { HealthBadge, TenantName, ago, setupSoFar } from '@/components/hq/parts'
import { loadTenants, requirePlatformAdmin } from '@/lib/hq/hq-data'
import { TRIAL_DAYS } from '@/lib/subscription-status'

export const metadata = { title: 'Trials' }
export const dynamic = 'force-dynamic'

const COLS = 'minmax(0, 1.5fr) 80px 80px minmax(0, 1.3fr) 120px'

export default async function HqTrialsPage() {
  await requirePlatformAdmin()
  const tenants = await loadTenants()

  const trials = tenants.filter((t) => t.status === 'trial').sort((a, b) => a.daysLeftInTrial - b.daysLeftInTrial)
  const ordered = trials.filter((t) => t.orders.total > 0).length
  const onTrack = trials.filter((t) => t.health === 'converting').length
  const stuck = trials.filter((t) => t.health === 'stuck')
  const finished = tenants.filter((t) => t.status !== 'trial')
  const paidShare = pct(finished.filter((t) => t.status === 'paying' || t.status === 'past_due').length, finished.length)

  const share = (f: (t: (typeof trials)[number]) => boolean) => (trials.length ? Math.round((trials.filter(f).length / trials.length) * 100) : 0)
  const checklist = [
    { label: 'Added a menu', v: share((t) => t.menuItems > 0) },
    { label: 'Set up tables', v: share((t) => t.tables > 0) },
    { label: 'Invited staff', v: share((t) => t.staff > 1) },
    { label: 'Took a first order', v: share((t) => t.orders.total > 0) },
  ]

  const headline =
    trials.length === 0 ? 'No restaurants on trial right now.' : `${plural(trials.length, 'restaurant')} on trial.${stuck.length ? ` ${stuck.length} need a call today.` : ''}`

  return (
    <>
      <PageHead
        eyebrow="Prominentz HQ · trials"
        title={headline}
        actions={<Link href="/signup" className="bz-btn bz-btn--outline" target="_blank">Open the sign-up page</Link>}
      />

      <section className="bz-grid" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-tile--accent bz-c5 bz-r2">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 150 }}>{TRIAL_DAYS}d</span>
          <div className="bz-stack">
            <h2 className="bz-title bz-title--hero" style={{ fontSize: 18 }}>Trials right now</h2>
            <span className="bz-big" style={{ fontSize: 60 }}>{trials.length}</span>
            <span className="bz-sub">{paidShare === null ? 'No trial has finished yet' : `${paidShare}% of finished trials became paying restaurants`}</span>
          </div>
          <div className="bz-stack bz-push" style={{ gap: 14 }}>
            {[
              { label: 'On trial', n: trials.length },
              { label: 'Took a first order', n: ordered },
              { label: 'On track to pay', n: onTrack },
            ].map((r) => (
              <div key={r.label} className="bz-stack" style={{ gap: 6 }}>
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{r.label}</span>
                  <span className="bz-mono" style={{ color: 'var(--bz-on-accent-muted)' }}>{r.n}</span>
                </div>
                <div className="bz-meter" style={{ background: '#141416' }}>
                  <div className="bz-meter__fill bz-meter__fill--lime" style={{ width: `${trials.length ? Math.round((r.n / trials.length) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="bz-tile bz-c7">
          <div className="bz-row">
            <h2 className="bz-title">Trial accounts</h2>
            <span className="bz-meta">closest to the end first</span>
          </div>
          {trials.length > 0 ? (
            <div className="bz-table">
              <div className="bz-table__inner">
                <div className="bz-table__head" style={{ gridTemplateColumns: COLS }}>
                  <span>Restaurant</span><span>Trial</span><span>Orders</span><span>Set up so far</span><span>Status</span>
                </div>
                {trials.map((t) => (
                  <div key={t.id} className="bz-table__row" style={{ gridTemplateColumns: COLS }}>
                    <TenantName t={t} />
                    <span>Day {t.trialDay}</span>
                    <span className="bz-mono">{t.orders.total}</span>
                    <span className="bz-sub">{setupSoFar(t)}</span>
                    <HealthBadge t={t} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty title="No trials">New sign-ups appear here for their first {TRIAL_DAYS} days.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Stuck · call today</h2>
            <span style={{ fontSize: 13, color: '#A1A1AA' }}>{stuck.length}</span>
          </div>
          {stuck.length > 0 ? (
            stuck.slice(0, 5).map((t) => (
              <div key={t.id} className="bz-darkrow bz-darkrow--pad">
                <span className="bz-darkrow__main" style={{ fontSize: 14 }}>{t.name}</span>
                <span className="bz-darkrow__meta">day {t.trialDay}{t.orders.total ? `, quiet since ${ago(t.orders.lastAt)}` : ', no orders'}</span>
                {t.phone ? (
                  <a href={`tel:${t.phone.replace(/[^\d+]/g, '')}`} className="bz-btn bz-btn--lime bz-btn--sm">Call</a>
                ) : t.owner ? (
                  <a href={`mailto:${t.owner.email}`} className="bz-btn bz-btn--lime bz-btn--sm">Email</a>
                ) : null}
              </div>
            ))
          ) : (
            <span style={{ color: '#A1A1AA', fontSize: 14 }}>Every trial past day 3 has taken orders this week.</span>
          )}
          <span style={{ fontSize: 13, color: '#A1A1AA' }}>Stuck means day 3 or later with no orders in the last 7 days.</span>
        </article>

        <article className="bz-tile bz-c3">
          <div className="bz-row">
            <h2 className="bz-title">Setup across trials</h2>
          </div>
          {checklist.map((c, i) => (
            <div key={c.label} className="bz-stack" style={{ gap: 6 }}>
              <div className="bz-row" style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>{c.label}</span>
                <span className="bz-sub">{c.v}%</span>
              </div>
              <div className="bz-meter">
                <div className={`bz-meter__fill${i === 0 ? ' bz-meter__fill--accent' : ''}`} style={{ width: `${c.v}%` }} />
              </div>
            </div>
          ))}
        </article>
      </section>
    </>
  )
}
