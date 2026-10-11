import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateCouponSchema } from '@/lib/validations/menu'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const coupon = await prisma.coupon.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    return NextResponse.json(coupon)
  } catch (error) {
    console.error('[GET /api/coupons/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateCouponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.coupon.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    const updateData: any = { ...parsed.data }
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate)
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate)

    const updated = await prisma.coupon.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/coupons/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.coupon.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    await prisma.coupon.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/coupons/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
