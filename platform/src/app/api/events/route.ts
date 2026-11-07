import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { subscribeToRestaurant } from '@/lib/event-hub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-Sent Events stream for dashboard, POS and KDS screens.
 * Only events for the signed-in user's restaurant (and location, if scoped) are sent.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.restaurantId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const restaurantId = session.user.restaurantId
  const locationId = session.user.locationId
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          close()
        }
      }

      const { live, unsubscribe } = await subscribeToRestaurant(restaurantId, ({ event, payload }) => {
        if (locationId && payload._locationId && payload._locationId !== locationId) return
        send(event, payload)
      })

      send('connected', { success: true, live, timestamp: Date.now() })

      const ping = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          close()
        }
      }, 15_000)

      // Recycle long-lived streams so proxies and load balancers stay healthy.
      const maxLifetime = setTimeout(() => {
        send('reconnect', { reason: 'max_lifetime_exceeded' })
        close()
      }, 5 * 60 * 1000)

      function close() {
        if (closed) return
        closed = true
        clearInterval(ping)
        clearTimeout(maxLifetime)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      }

      req.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
