import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { lockPeriod } from '@/lib/delivery-reconciliation'

// POST /api/reconciliation/periods/[id]/lock
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await lockPeriod(id, session.user.id)

    return NextResponse.json({ success: true, message: 'Period locked successfully' })
  } catch (error: any) {
    console.error('POST /api/reconciliation/periods/[id]/lock error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
