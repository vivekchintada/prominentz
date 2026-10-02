'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast, ToastContainer } from '../ui/Toast'

interface TimeEntry {
  id: string
  clockIn: string
  clockOut: string | null
  breakMinutes: number
  status: 'ACTIVE' | 'COMPLETED' | 'FLAGGED'
  flagReason?: string | null
  distanceMeters?: number | null
  employee: {
    id: string
    jobTitle?: string | null
    hourlyRate?: string | null
    user: {
      id: string
      name: string
      email: string
      role: string
    } | null
  }
  shift?: {
    id: string
    scheduledStart: string | null
    scheduledEnd: string | null
    role: string
  } | null
}

export default function AttendanceClient() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'FLAGGED'>('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/attendance')
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch {
      showToast('Failed to load live attendance', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAttendance()
    const timer = setInterval(fetchAttendance, 15000)

    // SSE updates
    const es = new EventSource('/api/events')
    es.addEventListener('employee.clocked_in', fetchAttendance)
    es.addEventListener('employee.clocked_out', fetchAttendance)
    es.addEventListener('attendance.clock', fetchAttendance)
    es.addEventListener('attendance.flagged', fetchAttendance)

    return () => {
      clearInterval(timer)
      es.close()
    }
  }, [fetchAttendance])

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      })
      if (res.ok) {
        showToast('Punch anomaly approved and reconciled', 'success')
        fetchAttendance()
      } else {
        showToast('Failed to approve punch', 'error')
      }
    } catch {
      showToast('Error connecting to server', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleForceClockOut = async (id: string) => {
    if (!confirm('Force clock out this staff member now?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLOCK_OUT' }),
      })
      if (res.ok) {
        showToast('Staff member clocked out', 'success')
        fetchAttendance()
      } else {
        showToast('Failed to clock out staff', 'error')
      }
    } catch {
      showToast('Error connecting to server', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const activeEntries = entries.filter((e) => !e.clockOut || e.status === 'ACTIVE')
  const flaggedEntries = entries.filter((e) => e.status === 'FLAGGED')

  const filteredEntries = entries.filter((e) => {
    if (filter === 'ACTIVE') return !e.clockOut || e.status === 'ACTIVE'
    if (filter === 'FLAGGED') return e.status === 'FLAGGED'
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── KPI Metric Cards ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Live on Floor', value: `${activeEntries.length}`, icon: '🟢', color: '#16a34a' },
          { label: 'GPS / Time Flags', value: `${flaggedEntries.length}`, icon: '⚠️', color: flaggedEntries.length > 0 ? '#ef4444' : '#16a34a' },
          { label: 'Today Total Punches', value: `${entries.length}`, icon: '⏱️', color: '#5b45f5' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontSize: '24px' }}>{kpi.icon}</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: kpi.color, marginTop: '2px' }}>
                {kpi.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs & Controls ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="dream-filter-pills">
          {[
            { id: 'ALL', label: 'All Today', count: entries.length },
            { id: 'ACTIVE', label: '🟢 Live On Floor', count: activeEntries.length },
            { id: 'FLAGGED', label: '⚠️ Flagged Anomalies', count: flaggedEntries.length },
          ].map((tab) => {
            const active = filter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`dream-filter-pill ${active ? 'dream-filter-pill--active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 800,
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-raised)',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={fetchAttendance}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-card)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Live Attendance Table (Deputy Style) ──────────────── */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          Loading live attendance...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: '48px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏱️</div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
            No attendance records matching filter
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {filteredEntries.map((entry) => {
            const isFlagged = entry.status === 'FLAGGED'
            const isLive = !entry.clockOut || entry.status === 'ACTIVE'
            const clockInTime = new Date(entry.clockIn)
            const clockOutTime = entry.clockOut ? new Date(entry.clockOut) : null

            const workedMins = Math.round(
              ((clockOutTime ? clockOutTime.getTime() : Date.now()) - clockInTime.getTime()) / 60000
            )
            const hours = Math.floor(workedMins / 60)
            const mins = workedMins % 60

            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-separator)',
                  borderLeft: isFlagged ? '4px solid #ef4444' : isLive ? '4px solid #16a34a' : '4px solid transparent',
                  background: isFlagged ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                {/* Staff Member Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: isFlagged ? 'rgba(239,68,68,0.15)' : '#5b45f5',
                      color: isFlagged ? '#ef4444' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {entry.employee.user?.name?.charAt(0).toUpperCase() || 'E'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {entry.employee.user?.name || 'Staff Member'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                      {entry.employee.jobTitle || entry.employee.user?.role || 'Staff'} • {entry.employee.hourlyRate ? `$${entry.employee.hourlyRate}/hr` : 'Hourly'}
                    </div>
                  </div>
                </div>

                {/* Status & Times */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                      Clock In
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                      Clock Out
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {clockOutTime ? clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '🟢 On Floor'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                      Time On Shift
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#5b45f5', fontFamily: 'monospace' }}>
                      {hours}h {mins}m
                    </div>
                  </div>
                </div>

                {/* Flag Notice (if any) */}
                {isFlagged && (
                  <div
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: '#ef4444',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>⚠️</span>
                    <span>{entry.flagReason || 'Punched outside location geofence boundary'}</span>
                  </div>
                )}

                {/* One-tap inline actions (Deputy style) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isFlagged && (
                    <button
                      onClick={() => handleApprove(entry.id)}
                      disabled={actionLoading === entry.id}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Approve Punch
                    </button>
                  )}

                  {isLive && (
                    <button
                      onClick={() => handleForceClockOut(entry.id)}
                      disabled={actionLoading === entry.id}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg)',
                        color: '#ef4444',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Clock Out Staff
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
