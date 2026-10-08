'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast, ToastContainer } from '../ui/Toast'

interface ShiftTrade {
  id: string
  shiftId: string
  requesterId: string
  targetEmployeeId: string | null
  status: 'PENDING_PEER' | 'PENDING_MANAGER' | 'APPROVED' | 'DENIED' | 'CANCELLED'
  reason: string | null
  managerNote: string | null
  createdAt: string
  shift: {
    id: string
    scheduledStart: string | null
    scheduledEnd: string | null
    role: string
  }
  requester: {
    id: string
    user: { name: string; email: string } | null
  }
  targetEmployee: {
    id: string
    user: { name: string; email: string } | null
  } | null
}

interface LeaveRequest {
  id: string
  employeeId: string
  type: 'SICK' | 'VACATION' | 'PERSONAL' | 'UNPAID'
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED'
  startDate: string
  endDate: string
  reason: string | null
  createdAt: string
  employee: {
    id: string
    user: { name: string; email: string; role: string } | null
  }
}

export default function ApprovalsClient() {
  const [activeTab, setActiveTab] = useState<'swaps' | 'leave'>('swaps')
  const [trades, setTrades] = useState<ShiftTrade[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [tradeRes, leaveRes] = await Promise.all([
        fetch('/api/shifts/swap'),
        fetch('/api/leave'),
      ])
      if (tradeRes.ok) setTrades(await tradeRes.json())
      if (leaveRes.ok) setLeaves(await leaveRes.json())
    } catch {
      showToast('Error loading approvals queue', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()

    const es = new EventSource('/api/events')
    es.addEventListener('swap.requested', fetchData)
    es.addEventListener('swap.resolved', fetchData)

    return () => es.close()
  }, [fetchData])

  const handleResolveSwap = async (tradeId: string, action: 'APPROVE' | 'DENY') => {
    setProcessingId(tradeId)
    try {
      const res = await fetch(`/api/shifts/swap/${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        showToast(action === 'APPROVE' ? 'Shift swap approved and roster updated' : 'Shift swap denied', 'success')
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to update swap', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleResolveLeave = async (leaveId: string, status: 'APPROVED' | 'DENIED') => {
    setProcessingId(leaveId)
    try {
      const res = await fetch(`/api/leave/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        showToast(`Leave request marked as ${status}`, 'success')
        fetchData()
      } else {
        showToast('Failed to update leave', 'error')
      }
    } catch {
      showToast('Connection error', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingSwaps = trades.filter((t) => t.status === 'PENDING_MANAGER' || t.status === 'PENDING_PEER')
  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── KPI Strip ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Pending Swap Approvals', value: `${pendingSwaps.length}`, icon: '🔄', color: pendingSwaps.length > 0 ? '#f59e0b' : '#16a34a' },
          { label: 'Pending Time-Off Requests', value: `${pendingLeaves.length}`, icon: '🏖️', color: pendingLeaves.length > 0 ? 'var(--brand)' : '#16a34a' },
          { label: 'All Historic Requests', value: `${trades.length + leaves.length}`, icon: '📜', color: 'var(--color-text-secondary)' },
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

      {/* ── Tabs Switcher ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="dream-filter-pills">
          <button
            onClick={() => setActiveTab('swaps')}
            className={`dream-filter-pill ${activeTab === 'swaps' ? 'dream-filter-pill--active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}
          >
            <span>🔄 Shift Swaps & Trades</span>
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 800,
                background: activeTab === 'swaps' ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-raised)',
                color: activeTab === 'swaps' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {pendingSwaps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leave')}
            className={`dream-filter-pill ${activeTab === 'leave' ? 'dream-filter-pill--active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}
          >
            <span>🏖️ Time Off & Leave</span>
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 800,
                background: activeTab === 'leave' ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-raised)',
                color: activeTab === 'leave' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {pendingLeaves.length}
            </span>
          </button>
        </div>

        <button
          onClick={fetchData}
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

      {/* ── Content ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          Loading approvals...
        </div>
      ) : activeTab === 'swaps' ? (
        /* SHIFT SWAPS QUEUE */
        trades.length === 0 ? (
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
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
              No shift swap requests
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              When servers or kitchen staff request shift trades, they will appear here for 1-tap review.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trades.map((trade) => {
              const isPending = trade.status === 'PENDING_MANAGER' || trade.status === 'PENDING_PEER'
              const start = trade.shift.scheduledStart ? new Date(trade.shift.scheduledStart) : null
              const end = trade.shift.scheduledEnd ? new Date(trade.shift.scheduledEnd) : null

              return (
                <div
                  key={trade.id}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background:
                            trade.status === 'APPROVED'
                              ? 'rgba(34,197,94,0.12)'
                              : trade.status === 'DENIED'
                              ? 'rgba(239,68,68,0.12)'
                              : 'rgba(245,158,11,0.14)',
                          color:
                            trade.status === 'APPROVED'
                              ? '#16a34a'
                              : trade.status === 'DENIED'
                              ? '#ef4444'
                              : '#d97706',
                        }}
                      >
                        {trade.status}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                        Requested {new Date(trade.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      <strong>{trade.requester.user?.name || 'Staff'}</strong> wants to transfer shift to{' '}
                      <strong>{trade.targetEmployee?.user?.name || 'Open Trade Board'}</strong>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      📅 {start?.toLocaleDateString()} • {start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({trade.shift.role})
                    </div>

                    {trade.reason && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: '4px' }}>
                        Reason: "{trade.reason}"
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleResolveSwap(trade.id, 'DENY')}
                        disabled={processingId === trade.id}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: 'transparent',
                          color: '#ef4444',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => handleResolveSwap(trade.id, 'APPROVE')}
                        disabled={processingId === trade.id}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Approve Swap
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* LEAVE REQUESTS QUEUE */
        leaves.length === 0 ? (
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
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏖️</div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
              No time-off requests
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              Staff leave and vacation requests will appear here for manager sign-off.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaves.map((leave) => {
              const isPending = leave.status === 'PENDING'
              const start = new Date(leave.startDate)
              const end = new Date(leave.endDate)

              return (
                <div
                  key={leave.id}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background:
                            leave.status === 'APPROVED'
                              ? 'rgba(34,197,94,0.12)'
                              : leave.status === 'DENIED'
                              ? 'rgba(239,68,68,0.12)'
                              : 'var(--brand-tint)',
                          color:
                            leave.status === 'APPROVED'
                              ? '#16a34a'
                              : leave.status === 'DENIED'
                              ? '#ef4444'
                              : 'var(--brand)',
                        }}
                      >
                        {leave.status}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                        {leave.type} LEAVE
                      </span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {leave.employee.user?.name || 'Staff Member'}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      📅 {start.toLocaleDateString()} – {end.toLocaleDateString()}
                    </div>

                    {leave.reason && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: '4px' }}>
                        Note: "{leave.reason}"
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleResolveLeave(leave.id, 'DENIED')}
                        disabled={processingId === leave.id}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: 'transparent',
                          color: '#ef4444',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => handleResolveLeave(leave.id, 'APPROVED')}
                        disabled={processingId === leave.id}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Approve Leave
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
