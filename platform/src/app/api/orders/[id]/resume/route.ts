import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'

// POST /api/orders/:id/resume — Resume a held order back to its previous status
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

    if (order.status !== 'HOLD') {
      return NextResponse.json(
        { error: `Order is not on hold (current status: "${order.status}")` },
        { status: 409 },
      )
    }

    // Look up the most recent "order.held" event to find what status to resume to
    const holdEvent = await prisma.orderEvent.findFirst({
      where: { orderId: id, eventType: 'order.held' },
      orderBy: { createdAt: 'desc' },
    })

    const resumeStatus = (holdEvent?.metadata as any)?.previousStatus || 'OPEN'

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: resumeStatus },
      }),
      prisma.orderEvent.create({
        data: {
          orderId:   id,
          eventType: 'order.resumed',
          actorId:   session.user.id,
          metadata:  { resumedTo: resumeStatus },
        },
      }),
    ])

    await publishEvent(EVENTS.ORDER_MODIFIED, {
      orderId: id,
      status:  resumeStatus,
      actorId: session.user.id,
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('[POST /api/orders/:id/resume]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
