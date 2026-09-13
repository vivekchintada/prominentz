import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { recalculateOrderTotals } from '@/lib/orders'
import { updateOrderItemSchema } from '@/lib/validations/orders'

// ─── Shared: resolve an order item and verify it belongs to this restaurant ───
async function resolveOrderItem(
  orderId:      string,
  itemId:       string,
  restaurantId: string,
) {
  return prisma.orderItem.findFirst({
    where: {
      id:     itemId,
      orderId,
      order:  { table: { location: { restaurantId } } },
    },
  })
}

// ─── PATCH /api/orders/:id/items/:itemId ──────────────────────────────────────
// Update quantity, modifiers, or special note. Recalculates totals.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId, itemId } = await params

    const existing = await resolveOrderItem(orderId, itemId, session.user.restaurantId)
    if (!existing) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }
    // Cannot edit items that are already ready or served
    if (['READY', 'SERVED'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Cannot modify an item that is already ready or served' },
        { status: 409 },
      )
    }

    const body   = await req.json()
    const parsed = updateOrderItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data:  parsed.data,
      include: {
        menuItem: { select: { id: true, name: true, kdsStation: true } },
      },
    })

    const updatedOrder = await recalculateOrderTotals(orderId)

    await publishEvent(EVENTS.ORDER_MODIFIED, {
      orderId,
      action:  'item_updated',
      itemId,
      actorId: session.user.id,
      totals: {
        subtotal: updatedOrder.subtotal,
        tax:      updatedOrder.tax,
        total:    updatedOrder.total,
      },
    })

    return NextResponse.json({ item: updated, order: updatedOrder })
  } catch (error) {
    console.error('[PATCH /api/orders/:id/items/:itemId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/orders/:id/items/:itemId ─────────────────────────────────────
// Remove an item from the order. Recalculates totals.
// PENDING items     → any authenticated user (server can remove before firing)
// IN_PROGRESS/READY → MANAGER or OWNER only (food may already be cooking)
// SERVED            → never (food left the kitchen)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId, itemId } = await params

    const existing = await resolveOrderItem(orderId, itemId, session.user.restaurantId)
    if (!existing) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    // Served items can never be voided
    if (existing.status === 'SERVED') {
      return NextResponse.json(
        { error: 'Cannot remove an item that has already been served' },
        { status: 409 },
      )
    }

    // Items already fired to kitchen require manager-level approval
    if (['IN_PROGRESS', 'READY'].includes(existing.status)) {
      if (!['MANAGER', 'OWNER'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Manager approval required to void an item already sent to the kitchen' },
          { status: 403 },
        )
      }
    }

    await prisma.orderItem.delete({ where: { id: itemId } })

    const updatedOrder = await recalculateOrderTotals(orderId)

    await publishEvent(EVENTS.ORDER_MODIFIED, {
      orderId,
      action:  'item_removed',
      itemId,
      actorId: session.user.id,
      totals: {
        subtotal: updatedOrder.subtotal,
        tax:      updatedOrder.tax,
        total:    updatedOrder.total,
      },
    })

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('[DELETE /api/orders/:id/items/:itemId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}