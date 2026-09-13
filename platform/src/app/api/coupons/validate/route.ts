import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      code,
      categoryName,
      customerId,
      allowCashierOverride = true,
    } = body
    const orderSubtotal = Number(body.orderSubtotal ?? body.subtotal ?? 0)

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Please provide a coupon code', message: 'Please provide a coupon code' }, { status: 400 })
    }

    const coupon = await prisma.coupon.findUnique({
      where: {
        restaurantId_code: {
          restaurantId: session.user.restaurantId,
          code: code.trim().toUpperCase(),
        },
      },
    })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code', message: 'Invalid coupon code' }, { status: 404 })
    }

    if (coupon.status !== 'ACTIVE') {
      const msg = `Coupon is ${coupon.status.toLowerCase()}`
      return NextResponse.json({ valid: false, error: msg, message: msg }, { status: 400 })
    }

    const now = new Date()
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      return NextResponse.json({ valid: false, error: 'Coupon is not yet active', message: 'Coupon is not yet active' }, { status: 400 })
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
      return NextResponse.json({ valid: false, error: 'Coupon has expired', message: 'Coupon has expired' }, { status: 400 })
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: 'Coupon usage limit reached', message: 'Coupon usage limit reached' }, { status: 400 })
    }

    // Category check (if coupon specifies a valid category)
    if (coupon.validCategory && coupon.validCategory !== 'All Categories') {
      if (categoryName && !categoryName.toLowerCase().includes(coupon.validCategory.toLowerCase())) {
        const msg = `Coupon is only valid for items in ${coupon.validCategory}`
        return NextResponse.json({
          valid: false,
          error: msg,
          message: msg,
        }, { status: 400 })
      }
    }

    // Customer Loyalty Points verification (if coupon requires loyalty points)
    let pointsVerified = false
    let customerPoints = 0
    if (coupon.pointsCost && coupon.pointsCost > 0) {
      if (customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { id: true, name: true, pointsBalance: true },
        })

        if (!customer) {
          return NextResponse.json({ valid: false, error: 'Customer profile not found', message: 'Customer profile not found' }, { status: 404 })
        }

        customerPoints = customer.pointsBalance
        if (customer.pointsBalance < coupon.pointsCost) {
          const msg = `Insufficient loyalty points. Guest has ${customer.pointsBalance} pts, but ${coupon.pointsCost} pts are required.`
          return NextResponse.json({
            valid: false,
            insufficientPoints: true,
            pointsCost: coupon.pointsCost,
            customerPoints: customer.pointsBalance,
            error: msg,
            message: msg,
          }, { status: 400 })
        }
        pointsVerified = true
      } else if (!allowCashierOverride) {
        const msg = `This coupon requires ${coupon.pointsCost} Loyalty Points. Please link or select a guest to redeem.`
        return NextResponse.json({
          valid: false,
          requiresLoyaltyCustomer: true,
          pointsCost: coupon.pointsCost,
          error: msg,
          message: msg,
        }, { status: 400 })
      }
    }

    // Calculate discount
    const subtotal = Math.max(0, orderSubtotal)
    let discount = 0
    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.round((subtotal * Number(coupon.discountAmount) / 100) * 100) / 100
    } else {
      discount = Math.min(subtotal, Number(coupon.discountAmount))
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount: Number(coupon.discountAmount),
        calculatedDiscount: discount,
        validCategory: coupon.validCategory,
        pointsCost: coupon.pointsCost || 0,
        pointsReward: coupon.pointsReward || 0,
      },
      discount,
      calculatedDiscount: discount,
      pointsVerified,
      customerPoints,
      message: `Coupon ${coupon.code} applied! -$${discount.toFixed(2)}${pointsVerified ? ` (${coupon.pointsCost} loyalty pts redeemed)` : ''}`,
    })
  } catch (error) {
    console.error('[POST /api/coupons/validate]', error)
    return NextResponse.json({ valid: false, error: 'Internal server error validating coupon', message: 'Internal server error validating coupon' }, { status: 500 })
  }
}
