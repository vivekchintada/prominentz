'use client'

import React, { useState, useEffect } from 'react'

interface KdsKpiData {
  ordersPerHour: number
  avgTicketTimeMins: number
  activeTickets: number
  overdueTickets: number
  activeKitchenStaff: number
  todayRevenue: number
  completedTicketsToday: number
}

export default function KdsKpiBar() {
  const [data, setData] = useState<KdsKpiData | null>(null)

  const fetchKpi = async () => {
    try {
      const res = await fetch('/api/kds/kpi')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch KDS KPIs', err)
    }
  }

  useEffect(() => {
    fetchKpi()
    const interval = setInterval(fetchKpi, 10000) // refresh every 10s
    return () => clearInterval(interval)
  }, [])

  if (!data) return null // Don't render anything while loading

  const kpis = [
    {
      label: 'Orders / Hour',
      value: data.ordersPerHour.toString(),
      icon: '📦',
      color: 'var(--color-info)',
    },
    {
      label: 'Avg Ticket Time',
      value: `${data.avgTicketTimeMins} min`,
      icon: '⏱️',
      color: data.avgTicketTimeMins <= 12 ? 'var(--color-success)' : 'var(--color-warning)',
    },
    {
      label: 'Active Tickets',
      value: data.activeTickets.toString(),
      icon: '🎫',
      color: 'var(--color-brand-500)',
    },
    {
      label: 'Overdue (>12m)',
      value: data.overdueTickets.toString(),
      icon: '🚨',
      color: data.overdueTickets > 0 ? 'var(--color-error)' : 'var(--color-success)',
    },
    {
      label: 'Kitchen Staff',
      value: data.activeKitchenStaff.toString(),
      icon: '🧑‍🍳',
      color: data.activeKitchenStaff > 0 ? 'var(--color-success)' : 'var(--color-warning)',
    },
    {
      label: "Today's Revenue",
      value: `$${data.todayRevenue.toFixed(0)}`,
      icon: '💰',
      color: 'var(--color-success)',
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-6)',
        background: 'var(--color-bg-raised)',
        borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            minWidth: '140px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '18px' }}>{kpi.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}
            >
              {kpi.label}
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: kpi.color,
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
              }}
            >
              {kpi.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
