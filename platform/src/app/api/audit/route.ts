import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/audit ───────────────────────────────────────────────────────────
// Returns paginated audit log for the restaurant. OWNER/MANAGER only.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not resolved' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit   = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
    const action  = searchParams.get('action') ?? undefined
    const actorId = searchParams.get('actorId') ?? undefined
    const startDate = searchParams.get('startDate')
    const endDate   = searchParams.get('endDate')

    const where: Record<string, unknown> = { restaurantId }
    if (action) where.action = action
    if (actorId) where.actorId = actorId
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate   ? { lte: new Date(endDate)   } : {}),
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/audit]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
