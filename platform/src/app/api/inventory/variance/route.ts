import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'

export const dynamic = 'force-dynamic'

// ─── GET /api/inventory/variance ─────────────────────────────────────────────
// Reconciles theoretical ingredient consumption against actual stock & transactions
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    const [items, transactions, wasteLogs] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { locationId: location.id },
        include: {
          recipes: {
            include: {
              menuItem: { select: { name: true, is86d: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.inventoryTransaction.findMany({
        where: {
          inventoryItem: { locationId: location.id },
          createdAt: { gte: sinceDate },
        },
      }),
      prisma.wasteLog.findMany({
        where: {
          locationId: location.id,
          createdAt: { gte: sinceDate },
        },
      }),
    ])

    const analysis = items.map((item) => {
      const itemTx = transactions.filter((t) => t.inventoryItemId === item.id)
      const itemWaste = wasteLogs.filter((w) => w.inventoryItemId === item.id)

      let totalStockIn = 0
      let totalDepletedOrders = 0
      let totalAdjustments = 0

      for (const tx of itemTx) {
        if (tx.type === 'STOCK_IN') {
          totalStockIn += Math.abs(tx.quantity)
        } else if (tx.type === 'DEPLETION_ORDER') {
          totalDepletedOrders += Math.abs(tx.quantity)
        } else if (tx.type === 'ADJUSTMENT') {
          totalAdjustments += tx.quantity
        }
      }

      const totalRecordedWaste = itemWaste.reduce((sum, w) => sum + w.quantity, 0)
      const unitCost = Number(item.unitCost)

      // Variance is captured by adjustments posted from stock counts
      const varianceQty = totalAdjustments
      const varianceCost = varianceQty * unitCost

      return {
        id:                  item.id,
        name:                item.name,
        category:            item.category || 'General',
        unit:                item.unit,
        unitCost,
        currentStock:        item.currentStock,
        parStock:            item.parStock,
        totalStockIn:        Number(totalStockIn.toFixed(2)),
        theoreticalDepleted: Number(totalDepletedOrders.toFixed(2)),
        recordedWaste:       Number(totalRecordedWaste.toFixed(2)),
        varianceQty:         Number(varianceQty.toFixed(2)),
        varianceCost:        Number(varianceCost.toFixed(2)),
        recipesCount:        item.recipes.length,
      }
    })

    return NextResponse.json({
      periodDays: days,
      since: sinceDate.toISOString(),
      items: analysis,
    })
  } catch (error) {
    console.error('[GET /api/inventory/variance]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
