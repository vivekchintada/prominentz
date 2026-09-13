import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { updateOrderSchema } from '@/lib/validations/orders'
import { logAuditEvent } from '@/lib/audit'

// ─── Shared: resolve and auth-check an order ──────────────────────────────────
async function resolveOrder(id: string, restaurantId: string) {
  return prisma.order.findFirst({
    where: { id, table: { location: { restaurantId } } },
  })
}

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
export async function GET(
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
      include: {
        table:  {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: {
              select: {
                name: true,
                address: true,
                phone: true,
                restaurant: { select: { name: true } },
              },
            },
          },
        },
        server: { select: { id: true, name: true, email: true } },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            pointsBalance: true,
            lifetimeSpend: true,
            allergyTags: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true, name: true, price: true,
                kdsStation: true, taxRate: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        tickets:  { include: { items: true }, orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
        events:   { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('[GET /api/orders/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/orders/:id ────────────────────────────────────────────────────
// Update order metadata (guestCount, notes). Items are managed via /items.
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
    const existing = await resolveOrder(id, session.user.restaurantId)
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = updateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    if (['PAID', 'VOIDED'].includes(existing.status) && !parsed.data.status) {
      return NextResponse.json(
        { error: 'Cannot modify a closed order' },
        { status: 409 },
      )
    }

    const updated = await prisma.order.update({
      where: { id },
      data:  parsed.data,
      include: {
        table: { select: { id: true, name: true, locationId: true } },
      },
    })

    // If order was marked PAID or VOIDED, check if table can be freed
    if (parsed.data.status && ['PAID', 'VOIDED'].includes(parsed.data.status)) {
      const remainingActive = await prisma.order.findFirst({
        where: {
          tableId: existing.tableId,
          id: { not: id },
          status: { notIn: ['PAID', 'VOIDED'] },
        },
      })
      if (!remainingActive) {
        await prisma.table.update({
          where: { id: existing.tableId },
          data: { status: 'EMPTY' },
        })
        await publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
          tableId: existing.tableId,
          status: 'EMPTY',
          actorId: session.user.id,
        })
      }
    }

    // Publish order modified event
    await publishEvent(
      EVENTS.ORDER_MODIFIED,
      {
        orderId: id,
        status: updated.status,
        tableName: updated.table?.name || 'Order',
        locationId: updated.table?.locationId,
        actorId: session.user.id,
      },
      updated.table?.locationId
    )

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        eventType: 'order.modified',
        actorId: session.user.id,
        metadata: { updatedStatus: updated.status, changes: parsed.data },
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/orders/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/orders/:id ───────────────────────────────────────────────────
// Voids an open order. OWNER / MANAGER only. Frees the table.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await resolveOrder(id, session.user.restaurantId)
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (existing.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot void a paid order — issue a refund instead' },
        { status: 409 },
      )
    }

    // Void order + free table in one transaction
    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data:  { status: 'VOIDED' },
      }),
      prisma.table.update({
        where: { id: existing.tableId },
        data:  { status: 'EMPTY' },
      }),
    ])

    await prisma.orderEvent.create({
      data: {
        orderId:   id,
        eventType: 'order.voided',
        actorId:   session.user.id,
        metadata:  { previousStatus: existing.status },
      },
    })

    await Promise.all([
      publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: existing.tableId,
        status:  'EMPTY',
        actorId: session.user.id,
      }),
      publishEvent(EVENTS.ORDER_MODIFIED, {
        orderId: id,
        status:  'VOIDED',
        actorId: session.user.id,
      }),
    ])

    // Log audit event for order voiding
    await logAuditEvent({
      restaurantId: session.user.restaurantId,
      actorId: session.user.id,
      actorName: session.user.name,
      action: 'VOID_ORDER',
      targetType: 'Order',
      targetId: id,
      before: { status: existing.status, total: Number(existing.total) },
      after: { status: 'VOIDED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/orders/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
