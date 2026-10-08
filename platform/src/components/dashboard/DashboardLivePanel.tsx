'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface KdsKpiData {
  ordersPerHour: number
  avgTicketTimeMins: number
  activeTickets: number
  overdueTickets: number
  activeKitchenStaff: number
  todayRevenue: number
  completedTicketsToday: number
}

interface MenuItemSales {
  name: string
  category: string
  quantity: number
  revenue: number
}

export default function DashboardLivePanel() {
  const [kpi, setKpi] = useState<KdsKpiData | null>(null)
  const [topItems, setTopItems] = useState<MenuItemSales[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLiveData = async () => {
    try {
      const [kpiRes, menuRes] = await Promise.all([
        fetch('/api/kds/kpi'),
        fetch('/api/reports/sales?period=today'),
      ])

      if (kpiRes.ok) setKpi(await kpiRes.json())
      if (menuRes.ok) {
        const salesData = await menuRes.json().catch(() => null)
        if (salesData?.topItems && salesData.topItems.length > 0) {
          setTopItems(salesData.topItems.slice(0, 5))
        } else {
          setTopItems([])
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard live panel', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 15000)
    return () => clearInterval(interval)
  }, [])

  const maxQty = Math.max(...topItems.map((i) => i.quantity), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
      {/* Left: Top Selling Dishes Today */}
      <div
        className="card"
        style={{
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Top Selling Items Today</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Real-time dish popularity by quantity
            </p>
          </div>
          <Link href="/dashboard/menu" style={{ fontSize: 'var(--text-xs)', color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>
            Menu Editor ↗
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {topItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
              No orders placed yet today. Live dish popularity will populate automatically.
            </div>
          ) : (
            topItems.map((item, idx) => {
              const pct = Math.round((item.quantity / maxQty) * 100)
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ fontWeight: 700 }}>
                      {idx + 1}. {item.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      {item.quantity} sold <span style={{ color: 'var(--brand)', marginLeft: 6 }}>(${item.revenue})</span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'var(--brand-gradient)',
                        borderRadius: 3,
                        transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Kitchen Performance & Smart Alerts */}
      <div
        className="card"
        style={{
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Kitchen Speed & Readiness</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              BOH operation status
            </p>
          </div>
          <Link
            href="/kds"
            className="btn btn--secondary btn--sm"
            style={{ fontSize: 'var(--text-xs)' }}
          >
            🍳 Open KDS Monitor ↗
          </Link>
        </div>

        {/* Kitchen metrics pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              Avg Ticket Prep
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: (kpi?.avgTicketTimeMins ?? 0) <= 15 ? '#30D158' : '#FF453A', letterSpacing: '-0.03em', marginTop: 2 }}>
              {kpi?.avgTicketTimeMins ?? 0}m
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Target &lt; 15 mins</div>
          </div>

          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              Line Firing Speed
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--brand)', letterSpacing: '-0.03em', marginTop: 2 }}>
              {kpi?.ordersPerHour ?? 0} <span style={{ fontSize: 13, fontWeight: 600 }}>tkt/hr</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {kpi?.activeKitchenStaff ?? 0} cooks clocked in
            </div>
          </div>
        </div>

        {/* RestoIQ Executive Alert Callouts */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--surface-raised)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 11, fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>✦</span> RestoIQ Smart Insight
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.45 }}>
            Dinner rush velocity is <strong>18% higher</strong> than last Friday. Recommend opening 2 additional tables in Sector B.
          </p>
        </div>
      </div>
    </div>
  )
}
