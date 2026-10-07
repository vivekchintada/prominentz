'use client'

import React, { useState, useEffect } from 'react'

export interface ShiftTrade {
  id: string
  shiftId: string
  status: 'PENDING_PEER' | 'PENDING_MANAGER' | 'APPROVED' | 'DENIED' | 'CANCELLED'
  reason?: string | null
  managerNote?: string | null
  createdAt: string
  shift: {
    id: string
    scheduledStart: string
    scheduledEnd: string
    role: string
    employee?: {
      user: { name: string | null; email: string; role: string }
    }
  }
  requester?: {
    user: { name: string | null; email: string }
  }
  targetEmployee?: {
    user: { name: string | null; email: string }
  }
}

interface ShiftSwapDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ShiftSwapDrawer({ isOpen, onClose, onSuccess }: ShiftSwapDrawerProps) {
  const [trades, setTrades] = useState<ShiftTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const fetchTrades = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/shifts/swap')
      if (res.ok) {
        const data = await res.json()
        setTrades(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load shift trades', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchTrades()
    }
  }, [isOpen])

  const handleAction = async (id: string, action: 'APPROVE' | 'DENY') => {
    try {
      setProcessingId(id)
      const res = await fetch(`/api/shifts/swap/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setFeedback(`✓ Shift trade successfully ${action === 'APPROVE' ? 'approved' : 'denied'}`)
        fetchTrades()
        onSuccess()
      } else {
        const err = await res.json()
        setFeedback(`Error: ${err.error || 'Failed to update trade'}`)
      }
    } catch {
      setFeedback('Error processing shift trade request')
    } finally {
      setProcessingId(null)
      setTimeout(() => setFeedback(null), 3500)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shift Swap Approvals"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: 'var(--surface, #181715)',
          borderLeft: '1px solid var(--surface-border, rgba(255, 255, 255, 0.12))',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--surface-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔄</span>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary, #fff)', margin: 0 }}>
                Shift Swap Approvals
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-secondary, #888)' }}>
                Review and approve peer shift trades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: 'var(--color-text-tertiary, #666)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--brand-emerald-light, rgba(5, 150, 105, 0.15))',
              borderBottom: '1px solid var(--brand-emerald-border, rgba(5, 150, 105, 0.3))',
              color: 'var(--brand-emerald, #059669)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {feedback}
          </div>
        )}

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              Loading shift trade requests...
            </div>
          ) : trades.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>All caught up!</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>No pending shift swap requests at this time.</div>
            </div>
          ) : (
            trades.map((trade) => {
              const start = new Date(trade.shift.scheduledStart)
              const end = new Date(trade.shift.scheduledEnd)
              const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

              const requesterName = trade.requester?.user?.name || trade.shift?.employee?.user?.name || 'Staff'
              const targetName = trade.targetEmployee?.user?.name || 'Open to all staff'

              return (
                <div
                  key={trade.id}
                  style={{
                    backgroundColor: 'var(--color-bg-card, #201f1c)',
                    border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.08))',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {dateStr}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        ⏱️ {timeStr} ({trade.shift.role})
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        backgroundColor: trade.status.includes('PENDING') ? 'rgba(217, 119, 6, 0.15)' : 'rgba(5, 150, 105, 0.15)',
                        color: trade.status.includes('PENDING') ? 'var(--brand-amber, #d97706)' : 'var(--brand-emerald, #059669)',
                      }}
                    >
                      {trade.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    <div><strong>From:</strong> {requesterName}</div>
                    <div><strong>Offered to:</strong> {targetName}</div>
                    {trade.reason && (
                      <div style={{ fontStyle: 'italic', marginTop: '4px', color: 'var(--color-text-tertiary)' }}>
                        &ldquo;{trade.reason}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Action Buttons for Manager */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => handleAction(trade.id, 'APPROVE')}
                      disabled={processingId === trade.id}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '8px',
                        backgroundColor: 'var(--brand-emerald, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      {processingId === trade.id ? 'Saving...' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(trade.id, 'DENY')}
                      disabled={processingId === trade.id}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      ✕ Deny
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
