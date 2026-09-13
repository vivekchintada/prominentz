import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateModifierSchema } from '@/lib/validations/menu'

// ─── PUT /api/menu/modifiers/:id ──────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateModifierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify modifier belongs to this restaurant via item → category chain
    const existing = await prisma.menuModifier.findFirst({
      where: {
        id,
        menuItem: { category: { restaurantId: session.user.restaurantId } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Modifier not found' }, { status: 404 })
    }

    const { options, ...modifierData } = parsed.data

    // If options are provided, replace them entirely
    const updated = await prisma.$transaction(async (tx) => {
      if (options !== undefined) {
        await tx.modifierOption.deleteMany({ where: { modifierId: id } })
        await tx.modifierOption.createMany({
          data: options.map((opt) => ({
            modifierId: id,
            name: opt.name,
            priceAdjustment: opt.priceAdjustment ?? 0,
            displayOrder: opt.displayOrder ?? 0,
          })),
        })
      }

      return tx.menuModifier.update({
        where: { id },
        data: modifierData,
        include: { options: { orderBy: { displayOrder: 'asc' } } },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/menu/modifiers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/menu/modifiers/:id ───────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.menuModifier.findFirst({
      where: {
        id,
        menuItem: { category: { restaurantId: session.user.restaurantId } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Modifier not found' }, { status: 404 })
    }

    // Options are cascade-deleted by DB constraint
    await prisma.menuModifier.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/menu/modifiers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
