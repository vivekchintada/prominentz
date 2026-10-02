import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'

// GET /api/reconciliation/periods
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let locationId = req.nextUrl.searchParams.get('locationId')
    if (!locationId) {
      const loc = await resolveLocationContext(session.user.id, session.user.restaurantId)
      locationId = loc?.id || null
    }
    if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

    const periods = await prisma.reconciliationPeriod.findMany({
      where: { locationId },
      orderBy: { periodStart: 'desc' },
      include: {
        statements: {
          include: {
            statement: {
              select: {
                id: true,
                provider: { select: { name: true, slug: true } },
                lineCount: true,
              },
            },
          },
        },
        _count: { select: { exceptions: true } },
      },
    })

    return NextResponse.json(periods)
  } catch (error: any) {
    console.error('GET /api/reconciliation/periods error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/reconciliation/periods
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    let { locationId, name, periodStart, periodEnd, statementIds, notes } = body

    if (!locationId) {
      const loc = await resolveLocationContext(session.user.id, session.user.restaurantId)
      locationId = loc?.id || null
    }

    if (!locationId || !name || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'locationId, name, periodStart, and periodEnd are required' },
        { status: 400 }
      )
    }

    const period = await prisma.reconciliationPeriod.create({
      data: {
        locationId,
        name,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        notes,
        statements: statementIds?.length
          ? {
              create: statementIds.map((sid: string) => ({ statementId: sid })),
            }
          : undefined,
      },
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/reconciliation/periods error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
