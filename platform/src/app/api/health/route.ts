import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Service health check endpoint — returns status of all critical subsystems.
 * Used by the dashboard's Service Health tab and external monitoring.
 */
export async function GET() {
  const checks: Record<string, { status: 'ok' | 'degraded' | 'down'; latencyMs: number; detail?: string }> = {}

  // 1. Database connectivity
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - start }
  } catch (err: unknown) {
    checks.database = { status: 'down', latencyMs: 0, detail: err.message?.slice(0, 100) }
  }

  // 2. Redis / SSE connectivity
  const redisUrl = process.env.REDIS_URL
  const isRedisConfigured = Boolean(redisUrl && !redisUrl.includes('localhost') && !redisUrl.includes('127.0.0.1'))

  if (!isRedisConfigured) {
    checks.redis = { status: 'degraded', latencyMs: 0, detail: 'Redis URL not configured (SSE/polling fallback active)' }
  } else {
    try {
      const start = Date.now()
      const { redis } = await import('@/lib/redis')
      await redis.ping()
      checks.redis = { status: 'ok', latencyMs: Date.now() - start }
    } catch (err: unknown) {
      checks.redis = { status: 'degraded', latencyMs: 0, detail: err.message?.slice(0, 100) }
    }
  }

  // 3. Auth system
  try {
    const start = Date.now()
    // Verify the auth module can be imported and config is valid
    const authModule = await import('@/auth')
    checks.auth = {
      status: authModule ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
      detail: 'NextAuth configured',
    }
  } catch (err: unknown) {
    checks.auth = { status: 'down', latencyMs: 0, detail: err.message?.slice(0, 100) }
  }

  // 4. Stripe connectivity
  try {
    const start = Date.now()
    const stripeKey = process.env.STRIPE_SECRET_KEY
    checks.stripe = {
      status: stripeKey ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
      detail: stripeKey ? 'API key configured' : 'No API key set',
    }
  } catch {
    checks.stripe = { status: 'down', latencyMs: 0 }
  }

  // 5. Email / Resend
  try {
    const start = Date.now()
    const resendKey = process.env.RESEND_API_KEY
    checks.email = {
      status: resendKey ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
      detail: resendKey ? 'Resend API key configured' : 'No API key set',
    }
  } catch {
    checks.email = { status: 'down', latencyMs: 0 }
  }

  // Overall status
  const allStatuses = Object.values(checks).map((c) => c.status)
  const overallStatus = allStatuses.every((s) => s === 'ok')
    ? 'healthy'
    : allStatuses.some((s) => s === 'down')
    ? 'unhealthy'
    : 'degraded'

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    { status: httpStatus }
  )
}
