import Link from 'next/link'
import { initials } from '@/lib/bento/time'
import type { SettingsBoard } from '@/lib/bento/settings-page'
import { PageHead, plural } from './parts'

interface Props {
  data: SettingsBoard
  outletName: string | null
}

function OnOffList({ rows }: { rows: { name: string; detail: string; on: boolean }[] }) {
  return (
    <div className="bz-list" style={{ gap: 0 }}>
      {rows.map((r) => (
        <div key={r.name} className="bz-toggle-row">
          <div className="bz-stack" style={{ gap: 0, minWidth: 0 }}>
            <span className="bz-toggle-row__name" style={{ fontSize: 14 }}>{r.name}</span>
            <span className="bz-sub" style={{ fontSize: 12 }}>{r.detail}</span>
          </div>
          <span className={r.on ? 'bz-on' : 'bz-off'}>{r.on ? 'On' : 'Off'}</span>
        </div>
      ))}
    </div>
  )
}

/** Settings board: a read-only summary over the full settings forms. */
export function SettingsBoardView({ data, outletName }: Props) {
  const tierName = data.plan.tier.charAt(0) + data.plan.tier.slice(1).toLowerCase()
  const devicesOn = data.devices.filter((d) => d.on).length

  return (
    <>
      <PageHead
        eyebrow={`Settings${outletName ? ` · ${outletName}` : ''}`}
        title={`Settings for ${outletName ?? 'your restaurant'}.`}
        actions={<a href="#manage" className="bz-btn bz-btn--ink">Edit settings</a>}
      />

      <section className="bz-grid" aria-label="Settings at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-c8 bz-r2">
          <div className="bz-row bz-row--center">
            <h2 className="bz-title">Restaurant profile</h2>
            <span className="bz-meta">shown on bills</span>
          </div>
          <dl className="bz-dl">
            {data.profile.map((p) => (
              <div key={p.label} className={p.wide ? 'bz-dl__wide' : undefined}>
                <dt>{p.label}</dt>
                <dd>{p.value}</dd>
              </div>
            ))}
          </dl>
          <div className="bz-row bz-push" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <Link href="/dashboard/locations" className="bz-btn bz-btn--outline">Outlets</Link>
            <a href="#manage" className="bz-btn bz-btn--ink">Change details</a>
          </div>
        </article>

        <article className="bz-tile bz-tile--accent bz-c4">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 120 }}>PLAN</span>
          <h2 className="bz-title">{tierName} plan</h2>
          <span style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.1 }}>{data.plan.status}</span>
          <span className="bz-sub">{data.plan.detail}</span>
          <Link href="/dashboard/settings/billing" className="bz-btn bz-btn--lime bz-push">Manage billing</Link>
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Devices</h2>
            <span className="bz-meta">{devicesOn} of {data.devices.length} on</span>
          </div>
          <OnOffList rows={data.devices} />
        </article>

        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">Users and roles</h2>
            <span className="bz-meta">{plural(data.people.total, 'person', 'people')}</span>
          </div>
          <div className="bz-list" style={{ gap: 12 }}>
            {data.people.list.map((u) => (
              <div key={u.id} className="bz-item">
                <span className="bz-ini">{initials(u.name)}</span>
                <span className="bz-item__name bz-grow" style={{ fontSize: 14 }}>{u.name}</span>
                <span className="bz-badge bz-badge--quiet">{u.role}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/staff#manage" className="bz-btn bz-btn--outline bz-push">Invite someone</Link>
        </article>

        <article className="bz-tile bz-c4">
          <h2 className="bz-title">Bills and printing</h2>
          <OnOffList rows={data.bills} />
        </article>

        <article className="bz-tile bz-tile--ink bz-c4">
          <h2 className="bz-title">Connected apps</h2>
          <OnOffList rows={data.apps} />
        </article>
      </section>
    </>
  )
}
