import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { recalculateOrderTotals } from '@/lib/orders'
import { addItemsSchema } from '@/lib/validations/orders'

// ─── POST /api/orders/:id/items ───────────────────────────────────────────────
// Adds one or more items to an open order.
// Validates that every menuItemId belongs to this restaurant and is available.
// Recalculates order subtotal / tax / total after insert.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await params

    // Verify the order exists and belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: { id: orderId, table: { location: { restaurantId: session.user.restaurantId } } },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (['PAID', 'VOIDED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Cannot add items to a closed order' },
        { status: 409 },
      )
    }

    const body   = await req.json()
    const parsed = addItemsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { items } = parsed.data
    const menuItemIds = items.map((i) => i.menuItemId)

    // Bulk-validate that all menu items exist, belong here, and are available
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id:          { in: menuItemIds },
        isAvailable: true,
        is86d:       false,
        category:    { restaurantId: session.user.restaurantId },
      },
    })

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = new Set(menuItems.map((m) => m.id))
      const missing  = menuItemIds.filter((mid) => !foundIds.has(mid))
      return NextResponse.json(
        { error: 'Some items are unavailable or not found', missing },
        { status: 400 },
      )
    }

    const priceMap = new Map(menuItems.map((m) => [m.id, m.price]))

    // Insert all order items in a single transaction
    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.orderItem.create({
          data: {
            orderId,
            menuItemId:  item.menuItemId,
            quantity:    item.quantity,
            seatNumber:  item.seatNumber ?? 1,
            priceAtOrder: priceMap.get(item.menuItemId)!,
            modifiers:   item.modifiers,
            specialNote: item.specialNote ?? null,
            status:      'PENDING',
          },
          include: {
            menuItem: { select: { id: true, name: true, kdsStation: true } },
          },
        }),
      ),
    )

    // Recalculate totals and log event
    const updatedOrder = await recalculateOrderTotals(orderId)
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'order.items_added',
        actorId:   session.user.id,
        metadata:  { count: items.length },
      },
    })

    await publishEvent(EVENTS.ORDER_MODIFIED, {
      orderId,
      action:  'items_added',
      count:   items.length,
      actorId: session.user.id,
      totals: {
        subtotal: updatedOrder.subtotal,
        tax:      updatedOrder.tax,
        total:    updatedOrder.total,
      },
    })

    return NextResponse.json({ items: created, order: updatedOrder }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/orders/:id/items]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
