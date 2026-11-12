import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import type { MenuBoard } from '@/lib/bento/menu-page'
import { Empty, PageHead, plural } from './parts'

interface Props {
  data: MenuBoard
  currency: string
}

/** Menu editor board. */
export function MenuBoardView({ data, currency }: Props) {
  const m = (n: number, d = 0) => formatMoney(n, currency, d)
  const headline =
    data.itemCount === 0
      ? 'Your menu is empty. Add your first dish.'
      : `Menu · ${plural(data.itemCount, 'item')} in ${plural(data.categories.length, 'category', 'categories')}.`
  const ts = data.topSeller

  return (
    <>
      <PageHead
        eyebrow="Menu · editor"
        title={headline}
        actions={<a href="#manage" className="bz-btn bz-btn--ink">Add or edit items</a>}
      />

      <section className="bz-grid" aria-label="Menu at a glance" style={{ marginTop: 20 }}>
        <article className="bz-tile bz-c3 bz-r2">
          <div className="bz-row">
            <h2 className="bz-title">Categories</h2>
            <span className="bz-meta">{plural(data.itemCount, 'item')}</span>
          </div>
          {data.categories.length > 0 ? (
            <div className="bz-list" style={{ gap: 6 }}>
              {data.categories.map((c, i) => (
                <div key={c.id} className={`bz-pillrow${i === 0 ? ' bz-pillrow--ink' : ''}`} style={{ opacity: c.active ? 1 : 0.6 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                    {!c.active && <span className="bz-sr"> (hidden)</span>}
                  </span>
                  <span className="bz-pillrow__n">{c.items}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No categories yet">Group dishes into categories like Starters and Mains.</Empty>
          )}
          <a href="#manage" className="bz-btn bz-btn--outline bz-btn--block bz-push">Add category</a>
        </article>

        <article className="bz-tile bz-c6 bz-r2">
          <div className="bz-row bz-row--center">
            <h2 className="bz-title">{data.featured?.name ?? 'Items'}</h2>
            <a href="#manage" className="bz-btn bz-btn--lime bz-btn--sm">Add item</a>
          </div>
          {data.featured ? (
            <>
              <div className="bz-list" style={{ gap: 0 }}>
                {data.featured.items.map((i) => (
                  <div key={i.id} className="bz-item" style={{ minHeight: 56, borderBottom: '1px solid var(--bz-line-2)' }}>
                    <div className="bz-item__body">
                      <span className="bz-item__name">{i.name}</span>
                      <span className="bz-item__sub">{i.station}{i.isVeg ? ' · veg' : ''}</span>
                    </div>
                    <span className="bz-mono" style={{ fontSize: 14, fontWeight: 600 }}>{m(i.price)}</span>
                    <span className={i.available ? 'bz-badge' : 'bz-badge bz-badge--accent'} style={{ minWidth: 84, justifyContent: 'center' }}>
                      {i.available ? 'Available' : 'Sold out'}
                    </span>
                  </div>
                ))}
              </div>
              {data.featured.more > 0 && <span className="bz-sub">and {data.featured.more} more in this category</span>}
            </>
          ) : (
            <Empty title="No dishes yet">Add a dish with a price and kitchen station to start taking orders.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--accent bz-c3">
          <span aria-hidden="true" className="bz-ghost" style={{ fontSize: 110 }}>TOP</span>
          <h2 className="bz-title">Top seller</h2>
          {ts ? (
            <>
              <div className="bz-stack" style={{ gap: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 24, lineHeight: 1.15 }}>{ts.name}</span>
                <span className="bz-sub">
                  {ts.sold} sold in 7 days{ts.marginPct !== null ? ` · ${ts.marginPct}% margin` : ''}
                </span>
              </div>
              <div className="bz-kpis bz-push" style={{ gap: 10 }}>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">Price</span>
                  <span className="bz-kpi__value" style={{ fontSize: 18 }}>{m(ts.price)}</span>
                </div>
                <div className="bz-kpi">
                  <span className="bz-kpi__label">Food cost</span>
                  <span className="bz-kpi__value" style={{ fontSize: 18 }}>{ts.foodCost === null ? '–' : m(ts.foodCost)}</span>
                </div>
              </div>
            </>
          ) : (
            <Empty title="Nothing sold this week">Your best seller shows here after the first orders.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c3">
          <div className="bz-row">
            <h2 className="bz-title">Sold out now</h2>
            <span className="bz-meta">{data.soldOutCount}</span>
          </div>
          {data.soldOut.length > 0 ? (
            <div className="bz-list" style={{ gap: 8 }}>
              {data.soldOut.map((s) => (
                <div key={s.id} className="bz-stack" style={{ gap: 0, paddingBottom: 8, borderBottom: '1px solid var(--bz-night-line)' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span>
                  <span className="bz-sub" style={{ fontSize: 12 }}>{s.category}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Everything is on">Items you mark sold out are hidden on POS, QR and online.</Empty>
          )}
          {data.soldOutCount > 0 && <a href="#manage" className="bz-link bz-push">Turn items back on</a>}
        </article>

        <article className="bz-tile bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Modifiers</h2>
            <span className="bz-meta">most used first</span>
          </div>
          {data.modifiers.length > 0 ? (
            <div className="bz-list" style={{ gap: 0 }}>
              {data.modifiers.map((g) => (
                <div key={g.name} className="bz-toggle-row">
                  <div className="bz-stack" style={{ gap: 2 }}>
                    <span className="bz-toggle-row__name">{g.name}</span>
                    <span className="bz-sub" style={{ fontSize: 13 }}>{g.options.join(' · ') || 'No options yet'}</span>
                  </div>
                  <span className="bz-badge bz-badge--quiet">on {plural(g.usedOn, 'item')}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No modifiers yet">Add choices like spice level, size or extras to a dish.</Empty>
          )}
        </article>

        <article className="bz-tile bz-tile--ink bz-c6">
          <div className="bz-row">
            <h2 className="bz-title">Where this menu is live</h2>
            <Link href="/dashboard/settings/ordering" className="bz-link">Ordering settings</Link>
          </div>
          <div className="bz-list" style={{ gap: 0 }}>
            {data.channels.map((c) => (
              <div key={c.name} className="bz-toggle-row">
                <div className="bz-stack" style={{ gap: 2 }}>
                  <span className="bz-toggle-row__name">{c.name}</span>
                  <span className="bz-sub" style={{ fontSize: 13 }}>{c.detail}</span>
                </div>
                <span className={c.live ? 'bz-on' : 'bz-off'}>{c.live ? 'Live' : 'Off'}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  )
}
