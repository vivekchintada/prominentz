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
  // Direction C KDS statuses
  | 'aging'
  | 'ready'
  | 'late'
  | 'new'
  | 'online'
  | string

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/**
 * Direction C status mapping:
 * - READY / ACTIVE / PAID / AVAILABLE / COMPLETED / OPEN  → green block
 * - AGING / PENDING / PROCESSING / BOOKED / DRAFT         → amber block
 * - LATE / UNPAID / ERROR / CANCELLED / EXPIRED           → red block
 * - INACTIVE / CLOSED / NEW / NEUTRAL                     → dark raised block
 */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  // Direction C KDS
  aging:      { label: 'Aging',      cls: 'badge--warning' },
  ready:      { label: 'Ready',      cls: 'badge--active' },
  late:       { label: 'Late',       cls: 'badge--error' },
  new:        { label: 'New',        cls: 'badge--inactive' },
  online:     { label: 'Online',     cls: 'badge--inactive' },
  // General
  active:     { label: 'Active',     cls: 'badge--active' },
  inactive:   { label: 'Inactive',   cls: 'badge--inactive' },
  pending:    { label: 'Pending',    cls: 'badge--warning' },
  processing: { label: 'Processing', cls: 'badge--warning' },
  paid:       { label: 'Paid',       cls: 'badge--active' },
  unpaid:     { label: 'Unpaid',     cls: 'badge--error' },
  expired:    { label: 'Expired',    cls: 'badge--error' },
  cancelled:  { label: 'Cancelled',  cls: 'badge--error' },
  available:  { label: 'Available',  cls: 'badge--active' },
  booked:     { label: 'Booked',     cls: 'badge--warning' },
  occupied:   { label: 'Occupied',   cls: 'badge--error' },
  completed:  { label: 'Completed',  cls: 'badge--active' },
  draft:      { label: 'Draft',      cls: 'badge--warning' },
  open:       { label: 'Open',       cls: 'badge--active' },
  closed:     { label: 'Closed',     cls: 'badge--inactive' },
  delayed:    { label: 'Delayed',    cls: 'badge--error' },
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
 * StatusBadge — Direction C design: solid color block with uppercase word.
 * Green = positive/ready, Amber = aging/warning, Red = late/error, Dark = neutral.
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
      warning: 'badge--warning',
      danger: 'badge--error',
      info: 'badge--info',
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
