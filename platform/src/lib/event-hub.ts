import type Redis from 'ioredis'
import { redis } from '@/lib/redis'

/**
 * Per-process fan-out for live events (orders, tickets, tables…).
 *
 * One shared Redis subscriber per server process instead of one per open screen,
 * so 500 KDS/POS screens cost 1 Redis connection, and each message is parsed once.
 * Listeners are indexed by restaurant, so tenants never see each other's events.
 */

export type HubEvent = { event: string; payload: Record<string, unknown>; ts?: number }
type Listener = (evt: HubEvent) => void

type Hub = {
  sub: Redis | null
  ready: Promise<boolean> | null
  byRestaurant: Map<string, Set<Listener>>
}

const g = globalThis as unknown as { __restoEventHub?: Hub }
const hub: Hub = (g.__restoEventHub ??= { sub: null, ready: null, byRestaurant: new Map() })

const CHANNEL = 'resto:events'

function connect(): Promise<boolean> {
  if (hub.ready) return hub.ready
  hub.ready = (async () => {
    try {
      const sub = redis.duplicate({ enableOfflineQueue: true, retryStrategy: (n: number) => Math.min(n * 500, 5000) })
      sub.on('error', (err) => console.warn('[EventHub] Redis error:', err.message))
      sub.on('message', (_channel, raw) => {
        let parsed: HubEvent
        try {
          parsed = JSON.parse(raw)
        } catch {
          return
        }
        const p = parsed.payload || {}
        const restaurantId =
          (typeof p._restaurantId === 'string' && p._restaurantId) ||
          (typeof p.restaurantId === 'string' && p.restaurantId) ||
          null
        // Unscoped events are dropped: never broadcast across tenants.
        if (!restaurantId) return
        const listeners = hub.byRestaurant.get(restaurantId)
        if (!listeners) return
        for (const fn of listeners) {
          try {
            fn(parsed)
          } catch {
            // a broken listener must not affect others
          }
        }
      })
      if (sub.status === 'wait') await sub.connect()
      await sub.subscribe(CHANNEL)
      hub.sub = sub
      return true
    } catch (err) {
      console.warn('[EventHub] Live events unavailable:', err instanceof Error ? err.message : err)
      hub.ready = null // allow a later retry
      return false
    }
  })()
  return hub.ready
}

/**
 * Subscribe to one restaurant's live events. Returns an unsubscribe function and
 * whether live delivery is available (false → clients should fall back to polling).
 */
export async function subscribeToRestaurant(
  restaurantId: string,
  listener: Listener,
): Promise<{ live: boolean; unsubscribe: () => void }> {
  let set = hub.byRestaurant.get(restaurantId)
  if (!set) {
    set = new Set()
    hub.byRestaurant.set(restaurantId, set)
  }
  set.add(listener)

  const live = await connect()
  return {
    live,
    unsubscribe: () => {
      const s = hub.byRestaurant.get(restaurantId)
      if (!s) return
      s.delete(listener)
      if (s.size === 0) hub.byRestaurant.delete(restaurantId)
    },
  }
}
