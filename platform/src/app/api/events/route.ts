import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const encoder = new TextEncoder()
  const sub = redis.duplicate()

  const stream = new ReadableStream({
    async start(controller) {
      let destroyed = false

      let isSubscribed = false

      const cleanup = async () => {
        if (destroyed) return
        destroyed = true
        clearInterval(pingInterval)
        try {
          if (isSubscribed) {
            await sub.unsubscribe('resto:events')
            await sub.quit()
          } else {
            sub.disconnect()
          }
        } catch (e) {
          // ignore cleanup error
        }
      }

      const sendEvent = (event: string, data: unknown) => {
        if (destroyed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch (e) {
          console.error('[SSE] Failed to enqueue event:', e)
        }
      }

      try {
        if (sub.status === 'wait' || sub.status === 'close') {
          await sub.connect()
        }
        await sub.subscribe('resto:events')
        isSubscribed = true
      } catch (err) {
        console.warn('[SSE] Redis subscription unavailable, operating in heartbeat mode:', err instanceof Error ? err.message : err)
      }

      if (isSubscribed) {
        sub.on('message', (channel, message) => {
          if (destroyed) return
          try {
            const parsed = JSON.parse(message)
            sendEvent(parsed.event, parsed.payload)
          } catch (e) {
            console.error('[SSE] Message parsing error:', e)
          }
        })
      }

      // Send initial acknowledgement
      sendEvent('connected', { success: true, timestamp: Date.now() })

      // Keep-alive ping interval (15s)
      const pingInterval = setInterval(() => {
        if (destroyed) return
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch (e) {
          cleanup()
        }
      }, 15000)

      // Max connection lifetime (5 minutes) to recycle stale SSE streams cleanly
      const maxLifetime = setTimeout(() => {
        if (destroyed) return
        sendEvent('reconnect', { reason: 'max_lifetime_exceeded' })
        cleanup().then(() => {
          try { controller.close() } catch (e) {}
        })
      }, 5 * 60 * 1000)

      const cleanupWithMaxLifetime = async () => {
        clearTimeout(maxLifetime)
        await cleanup()
      }

      req.signal.addEventListener('abort', () => {
        cleanupWithMaxLifetime().then(() => {
          try {
            controller.close()
          } catch (e) {}
        })
      })
    },
    cancel() {
      // Handled by abort listener
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
