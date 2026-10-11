import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { recordPointsTransaction } from '@/lib/customer-crm'
import { PointsLedgerType } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Adjustments require Manager or Owner role
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Only managers can manually adjust points' }, { status: 403 })
    }

    const { customerId, pointsChange, reason } = await req.json()

    if (!customerId || pointsChange === undefined || !reason?.trim()) {
      return NextResponse.json(
        { error: 'Customer ID, points change amount, and mandatory reason are required.' },
        { status: 400 }
      )
    }

    const result = await recordPointsTransaction({
      customerId,
      type: PointsLedgerType.MANUAL_ADJUSTMENT,
      pointsChange: Number(pointsChange),
      reason: reason.trim(),
      actorId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      newBalance: result.customer.pointsBalance,
      ledgerEntry: result.ledger,
    })
  } catch (err: any) {
    console.error('[POST /api/loyalty/adjust]', err)
    return NextResponse.json({ error: err?.message || 'Failed to adjust points' }, { status: 500 })
  }
}
