import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reconciliation/periods/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const period = await prisma.reconciliationPeriod.findUnique({
      where: { id },
      include: {
        statements: {
          include: {
            statement: {
              include: {
                provider: { select: { id: true, name: true, slug: true } },
                lines: {
                  select: {
                    id: true,
                    externalOrderId: true,
                    restoOrderId: true,
                    matchedAt: true,
                    orderDate: true,
                    customerName: true,
                    grossAmount: true,
                    commission: true,
                    tax: true,
                    promotionAmount: true,
                    refundAmount: true,
                    adjustment: true,
                    netAmount: true,
                    paymentMethod: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        exceptions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })

    return NextResponse.json(period)
  } catch (error: any) {
    console.error('GET /api/reconciliation/periods/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
