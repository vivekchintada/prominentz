import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

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
