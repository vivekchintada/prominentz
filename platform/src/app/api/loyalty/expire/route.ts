import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PointsLedgerType } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role && !['OWNER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId

    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId },
    })

    if (!config?.pointsExpiryDays || config.pointsExpiryDays <= 0) {
      return NextResponse.json({ message: 'Points expiry is disabled for this restaurant', expiredCount: 0 })
    }

    const expiryDate = new Date(Date.now() - config.pointsExpiryDays * 24 * 60 * 60 * 1000)

    // Find customers with inactive points older than expiry date whose last visit was prior to expiry
    const inactiveCustomers = await prisma.customer.findMany({
      where: {
        restaurantId,
        pointsBalance: { gt: 0 },
        OR: [
          { lastVisitAt: { lt: expiryDate } },
          { lastVisitAt: null, createdAt: { lt: expiryDate } },
        ],
      },
    })

    let expiredCount = 0
    let totalPointsExpired = 0

    for (const customer of inactiveCustomers) {
      const pointsToExpire = customer.pointsBalance
      if (pointsToExpire > 0) {
        await prisma.$transaction([
          prisma.customer.update({
            where: { id: customer.id },
            data: { pointsBalance: 0 },
          }),
          prisma.pointsLedger.create({
            data: {
              customerId: customer.id,
              type: PointsLedgerType.EXPIRED,
              pointsChange: -pointsToExpire,
              balanceAfter: 0,
              reason: `Points expired after ${config.pointsExpiryDays} days of inactivity`,
            },
          }),
        ])
        expiredCount++
        totalPointsExpired += pointsToExpire
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount,
      totalPointsExpired,
      expiryDays: config.pointsExpiryDays,
    })
  } catch (err: unknown) {
    console.error('[POST /api/loyalty/expire]', err)
    return NextResponse.json({ error: err?.message || 'Failed to expire points' }, { status: 500 })
  }
}
