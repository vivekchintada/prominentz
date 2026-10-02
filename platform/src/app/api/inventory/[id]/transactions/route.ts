import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'

// ─── GET /api/inventory/[id]/transactions ─────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: inventoryItemId } = await params

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }

    // Verify item belongs to this location
    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, locationId },
    })
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { inventoryItemId },
      orderBy: { createdAt: 'desc' },
      take: 100, // safety limit
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('[GET /api/inventory/:id/transactions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const transactionSchema = z.object({
  type: z.enum(['STOCK_IN', 'WASTE', 'ADJUSTMENT']),
  quantity: z.coerce.number().positive(),
  adjustmentDirection: z.enum(['ADD', 'REMOVE']).optional(),
  notes: z.string().trim().max(300).optional(),
})

// ─── POST /api/inventory/[id]/transactions ────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const parsed = transactionSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    const { id } = await params
    const existing = await prisma.inventoryItem.findFirst({ where: { id, locationId: location.id } })
    if (!existing) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })

    const sign = parsed.data.type === 'STOCK_IN'
      ? 1
      : parsed.data.type === 'WASTE'
        ? -1
        : parsed.data.adjustmentDirection === 'ADD' ? 1 : -1
    const quantity = parsed.data.quantity * sign
    const nextStock = Math.max(0, existing.currentStock + quantity)

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id },
        data: { currentStock: nextStock },
      })
      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          type: parsed.data.type,
          quantity,
          actorId: session.user.id,
          notes: parsed.data.notes || null,
        },
      })
      if (nextStock <= item.minStock) {
        await tx.inventoryAlert.create({
          data: {
            inventoryItemId: id,
            locationId: location.id,
            type: nextStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            message: `${item.name} is at ${nextStock} ${item.unit}`,
          },
        })
      }
      return { item, transaction }
    })

    return NextResponse.json({
      item: { ...result.item, unitCost: Number(result.item.unitCost) },
      transaction: result.transaction,
    })
  } catch (error) {
    console.error('[POST /api/inventory/:id/transactions]', error)
    return NextResponse.json({ error: 'Unable to record stock movement' }, { status: 500 })
  }
}

