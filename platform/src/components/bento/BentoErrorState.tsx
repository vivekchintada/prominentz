'use client'

import { useEffect } from 'react'

interface Props {
  /** Where it happened, for the eyebrow: "Dashboard", "POS", "Kitchen display". */
  area: string
  title: string
  detail: string
  error: Error & { digest?: string }
  onRetry: () => void
  retryLabel?: string
  homeHref?: string
  homeLabel?: string
  /** Kitchen screens are dark. */
  night?: boolean
}

/**
 * Full-page error from the System states board. Red appears only here, the
 * state is named in words, and the way out is a plain "Try again".
 */
export function BentoErrorState({ area, title, detail, error, onRetry, retryLabel = 'Try again', homeHref, homeLabel = 'Back to the dashboard', night = false }: Props) {
  useEffect(() => {
    console.error(`[${area}]`, error)
  }, [area, error])

  return (
    <div className={`bz bz-state-page${night ? ' bz--night' : ''}`}>
      <div className="bz-tile" style={{ width: 'min(520px, 100%)', gap: 16 }}>
        <span className="bz-eyebrow">{area} · something went wrong</span>
        <div className="bz-error" role="alert">
          <div className="bz-row bz-row--center">
            <span className="bz-error__title">{title}</span>
            {error.digest && <span className="bz-meta">{error.digest}</span>}
          </div>
          <span className="bz-error__detail">{detail}</span>
          <div className="bz-row bz-row--wrap" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <button type="button" className="bz-btn bz-btn--ink bz-btn--lg" onClick={onRetry}>
              {retryLabel}
            </button>
            {homeHref && (
              <a href={homeHref} className="bz-btn bz-btn--outline bz-btn--lg">
                {homeLabel}
              </a>
            )}
          </div>
        </div>
        <span className="bz-sub">Nothing was changed by this error. If it keeps happening, reload the page or sign in again.</span>
      </div>
    </div>
  )
}
