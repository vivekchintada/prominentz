import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
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

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: { locationId },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: true,
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

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }
    if (!locationId) {
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
        inventoryItemId: item.inventoryItemId,
        quantity:        item.quantity,
        unitCost:        item.unitCost,
        totalCost:       lineTotal,
      }
    })

    const po = await prisma.purchaseOrder.create({
      data: {
        locationId,
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
        items: true,
      },
    })

    return NextResponse.json(po, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/purchase-orders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/inventory/purchase-orders ───────────────────────────────────
// Updates PO status (e.g. RECEIVED) and automatically increments stock
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
    const { status } = body
    if (!['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid PO status' }, { status: 400 })
    }

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 })
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {}),
      },
      include: { items: true, supplier: true },
    })

    // If status changed to RECEIVED, increment stock and log STOCK_IN transactions
    if (status === 'RECEIVED' && existing.status !== 'RECEIVED') {
      for (const item of existing.items) {
        await prisma.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            currentStock: { increment: item.quantity },
          },
        })

        await prisma.inventoryTransaction.create({
          data: {
            inventoryItemId: item.inventoryItemId,
            type:            'STOCK_IN',
            quantity:        item.quantity,
            actorId:         session.user.id,
            notes:           `Restock via Purchase Order ${existing.poNumber}`,
          },
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/inventory/purchase-orders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
