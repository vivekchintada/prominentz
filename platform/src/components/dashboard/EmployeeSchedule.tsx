'use client'

import React, { useEffect, useState } from 'react'
import type { ShiftSummary } from '@/types/dashboard'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    '#30D158',
  SCHEDULED: '#FF9F0A',
  COMPLETED: 'var(--color-text-tertiary)',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:    'On Shift',
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Done',
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function EmployeeSchedule() {
  const [shifts, setShifts] = useState<ShiftSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/employees/today')
      .then((r) => r.json())
      .then((data) => setShifts(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
          👥 Employee Schedule
        </h3>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Today · {shifts.length} staff
        </span>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 2 }} />

      {loading ? (
        <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 8px', width: 18, height: 18 }} />
          <span className="text-sm text-secondary">Loading schedule…</span>
        </div>
      ) : shifts.length === 0 ? (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            padding: 'var(--space-3) 0',
            textAlign: 'center',
          }}
        >
          No shifts scheduled for today.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {shifts.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-raised)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* Left: Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  {s.employee.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {formatTime(s.scheduledStart)} – {formatTime(s.scheduledEnd)}
                </span>
              </div>

              {/* Right: Status badge */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: (STATUS_COLORS[s.status] || '#888') + '1A',
                  color: STATUS_COLORS[s.status] || '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {STATUS_LABELS[s.status] || s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
