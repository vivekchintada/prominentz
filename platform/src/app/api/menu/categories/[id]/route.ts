import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateCategorySchema } from '@/lib/validations/menu'

// ─── PUT /api/menu/categories/:id ─────────────────────────────────────────────
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
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify the category belongs to this restaurant
    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/menu/categories/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/menu/categories/:id ──────────────────────────────────────────
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

    const existing = await prisma.menuCategory.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
      include: { _count: { select: { items: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existing._count.items > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with items. Move or delete items first.' },
        { status: 409 }
      )
    }

    await prisma.menuCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/menu/categories/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
