import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { matchPeriodOrders } from '@/lib/delivery-reconciliation'

// POST /api/reconciliation/periods/[id]/match
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
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
