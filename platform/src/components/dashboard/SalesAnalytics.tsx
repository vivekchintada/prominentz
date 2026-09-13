'use client'

import React, { useEffect, useState, useRef } from 'react'
import type { SalesHour } from '@/types/dashboard'

const CHART_H = 140
const CHART_W = 500
const PAD_LEFT = 48
const PAD_BOT = 28
const PAD_TOP = 12
const PAD_RIGHT = 8

function buildBars(data: SalesHour[]) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const barW = (CHART_W - PAD_LEFT - PAD_RIGHT) / 24
  return data.map((d, i) => {
    const barH = ((d.revenue / maxRevenue) * (CHART_H - PAD_BOT - PAD_TOP))
    const x = PAD_LEFT + i * barW + barW * 0.1
    const y = CHART_H - PAD_BOT - barH
    return { ...d, x, y, barH, barW: barW * 0.8 }
  })
}

export default function SalesAnalytics() {
  const [data, setData] = useState<SalesHour[]>([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<SalesHour | null>(null)
  const [tooltipX, setTooltipX] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch('/api/reports/sales')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleExportCSV = () => {
    const a = document.createElement('a')
    a.href = '/api/reports/sales?format=csv'
    a.download = 'sales_report.csv'
    a.click()
  }

  const bars = data.length ? buildBars(data) : []
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = data.reduce((s, d) => s + d.orders, 0)
  const peakHour = data.reduce((best, d) => (d.revenue > best.revenue ? d : best), data[0] ?? { hour: 0, revenue: 0, orders: 0 })
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
          📊 Today&apos;s Sales Analytics
        </h3>
        <button
          onClick={handleExportCSV}
          className="btn btn--secondary btn--sm"
          style={{ fontSize: '11px' }}
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-bg-raised)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          {[
            { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, color: 'var(--color-success)' },
            { label: "Orders", value: totalOrders.toString(), color: 'var(--color-info)' },
            { label: "Peak Hour", value: `${String(peakHour.hour).padStart(2,'0')}:00`, color: 'var(--color-brand-500)' },
          ].map((m) => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 8px', width: 18, height: 18 }} />
          <span className="text-sm text-secondary">Loading sales data…</span>
        </div>
      ) : (
        <div style={{ position: 'relative', overflowX: 'auto' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            width="100%"
            style={{ display: 'block', minWidth: 320 }}
          >
            {/* Y grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = CHART_H - PAD_BOT - pct * (CHART_H - PAD_BOT - PAD_TOP)
              const val = (pct * maxRevenue).toFixed(0)
              return (
                <g key={pct}>
                  <line x1={PAD_LEFT} y1={y} x2={CHART_W - PAD_RIGHT} y2={y} stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3,3" />
                  <text x={PAD_LEFT - 4} y={y + 4} textAnchor="end" fontSize={8} fill="var(--color-text-tertiary)">${val}</text>
                </g>
              )
            })}

            {/* Bars */}
            {bars.map((b) => (
              <g key={b.hour}
                onMouseEnter={(e) => { setHovered(b); setTooltipX(b.x) }}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={b.x}
                  y={b.barH > 0 ? b.y : CHART_H - PAD_BOT - 1}
                  width={b.barW}
                  height={b.barH > 0 ? b.barH : 1}
                  rx={2}
                  fill={hovered?.hour === b.hour ? 'var(--color-brand-600)' : 'var(--color-brand-500)'}
                  opacity={b.revenue === 0 ? 0.15 : 0.9}
                />
                {/* X-axis label every 4 hours */}
                {b.hour % 4 === 0 && (
                  <text
                    x={b.x + b.barW / 2}
                    y={CHART_H - PAD_BOT + 12}
                    textAnchor="middle"
                    fontSize={8}
                    fill="var(--color-text-tertiary)"
                  >
                    {String(b.hour).padStart(2, '0')}
                  </text>
                )}
              </g>
            ))}

            {/* Baseline */}
            <line x1={PAD_LEFT} y1={CHART_H - PAD_BOT} x2={CHART_W - PAD_RIGHT} y2={CHART_H - PAD_BOT} stroke="var(--color-border)" strokeWidth={1} />
          </svg>

          {/* Hover tooltip */}
          {hovered && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: Math.min(tooltipX, 340),
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                zIndex: 10,
              }}
            >
              <div style={{ color: 'var(--color-text-primary)' }}>
                {String(hovered.hour).padStart(2, '0')}:00 – {String(hovered.hour + 1).padStart(2, '0')}:00
              </div>
              <div style={{ color: 'var(--color-success)' }}>Revenue: ${hovered.revenue.toFixed(2)}</div>
              <div style={{ color: 'var(--color-info)' }}>Orders: {hovered.orders}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
