import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'

const poItemSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity:        z.number().positive(),
  unitCost:        z.number().min(0),
})

const createPOSchema = z.object({
  supplierId: z.string().min(1),
  notes:      z.string().optional().nullable(),
  items:      z.array(poItemSchema).min(1),
})

// ─── GET /api/inventory/purchase-orders ─────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: { locationId: location.id },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true, leadTimeDays: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true, unitCost: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(pos)
  } catch (error) {
    console.error('[GET /api/inventory/purchase-orders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/inventory/purchase-orders ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = createPOSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Generate PO Number (PO-YYYYMMDD-XXXX)
    const dateTag = new Date().toISOString().substring(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const poNumber = `PO-${dateTag}-${randomSuffix}`

    let totalCost = 0
    const itemData = parsed.data.items.map((item) => {
      const lineTotal = item.quantity * item.unitCost
      totalCost += lineTotal
      return {
        inventoryItemId:  item.inventoryItemId,
        quantity:         item.quantity,
        receivedQuantity: 0,
        unitCost:         item.unitCost,
        totalCost:        lineTotal,
      }
    })

    const po = await prisma.purchaseOrder.create({
      data: {
        locationId: location.id,
        supplierId: parsed.data.supplierId,
        poNumber,
        status:     'ORDERED',
        totalCost,
        orderedAt:  new Date(),
        notes:      parsed.data.notes ?? null,
        items: {
          create: itemData,
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    })

    return NextResponse.json(po, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/purchase-orders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/inventory/purchase-orders ───────────────────────────────────
// Updates PO status (e.g. RECEIVED, PARTIALLY_RECEIVED) with partial receiving & unit-cost updates
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'PO ID required' }, { status: 400 })
    }

    const body = await req.json()
    const { status, receivedItems } = body

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
      include: { items: { include: { inventoryItem: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 })
    }

    // Granular item receiving
    if (Array.isArray(receivedItems) && receivedItems.length > 0) {
      let allFullyReceived = true

      for (const rec of receivedItems) {
        const line = existing.items.find((it) => it.id === rec.id)
        if (!line) continue

        const targetQty = typeof rec.receivedQuantity === 'number' ? rec.receivedQuantity : line.quantity
        const delta = Math.max(0, targetQty - line.receivedQuantity)
        const newUnitCost = typeof rec.unitCost === 'number' ? rec.unitCost : Number(line.unitCost)

        if (delta > 0) {
          // Increment stock exactly once for the newly received delta
          await prisma.inventoryItem.update({
            where: { id: line.inventoryItemId },
            data: {
              currentStock: { increment: delta },
              unitCost:     newUnitCost,
            },
          })

          // Audit trail transaction
          await prisma.inventoryTransaction.create({
            data: {
              inventoryItemId: line.inventoryItemId,
              type:            'STOCK_IN',
              quantity:        delta,
              actorId:         session.user.id,
              notes:           `Received ${delta} ${line.inventoryItem.unit} via PO ${existing.poNumber} @ $${newUnitCost.toFixed(2)}/ea`,
            },
          })
        }

        // Update line item
        await prisma.purchaseOrderItem.update({
          where: { id: line.id },
          data: {
            receivedQuantity: targetQty,
            unitCost:         newUnitCost,
            totalCost:        line.quantity * newUnitCost,
          },
        })

        if (targetQty < line.quantity) {
          allFullyReceived = false
        }
      }

      const finalStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status:     finalStatus,
          receivedAt: allFullyReceived ? new Date() : existing.receivedAt,
        },
        include: {
          supplier: true,
          items:    { include: { inventoryItem: true } },
        },
      })

      return NextResponse.json(updated)
    }

    // Direct status change fallback (e.g. quick full receive or cancel)
    if (!status || !['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid PO status or parameters' }, { status: 400 })
    }

    // If status changed to RECEIVED from non-received, receive all remaining quantity
    if (status === 'RECEIVED' && existing.status !== 'RECEIVED') {
      for (const item of existing.items) {
        const remaining = Math.max(0, item.quantity - item.receivedQuantity)
        if (remaining > 0) {
          await prisma.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: {
              currentStock: { increment: remaining },
              unitCost:     Number(item.unitCost),
            },
          })

          await prisma.inventoryTransaction.create({
            data: {
              inventoryItemId: item.inventoryItemId,
              type:            'STOCK_IN',
              quantity:        remaining,
              actorId:         session.user.id,
              notes:           `Full receive restock via Purchase Order ${existing.poNumber}`,
            },
          })

          await prisma.purchaseOrderItem.update({
            where: { id: item.id },
            data: { receivedQuantity: item.quantity },
          })
        }
      }
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {}),
      },
      include: {
        supplier: true,
        items:    { include: { inventoryItem: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/inventory/purchase-orders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

