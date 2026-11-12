import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { exportPeriodCsv } from '@/lib/delivery-reconciliation'
import { prisma } from '@/lib/prisma'

// GET /api/reconciliation/periods/[id]/export
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const owned = await prisma.reconciliationPeriod.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
      select: { id: true },
    })
    if (!owned) return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    const csv = await exportPeriodCsv(id)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="reconciliation-${id}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('GET /api/reconciliation/periods/[id]/export error:', error)
    return NextResponse.json({ error: 'Failed to export reconciliation period' }, { status: 500 })
  }
}
