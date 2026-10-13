import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_r: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ error: 'Invalid tracking token format' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    include: {
      table: {
        select: {
          name: true,
          location: {
            select: {
              name: true,
              address: true,
              phone: true,
              restaurantId: true,
            },
          },
        },
      },
      items: {
        include: {
          menuItem: { select: { name: true, imageUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      deliveryAddress: true,
      events: {
        where: { eventType: { startsWith: 'online_order.' } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({
    orderNumber: order.publicOrderNumber,
    status: order.onlineStatus,
    fulfilmentType: order.fulfilmentType,
    customerName: order.customerName,
    scheduledFor: order.scheduledFor,
    estimatedReadyAt: order.estimatedReadyAt,
    rejectionReason: order.rejectionReason,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    serviceCharge: Number(order.serviceCharge),
    deliveryFee: Number(order.deliveryFee),
    tip: Number(order.tip),
    total: Number(order.total),
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    location: order.table?.location || null,
    restaurantId: order.table?.location?.restaurantId || null,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.menuItem?.name || 'Item',
      quantity: i.quantity,
      price: Number(i.priceAtOrder),
      modifiers: i.modifiers,
      specialNote: i.specialNote,
    })),
    deliveryAddress: order.deliveryAddress,
    events: order.events,
  })
}
