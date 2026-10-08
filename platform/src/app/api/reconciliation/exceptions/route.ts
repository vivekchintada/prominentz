import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reconciliation/exceptions
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const periodId = req.nextUrl.searchParams.get('periodId')
    const resolved = req.nextUrl.searchParams.get('resolved')
    const type = req.nextUrl.searchParams.get('type')

    if (!periodId) return NextResponse.json({ error: 'periodId is required' }, { status: 400 })

    const exceptions = await prisma.reconciliationException.findMany({
      where: {
        periodId,
        ...(resolved !== null ? { isResolved: resolved === 'true' } : {}),
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(exceptions)
  } catch (error: unknown) {
    console.error('GET /api/reconciliation/exceptions error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
