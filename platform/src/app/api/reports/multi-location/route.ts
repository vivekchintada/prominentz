import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    // Resolve restaurant ID from session or fallback for dev/demo testing
    let restaurantId = session?.user?.restaurantId

    if (!restaurantId) {
      const fallbackRestaurant = await prisma.restaurant.findFirst()
      restaurantId = fallbackRestaurant?.id
    }

    if (!restaurantId) {
      return NextResponse.json({
        summary: { totalLocations: 0, grandTotalRevenue: 0, grandTotalOrders: 0, grandTotalLaborCost: 0, overallLaborPct: 0 },
        benchmarks: [],
      })
    }

    // Verify PRO tier access for Multi-Location analytics
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Multi-Location Analytics is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const locations = await prisma.location.findMany({
      where: { restaurantId },
      orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
    })

    const benchmarks = await Promise.all(
      locations.map(async (loc) => {
        // Revenue & Orders
        const salesAgg = await prisma.payment.aggregate({
          _sum: { total: true, subtotal: true, tax: true, tip: true },
          _count: { id: true },
          _avg: { total: true },
          where: {
            order: { table: { locationId: loc.id } },
            status: 'COMPLETED',
          },
        })

        // Labor Cost Calculation
        const shifts = await prisma.shift.findMany({
          where: { locationId: loc.id },
          include: { employee: { select: { hourlyRate: true } } },
        })

        let totalLaborCost = 0
        shifts.forEach((s) => {
          const rate = Number(s.employee?.hourlyRate || 0)
          const mins = s.clockIn && s.clockOut
            ? Math.max(0, Math.round((new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000) - (s.breakMinutes ?? 0))
            : 0
          totalLaborCost += (mins / 60) * rate
        })

        const totalRevenue = Number(salesAgg._sum.total || 0)
        const orderCount = salesAgg._count.id || 0
        const avgCheck = Number(salesAgg._avg.total || 0)
        const laborPct = totalRevenue > 0 ? Number(((totalLaborCost / totalRevenue) * 100).toFixed(1)) : 0

        // Active Staff On Shift
        const activeStaffCount = await prisma.shift.count({
          where: { locationId: loc.id, status: 'ACTIVE', clockOut: null },
        })

        // Low stock count
        const lowStockCount = await prisma.inventoryItem.count({
          where: { locationId: loc.id, currentStock: { lte: 10 } },
        })

        return {
          locationId: loc.id,
          locationName: loc.name,
          region: loc.region || 'Unassigned',
          isHeadquarters: loc.isHeadquarters,
          totalRevenue,
          orderCount,
          averageCheck: avgCheck,
          totalLaborCost: Number(totalLaborCost.toFixed(2)),
          laborPercentage: laborPct,
          activeStaffCount,
          lowStockCount,
        }
      })
    )

    // Calculate enterprise totals
    const grandTotalRevenue = benchmarks.reduce((acc, b) => acc + b.totalRevenue, 0)
    const grandTotalOrders = benchmarks.reduce((acc, b) => acc + b.orderCount, 0)
    const grandTotalLaborCost = benchmarks.reduce((acc, b) => acc + b.totalLaborCost, 0)
    const overallLaborPct = grandTotalRevenue > 0 ? Number(((grandTotalLaborCost / grandTotalRevenue) * 100).toFixed(1)) : 0

    return NextResponse.json({
      summary: {
        totalLocations: locations.length,
        grandTotalRevenue,
        grandTotalOrders,
        grandTotalLaborCost,
        overallLaborPct,
      },
      benchmarks,
    })
  } catch (error) {
    console.error('[GET /api/reports/multi-location]', error)
    return NextResponse.json({ error: 'Failed to fetch multi-location analytics' }, { status: 500 })
  }
}
