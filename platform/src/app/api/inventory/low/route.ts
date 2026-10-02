import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'

export const dynamic = 'force-dynamic'

// ─── GET /api/inventory/low ──────────────────────────────────────────────────
// Returns smart low-stock reorder suggestions using par stock, supplier lead time, and recent consumption
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

    const daysWindow = 14
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - daysWindow)

    const [items, transactions, suppliers] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { locationId: location.id },
        include: {
          purchaseOrderItems: {
            take: 1,
            orderBy: { purchaseOrder: { createdAt: 'desc' } },
            include: { purchaseOrder: { select: { supplierId: true } } },
          },
        },
        orderBy: { currentStock: 'asc' },
      }),
      prisma.inventoryTransaction.findMany({
        where: {
          inventoryItem: { locationId: location.id },
          type: 'DEPLETION_ORDER',
          createdAt: { gte: sinceDate },
        },
        select: { inventoryItemId: true, quantity: true },
      }),
      prisma.supplier.findMany({
        where: { locationId: location.id },
        select: { id: true, name: true, leadTimeDays: true },
      }),
    ])

    const supplierMap = new Map(suppliers.map((s) => [s.id, s]))

    const suggestions = items
      .map((item) => {
        // Calculate recent consumption
        const itemTx = transactions.filter((t) => t.inventoryItemId === item.id)
        const totalDepleted = itemTx.reduce((sum, t) => sum + Math.abs(t.quantity), 0)
        const dailyBurnRate = totalDepleted / daysWindow

        // Determine supplier lead time
        const recentSupplierId = item.purchaseOrderItems[0]?.purchaseOrder.supplierId
        const supplier = recentSupplierId ? supplierMap.get(recentSupplierId) : suppliers[0]
        const leadTimeDays = supplier?.leadTimeDays || 3

        // Estimated demand during the lead time window
        const leadTimeDemand = dailyBurnRate * leadTimeDays

        // Target par stock deficit
        const parDeficit = Math.max(0, item.parStock - item.currentStock)

        // Safety threshold: minStock or lead time demand
        const safetyThreshold = Math.max(item.minStock, leadTimeDemand)
        const isLow = item.currentStock <= safetyThreshold
        const isCritical = item.currentStock <= 0

        // Recommended reorder quantity: replenish to par + cover lead time
        const suggestedReorderQty = Math.ceil(parDeficit + leadTimeDemand)

        return {
          id:                  item.id,
          name:                item.name,
          category:            item.category || 'General',
          unit:                item.unit,
          currentStock:        item.currentStock,
          minStock:            item.minStock,
          parStock:            item.parStock,
          unitCost:            Number(item.unitCost),
          dailyBurnRate:       Number(dailyBurnRate.toFixed(2)),
          leadTimeDays,
          leadTimeDemand:      Number(leadTimeDemand.toFixed(2)),
          suggestedReorderQty: Math.max(suggestedReorderQty, item.minStock > 0 ? item.minStock : 5),
          estimatedCost:       Number((suggestedReorderQty * Number(item.unitCost)).toFixed(2)),
          isLow,
          isCritical,
          preferredSupplier:   supplier ? { id: supplier.id, name: supplier.name } : null,
        }
      })
      .filter((s) => s.isLow || s.isCritical)

    return NextResponse.json({
      count: suggestions.length,
      suggestions,
    })
  } catch (error) {
    console.error('[GET /api/inventory/low]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
