import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    let restaurantId = session?.user?.restaurantId
    if (!restaurantId) {
      const fb = await prisma.restaurant.findFirst()
      restaurantId = fb?.id
    }
    if (!restaurantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })
    }

    const customers = await prisma.customer.findMany({
      where: { restaurantId },
      include: { tier: true },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const segments = {
      ALL: customers,
      NEW: customers.filter((c) => c.totalVisits <= 1 && c.createdAt >= thirtyDaysAgo),
      REPEAT: customers.filter((c) => c.totalVisits >= 2),
      HIGH_VALUE: customers.filter((c) => Number(c.lifetimeSpend) >= 200 || c.tierId !== null),
      LAPSED: customers.filter((c) => c.totalVisits >= 1 && (!c.lastVisitAt || c.lastVisitAt < sixtyDaysAgo)),
      BIRTHDAY: customers.filter((c) => c.birthDate && new Date(c.birthDate).getMonth() === now.getMonth()),
      DIETARY: customers.filter((c) => Array.isArray(c.allergyTags) && (c.allergyTags as any[]).length > 0),
    }

    const summary = Object.entries(segments).map(([key, list]) => ({
      key,
      count: list.length,
      sample: list.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalVisits: c.totalVisits,
        lifetimeSpend: Number(c.lifetimeSpend),
        tier: c.tier?.name || null,
      })),
    }))

    return NextResponse.json({ summary, totalCustomers: customers.length })
  } catch (err) {
    console.error('[GET /api/customers/segments]', err)
    return NextResponse.json({ error: 'Failed to fetch customer segments' }, { status: 500 })
  }
}
