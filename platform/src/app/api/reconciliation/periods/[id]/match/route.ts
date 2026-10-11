import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { matchPeriodOrders } from '@/lib/delivery-reconciliation'
import { prisma } from '@/lib/prisma'

// POST /api/reconciliation/periods/[id]/match
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const period = await prisma.reconciliationPeriod.findFirst({
      where: {
        id,
        location: { restaurantId: session.user.restaurantId },
      },
      select: { id: true },
    })
    if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    const result = await matchPeriodOrders(id)

    return NextResponse.json({
      success: true,
      matched: result.matched,
      unmatched: result.unmatched,
      exceptions: result.exceptions,
    })
  } catch (error: any) {
    console.error('POST /api/reconciliation/periods/[id]/match error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
