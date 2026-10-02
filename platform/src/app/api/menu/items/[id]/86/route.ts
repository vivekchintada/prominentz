import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { toggle86Schema } from '@/lib/validations/menu'

// ─── PUT /api/menu/items/:id/86 ───────────────────────────────────────────────
// Toggles the 86 (unavailable) status for an item.
// Fires menu.item.86d event so POS greys out the item and KDS shows an alert.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Kitchen staff and servers can also 86 an item in the field
    if (!['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = toggle86Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { is86d, reason } = parsed.data

    // Verify item belongs to this restaurant
    const existing = await prisma.menuItem.findFirst({
      where: { id, category: { restaurantId: session.user.restaurantId } },
      include: { category: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Update item — set is86d and flip isAvailable accordingly
    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        is86d,
        isAvailable: !is86d,
      },
    })

    // Log the 86 event for reporting
    await prisma.availabilityLog.create({
      data: {
        menuItemId: id,
        changedBy: session.user.id,
        action: is86d ? '86D' : 'RESTORED',
        reason: reason ?? null,
      },
    })

    // Fire the 86 event to all connected POS + KDS clients
    await publishEvent(EVENTS.MENU_ITEM_86D, {
      id: updated.id,
      name: updated.name,
      is86d,
      reason: reason ?? null,
      categoryId: updated.categoryId,
      changedBy: session.user.name,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/menu/items/:id/86]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
