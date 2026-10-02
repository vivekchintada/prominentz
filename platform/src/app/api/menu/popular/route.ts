import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/menu/popular?locationId=xxx
// Returns top best-seller menuItem IDs for the given location (last 30 days)
// Public endpoint — no auth required (called by customer phone)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json({ popularItemIds: [] })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Find all orders from tables in this location
    const popularItems = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          table: { locationId },
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    })

    const popularItemIds = popularItems.map((p) => p.menuItemId)

    return NextResponse.json({ popularItemIds })
  } catch (err) {
    console.error('[GET /api/menu/popular]', err)
    // Graceful fallback — don't break the menu page
    return NextResponse.json({ popularItemIds: [] })
  }
}
