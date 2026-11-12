'use client'

import { useEffect, useState } from 'react'

/**
 * "You're offline" bar from the System states board. It replaces, never stacks
 * on, other notices: it only renders while the browser reports no connection,
 * names the state in words, and offers one lime way out.
 */
export function OfflineBanner({ dark = false }: { dark?: boolean }) {
  const [offlineSince, setOfflineSince] = useState<Date | null>(null)

  useEffect(() => {
    const update = () => setOfflineSince(navigator.onLine ? null : (prev) => prev ?? new Date())
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offlineSince) return null
  const at = offlineSince.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`bz-offline${dark ? ' bz-offline--dark' : ''}`} role="status" aria-live="polite">
      <span aria-hidden="true" className="bz-dot" />
      <div className="bz-offline__text">
        <strong>You’re offline · {at}</strong>
        <span>Live updates are paused. This screen reconnects on its own when the internet is back.</span>
      </div>
      <button type="button" className="bz-btn bz-btn--lime bz-btn--sm" onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  )
}
