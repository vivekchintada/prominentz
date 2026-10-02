import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PointsLedgerType } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // 1. Total members and total points in circulation
    const customerStats = await prisma.customer.aggregate({
      where: { restaurantId },
      _count: { id: true },
      _sum: { pointsBalance: true, lifetimeSpend: true },
    })

    const totalMembers = customerStats._count.id || 0
    const totalPointsOutstanding = customerStats._sum.pointsBalance || 0
    const totalLifetimeSpend = Number(customerStats._sum.lifetimeSpend || 0)

    // 2. Average dollar value per point based on configured rewards
    // e.g. 100 points for $10 discount => $0.10/point
    const rewards = await prisma.loyaltyReward.findMany({
      where: { restaurantId, isActive: true },
    })

    let pointValueDollar = 0.1 // Default: $0.10 per point
    if (rewards.length > 0) {
      const ratios = rewards.map((r) => Number(r.discountAmount) / r.pointsRequired).filter((r) => r > 0 && r < 5)
      if (ratios.length > 0) {
        pointValueDollar = ratios.reduce((a, b) => a + b, 0) / ratios.length
      }
    }

    const estimatedDollarLiability = Math.round(totalPointsOutstanding * pointValueDollar * 100) / 100

    // 3. Points earned vs redeemed this month
    const monthLedgers = await prisma.pointsLedger.findMany({
      where: {
        customer: { restaurantId },
        createdAt: { gte: startOfMonth },
      },
      select: { type: true, pointsChange: true },
    })

    let pointsEarnedThisMonth = 0
    let pointsRedeemedThisMonth = 0

    for (const entry of monthLedgers) {
      if (entry.type === PointsLedgerType.EARNED_PURCHASE || entry.type === PointsLedgerType.WELCOME_BONUS) {
        pointsEarnedThisMonth += entry.pointsChange
      } else if (entry.type === PointsLedgerType.REDEEMED) {
        pointsRedeemedThisMonth += Math.abs(entry.pointsChange)
      }
    }

    // 4. Tier breakdown
    const tiers = await prisma.loyaltyTier.findMany({
      where: { restaurantId },
      include: { _count: { select: { customers: true } } },
      orderBy: { minimumSpend: 'asc' },
    })

    const tierBreakdown = tiers.map((t) => ({
      id: t.id,
      name: t.name,
      badgeColor: t.badgeColor,
      memberCount: t._count.customers,
      minimumSpend: Number(t.minimumSpend),
    }))

    return NextResponse.json({
      totalMembers,
      totalPointsOutstanding,
      pointValueDollar: Number(pointValueDollar.toFixed(3)),
      estimatedDollarLiability,
      totalLifetimeSpend,
      pointsEarnedThisMonth,
      pointsRedeemedThisMonth,
      tierBreakdown,
    })
  } catch (err) {
    console.error('[GET /api/loyalty/liability]', err)
    return NextResponse.json({ error: 'Failed to calculate loyalty liability' }, { status: 500 })
  }
}
