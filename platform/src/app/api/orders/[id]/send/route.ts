import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import type { KdsStation } from '@prisma/client'

// ─── POST /api/orders/:id/send ────────────────────────────────────────────────
// "Fire to kitchen" — the key action in the order lifecycle.
//
// What it does:
//   1. Validates the order is in a sendable state (OPEN or PARTIALLY_READY)
//   2. Fetches all PENDING order items
//   3. Groups them by their menuItem's kdsStation
//   4. Creates one KdsTicket per station, each with its KdsTicketItems
//   5. Transitions order items PENDING → IN_PROGRESS
//   6. Updates order status → SENT_TO_KITCHEN
//   7. Fires order.sent_to_kitchen event so connected KDS screens update instantly
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await params

    // Verify the order belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: { id: orderId, table: { location: { restaurantId: session.user.restaurantId } } },
      include: { table: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (!['OPEN', 'PARTIALLY_READY', 'SENT_TO_KITCHEN', 'READY'].includes(order.status)) {
      return NextResponse.json(
        { error: `Order cannot be sent in its current status: ${order.status}` },
        { status: 409 },
      )
    }

    // For SENT_TO_KITCHEN or READY orders, reset status to OPEN temporarily so new items can be processed
    if (order.status === 'SENT_TO_KITCHEN' || order.status === 'READY') {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'OPEN' } })
    }

    // Collect all PENDING items for this order (not yet fired)
    const pendingItems = await prisma.orderItem.findMany({
      where:   { orderId, status: 'PENDING' },
      include: {
        menuItem: { select: { name: true, kdsStation: true } },
      },
    })

    if (pendingItems.length === 0) {
      return NextResponse.json(
        { error: 'No pending items to send to kitchen' },
        { status: 400 },
      )
    }

    // Group items by KDS station
    const byStation = new Map<KdsStation, typeof pendingItems>()
    for (const item of pendingItems) {
      const station = item.menuItem.kdsStation
      if (!byStation.has(station)) byStation.set(station, [])
      byStation.get(station)!.push(item)
    }

    // Create tickets, deplete stock, and update order statuses inside an interactive transaction
    const { tickets } = await prisma.$transaction(async (tx) => {
      // 1. Create one KdsTicket per station, each with its items
      const tickets = []
      for (const [station, stationItems] of byStation.entries()) {
        const ticket = await tx.kdsTicket.create({
          data: {
            orderId,
            station,
            status: 'NEW',
            items: {
              create: stationItems.map((item) => ({
                menuItemId:  item.menuItemId,
                quantity:    item.quantity,
                modifiers:   item.modifiers as any,
                specialNote: item.specialNote,
                status:      'PENDING',
              })),
            },
          },
          include: { items: true },
        })
        tickets.push(ticket)
      }

      // 2. Query recipes for the items being fired
      const menuItemIds = Array.from(new Set(pendingItems.map((i) => i.menuItemId)))
      const recipes = await tx.recipeItem.findMany({
        where: { menuItemId: { in: menuItemIds } },
        include: { inventoryItem: true },
      })

      // 3. Deplete stock and log transaction entries
      for (const item of pendingItems) {
        const itemRecipes = recipes.filter((r) => r.menuItemId === item.menuItemId)
        for (const recipe of itemRecipes) {
          const amountToDeplete = recipe.quantityRequired * item.quantity

          // Decrement stock levels
          await tx.inventoryItem.update({
            where: { id: recipe.inventoryItemId },
            data: {
              currentStock: {
                decrement: amountToDeplete,
              },
            },
          })

          // Create inventory transaction audit entry
          await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: recipe.inventoryItemId,
              type: 'DEPLETION_ORDER',
              quantity: -amountToDeplete,
              orderId,
              notes: `Order item fire: ${item.quantity}x (MenuItem: ${item.menuItemId})`,
            },
          })
        }
      }

      // 4. Transition order items status PENDING -> IN_PROGRESS
      await tx.orderItem.updateMany({
        where: { orderId, status: 'PENDING' },
        data:  { status: 'IN_PROGRESS' },
      })

      // 5. Update parent order status -> SENT_TO_KITCHEN
      await tx.order.update({
        where: { id: orderId },
        data:  { status: 'SENT_TO_KITCHEN' },
      })

      return { tickets, recipes }
    })

    // 6. Post-transaction auto-86 checks for depleted ingredients
    const menuItemIds = Array.from(new Set(pendingItems.map((i) => i.menuItemId)))
    const recipes = await prisma.recipeItem.findMany({
      where: { menuItemId: { in: menuItemIds } },
    })

    const depletedInventoryItemIds = Array.from(new Set(recipes.map((r) => r.inventoryItemId)))

    if (depletedInventoryItemIds.length > 0) {
      const depletedItems = await prisma.inventoryItem.findMany({
        where: { id: { in: depletedInventoryItemIds } },
        include: {
          recipes: {
            include: {
              menuItem: true,
            },
          },
        },
      })

      for (const item of depletedItems) {
        for (const recipe of item.recipes) {
          // If current stock drops below what a single portion requires, trigger 86
          if (item.currentStock < recipe.quantityRequired && !recipe.menuItem.is86d) {
            await prisma.menuItem.update({
              where: { id: recipe.menuItemId },
              data: { is86d: true },
            })

            await prisma.availabilityLog.create({
              data: {
                menuItemId: recipe.menuItemId,
                action: '86D',
                reason: `Auto-86: ingredient stock depleted (${item.name}: ${item.currentStock} ${item.unit} remaining)`,
                changedBy: session.user.id,
              },
            })

            // Broadcast the 86 event to all terminals
            await publishEvent(EVENTS.MENU_ITEM_86D, {
              menuItemId: recipe.menuItemId,
              name: recipe.menuItem.name,
              is86d: true,
              reason: `Out of stock: ${item.name}`,
            })
          }
        }
      }
    }

    // Audit trail
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'order.sent_to_kitchen',
        actorId:   session.user.id,
        metadata:  {
          ticketCount: tickets.length,
          stations:    tickets.map((t) => t.station),
          itemCount:   pendingItems.length,
        },
      },
    })

    // Fire realtime event — KDS screens subscribe to this
    await publishEvent(
      EVENTS.ORDER_SENT_KITCHEN,
      {
        orderId,
        tableName: order.table?.name || 'Table',
        tickets: tickets.map((t) => ({
          ticketId: t.id,
          station:  t.station,
          items:    t.items.length,
        })),
        sentBy: session.user.name,
      },
      order.table?.locationId,
    )

    return NextResponse.json({ success: true, tickets })
  } catch (error) {
    console.error('[POST /api/orders/:id/send]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
