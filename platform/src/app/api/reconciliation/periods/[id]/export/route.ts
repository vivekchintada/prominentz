import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { exportPeriodCsv } from '@/lib/delivery-reconciliation'

// GET /api/reconciliation/periods/[id]/export
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const csv = await exportPeriodCsv(id)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="reconciliation-${id}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: unknown) {
    console.error('GET /api/reconciliation/periods/[id]/export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
