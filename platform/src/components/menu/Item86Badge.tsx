'use client'

import { useState } from 'react'

interface Item86BadgeProps {
  itemId:    string
  itemName:  string
  is86d:     boolean
  /** Called after a successful toggle so the parent can update its local state */
  onToggled: (newIs86d: boolean) => void
  showToast: (message: string, variant: 'success' | 'error') => void
}

/**
 * Item86Badge — the "86" toggle control on each menu item card.
 *
 * 86'ing means the item is out / unavailable for the current service.
 * Any OWNER, MANAGER, or SERVER can 86 or restore an item.
 *
 * UX:
 *   - Clicking the active badge asks for a quick reason (native prompt for now)
 *   - Optimistic: flips instantly, reverts on error
 *   - Disabled while the request is in-flight
 */
export default function Item86Badge({
  itemId,
  itemName,
  is86d,
  onToggled,
  showToast,
}: Item86BadgeProps) {
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !is86d
    let reason: string | null = null

    if (next) {
      // Ask for an optional reason when 86'ing
      reason = window.prompt(`86 "${itemName}" — reason (optional):`, '') ?? ''
    }

    setLoading(true)
    // Optimistic update
    onToggled(next)

    try {
      const res = await fetch(`/api/menu/items/${itemId}/86`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is86d: next, reason: reason || undefined }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Failed to update item')
      }

      showToast(
        next ? `"${itemName}" has been 86'd` : `"${itemName}" restored`,
        'success',
      )
    } catch (err) {
      // Revert optimistic update
      onToggled(!next)
      showToast(
        err instanceof Error ? err.message : 'Something went wrong',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={is86d ? 'Restore item' : '86 this item (mark unavailable)'}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '4px',
        padding:        '3px 8px',
        borderRadius:   'var(--radius-full)',
        border:         `1px solid ${is86d ? 'var(--color-error)' : 'var(--color-border)'}`,
        background:     is86d ? 'rgba(239,68,68,0.12)' : 'transparent',
        color:          is86d ? 'var(--color-error)' : 'var(--color-text-tertiary)',
        fontSize:       'var(--text-xs)',
        fontWeight:     700,
        cursor:         loading ? 'not-allowed' : 'pointer',
        opacity:        loading ? 0.6 : 1,
        transition:     'all var(--transition-fast)',
        letterSpacing:  '0.04em',
        textTransform:  'uppercase',
        fontFamily:     'var(--font-mono)',
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          const el = e.currentTarget
          el.style.background = is86d
            ? 'rgba(239,68,68,0.20)'
            : 'var(--color-bg-input)'
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = is86d ? 'rgba(239,68,68,0.12)' : 'transparent'
      }}
    >
      {loading ? (
        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
      ) : (
        <span>86</span>
      )}
      {is86d && <span>&#x2713;</span>}
    </button>
  )
}
