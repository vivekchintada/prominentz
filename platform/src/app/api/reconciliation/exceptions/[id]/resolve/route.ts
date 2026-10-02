import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// POST /api/reconciliation/exceptions/[id]/resolve
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { resolutionNote } = body

    const exception = await prisma.reconciliationException.findUnique({ where: { id } })
    if (!exception) return NextResponse.json({ error: 'Exception not found' }, { status: 404 })
    if (exception.isResolved) return NextResponse.json({ error: 'Exception is already resolved' }, { status: 400 })

    const updated = await prisma.reconciliationException.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        resolutionNote: resolutionNote || 'Manually resolved',
      },
    })

    // Decrement exceptionCount on the period
    await prisma.reconciliationPeriod.update({
      where: { id: exception.periodId },
      data: { exceptionCount: { decrement: 1 } },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('POST /api/reconciliation/exceptions/[id]/resolve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
