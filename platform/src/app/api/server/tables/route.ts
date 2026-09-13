import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user

  // Resolve location for this user
  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, isActive: true },
    select: { locationId: true, id: true },
  })

  let locationId = employee?.locationId
  if (!locationId) {
    const loc = await prisma.location.findFirst({
      where: { restaurantId: user.restaurantId },
      select: { id: true },
    })
    locationId = loc?.id
  }

  if (!locationId) {
    return NextResponse.json([])
  }

  // Fetch tables that have at least one open order
  const tables = await prisma.table.findMany({
    where: { locationId },
    include: {
      orders: {
        where: { status: { notIn: ['PAID', 'VOIDED'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          guestCount: true,
          createdAt: true,
          total: true,
          _count: { select: { items: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const result = tables.map((t) => {
    const order = t.orders[0] ?? null
    const elapsedMins = order
      ? Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
      : null

    return {
      id: t.id,
      name: t.name,
      status: t.status,
      capacity: t.capacity,
      order: order
        ? {
            id: order.id,
            status: order.status,
            guestCount: order.guestCount,
            itemCount: order._count.items,
            total: Number(order.total),
            elapsedMins,
          }
        : null,
    }
  })

  return NextResponse.json(result)
}
