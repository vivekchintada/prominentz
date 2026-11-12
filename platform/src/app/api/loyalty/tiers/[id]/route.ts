import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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

    const owned = await prisma.loyaltyTier.findFirst({ where: { id, restaurantId: session.user.restaurantId }, select: { id: true } })
    if (!owned) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    const updated = await prisma.loyaltyTier.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.minimumSpend !== undefined ? { minimumSpend: Number(body.minimumSpend) } : {}),
        ...(body.pointsMultiplier !== undefined ? { pointsMultiplier: Number(body.pointsMultiplier) } : {}),
        ...(body.perks !== undefined ? { perks: body.perks } : {}),
        ...(body.badgeColor !== undefined ? { badgeColor: body.badgeColor } : {}),
      },
    })

    return NextResponse.json({ tier: updated })
  } catch (err) {
    console.error('[PATCH /api/loyalty/tiers/:id]', err)
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
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

    const owned = await prisma.loyaltyTier.findFirst({ where: { id, restaurantId: session.user.restaurantId }, select: { id: true } })
    if (!owned) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    // Dissociate customers from tier
    await prisma.$transaction([
      prisma.customer.updateMany({
        where: { tierId: id, restaurantId: session.user.restaurantId },
        data: { tierId: null },
      }),
      prisma.loyaltyTier.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/loyalty/tiers/:id]', err)
    return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 })
  }
}
