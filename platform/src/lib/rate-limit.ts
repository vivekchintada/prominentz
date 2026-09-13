import { redis } from './redis'

/**
 * Redis-based sliding window rate limiter.
 *
 * @param key    Unique identifier (e.g. `ratelimit:orders:${userId}`)
 * @param limit  Max requests allowed in the window
 * @param windowSec  Window duration in seconds (default 60)
 * @returns { allowed: boolean, remaining: number, retryAfterSec: number }
 */
export async function rateLimit(
  key: string,
  limit: number = 30,
  windowSec: number = 60,
): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
  const prefixed = `resto:ratelimit:${key}`

  try {
    const current = await redis.incr(prefixed)

    if (current === 1) {
      // First request in this window — set expiry
      await redis.expire(prefixed, windowSec)
    }

    if (current > limit) {
      const ttl = await redis.ttl(prefixed)
      return { allowed: false, remaining: 0, retryAfterSec: ttl > 0 ? ttl : windowSec }
    }

    return { allowed: true, remaining: limit - current, retryAfterSec: 0 }
  } catch (err) {
    // If Redis is down, fail open — don't block legitimate requests
    console.error('[RateLimit] Redis error, failing open:', err)
    return { allowed: true, remaining: limit, retryAfterSec: 0 }
  }
}

/**
 * Helper to return a 429 Too Many Requests response.
 */
export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please slow down.',
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  )
}
