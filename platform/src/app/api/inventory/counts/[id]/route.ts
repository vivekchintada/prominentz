import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchCountSchema = z.object({
  status: z.enum(['DRAFT', 'COMPLETED', 'CANCELLED']).optional(),
  notes:  z.string().optional().nullable(),
  items:  z.array(
    z.object({
      id:              z.string().min(1),
      countedQuantity: z.number().min(0),
      notes:           z.string().optional().nullable(),
    })
  ).optional(),
})

// ─── GET /api/inventory/counts/[id] ──────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const countSession = await prisma.stockCountSession.findFirst({
      where: { id, locationId: location.id },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
                unitCost: true,
                currentStock: true,
              },
            },
          },
          orderBy: { inventoryItem: { name: 'asc' } },
        },
      },
    })

    if (!countSession) {
      return NextResponse.json({ error: 'Stock count session not found' }, { status: 404 })
    }

    return NextResponse.json(countSession)
  } catch (error) {
    console.error('[GET /api/inventory/counts/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/inventory/counts/[id] ────────────────────────────────────────
// Updates count lines and/or finalizes the session with auditable stock adjustments
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const countSession = await prisma.stockCountSession.findFirst({
      where: { id, locationId: location.id },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    })

    if (!countSession) {
      return NextResponse.json({ error: 'Stock count session not found' }, { status: 404 })
    }

    if (countSession.status === 'COMPLETED') {
      return NextResponse.json({ error: 'This count session has already been completed and locked' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = patchCountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { status, notes, items } = parsed.data

    // 1. Update line item counts
    if (Array.isArray(items) && items.length > 0) {
      for (const line of items) {
        const existingLine = countSession.items.find((it) => it.id === line.id)
        if (!existingLine) continue

        const counted = line.countedQuantity
        const variance = counted - existingLine.expectedQuantity
        const unitCost = Number(existingLine.unitCost)
        const varianceCost = variance * unitCost

        await prisma.stockCountItem.update({
          where: { id: line.id },
          data: {
            countedQuantity: counted,
            variance,
            varianceCost,
            notes: line.notes ?? existingLine.notes,
          },
        })
      }
    }

    // 2. Finalize session (COMPLETED)
    if (status === 'COMPLETED') {
      // Re-fetch all lines after line updates
      const updatedLines = await prisma.stockCountItem.findMany({
        where: { stockCountSessionId: id },
        include: { inventoryItem: true },
      })

      // Run transactional adjustments
      await prisma.$transaction(async (tx) => {
        for (const line of updatedLines) {
          if (Math.abs(line.variance) > 0.0001) {
            // Update the live current stock to match physical count
            await tx.inventoryItem.update({
              where: { id: line.inventoryItemId },
              data:  { currentStock: line.countedQuantity },
            })

            // Post auditable adjustment transaction
            await tx.inventoryTransaction.create({
              data: {
                inventoryItemId: line.inventoryItemId,
                type:            'ADJUSTMENT',
                quantity:        line.variance,
                actorId:         session.user.id,
                notes:           `Stock count audit adjustment (${countSession.sessionNumber}): counted ${line.countedQuantity} vs expected ${line.expectedQuantity} ${line.inventoryItem.unit}`,
              },
            })
          }
        }

        await tx.stockCountSession.update({
          where: { id },
          data: {
            status:      'COMPLETED',
            completedAt: new Date(),
            notes:       notes ?? countSession.notes,
          },
        })
      })
    } else if (status === 'CANCELLED') {
      await prisma.stockCountSession.update({
        where: { id },
        data: { status: 'CANCELLED', notes: notes ?? countSession.notes },
      })
    } else if (notes !== undefined) {
      await prisma.stockCountSession.update({
        where: { id },
        data: { notes },
      })
    }

    const result = await prisma.stockCountSession.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, category: true } },
          },
        },
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PATCH /api/inventory/counts/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
