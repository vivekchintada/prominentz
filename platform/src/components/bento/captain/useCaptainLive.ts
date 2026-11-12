'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface GuestCall {
  tableId: string
  tableName: string
  type: string
  notes: string | null
  requestedAt: string
}

export const CALL_LABEL: Record<string, string> = {
  CALL_WAITER: 'Wants a server',
  REQUEST_BILL: 'Asked for the bill',
  WATER: 'Water refill',
  CUTLERY: 'Needs cutlery',
  OTHER: 'Needs help',
}

const REFRESH_EVENTS = [
  'order.created',
  'order.sent_to_kitchen',
  'payment.processed',
  'ticket.status.updated',
  'ticket.completed',
  'ticket.ready_to_serve',
]

/**
 * Live data for every Captain tab: guest calls, a ticking clock for "18 min"
 * labels, and a server refresh whenever the floor changes. One EventSource and
 * one slow fallback poll per screen, nothing faster.
 */
export function useCaptainLive(locationId: string) {
  const router = useRouter()
  const [calls, setCalls] = useState<GuestCall[]>([])
  const [now, setNow] = useState(() => new Date())

  const loadCalls = useCallback(async () => {
    try {
      const r = await fetch(`/api/table-order/assistance?locationId=${encodeURIComponent(locationId)}`)
      if (!r.ok) return
      const d = await r.json()
      setCalls(((d.requests ?? []) as GuestCall[]).sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)))
    } catch {
      // Offline or server busy: keep the last list, the next event or poll retries.
    }
  }, [locationId])

  useEffect(() => {
    loadCalls()
    const tick = setInterval(() => setNow(new Date()), 30000)
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      loadCalls()
      router.refresh()
    }, 30000)
    const es = new EventSource('/api/events')
    const refresh = () => router.refresh()
    for (const ev of REFRESH_EVENTS) es.addEventListener(ev, refresh)
    es.addEventListener('table.assistance.requested', () => {
      loadCalls()
      toast.info('A table is asking for you')
    })
    es.addEventListener('table.assistance.acknowledged', () => loadCalls())
    return () => {
      clearInterval(tick)
      clearInterval(poll)
      es.close()
    }
  }, [loadCalls, router])

  const ack = useCallback(
    async (c: GuestCall) => {
      setCalls((prev) => prev.filter((x) => x.tableId !== c.tableId))
      try {
        const r = await fetch('/api/table-order/assistance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId, tableId: c.tableId }),
        })
        if (!r.ok) throw new Error()
      } catch {
        toast.error('Could not clear that call')
        loadCalls()
      }
    },
    [locationId, loadCalls],
  )

  return { calls, ack, now }
}

/** "Table 7" → "T-7", kept short enough for a square badge. */
export function shortTable(name: string): string {
  return name.replace(/^table\s*/i, 'T-').slice(0, 5)
}
