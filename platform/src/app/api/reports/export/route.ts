import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/reports/export ──────────────────────────────────────────────────
// Returns downloadable CSV file for financial and labor metrics
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam   = searchParams.get('endDate')

    const defaultStart = new Date(); defaultStart.setDate(defaultStart.getDate() - 30); defaultStart.setHours(0, 0, 0, 0)
    const defaultEnd   = new Date(); defaultEnd.setHours(23, 59, 59, 999)

    let start: Date
    let end: Date

    if (startDateParam) {
      const [y, m, d] = startDateParam.split('T')[0].split('-').map(Number)
      start = new Date(y, m - 1, d, 0, 0, 0, 0)
    } else {
      start = defaultStart
    }

    if (endDateParam) {
      const [y, m, d] = endDateParam.split('T')[0].split('-').map(Number)
      end = new Date(y, m - 1, d, 23, 59, 59, 999)
    } else {
      end = defaultEnd
    }

    // Fetch payments
    const payments = await prisma.payment.findMany({
      where: {
        order: { table: { locationId } },
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        order: {
          select: {
            guestCount: true,
            server: { select: { name: true } },
            table: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Construct CSV content
    const csvRows: string[] = []

    csvRows.push('PROMINENTZ — FINANCIAL & OPERATIONS REPORT')
    csvRows.push(`Date Range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`)
    csvRows.push('')

    csvRows.push('TRANSACTION DETAILS')
    csvRows.push('Payment ID,Date/Time,Table,Server,Guests,Subtotal,Tax,Tip,Total,Method')

    payments.forEach((p) => {
      const dateStr = new Date(p.createdAt).toLocaleString().replace(/,/g, '')
      const table   = p.order.table.name.replace(/,/g, '')
      const server  = (p.order.server?.name || 'N/A').replace(/,/g, '')
      csvRows.push(
        `${p.id},"${dateStr}",${table},${server},${p.order.guestCount},${p.subtotal},${p.tax},${p.tip},${p.total},${p.method}`
      )
    })

    const csvData = csvRows.join('\n')

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="resto_analytics_${start.toISOString().substring(0, 10)}_to_${end.toISOString().substring(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/reports/export]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
