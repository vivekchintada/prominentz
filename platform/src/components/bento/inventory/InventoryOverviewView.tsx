import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import type { InventoryOverview } from '@/lib/bento/inventory-overview'
import { IngredientsTile } from './IngredientsTile'

interface Props {
  data: InventoryOverview
  currency: string
  roleLabel: string
}

/** Store keeper · Inventory board, wired to real stock. */
export function InventoryOverviewView({ data, currency, roleLabel }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const usageMax = data.usage ? Math.max(...data.usage.bars.map((b) => b.value), 0) : 0

  return (
    <>
      <div className="bz-head">
        <div className="bz-head__text">
          <span className="bz-eyebrow">{roleLabel}</span>
          <h1 className="bz-h1">{data.headline}</h1>
        </div>
      </div>

      <section className="bz-grid" aria-label="Stock at a glance" style={{ marginTop: 20 }}>
        {/* Reorder now */}
        <article className="bz-tile bz-tile--accent bz-c5 bz-r2" style={{ padding: 26, gap: 16 }}>
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 130, right: -8, top: 4 }}>LOW</span>
          <div className="bz-stack" style={{ gap: 4 }}>
            <h2 className="bz-title">Reorder now</h2>
            <span className="bz-sub">Below the reorder point, soonest to run out first, from the last 14 days of recipe use</span>
          </div>
          {data.reorder.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.reorder.map((r) => (
                <div key={r.id} className="bz-glassrow">
                  <span className="bz-grow" style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <span className="bz-mono" style={{ fontSize: 13, color: 'var(--bz-on-accent-muted)', whiteSpace: 'nowrap' }}>{r.left}</span>
                  <span className="bz-mono" style={{ padding: '4px 10px', borderRadius: 8, background: '#FFFFFF', color: '#141416', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.days}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bz-empty">
              <strong>Nothing to reorder</strong>
              Every ingredient is above its reorder point.
            </div>
          )}
          <div className="bz-push" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/dashboard/inventory/purchase-orders" className="bz-btn bz-btn--lime bz-btn--lg">Create purchase order</Link>
            {data.reorderCount > 0 && (
              <Link href="#ingredients" className="bz-btn bz-btn--ghost-light bz-btn--lg">See all {data.reorderCount}</Link>
            )}
          </div>
        </article>

        {/* Stock on hand */}
        <article className="bz-tile bz-c4">
          <h2 className="bz-title">Stock on hand</h2>
          <span className="bz-big bz-big--md">{m(data.stockValue)}</span>
          <div className="bz-kpis" style={{ gap: 10 }}>
            <div className="bz-kpi" style={{ borderRadius: 16, padding: '12px 14px' }}>
              <span className="bz-kpi__label">Food cost</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{data.foodCostPct === null ? '–' : `${data.foodCostPct.toFixed(1)}%`}</span>
              <span className="bz-kpi__note">last 30 days</span>
            </div>
            <div className="bz-kpi" style={{ borderRadius: 16, padding: '12px 14px' }}>
              <span className="bz-kpi__label">Days of cover</span>
              <span className="bz-kpi__value" style={{ fontSize: 20 }}>{data.daysOfCover === null ? '–' : data.daysOfCover.toFixed(1)}</span>
              <span className="bz-kpi__note">across {data.itemCount} items</span>
            </div>
          </div>
        </article>

        {/* Wastage */}
        <article className="bz-tile bz-tile--ink bz-c3" style={{ gap: 12 }}>
          <h2 className="bz-title">Wastage · week</h2>
          <span className="bz-big bz-big--sm">{m(data.waste.total)}</span>
          {data.waste.reasons.length > 0 ? (
            data.waste.reasons.map((w) => (
              <div key={w.label} className="bz-row" style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--bz-night-line)' }}>
                <span>{w.label}</span>
                <span className="bz-mono" style={{ color: 'var(--bz-on-night-soft)' }}>{m(w.amount)}</span>
              </div>
            ))
          ) : (
            <span className="bz-sub">No waste logged in the last 7 days.</span>
          )}
          <Link href="/dashboard/inventory/waste" className="bz-link bz-push" style={{ fontSize: 14 }}>Log wastage</Link>
        </article>

        {/* Usage chart */}
        <article className="bz-tile bz-c4">
          <div className="bz-row">
            <h2 className="bz-title">{data.usage ? `${data.usage.itemName} used, ${data.usage.unit}` : 'Ingredient use'}</h2>
            <span className="bz-meta">last 7 days</span>
          </div>
          {data.usage && usageMax > 0 ? (
            <div className="bz-bars bz-bars--sm" style={{ height: 150 }}>
              {data.usage.bars.map((b, i) => (
                <div className="bz-bar" key={i} style={{ gap: 6 }}>
                  <span className="bz-bar__val" style={{ fontSize: 11, color: 'var(--bz-muted)', fontWeight: 400 }}>{b.value > 0 ? (Number.isInteger(b.value) ? b.value : b.value.toFixed(1)) : ''}</span>
                  <div className={`bz-bar__fill${b.hi ? ' bz-bar__fill--hi' : ''}`} style={{ height: Math.max(4, Math.round((b.value / usageMax) * 100)), ['--i' as string]: i }} />
                  <span className="bz-bar__label" style={{ fontSize: 12 }}>{b.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bz-empty">
              <strong>No recipe use yet</strong>
              Link ingredients to dishes in Recipes and sales will draw stock down here.
            </div>
          )}
        </article>

        {/* On order */}
        <article className="bz-tile bz-tile--ink bz-c3" style={{ gap: 10 }}>
          <h2 className="bz-title">On order</h2>
          {data.onOrder.length > 0 ? (
            data.onOrder.map((d) => (
              <div key={d.id} style={{ background: 'var(--bz-night-3)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="bz-row" style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.supplier}</span>
                  <span className="bz-mono" style={{ color: d.late ? '#FF9AA0' : 'var(--bz-lime)', whiteSpace: 'nowrap' }}>{d.late ? 'Late' : `Due ${d.due}`}</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--bz-on-night-muted)' }}>{d.what || 'No lines'}</span>
              </div>
            ))
          ) : (
            <div className="bz-empty">
              <strong>Nothing on order</strong>
              Sent purchase orders show here until received.
            </div>
          )}
        </article>

        <IngredientsTile rows={data.rows} />
      </section>
    </>
  )
}
