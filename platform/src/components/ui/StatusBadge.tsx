import React from 'react'

type StatusKey =
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

/** Status → { label, CSS class } */
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

interface StatusBadgeProps {
  status: StatusKey
  /** Override the display label */
  label?: string
}

/**
 * StatusBadge — maps a status string to a consistently styled coloured pill.
 * Green = positive (active/paid/available), Amber = in-progress, Red = negative.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status.toLowerCase()
  const map = STATUS_MAP[key] ?? { label: status, cls: 'badge--neutral' }
  return (
    <span className={`badge ${map.cls}`}>
      {label ?? map.label}
    </span>
  )
}
