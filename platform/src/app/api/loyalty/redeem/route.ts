import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

export const dynamic = 'force-dynamic'

interface RedeemRequest {
  customerId: string
  rewardId: string
  orderId?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = await verifyRestaurantPlan(session.user.restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Loyalty Rewards is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }
    const { customerId, rewardId, orderId }: RedeemRequest = await req.json()

    if (!customerId || !rewardId) {
      return NextResponse.json({ error: 'Customer ID and Reward ID required' }, { status: 400 })
    }

    const restaurantId = session.user.restaurantId
    const customer = await prisma.customer.findFirst({ where: { id: customerId, restaurantId } })
    const reward = await prisma.loyaltyReward.findFirst({ where: { id: rewardId, restaurantId } })

    if (!customer || !reward) {
      return NextResponse.json({ error: 'Customer or Reward not found' }, { status: 404 })
    }

    if (customer.pointsBalance < reward.pointsRequired) {
      return NextResponse.json({
        error: `Insufficient points. Customer has ${customer.pointsBalance} pts, but ${reward.pointsRequired} pts required.`,
      }, { status: 400 })
    }

    // Transactionally deduct points and record redemption & ledger entry
    const result = await prisma.$transaction(async (tx) => {
      const spent = await tx.customer.updateMany({
        where: { id: customerId, restaurantId, pointsBalance: { gte: reward.pointsRequired } },
        data: { pointsBalance: { decrement: reward.pointsRequired } },
      })
      if (spent.count === 0) return null
      const updatedCustomer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } })
      const redemption = await tx.loyaltyRedemption.create({
        data: {
          customerId,
          rewardId,
          orderId: orderId || null,
          pointsRedeemed: reward.pointsRequired,
        },
      })
      await tx.pointsLedger.create({
        data: {
          customerId,
          orderId: orderId || null,
          type: 'REDEEMED',
          pointsChange: -reward.pointsRequired,
          balanceAfter: updatedCustomer.pointsBalance,
          reason: `Redeemed reward: ${reward.name}`,
          actorId: session.user.id,
        },
      })
      return { updatedCustomer, redemption }
    })

    if (!result) {
      return NextResponse.json({ error: 'Insufficient points for this reward.' }, { status: 400 })
    }
    const { updatedCustomer, redemption } = result

    // Send confirmation email if customer has email on file
    if (customer.email) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: session.user.restaurantId },
        select: { name: true },
      })
      const discountText = reward.discountType === 'PERCENTAGE'
        ? `${reward.discountAmount}% off entire bill`
        : `$${reward.discountAmount} flat discount`

      const { sendLoyaltyRewardEmail } = await import('@/lib/email')
      sendLoyaltyRewardEmail({
        to: customer.email,
        guestName: customer.name,
        restaurantName: restaurant?.name || 'Prominentz',
        rewardName: reward.name,
        discountText,
        pointsRedeemed: reward.pointsRequired,
        newPointsBalance: updatedCustomer.pointsBalance,
      }).catch((err) => console.error('[Loyalty] Background email error:', err))
    }

    return NextResponse.json({
      success: true,
      message: `Redeemed reward "${reward.name}" for ${reward.pointsRequired} points. Remaining balance: ${updatedCustomer.pointsBalance} pts.`,
      discountAmount: Number(reward.discountAmount),
      discountType: reward.discountType,
      newPointsBalance: updatedCustomer.pointsBalance,
    })
  } catch (error) {
    console.error('[POST /api/loyalty/redeem]', error)
    return NextResponse.json({ error: 'Failed to redeem loyalty points' }, { status: 500 })
  }
}
