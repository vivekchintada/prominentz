import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { createOrderSchema } from '@/lib/validations/orders'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

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
// Creates a new open order and flips the table to ACTIVE.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 60 order creations per minute per user
    const rl = await rateLimit(`orders:create:${session.user.id}`, 60)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec)

    const body   = await req.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { tableId, guestCount, notes } = parsed.data

    // Verify the table belongs to this restaurant
    const table = await prisma.table.findFirst({
      where: { id: tableId, location: { restaurantId: session.user.restaurantId } },
    })
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }
    // If table already has an active order, return it instead of creating a duplicate
    if (table.status === 'ACTIVE' || table.status === 'PAYING') {
      const existingOrder = await prisma.order.findFirst({
        where: {
          tableId,
          status: { notIn: ['PAID', 'VOIDED'] },
        },
        include: {
          table:  { select: { id: true, name: true } },
          server: { select: { id: true, name: true } },
          items:  true,
        },
        orderBy: { createdAt: 'desc' },
      })
      if (existingOrder) {
        return NextResponse.json(existingOrder, { status: 200 })
      }
      // No open order found even though table is ACTIVE — fall through to create new order
    }

    // Create the order and update the table status atomically
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          tableId,
          serverId:   session.user.id,
          guestCount,
          notes:      notes ?? null,
          status:     'OPEN',
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

    // Log the event in OrderEvent
    await prisma.orderEvent.create({
      data: {
        orderId:   order.id,
        eventType: 'order.created',
        actorId:   session.user.id,
        metadata:  { tableId, guestCount },
      },
    })

    await publishEvent(EVENTS.ORDER_CREATED, {
      orderId:    order.id,
      tableId,
      serverId:   session.user.id,
      serverName: session.user.name,
      guestCount,
    })

    // Fire table status change event separately (table.update already done in tx)
    await publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
      tableId,
      status:  'ACTIVE',
      actorId: session.user.id,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('[POST /api/orders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
