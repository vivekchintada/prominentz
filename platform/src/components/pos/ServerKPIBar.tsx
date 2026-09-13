'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface ServerKPIData {
  openChecksCount: number
  paidChecksCount: number
  salesToday: number
  tipsAccrued: number
  activeShiftMinutes: number
  avgTableTurnMins: number
  isClockedIn: boolean
  shiftStartTime: string | null
}

interface ServerKPIBarProps {
  currentUser: { id: string; name: string; role: string }
}

export default function ServerKPIBar({ currentUser }: ServerKPIBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<ServerKPIData>({
    openChecksCount: 0,
    paidChecksCount: 0,
    salesToday: 0,
    tipsAccrued: 0,
    activeShiftMinutes: 0,
    avgTableTurnMins: 0,
    isClockedIn: false,
    shiftStartTime: null,
  })

  const fetchKPI = useCallback(async () => {
    try {
      const res = await fetch('/api/server/kpi')
      if (res.ok) {
        const data = await res.json()
        setKpi(data)
      }
    } catch (err) {
      console.error('[ServerKPIBar] Failed to fetch server metrics', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKPI()

    // Listen to SSE events for real-time KPI recalculation
    const eventSource = new EventSource('/api/events')

    const handleUpdate = () => {
      fetchKPI()
    }

    eventSource.addEventListener('server.kpi.updated', handleUpdate)
    eventSource.addEventListener('payment.processed', handleUpdate)
    eventSource.addEventListener('order.created', handleUpdate)
    eventSource.addEventListener('order.modified', handleUpdate)
    eventSource.addEventListener('table.status.changed', handleUpdate)

    return () => {
      eventSource.close()
    }
  }, [fetchKPI])

  // Format shift minutes into Xh Ym
  const formatShiftTime = (mins: number) => {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    if (hrs === 0) return `${remMins}m`
    return `${hrs}h ${remMins}m`
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 'var(--space-3)',
        pointerEvents: 'none', // parent transparent
      }}
    >
      {/* Expanded Detailed Dashboard */}
      {isExpanded && (
        <div
          className="card card--elevated"
          style={{
            pointerEvents: 'auto',
            width: '340px',
            background: 'var(--color-bg-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-brand-500)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.2rem' }}>📈</span>
              <div>
                <h4 className="font-bold text-sm">Server Performance Metrics</h4>
                <p className="text-xs text-secondary">{currentUser.name} ({currentUser.role})</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="btn btn--secondary btn--sm"
              style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div style={{ background: 'var(--color-bg-raised)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <span className="text-xs text-secondary font-semibold block mb-1">Receipts & Sales</span>
              <span className="text-lg font-bold text-brand">${kpi.salesToday.toFixed(2)}</span>
              <span className="text-xs text-secondary block mt-0.5">{kpi.paidChecksCount} paid checks</span>
            </div>

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <span className="text-xs text-success font-semibold block mb-1">Est. Shift Tips (18%)</span>
              <span className="text-lg font-bold text-success">${kpi.tipsAccrued.toFixed(2)}</span>
              <span className="text-xs text-success block mt-0.5">Accrued today</span>
            </div>

            <div style={{ background: 'var(--color-bg-raised)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <span className="text-xs text-secondary font-semibold block mb-1">Active Open Checks</span>
              <span className="text-lg font-bold text-primary">{kpi.openChecksCount}</span>
              <span className="text-xs text-secondary block mt-0.5">In progress</span>
            </div>

            <div style={{ background: 'var(--color-bg-raised)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <span className="text-xs text-secondary font-semibold block mb-1">Avg Table Turn</span>
              <span className="text-lg font-bold text-primary">{kpi.avgTableTurnMins}m</span>
              <span className="text-xs text-secondary block mt-0.5">Per seating</span>
            </div>
          </div>

          {/* Footer Shift Timer */}
          <div className="flex justify-between items-center text-xs" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
            <span className="text-secondary">
              Shift Clock: <strong style={{ color: kpi.isClockedIn ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {kpi.isClockedIn ? `🟢 ${formatShiftTime(kpi.activeShiftMinutes)}` : '🟡 Clocked Out'}
              </strong>
            </span>
            <button
              onClick={fetchKPI}
              className="btn btn--secondary btn--sm"
              style={{ fontSize: '10px', padding: '2px 6px' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}

      {/* Floating Widget Pill Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          pointerEvents: 'auto',
          background: 'var(--color-bg-card)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-brand-500)',
          borderRadius: '9999px',
          padding: 'var(--space-2) var(--space-4)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <span className="flex items-center gap-1.5 font-bold text-xs">
          <span>📊</span>
          <span>Shift:</span>
          <span className="text-brand">${kpi.salesToday.toFixed(2)}</span>
        </span>
        <span style={{ height: '14px', width: '1px', background: 'var(--color-border)' }} />
        <span className="flex items-center gap-1 text-xs text-success font-semibold">
          <span>💵</span>
          <span>${kpi.tipsAccrued.toFixed(2)}</span>
        </span>
        <span style={{ height: '14px', width: '1px', background: 'var(--color-border)' }} />
        <span className="badge badge--brand" style={{ fontSize: '10px', padding: '2px 6px' }}>
          {kpi.openChecksCount} Open
        </span>
        <span style={{ fontSize: '12px', marginLeft: '2px' }}>
          {isExpanded ? '▼' : '▲'}
        </span>
      </button>
    </div>
  )
}
