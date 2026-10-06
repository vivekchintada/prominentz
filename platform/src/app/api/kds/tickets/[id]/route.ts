import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import type { TicketStatus, OrderStatus, OrderItemStatus } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body as { status: TicketStatus }

    if (!['NEW', 'IN_PROGRESS', 'READY', 'SERVED', 'VOIDED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Find the ticket and check permissions
    const ticket = await prisma.kdsTicket.findFirst({
      where: {
        id,
        order: {
          table: {
            location: { restaurantId: session.user.restaurantId },
          },
        },
      },
      include: {
        items: true,
        order: {
          include: {
            table: true,
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const orderId = ticket.orderId
    const now = new Date()

    // Determine TicketItem and OrderItem statuses to sync
    let ticketItemStatus = 'PENDING'
    let orderItemStatus: OrderItemStatus = 'IN_PROGRESS'

    if (status === 'IN_PROGRESS') {
      ticketItemStatus = 'IN_PROGRESS'
      orderItemStatus = 'IN_PROGRESS'
    } else if (status === 'READY') {
      ticketItemStatus = 'READY'
      orderItemStatus = 'READY'
    } else if (status === 'SERVED') {
      ticketItemStatus = 'READY'
      orderItemStatus = 'SERVED'
    }

    // Perform database updates in a single transaction
    const [updatedTicket] = await prisma.$transaction([
      // 1. Update the ticket status
      prisma.kdsTicket.update({
        where: { id },
        data: {
          status,
          ...(status === 'READY' ? { readyAt: now } : {}),
          ...(status === 'SERVED' ? { servedAt: now } : {}),
        },
      }),

      // 2. Update KdsTicketItems status
      prisma.kdsTicketItem.updateMany({
        where: { ticketId: id },
        data: {
          status: ticketItemStatus as any,
          ...(status === 'IN_PROGRESS' ? { startedAt: now } : {}),
          ...(status === 'READY' || status === 'SERVED' ? { completedAt: now } : {}),
        },
      }),

      // 3. Update parent order items status
      prisma.orderItem.updateMany({
        where: {
          orderId,
          menuItemId: { in: ticket.items.map((i) => i.menuItemId) },
          // Only update items that are not already completed/served
          status: { not: 'SERVED' },
        },
        data: {
          status: orderItemStatus,
        },
      }),
    ])

    // 4. Re-evaluate parent order status based on all tickets
    const allTickets = await prisma.kdsTicket.findMany({
      where: { orderId },
    })

    const ticketStatuses = allTickets.map((t) => t.status)
    let nextOrderStatus: OrderStatus = 'SENT_TO_KITCHEN'

    if (ticketStatuses.every((s) => s === 'SERVED')) {
      nextOrderStatus = 'OPEN'
    } else if (ticketStatuses.every((s) => s === 'SERVED' || s === 'READY')) {
      nextOrderStatus = 'READY'
    } else if (ticketStatuses.some((s) => s === 'SERVED' || s === 'READY')) {
      nextOrderStatus = 'PARTIALLY_READY'
    }

    // Update parent order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextOrderStatus },
    })

    // 5. Audit logs and real-time events
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'ticket.status.updated',
        actorId: session.user.id,
        metadata: { ticketId: id, status },
      },
    })

    const locationId = ticket.order?.table?.locationId
    const tableName = ticket.order?.table?.name || 'Table'

    // Publish to Redis PubSub
    const eventsToPublish: Promise<void>[] = [
      publishEvent(
        EVENTS.TICKET_STATUS,
        {
          orderId,
          ticketId: id,
          status,
          station: ticket.station,
          tableName,
          actorId: session.user.id,
        },
        locationId,
      ),
      publishEvent(
        EVENTS.ORDER_MODIFIED,
        {
          orderId,
          status: nextOrderStatus,
          tableName,
          actorId: session.user.id,
        },
        locationId,
      ),
    ]

    // Fire TICKET_COMPLETED when a ticket reaches SERVED
    if (status === 'SERVED') {
      eventsToPublish.push(
        publishEvent(
          EVENTS.TICKET_COMPLETED,
          {
            orderId,
            ticketId: id,
            station:  ticket.station,
            tableName,
            actorId:  session.user.id,
          },
          locationId,
        )
      )
    }

    await Promise.all(eventsToPublish)

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('[PATCH /api/kds/tickets/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
