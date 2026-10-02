import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ config: null })
    }

    const restaurantId = session.user.restaurantId

    let config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId },
    })

    if (!config) {
      config = await prisma.loyaltyConfig.create({
        data: {
          restaurantId,
          pointsPerDollar: 1.0,
          pointsExpiryDays: 365,
          welcomeBonusPoints: 50,
          birthdayBonusPoints: 100,
          minimumRedemptionPoints: 100,
          isEnabled: true,
        },
      })
    }

    return NextResponse.json({ config })
  } catch (err) {
    console.error('[GET /api/loyalty/config]', err)
    return NextResponse.json({ error: 'Failed to fetch loyalty config' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const config = await prisma.loyaltyConfig.upsert({
      where: { restaurantId: session.user.restaurantId },
      create: {
        restaurantId: session.user.restaurantId,
        pointsPerDollar: body.pointsPerDollar !== undefined ? Number(body.pointsPerDollar) : 1.0,
        pointsExpiryDays: body.pointsExpiryDays !== undefined ? Number(body.pointsExpiryDays) : 365,
        welcomeBonusPoints: body.welcomeBonusPoints !== undefined ? Number(body.welcomeBonusPoints) : 0,
        birthdayBonusPoints: body.birthdayBonusPoints !== undefined ? Number(body.birthdayBonusPoints) : 0,
        minimumRedemptionPoints: body.minimumRedemptionPoints !== undefined ? Number(body.minimumRedemptionPoints) : 100,
        isEnabled: body.isEnabled !== undefined ? Boolean(body.isEnabled) : true,
      },
      update: {
        ...(body.pointsPerDollar !== undefined ? { pointsPerDollar: Number(body.pointsPerDollar) } : {}),
        ...(body.pointsExpiryDays !== undefined ? { pointsExpiryDays: Number(body.pointsExpiryDays) } : {}),
        ...(body.welcomeBonusPoints !== undefined ? { welcomeBonusPoints: Number(body.welcomeBonusPoints) } : {}),
        ...(body.birthdayBonusPoints !== undefined ? { birthdayBonusPoints: Number(body.birthdayBonusPoints) } : {}),
        ...(body.minimumRedemptionPoints !== undefined ? { minimumRedemptionPoints: Number(body.minimumRedemptionPoints) } : {}),
        ...(body.isEnabled !== undefined ? { isEnabled: Boolean(body.isEnabled) } : {}),
      },
    })

    return NextResponse.json({ config })
  } catch (err) {
    console.error('[PATCH /api/loyalty/config]', err)
    return NextResponse.json({ error: 'Failed to update loyalty config' }, { status: 500 })
  }
}
