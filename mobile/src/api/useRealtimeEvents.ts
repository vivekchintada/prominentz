/**
 * Real-time SSE (Server-Sent Events) hook.
 * Connects to /api/events/stream and fires callbacks on events.
 * Automatically reconnects on disconnect.
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Api } from './client'
import { RealtimeEvent, RealtimeEventType } from '../types/models'
import { QK } from './hooks'

// EventSource polyfill for React Native (react-native-sse package)
import EventSource from 'react-native-sse'

type EventHandler = (event: RealtimeEvent) => void

interface UseRealtimeOptions {
  enabled?: boolean
  onEvent?: EventHandler
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useRealtimeEvents({
  enabled = true,
  onEvent,
  onConnect,
  onDisconnect,
}: UseRealtimeOptions = {}) {
  const qc = useQueryClient()
  const esRef = useRef<any>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const connect = async () => {
    const baseURL = Api.getBaseURL()
    const url = `${baseURL}/api/events/stream`

    try {
      if (esRef.current) {
        esRef.current.close()
      }

      const es = new EventSource(url, {
        headers: {
          'x-client': 'mobile',
        },
        timeoutBeforeConnection: 500,
        withCredentials: false,
      } as any)

      es.addEventListener('open', () => {
        onConnect?.()
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      })

      es.addEventListener('message', (ev: any) => {
        try {
          const event: RealtimeEvent = JSON.parse(ev.data || '{}')
          onEvent?.(event)
          handleAutoInvalidation(event, qc)
        } catch {
          // ignore malformed events
        }
      })

      es.addEventListener('error', () => {
        onDisconnect?.()
        // Auto-reconnect after 5 seconds
        reconnectTimer.current = setTimeout(() => {
          if (enabled) connect()
        }, 5000)
      })

      esRef.current = es
    } catch {
      // SSE connection failed — retry in 10s
      reconnectTimer.current = setTimeout(() => {
        if (enabled) connect()
      }, 10000)
    }
  }

  useEffect(() => {
    if (!enabled) return
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [enabled])
}

/**
 * Auto-invalidate TanStack Query caches based on event type.
 * This means screens don't need manual refresh — they update automatically.
 */
function handleAutoInvalidation(event: RealtimeEvent, qc: ReturnType<typeof useQueryClient>) {
  switch (event.type as RealtimeEventType) {
    case 'order.created':
    case 'order.modified':
    case 'order.paid':
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: QK.tables })
      break

    case 'order.voided':
      // Remove voided order's tickets instantly from KDS cache
      qc.setQueriesData({ queryKey: ['kdsTickets'] }, (old: any) =>
        Array.isArray(old)
          ? old.filter((t: any) => t.orderId !== event.payload?.orderId)
          : old
      )
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: QK.tables })
      break

    case 'ticket.created':
    case 'ticket.status':
    case 'ticket.completed':
      qc.invalidateQueries({ queryKey: ['kdsTickets'] })
      break

    case 'table.status':
      qc.invalidateQueries({ queryKey: QK.tables })
      break

    case 'waitlist.updated':
      qc.invalidateQueries({ queryKey: QK.waitlist })
      break
  }
}
