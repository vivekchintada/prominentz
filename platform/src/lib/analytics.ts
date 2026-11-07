/**
 * Tiny, cookieless analytics wrapper (Plausible).
 * Enabled only when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set, so it's a no-op locally.
 */
type Props = Record<string, string | number | boolean>

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void
  }
}

export function track(event: string, props?: Props) {
  if (typeof window === 'undefined') return
  try {
    window.plausible?.(event, props ? { props } : undefined)
  } catch {
    // analytics must never break the page
  }
}
