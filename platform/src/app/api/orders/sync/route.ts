import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { recalculateOrderTotals } from '@/lib/orders'

// ─── POST /api/orders/sync ────────────────────────────────────────────────────
// Drains queued offline orders recorded in IndexedDB during offline mode
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orders } = await req.json()
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided in sync queue' }, { status: 400 })
    }

    const syncedOrderIds: string[] = []
    const syncedOrders: Array<{ offlineId: string; serverId: string }> = []

    for (const offlineOrder of orders) {
      // Find table or fallback
      const table = await prisma.table.findFirst({
        where: { id: offlineOrder.tableId, location: { restaurantId: session.user.restaurantId } },
      })
      if (!table) continue

      // Create order & item records inside a transaction
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            tableId: table.id,
            guestCount: offlineOrder.guestCount || 1,
            notes: offlineOrder.notes ? `[Offline Sync] ${offlineOrder.notes}` : '[Offline Sync]',
            serverId: session.user.id,
            status: 'OPEN',
          },
        })

        if (offlineOrder.items && offlineOrder.items.length > 0) {
          await tx.orderItem.createMany({
            data: offlineOrder.items.map((item: unknown) => ({
              orderId: order.id,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              priceAtOrder: item.price,
              modifiers: item.modifiers || [],
              specialNote: item.specialNote || null,
              status: 'PENDING',
            })),
          })
        }

        await tx.table.update({
          where: { id: table.id },
          data: { status: 'ACTIVE' },
        })

        syncedOrderIds.push(offlineOrder.id)
        syncedOrders.push({ offlineId: offlineOrder.id, serverId: order.id })
      })

      // Recalculate totals for the newly created server order
      const lastSynced = syncedOrders[syncedOrders.length - 1]
      if (lastSynced) {
        await recalculateOrderTotals(lastSynced.serverId).catch(() => {})
      }
    }

    // Publish event for real-time screens
    await publishEvent(EVENTS.ORDER_MODIFIED, {
      action: 'offline_orders_synced',
      count: syncedOrderIds.length,
    })

    return NextResponse.json({
      success: true,
      syncedCount: syncedOrderIds.length,
      syncedOrderIds,
      syncedOrders,
    })
  } catch (error) {
    console.error('[POST /api/orders/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
