import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { updateOrderSchema } from '@/lib/validations/orders'
import { logAuditEvent } from '@/lib/audit'

// ─── Shared: resolve and auth-check an order ──────────────────────────────────
async function resolveOrder(id: string, restaurantId?: string | null) {
  if (restaurantId) {
    const found = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { table: { location: { restaurantId } } },
          { server: { restaurantId } },
        ],
      },
    })
    if (found) return found
  }
  return prisma.order.findUnique({
    where: { id },
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
    const { resolveUserLocation } = await import('@/lib/location-resolver')
    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId

    let order = await prisma.order.findFirst({
      where: {
        id,
        ...(restaurantId ? {
          OR: [
            { table: { location: { restaurantId } } },
            { server: { restaurantId } },
          ],
        } : {}),
      },
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
        tickets:  {
          include: {
            items: {
              include: { menuItem: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        events:   { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!order) {
      order = await prisma.order.findUnique({
        where: { id },
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
          tickets:  {
            include: {
              items: {
                include: { menuItem: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          payments: { orderBy: { createdAt: 'desc' } },
          events:   { orderBy: { createdAt: 'asc' } },
        },
      })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Defensive fallback: If order.items is empty but tickets exist, synthesize items from ticket items
    const rawOrder = order as any
    if ((!rawOrder.items || rawOrder.items.length === 0) && rawOrder.tickets && rawOrder.tickets.length > 0) {
      rawOrder.items = rawOrder.tickets.flatMap((t: any) =>
        (t.items || []).map((ti: any) => ({
          id: ti.id,
          orderId: order.id,
          menuItemId: ti.menuItemId,
          quantity: ti.quantity || 1,
          priceAtOrder: ti.menuItem ? ti.menuItem.price : 0,
          unitPrice: ti.menuItem ? ti.menuItem.price : 0,
          specialNote: ti.specialNote || null,
          status: ti.status || 'READY',
          menuItem: ti.menuItem || { id: ti.menuItemId, name: 'Dish', price: 0 },
        }))
      )
    }

    return NextResponse.json(rawOrder)
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
    const { resolveUserLocation } = await import('@/lib/location-resolver')
    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId

    const existing = await resolveOrder(id, restaurantId)
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

    // If order was transferred to a new table
    if (parsed.data.tableId && parsed.data.tableId !== existing.tableId) {
      const remainingOld = await prisma.order.findFirst({
        where: {
          tableId: existing.tableId,
          id: { not: id },
          status: { notIn: ['PAID', 'VOIDED'] },
        },
      })
      if (!remainingOld) {
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
      await prisma.table.update({
        where: { id: parsed.data.tableId },
        data: { status: 'ACTIVE' },
      })
      await publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: parsed.data.tableId,
        status: 'ACTIVE',
        actorId: session.user.id,
      })
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
  req: NextRequest,
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
    const { resolveUserLocation } = await import('@/lib/location-resolver')
    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId

    const existing = await resolveOrder(id, restaurantId)
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (existing.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot void a paid order — issue a refund instead' },
        { status: 409 },
      )
    }
    if (existing.status === 'VOIDED') {
      return NextResponse.json({ error: 'Order is already voided' }, { status: 409 })
    }

    // Parse optional void reason from body (gracefully ignore if missing)
    let voidReason = 'No reason provided'
    try {
      const body = await req.json().catch(() => ({}))
      if (body?.reason) voidReason = String(body.reason)
    } catch {}

    // ── Atomic void: order + all kitchen rows + table ──────────────────────────
    await prisma.$transaction([
      // 1. Mark the order itself as VOIDED
      prisma.order.update({
        where: { id },
        data:  { status: 'VOIDED', voidedAt: new Date() },
      }),

      // 2. Mark every order item as VOIDED so server UI reflects the cancel
      prisma.orderItem.updateMany({
        where: { orderId: id },
        data:  { status: 'VOIDED' },
      }),

      // 3. Mark every KDS ticket as VOIDED — kitchen will see the ticket go red/cancelled
      prisma.kdsTicket.updateMany({
        where: { orderId: id },
        data:  { status: 'VOIDED' },
      }),

      // 4. Mark every individual KDS ticket item as VOIDED
      prisma.kdsTicketItem.updateMany({
        where: { ticket: { orderId: id } },
        data:  { status: 'VOIDED' },
      }),

      // 5. Create the order-level void audit record
      prisma.orderVoid.create({
        data: {
          orderId:  id,
          voidedBy: session.user.id,
          reason:   voidReason,
        },
      }),

      // 6. Free the table
      prisma.table.update({
        where: { id: existing.tableId },
        data:  { status: 'EMPTY' },
      }),
    ])

    // ── Audit event log ────────────────────────────────────────────────────────
    await prisma.orderEvent.create({
      data: {
        orderId:   id,
        eventType: 'order.voided',
        actorId:   session.user.id,
        metadata:  { previousStatus: existing.status, reason: voidReason },
      },
    })

    // ── Real-time events (table + KDS) ─────────────────────────────────────────
    await Promise.all([
      // Table freed
      publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: existing.tableId,
        status:  'EMPTY',
        actorId: session.user.id,
      }),
      // KDS screen listens to this to remove/cancel the ticket immediately
      publishEvent('order.voided', {
        orderId:   id,
        tableId:   existing.tableId,
        actorId:   session.user.id,
        reason:    voidReason,
        voidedBy:  session.user.name,
      }),
      // Broader order-modified event for manager dashboard
      publishEvent(EVENTS.ORDER_MODIFIED, {
        orderId: id,
        status:  'VOIDED',
        actorId: session.user.id,
      }),
    ])

    // ── Structured audit trail ─────────────────────────────────────────────────
    await logAuditEvent({
      restaurantId: session.user.restaurantId,
      actorId:      session.user.id,
      actorName:    session.user.name,
      action:       'VOID_ORDER',
      targetType:   'Order',
      targetId:     id,
      before: { status: existing.status, total: Number(existing.total) },
      after:  { status: 'VOIDED', reason: voidReason },
    })

    return NextResponse.json({ success: true, orderId: id, voidedAt: new Date() })
  } catch (error) {
    console.error('[DELETE /api/orders/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

