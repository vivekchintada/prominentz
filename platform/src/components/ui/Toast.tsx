'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id:      number
  message: string
  variant: ToastVariant
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useToast — manages a list of auto-dismissing toast notifications.
 *
 * Usage:
 *   const { toasts, showToast } = useToast()
 *   showToast('Item saved!', 'success')
 *   <ToastContainer toasts={toasts} />
 */
export function useToast(duration = 4000) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    },
    [duration],
  )

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, showToast, dismissToast }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
}

const COLORS: Record<ToastVariant, { border: string; icon: string; bg: string }> = {
  success: { border: 'var(--color-success)',  icon: 'var(--color-success)',  bg: 'rgba(34,197,94,0.08)' },
  error:   { border: 'var(--color-error)',    icon: 'var(--color-error)',    bg: 'rgba(239,68,68,0.08)' },
  info:    { border: 'var(--color-info)',     icon: 'var(--color-info)',     bg: 'rgba(59,130,246,0.08)' },
  warning: { border: 'var(--color-warning)',  icon: 'var(--color-warning)',  bg: 'rgba(245,158,11,0.08)' },
}

// ─── Toast Item Component ──────────────────────────────────────────────────────

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false)
  const colors = COLORS[item.variant]

  useEffect(() => {
    // Tiny delay for entry animation
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={() => onDismiss(item.id)}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             'var(--space-3)',
        background:      colors.bg,
        border:          `1px solid ${colors.border}`,
        borderLeft:      `4px solid ${colors.border}`,
        borderRadius:    'var(--radius-lg)',
        padding:         'var(--space-3) var(--space-4)',
        boxShadow:       'var(--shadow-lg)',
        fontSize:        'var(--text-sm)',
        color:           'var(--color-text-primary)',
        cursor:          'pointer',
        maxWidth:        '360px',
        transform:       visible ? 'translateX(0)' : 'translateX(120%)',
        opacity:         visible ? 1 : 0,
        transition:      'transform 250ms ease, opacity 250ms ease',
        userSelect:      'none',
        backdropFilter:  'blur(8px)',
      }}
    >
      <span
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          '20px',
          height:         '20px',
          borderRadius:   '50%',
          background:     colors.border,
          color:          '#fff',
          fontSize:       '11px',
          fontWeight:     700,
          flexShrink:     0,
        }}
      >
        {ICONS[item.variant]}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{item.message}</span>
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts:    ToastItem[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      style={{
        position:      'fixed',
        bottom:        'var(--space-6)',
        right:         'var(--space-6)',
        zIndex:        'var(--z-toast)',
        display:       'flex',
        flexDirection: 'column',
        gap:           'var(--space-2)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <Toast item={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
