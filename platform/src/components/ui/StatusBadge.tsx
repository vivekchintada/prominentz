import React from 'react'

export type StatusKey =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'unpaid'
  | 'expired'
  | 'cancelled'
  | 'available'
  | 'booked'
  | 'occupied'
  | 'completed'
  | 'draft'
  | 'open'
  | 'closed'
  | 'delayed'
  | string

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:     { label: 'Active',     cls: 'badge--active' },
  inactive:   { label: 'Inactive',   cls: 'badge--inactive' },
  pending:    { label: 'Pending',    cls: 'badge--pending' },
  processing: { label: 'Processing', cls: 'badge--processing' },
  paid:       { label: 'Paid',       cls: 'badge--active' },
  unpaid:     { label: 'Unpaid',     cls: 'badge--error' },
  expired:    { label: 'Expired',    cls: 'badge--expired' },
  cancelled:  { label: 'Cancelled',  cls: 'badge--expired' },
  available:  { label: 'Available',  cls: 'badge--active' },
  booked:     { label: 'Booked',     cls: 'badge--pending' },
  occupied:   { label: 'Occupied',   cls: 'badge--expired' },
  completed:  { label: 'Completed',  cls: 'badge--active' },
  draft:      { label: 'Draft',      cls: 'badge--processing' },
  open:       { label: 'Open',       cls: 'badge--active' },
  closed:     { label: 'Closed',     cls: 'badge--inactive' },
  delayed:    { label: 'Delayed',    cls: 'badge--expired' },
}

export interface StatusBadgeProps {
  status?: StatusKey
  variant?: BadgeVariant
  label?: string
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
  children?: React.ReactNode
}

/**
 * StatusBadge — maps a status string or variant to a consistently styled coloured pill.
 * Emerald = positive, Amber = in-progress/warning, Rose = error/cancelled.
 */
export function StatusBadge({
  status,
  variant,
  label,
  dot = false,
  size = 'md',
  className = '',
  children,
}: StatusBadgeProps) {
  let cls = 'badge--neutral'
  let displayLabel = label || children

  if (variant) {
    const variantMap: Record<BadgeVariant, string> = {
      success: 'badge--active',
      warning: 'badge--pending',
      danger: 'badge--error',
      info: 'badge--processing',
      neutral: 'badge--inactive',
    }
    cls = variantMap[variant]
  } else if (status) {
    const key = status.toLowerCase()
    const mapped = STATUS_MAP[key]
    if (mapped) {
      cls = mapped.cls
      if (!displayLabel) displayLabel = mapped.label
    } else {
      if (!displayLabel) displayLabel = status
    }
  }

  return (
    <span className={`badge ${cls} ${size === 'sm' ? 'badge--sm' : ''} ${className}`}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      <span>{displayLabel}</span>
    </span>
  )
}
