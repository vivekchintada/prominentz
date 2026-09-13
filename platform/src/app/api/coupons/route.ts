import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createCouponSchema } from '@/lib/validations/menu'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coupons = await prisma.coupon.findMany({
      where: { restaurantId: session.user.restaurantId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(coupons)
  } catch (error) {
    console.error('[GET /api/coupons]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createCouponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const {
      code,
      validCategory,
      discountType,
      discountAmount,
      startDate,
      endDate,
      pointsCost,
      pointsReward,
      status,
      usageLimit,
    } = parsed.data

    const existing = await prisma.coupon.findUnique({
      where: {
        restaurantId_code: {
          restaurantId: session.user.restaurantId,
          code,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'A coupon with this code already exists.' }, { status: 409 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        restaurantId: session.user.restaurantId,
        code,
        validCategory: validCategory || null,
        discountType,
        discountAmount,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        pointsCost: pointsCost ?? 0,
        pointsReward: pointsReward ?? 0,
        status: status || 'ACTIVE',
        usageLimit: usageLimit ?? null,
      },
    })

    return NextResponse.json(coupon, { status: 201 })
  } catch (error) {
    console.error('[POST /api/coupons]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
