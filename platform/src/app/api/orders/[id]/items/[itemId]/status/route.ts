import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import type { OrderItemStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// ─── PATCH /api/orders/:id/items/:itemId/status ──────────────────────────────
// Advances item status: PENDING -> IN_PROGRESS -> READY -> SERVED
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId, itemId } = await params
    const body = await req.json().catch(() => ({}))
    const requestedStatus = body.status as OrderItemStatus | undefined

    const item = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        order: { table: { location: { restaurantId: session.user.restaurantId } } },
      },
      include: {
        order: {
          include: {
            table: true,
            server: { select: { id: true, name: true } },
          },
        },
        menuItem: { select: { id: true, name: true, kdsStation: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    // Determine next status if not explicitly given
    let nextStatus: OrderItemStatus = requestedStatus || 'IN_PROGRESS'
    if (!requestedStatus) {
      if (item.status === 'PENDING') nextStatus = 'IN_PROGRESS'
      else if (item.status === 'IN_PROGRESS') nextStatus = 'READY'
      else if (item.status === 'READY') nextStatus = 'SERVED'
      else nextStatus = 'SERVED'
    }

    const now = new Date()
    const timestampUpdates: Record<string, any> = {}
    if (nextStatus === 'IN_PROGRESS' && !item.prepStartedAt) {
      timestampUpdates.prepStartedAt = now
    } else if (nextStatus === 'READY' && !item.readyAt) {
      timestampUpdates.readyAt = now
    } else if (nextStatus === 'SERVED' && !item.servedAt) {
      timestampUpdates.servedAt = now
    }

    // Update orderItem
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: nextStatus,
        ...timestampUpdates,
      },
      include: {
        menuItem: { select: { id: true, name: true, kdsStation: true } },
      },
    })

    // Also update matching KdsTicketItem
    await prisma.kdsTicketItem.updateMany({
      where: {
        menuItemId: item.menuItemId,
        ticket: { orderId },
      },
      data: {
        status: nextStatus === 'PENDING' ? 'PENDING' : nextStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'READY',
        ...(nextStatus === 'IN_PROGRESS' ? { startedAt: now } : {}),
        ...(nextStatus === 'READY' || nextStatus === 'SERVED' ? { completedAt: now } : {}),
      },
    })

    // Fetch all items for this order to check overall progress
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    })

    const allReady = allItems.length > 0 && allItems.every((i) => i.status === 'READY' || i.status === 'SERVED')
    const allServed = allItems.length > 0 && allItems.every((i) => i.status === 'SERVED')
    const someReady = allItems.some((i) => i.status === 'READY' || i.status === 'SERVED')
    const someInProgress = allItems.some((i) => i.status === 'IN_PROGRESS')

    let nextOrderStatus = item.order.status
    if (allServed || allReady) {
      nextOrderStatus = 'READY'
    } else if (someReady || someInProgress) {
      nextOrderStatus = 'PARTIALLY_READY'
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextOrderStatus },
    })

    const locationId = item.order.table.locationId
    const tableName = item.order.table.name

    // If all items are ready, trigger server alert & food ready task!
    if (allReady && nextStatus === 'READY') {
      // Find server employee ID
      let serverEmployeeId = null
      if (item.order.serverId) {
        const emp = await prisma.employee.findFirst({
          where: { userId: item.order.serverId },
        })
        serverEmployeeId = emp?.id || null
      }

      // Check if food ready task already exists for this order
      const existingTask = await prisma.task.findFirst({
        where: {
          orderId,
          taskType: 'FOOD_READY',
          status: 'OPEN',
        },
      })

      if (!existingTask) {
        await prisma.task.create({
          data: {
            locationId,
            createdById: session.user.id,
            assignedToId: serverEmployeeId,
            role: 'SERVER',
            message: `${tableName} — All items ready for pickup!`,
            taskType: 'FOOD_READY',
            orderId,
            tableId: item.order.tableId,
            priority: 'URGENT',
            status: 'OPEN',
          },
        })
      }

      await publishEvent(
        'ticket.ready_to_serve',
        {
          orderId,
          tableName,
          serverId: item.order.serverId,
          serverName: item.order.server?.name,
          readyAt: now.toISOString(),
          message: `${tableName} — All items are READY to serve!`,
        },
        locationId
      )
    }

    // If item was marked SERVED and all are served, resolve the food ready task
    if (allServed) {
      await prisma.task.updateMany({
        where: {
          orderId,
          taskType: 'FOOD_READY',
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
        },
      })
    }

    // Publish event updates
    await publishEvent(
      'orderitem.status_changed',
      {
        orderId,
        itemId,
        itemName: item.menuItem.name,
        status: nextStatus,
        orderStatus: nextOrderStatus,
        tableName,
        allReady,
        allServed,
      },
      locationId
    )

    await publishEvent(
      EVENTS.TICKET_STATUS,
      {
        orderId,
        itemId,
        status: nextStatus,
        tableName,
      },
      locationId
    )

    return NextResponse.json({
      item: updatedItem,
      allReady,
      allServed,
      orderStatus: nextOrderStatus,
    })
  } catch (error: any) {
    console.error('[PATCH /api/orders/:id/items/:itemId/status]', error)
    return NextResponse.json({ error: error?.message || 'Failed to advance item status' }, { status: 500 })
  }
}
