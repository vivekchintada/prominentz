import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { createOrderSchema } from '@/lib/validations/orders'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { recalculateOrderTotals } from '@/lib/orders'
import type { KdsStation } from '@prisma/client'

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// Query params: tableId?, status? (comma-separated)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tableId  = searchParams.get('tableId')
    const statuses = searchParams.get('status')?.split(',')

    const orders = await prisma.order.findMany({
      where: {
        table: { location: { restaurantId: session.user.restaurantId } },
        ...(tableId  ? { tableId }                              : {}),
        ...(statuses ? { status: { in: statuses as never[] } } : {}),
      },
      include: {
        table:  { select: { id: true, name: true, locationId: true } },
        server: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, kdsStation: true, imageUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        tickets: { select: { id: true, station: true, status: true, createdAt: true } },
        _count: { select: { items: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('[GET /api/orders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Creates a new order (or adds to table check), adds items, and automatically fires KDS tickets.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 60 order creations per minute per user
    const rl = await rateLimit(`orders:create:${session.user.id}`, 60)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec)

    const body = await req.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { tableId, guestCount, notes } = parsed.data
    const rawItems: Array<{
      menuItemId: string
      quantity?: number
      specialNote?: string
    }> = Array.isArray(body.items) ? body.items : []

    // Verify the table belongs to this restaurant
    const table = await prisma.table.findFirst({
      where: { id: tableId, location: { restaurantId: session.user.restaurantId } },
    })
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Check if table already has an active open order
    let targetOrder = await prisma.order.findFirst({
      where: {
        tableId,
        status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'READY', 'HOLD'] },
      },
      include: {
        table:  { select: { id: true, name: true } },
        server: { select: { id: true, name: true } },
        items:  true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // If no open order exists, create a new one
    if (!targetOrder) {
      const [newOrder] = await prisma.$transaction([
        prisma.order.create({
          data: {
            tableId,
            serverId: session.user.id,
            guestCount: guestCount || 1,
            notes: notes ?? null,
            status: 'OPEN',
          },
          include: {
            table:  { select: { id: true, name: true } },
            server: { select: { id: true, name: true } },
            items:  true,
          },
        }),
        prisma.table.update({
          where: { id: tableId },
          data:  { status: 'ACTIVE' },
        }),
      ])

      targetOrder = newOrder

      // Log the creation event
      await prisma.orderEvent.create({
        data: {
          orderId:   targetOrder.id,
          eventType: 'order.created',
          actorId:   session.user.id,
          metadata:  { tableId, guestCount },
        },
      })

      await publishEvent(EVENTS.ORDER_CREATED, {
        orderId:    targetOrder.id,
        tableId,
        serverId:   session.user.id,
        serverName: session.user.name,
        guestCount,
      })

      await publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId,
        status:  'ACTIVE',
        actorId: session.user.id,
      })
    }

    // If items are provided in the payload, insert them and dispatch KDS tickets immediately
    if (rawItems.length > 0) {
      const menuItemIds = rawItems.map((i) => i.menuItemId)
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds } },
        select: { id: true, name: true, price: true, kdsStation: true },
      })
      const itemMap = new Map(menuItems.map((m) => [m.id, m]))

      // 1. Create OrderItem rows
      const itemsToCreate = rawItems.map((item) => {
        const menuItem = itemMap.get(item.menuItemId)
        return {
          orderId: targetOrder.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
          priceAtOrder: menuItem ? menuItem.price : 0,
          specialNote: item.specialNote || null,
          status: 'PENDING' as const,
        }
      })

      const createdItems = []
      for (const itemData of itemsToCreate) {
        const created = await prisma.orderItem.create({
          data: itemData,
          include: {
            menuItem: { select: { name: true, kdsStation: true } },
          },
        })
        createdItems.push(created)
      }

      // 2. Recalculate order totals with the new items
      await recalculateOrderTotals(targetOrder.id)

      // 3. Group by KDS station (HOT, COLD, BAR, GRILL, DESSERT, etc.)
      const byStation = new Map<KdsStation, typeof createdItems>()
      for (const item of createdItems) {
        const station: KdsStation = item.menuItem.kdsStation || 'HOT'
        if (!byStation.has(station)) byStation.set(station, [])
        byStation.get(station)!.push(item)
      }

      // 4. Create KdsTicket for each station with its ticket items
      for (const [station, stItems] of byStation.entries()) {
        await prisma.kdsTicket.create({
          data: {
            orderId: targetOrder.id,
            station,
            status: 'NEW',
            items: {
              create: stItems.map((item) => ({
                menuItemId:  item.menuItemId,
                quantity:    item.quantity,
                specialNote: item.specialNote,
                status:      'PENDING',
              })),
            },
          },
        })
      }

      // 5. Update items to IN_PROGRESS and order status to SENT_TO_KITCHEN
      await prisma.orderItem.updateMany({
        where: { id: { in: createdItems.map((i) => i.id) } },
        data:  { status: 'IN_PROGRESS' },
      })

      await prisma.order.update({
        where: { id: targetOrder.id },
        data:  { status: 'SENT_TO_KITCHEN' },
      })

      // 6. Publish real-time events for connected KDS screens
      await publishEvent(EVENTS.ORDER_SENT_KITCHEN, {
        orderId: targetOrder.id,
        tableId: targetOrder.tableId,
        tableName: table.name,
        stations: Array.from(byStation.keys()),
      })

      await publishEvent('order.sent_to_kitchen', {
        orderId: targetOrder.id,
        tableId: targetOrder.tableId,
      })
    }

    // Return the updated full order with items and tickets
    const fullOrder = await prisma.order.findUnique({
      where: { id: targetOrder.id },
      include: {
        table:  { select: { id: true, name: true } },
        server: { select: { id: true, name: true } },
        items:  { include: { menuItem: true } },
        tickets: { include: { items: true } },
      },
    })

    return NextResponse.json(fullOrder, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/orders]', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
