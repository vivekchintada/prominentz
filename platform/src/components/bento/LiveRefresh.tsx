'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Keeps a server-rendered dashboard page current without a manual reload.
 * Re-runs the page's server data when a matching event arrives on the shared
 * event stream, when the tab becomes visible again, and on a slow fallback poll
 * (covers dropped connections and events that nobody publishes).
 */
export default function LiveRefresh({ events, pollMs = 30000 }: { events: string[]; pollMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    // Several events often arrive together (an order touches the order, table and ticket): refresh once.
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 700)
    }

    const es = new EventSource('/api/events')
    for (const ev of events) es.addEventListener(ev, refresh)

    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, pollMs)
    const onVisible = () => document.visibilityState === 'visible' && router.refresh()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(timer)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      es.close()
    }
    // events is a constant list per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pollMs])

  return null
}
