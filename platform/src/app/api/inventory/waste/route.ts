import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createWasteSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity:        z.number().positive(),
  reason:          z.enum(['SPOILED', 'EXPIRED', 'PREP_MISTAKE', 'DROPPED', 'CUSTOMER_COMPLAINT', 'OTHER']),
  notes:           z.string().optional().nullable(),
})

// ─── GET /api/inventory/waste ────────────────────────────────────────────────
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

    const logs = await prisma.wasteLog.findMany({
      where: { locationId: location.id },
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    let totalWasteCost = 0
    for (const log of logs) {
      totalWasteCost += Number(log.totalCost)
    }

    return NextResponse.json({
      logs,
      totalWasteCost: Number(totalWasteCost.toFixed(2)),
      count: logs.length,
    })
  } catch (error) {
    console.error('[GET /api/inventory/waste]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/inventory/waste ───────────────────────────────────────────────
// Logs spoilage/waste, depletes stock, and creates an auditable transaction
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

    const body = await req.json()
    const parsed = createWasteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { inventoryItemId, quantity, reason, notes } = parsed.data

    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, locationId: location.id },
    })
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    const unitCost = Number(item.unitCost)
    const totalCost = quantity * unitCost

    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement current stock
      const updatedItem = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          currentStock: { decrement: quantity },
        },
      })

      // 2. Post WASTE transaction
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId,
          type:     'WASTE',
          quantity: -quantity,
          actorId:  session.user.id,
          notes:    `Waste recorded [${reason}]: ${notes || 'No details provided'} ($${totalCost.toFixed(2)})`,
        },
      })

      // 3. Create WasteLog entry
      const wasteLog = await tx.wasteLog.create({
        data: {
          locationId:   location.id,
          inventoryItemId,
          quantity,
          unitCost,
          totalCost,
          reason,
          status:       'APPROVED',
          reportedById: session.user.id,
          notes:        notes ?? null,
        },
        include: {
          inventoryItem: { select: { name: true, unit: true } },
        },
      })

      return { wasteLog, currentStock: updatedItem.currentStock }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/waste]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
