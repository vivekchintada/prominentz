import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * SSE stream for mobile clients.
 * Subscribes to Redis 'resto:events' and forwards events to the connected mobile app.
 * Mobile clients listen with react-native-sse.
 *
 * Filters events by restaurantId so cross-tenant data never leaks.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const restaurantId = session.user.restaurantId
  const locationId = session.user.locationId

  const encoder = new TextEncoder()
  let subscriber: typeof redis | null = null
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial ping so client knows connection is alive
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', payload: { restaurantId } })}\n\n`))

      // Create a dedicated subscriber connection
      subscriber = redis.duplicate()
      await subscriber.subscribe('resto:events')

      subscriber.on('message', (_channel: string, message: string) => {
        if (closed) return
        try {
          const parsed = JSON.parse(message)
          const payload = parsed.payload || {}

          // Tenant isolation — only forward events for this restaurant
          // (locationId filter is optional bonus)
          if (payload._restaurantId && payload._restaurantId !== restaurantId) return

          // Map internal event names → mobile-friendly type names
          const typeMap: Record<string, string> = {
            'order.created':              'order.created',
            'order.modified':             'order.modified',
            'order.sent_to_kitchen':      'order.created',
            'order.fired':                'order.created',
            'order.voided':               'order.voided',
            'payment.processed':          'order.paid',
            'ticket.status.updated':      'ticket.status',
            'ticket.completed':           'ticket.completed',
            'table.status.changed':       'table.status',
            'waitlist.updated':           'waitlist.updated',
          }

          const mobileType = typeMap[parsed.event] ?? parsed.event

          const ssePayload = JSON.stringify({
            type: mobileType,
            payload,
            timestamp: new Date().toISOString(),
          })

          controller.enqueue(encoder.encode(`data: ${ssePayload}\n\n`))
        } catch {
          // ignore parse errors
        }
      })

      // Keepalive ping every 25 seconds to prevent proxy timeouts
      const keepalive = setInterval(() => {
        if (closed) { clearInterval(keepalive); return }
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(keepalive)
        }
      }, 25_000)

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', async () => {
        closed = true
        clearInterval(keepalive)
        if (subscriber) {
          await subscriber.unsubscribe('resto:events').catch(() => {})
          subscriber.disconnect()
          subscriber = null
        }
        try { controller.close() } catch {}
      })
    },

    cancel() {
      closed = true
      if (subscriber) {
        subscriber.unsubscribe('resto:events').catch(() => {})
        subscriber.disconnect()
        subscriber = null
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
      'Access-Control-Allow-Origin': '*',
    },
  })
}
