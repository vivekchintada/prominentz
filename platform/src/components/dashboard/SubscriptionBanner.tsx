import Link from 'next/link'

interface SubscriptionBannerProps {
  isTrialing: boolean
  isExpired: boolean
  isPastDue: boolean
  daysLeftInTrial: number
}

export function SubscriptionBanner({ isExpired, isPastDue, daysLeftInTrial }: SubscriptionBannerProps) {
  // A running trial is announced by the order-based popup (SubscriptionReminder), not a
  // banner on every page. Only blocking states (trial over, payment failed) stay pinned.
  if (!isExpired && !isPastDue) return null

  const tone = isExpired || isPastDue ? 'urgent' : 'notice'
  const message = isExpired
    ? "Your free trial has ended. Online ordering and card payments are paused until you subscribe."
    : isPastDue
      ? 'Your last payment failed. Please update your card to avoid losing access.'
      : `Your free trial ends in ${daysLeftInTrial} day${daysLeftInTrial === 1 ? '' : 's'}.`

  return (
    <div
      style={{
        margin: '0 24px 16px',
        padding: '12px 16px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: tone === 'urgent' ? 'color-mix(in srgb, var(--color-error) 14%, transparent)' : 'color-mix(in srgb, var(--color-warning) 14%, transparent)',
        border: `1px solid ${tone === 'urgent' ? 'color-mix(in srgb, var(--color-error) 35%, transparent)' : '#fde68a'}`,
        color: tone === 'urgent' ? 'var(--color-error)' : '#92400e',
        fontSize: 14,
      }}
    >
      <span>{message}</span>
      <Link
        href="/dashboard/settings/billing"
        style={{
          whiteSpace: 'nowrap',
          fontWeight: 600,
          textDecoration: 'underline',
          color: 'inherit',
        }}
      >
        {isExpired || isPastDue ? 'Fix billing now' : 'Subscribe now'}
      </Link>
    </div>
  )
}
