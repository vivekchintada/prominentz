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
    const { id } = await params
    const body = await req.json()

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
    const { id } = await params

    // Dissociate customers from tier
    await prisma.customer.updateMany({
      where: { tierId: id },
      data: { tierId: null },
    })

    await prisma.loyaltyTier.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/loyalty/tiers/:id]', err)
    return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 })
  }
}
