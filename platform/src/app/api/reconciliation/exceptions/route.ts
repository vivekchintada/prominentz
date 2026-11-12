import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reconciliation/exceptions
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const periodId = req.nextUrl.searchParams.get('periodId')
    const resolved = req.nextUrl.searchParams.get('resolved')
    const type = req.nextUrl.searchParams.get('type')

    if (!periodId) return NextResponse.json({ error: 'periodId is required' }, { status: 400 })

    const exceptions = await prisma.reconciliationException.findMany({
      where: {
        periodId,
        period: { location: { restaurantId: session.user.restaurantId } },
        ...(resolved !== null ? { isResolved: resolved === 'true' } : {}),
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(exceptions)
  } catch (error: any) {
    console.error('GET /api/reconciliation/exceptions error:', error)
    return NextResponse.json({ error: 'Reconciliation request failed' }, { status: 500 })
  }
}
