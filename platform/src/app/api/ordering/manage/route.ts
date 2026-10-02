import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const status = new URL(req.url).searchParams.get('status')
    const orders = await prisma.order.findMany({
      where: {
        table: { location: { restaurantId: session.user.restaurantId } },
        onlineStatus: status ? (status as never) : { not: null },
      },
      include: {
        table: { select: { name: true, location: { select: { name: true } } } },
        items: { include: { menuItem: { select: { name: true, kdsStation: true } } } },
        deliveryAddress: true,
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
      take: 150,
    })
    return NextResponse.json(
      orders.map(order => ({
        ...order,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        serviceCharge: Number(order.serviceCharge),
        deliveryFee: Number(order.deliveryFee),
        tip: Number(order.tip),
        total: Number(order.total),
        items: order.items.map(item => ({ ...item, priceAtOrder: Number(item.priceAtOrder) })),
      }))
    )
  } catch (error) {
    console.error('[GET /api/ordering/manage]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load online orders' },
      { status: 500 }
    )
  }
}
