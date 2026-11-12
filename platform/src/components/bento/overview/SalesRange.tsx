'use client'

import { createContext, useContext, useState } from 'react'
import { useMoney } from '@/components/providers/CurrencyProvider'
import { formatMoneyCompact } from '@/lib/money'
import type { SalesRange } from '@/lib/bento/owner-overview'

type RangeKey = 'today' | 'week' | 'month'
const LABELS: Record<RangeKey, string> = { today: 'Today', week: 'Week', month: 'Month' }
const PERIOD: Record<RangeKey, string> = { today: 'today', week: 'this week', month: 'last 4 weeks' }
const BEST: Record<RangeKey, string> = { today: 'Busiest', week: 'Best day', month: 'Best week' }

const Ctx = createContext<{ range: RangeKey; setRange: (r: RangeKey) => void }>({ range: 'week', setRange: () => {} })

export function SalesRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<RangeKey>('week')
  return <Ctx.Provider value={{ range, setRange }}>{children}</Ctx.Provider>
}

export function SalesRangeToggle() {
  const { range, setRange } = useContext(Ctx)
  return (
    <div className="bz-seg" role="group" aria-label="Sales period">
      {(Object.keys(LABELS) as RangeKey[]).map((k) => (
        <button key={k} type="button" className="bz-seg__btn" aria-pressed={range === k} onClick={() => setRange(k)}>
          {LABELS[k]}
        </button>
      ))}
    </div>
  )
}

export function SalesHeroTile({ data }: { data: Record<RangeKey, SalesRange> }) {
  const { range } = useContext(Ctx)
  const { money, currency } = useMoney()
  const r = data[range]
  const max = Math.max(...r.bars.map((b) => b.value), 0)

  const up = r.growthPct !== null && r.growthPct >= 0
  const trend =
    r.growthPct === null
      ? `${PERIOD[range]}`
      : `${PERIOD[range]} · ${up ? 'up' : 'down'} ${Math.abs(Math.round(r.growthPct))}% on ${r.compareLabel}`

  return (
    <article className="bz-tile bz-tile--accent bz-tile--hero bz-c6 bz-r2">
      <span aria-hidden="true" className="bz-ghost">SALES</span>
      <div className="bz-row" style={{ alignItems: 'flex-start' }}>
        <div className="bz-stack">
          <h2 className="bz-title bz-title--hero">Sales analytics</h2>
          <span className="bz-big" aria-live="polite">{money(r.total, 0)}</span>
          <span className="bz-sub" style={{ fontSize: 15 }}>
            {r.growthPct !== null && <span aria-hidden="true">{up ? '▲ ' : '▼ '}</span>}
            {trend}
          </span>
        </div>
        {r.best && (
          <span className="bz-chip">
            {BEST[range]}: {r.best}
          </span>
        )}
      </div>

      {max > 0 ? (
        <>
          {/* Bars are visual only; screen readers get the same numbers as a list */}
          <div className="bz-bars bz-bars--fill" aria-hidden="true" key={range}>
            {r.bars.map((b, i) => (
              <div className="bz-bar" key={b.label + i}>
                <div className="bz-bar__track">
                  <span className="bz-bar__val">{b.value > 0 ? formatMoneyCompact(b.value, currency) : '–'}</span>
                  <div
                    className={`bz-bar__fill${b.hi ? ' bz-bar__fill--hi' : ''}${b.value > 0 ? '' : ' bz-bar__fill--zero'}`}
                    style={{
                      // the value label above the bar takes ~26px of the track
                      height: b.value > 0 ? `max(6px, calc((100% - 26px) * ${(b.value / max).toFixed(3)}))` : undefined,
                      ['--i' as string]: i,
                    }}
                  />
                </div>
                <span className="bz-bar__label">{b.label}</span>
              </div>
            ))}
          </div>
          <ul className="bz-sr" aria-label={`Sales ${PERIOD[range]}`}>
            {r.bars.map((b, i) => (
              <li key={b.label + i}>
                {b.label}: {b.value > 0 ? money(b.value, 0) : 'no sales'}
                {b.hi ? ` (${BEST[range].toLowerCase()})` : ''}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="bz-empty bz-push">
          <strong>No paid orders {PERIOD[range]}</strong>
          Sales show up here as soon as the first bill is paid.
        </div>
      )}
    </article>
  )
}
