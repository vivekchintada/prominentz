import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { updateItemSchema } from '@/lib/validations/menu'
import { logAuditEvent } from '@/lib/audit'

// ─── GET /api/menu/items/:id ──────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const item = await prisma.menuItem.findFirst({
      where: { id, category: { restaurantId: session.user.restaurantId } },
      include: {
        modifiers: {
          include: { options: { orderBy: { displayOrder: 'asc' } } },
          orderBy: { displayOrder: 'asc' },
        },
        category: { select: { id: true, name: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('[GET /api/menu/items/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT /api/menu/items/:id ──────────────────────────────────────────────────
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
    const parsed = updateItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify the item belongs to this restaurant
    const existing = await prisma.menuItem.findFirst({
      where: { id, category: { restaurantId: session.user.restaurantId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: parsed.data,
      include: {
        modifiers: {
          include: { options: { orderBy: { displayOrder: 'asc' } } },
        },
        category: { select: { id: true, name: true } },
      },
    })

    // Publish update event so POS + KDS react in real-time
    await publishEvent(EVENTS.MENU_ITEM_UPDATED, {
      id: updated.id,
      name: updated.name,
      price: updated.price,
      isAvailable: updated.isAvailable,
      categoryId: updated.categoryId,
      kdsStation: updated.kdsStation,
      action: 'updated',
    })

    // Audit log entry
    await logAuditEvent({
      restaurantId: session.user.restaurantId,
      actorId:      session.user.id,
      actorName:    session.user.name ?? 'Unknown',
      action:       'EDIT_MENU_ITEM',
      targetType:   'MenuItem',
      targetId:     updated.id,
      before: { name: existing.name, price: Number(existing.price), isAvailable: existing.isAvailable },
      after:  { name: updated.name, price: Number(updated.price), isAvailable: updated.isAvailable },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/menu/items/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/menu/items/:id ───────────────────────────────────────────────
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

    const existing = await prisma.menuItem.findFirst({
      where: { id, category: { restaurantId: session.user.restaurantId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    await prisma.menuItem.delete({ where: { id } })

    // Audit log entry
    await logAuditEvent({
      restaurantId: session.user.restaurantId,
      actorId:      session.user.id,
      actorName:    session.user.name ?? 'Unknown',
      action:       'DELETE_MENU_ITEM',
      targetType:   'MenuItem',
      targetId:     id,
      before: { name: existing.name, price: Number(existing.price) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/menu/items/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
