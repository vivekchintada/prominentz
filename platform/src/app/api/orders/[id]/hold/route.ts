import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'

// POST /api/orders/:id/hold — Place an active order on hold
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findFirst({
      where: { id, table: { location: { restaurantId: session.user.restaurantId } } },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only OPEN or kitchen-related statuses can be held
    const holdableStatuses = ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'READY']
    if (!holdableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot hold an order with status "${order.status}"` },
        { status: 409 },
      )
    }

    // Store the previous status in metadata so we can resume to it
    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: 'HOLD' },
      }),
      prisma.orderEvent.create({
        data: {
          orderId:   id,
          eventType: 'order.held',
          actorId:   session.user.id,
          metadata:  { previousStatus: order.status },
        },
      }),
    ])

    await publishEvent(EVENTS.ORDER_MODIFIED, {
      orderId: id,
      status:  'HOLD',
      actorId: session.user.id,
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('[POST /api/orders/:id/hold]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
