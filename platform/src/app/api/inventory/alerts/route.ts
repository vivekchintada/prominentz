import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/inventory/alerts ───────────────────────────────────────────────
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

    const alerts = await prisma.inventoryAlert.findMany({
      where: { locationId, isRead: false },
      include: {
        inventoryItem: { select: { name: true, currentStock: true, minStock: true, unit: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('[GET /api/inventory/alerts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
