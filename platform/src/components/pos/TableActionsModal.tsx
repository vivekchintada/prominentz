'use client'

import React, { useState } from 'react'
import { TableData } from './TableGrid'

interface TableActionsModalProps {
  isOpen: boolean
  table: TableData | null
  onClose: () => void
  onStartOrder: () => void
  onStatusUpdated: () => void
  showToast: (message: string, variant: 'success' | 'error' | 'info' | 'warning') => void
}

export default function TableActionsModal({
  isOpen,
  table,
  onClose,
  onStartOrder,
  onStatusUpdated,
  showToast,
}: TableActionsModalProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen || !table) return null

  const handleUpdateStatus = async (status: 'EMPTY' | 'RESERVED') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update table status')
      }

      showToast(`Table ${table.name} set to ${status}`, 'success')
      onStatusUpdated()
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Error updating table', 'error')
    } finally {
      setLoading(false)
    }
  }

  const statusLabels = {
    EMPTY: { label: 'Empty', color: 'var(--color-text-secondary)', bg: 'var(--color-border)' },
    RESERVED: { label: 'Reserved', color: 'var(--color-table-reserved)', bg: 'rgba(59,130,246,0.12)' },
    ACTIVE: { label: 'Active', color: 'var(--color-table-active)', bg: 'rgba(249,115,22,0.12)' },
    PAYING: { label: 'Paying', color: 'var(--color-table-paying)', bg: 'rgba(139,92,246,0.12)' },
  }

  const currentStatus = statusLabels[table.status] || { label: table.status, color: 'var(--color-text-primary)', bg: 'var(--color-bg)' }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="card card--elevated"
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center"
          style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}
        >
          <div>
            <h3 className="text-xl font-bold">Table: {table.name}</h3>
            <span
              style={{
                display: 'inline-block',
                marginTop: '4px',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: currentStatus.bg,
                color: currentStatus.color,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Status: {currentStatus.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn--ghost btn--sm"
            style={{ minWidth: 'auto', padding: 'var(--space-1) var(--space-2)' }}
          >
            ✕
          </button>
        </div>

        {/* Action Buttons list */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onStartOrder}
            disabled={loading}
            className="btn btn--primary"
            style={{
              justifyContent: 'flex-start',
              padding: 'var(--space-4)',
              fontSize: 'var(--text-base)',
            }}
          >
            ✨ Start New Order & Guest Count
          </button>

          {table.status === 'EMPTY' && (
            <button
              onClick={() => handleUpdateStatus('RESERVED')}
              disabled={loading}
              className="btn btn--secondary"
              style={{
                justifyContent: 'flex-start',
                padding: 'var(--space-4)',
                borderColor: 'var(--color-table-reserved)',
                color: 'var(--color-table-reserved)',
                background: 'rgba(59,130,246,0.04)',
                fontSize: 'var(--text-base)',
              }}
            >
              📅 Reserve Table
            </button>
          )}

          {table.status === 'RESERVED' && (
            <button
              onClick={() => handleUpdateStatus('EMPTY')}
              disabled={loading}
              className="btn btn--secondary"
              style={{
                justifyContent: 'flex-start',
                padding: 'var(--space-4)',
                borderColor: 'var(--color-text-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-base)',
              }}
            >
              🔓 Release / Mark Empty
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}
        >
          <button onClick={onClose} disabled={loading} className="btn btn--secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
