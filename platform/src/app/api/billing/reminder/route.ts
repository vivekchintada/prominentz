import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getRestaurantAccessStatus } from '@/lib/subscription-status'

export const dynamic = 'force-dynamic'

const MAX_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000

/**
 * GET /api/billing/reminder?since=<ISO time>
 *
 * Tells the subscription reminder whether it may show, and how many orders the restaurant
 * has taken since the viewer last saw it. Only owners and managers of a restaurant without a
 * working paid subscription (trial, expired or payment failed) are eligible. The client decides
 * when enough orders have passed, so each viewer gets their own cadence.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  const user = session?.user
  if (!user?.restaurantId || !['OWNER', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ eligible: false })
  }

  const access = await getRestaurantAccessStatus(user.restaurantId)
  if (!access || access.isActive) {
    return NextResponse.json({ eligible: false })
  }

  const parsed = new Date(req.nextUrl.searchParams.get('since') || '')
  const floor = new Date(Date.now() - MAX_LOOKBACK_MS)
  const since = Number.isNaN(parsed.getTime()) || parsed < floor ? floor : parsed

  const ordersSince = await prisma.order.count({
    where: {
      createdAt: { gt: since },
      status: { not: 'VOIDED' },
      OR: [{ table: { location: { restaurantId: user.restaurantId } } }, { server: { restaurantId: user.restaurantId } }],
    },
  })

  return NextResponse.json({
    eligible: true,
    ordersSince,
    state: access.isPastDue ? 'past_due' : access.isExpired ? 'expired' : 'trial',
    daysLeftInTrial: access.daysLeftInTrial,
    canSubscribe: user.role === 'OWNER',
  })
}
