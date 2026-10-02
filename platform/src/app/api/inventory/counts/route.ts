import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSessionSchema = z.object({
  notes: z.string().optional().nullable(),
})

// ─── GET /api/inventory/counts ───────────────────────────────────────────────
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

    const sessions = await prisma.stockCountSession.findMany({
      where: { locationId: location.id },
      include: {
        items: {
          include: {
            inventoryItem: { select: { name: true, unit: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const summary = sessions.map((s) => {
      let totalVarianceValue = 0
      let discrepancyCount = 0

      for (const item of s.items) {
        const lineVariance = Number(item.varianceCost)
        totalVarianceValue += lineVariance
        if (Math.abs(item.variance) > 0.001) {
          discrepancyCount += 1
        }
      }

      return {
        id:                 s.id,
        sessionNumber:      s.sessionNumber,
        status:             s.status,
        startedAt:          s.startedAt,
        completedAt:        s.completedAt,
        notes:              s.notes,
        totalItemsCounted:  s.items.length,
        discrepancyCount,
        totalVarianceValue: Number(totalVarianceValue.toFixed(2)),
      }
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[GET /api/inventory/counts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/inventory/counts ──────────────────────────────────────────────
// Starts a new physical inventory stock count session
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = createSessionSchema.safeParse(body)
    const notes = parsed.success ? parsed.data.notes : null

    // Snapshot all active inventory items for this location
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { locationId: location.id },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    if (inventoryItems.length === 0) {
      return NextResponse.json({ error: 'No inventory items exist to count' }, { status: 400 })
    }

    // Generate Session Number (SC-YYYYMMDD-XXXX)
    const dateTag = new Date().toISOString().substring(0, 10).replace(/-/g, '')
    const rand = Math.floor(1000 + Math.random() * 9000)
    const sessionNumber = `SC-${dateTag}-${rand}`

    const countSession = await prisma.stockCountSession.create({
      data: {
        locationId:    location.id,
        sessionNumber,
        status:        'DRAFT',
        createdById:   session.user.id,
        notes:         notes ?? null,
        items: {
          create: inventoryItems.map((item) => ({
            inventoryItemId:  item.id,
            expectedQuantity: item.currentStock,
            countedQuantity:  item.currentStock, // initialize with expected
            variance:         0,
            unitCost:         item.unitCost,
            varianceCost:     0,
          })),
        },
      },
      include: {
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, category: true, unitCost: true } },
          },
        },
      },
    })

    return NextResponse.json(countSession, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/counts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
