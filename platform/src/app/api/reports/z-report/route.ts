import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/reports/z-report ────────────────────────────────────────────────
// End-of-Day Financial Closing & Cash Drawer Reconciliation Z-Report
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const locationIdParam = searchParams.get('locationId')
    const dateParam = searchParams.get('date') // YYYY-MM-DD format

    // Resolve location
    let locationId: string | null = locationIdParam || null
    if (!locationId) {
      const fb = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = fb?.id || null
    }

    if (!locationId) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Determine target day start/end (default to today UTC or provided date)
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // Fetch all completed payments for this day and location
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'COMPLETED',
        order: {
          table: { locationId },
        },
      },
      include: {
        order: {
          select: {
            guestCount: true,
            createdAt: true,
            updatedAt: true,
            status: true,
          },
        },
        splits: true,
      },
    })

    // Fetch all voids for this day
    const voids = await prisma.void.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        payment: {
          order: {
            table: { locationId },
          },
        },
      },
    })

    // Calculate Sales Totals
    let grossSales = 0
    let taxCollected = 0
    let tipsCollected = 0
    let totalSettled = 0

    // Tender Method Totals
    let cashSales = 0
    let cardSales = 0
    let applePaySales = 0
    let otherSales = 0

    for (const p of payments) {
      grossSales += Number(p.subtotal || 0)
      taxCollected += Number(p.tax || 0)
      tipsCollected += Number(p.tip || 0)
      totalSettled += Number(p.total || 0)

      if (p.splits && p.splits.length > 0) {
        for (const s of p.splits) {
          const sTotal = Number(s.total || 0)
          if (s.method === 'CASH') cashSales += sTotal
          else if (s.method === 'CARD') cardSales += sTotal
          else if (s.method === 'APPLE_PAY') applePaySales += sTotal
          else otherSales += sTotal
        }
      } else {
        const pTotal = Number(p.total || 0)
        if (p.method === 'CASH') cashSales += pTotal
        else if (p.method === 'CARD') cardSales += pTotal
        else if (p.method === 'APPLE_PAY') applePaySales += pTotal
        else otherSales += pTotal
      }
    }

    const totalVoidsAmount = voids.reduce((sum, v) => sum + Number(v.refundAmount || 0), 0)

    // Guests & Turn Times
    const totalGuests = payments.reduce((sum, p) => sum + (p.order?.guestCount || 1), 0)
    const avgSpendPerGuest = totalGuests > 0 ? (totalSettled / totalGuests) : 0

    // Opening Drawer Float Default (Standard $200.00 float)
    const openingFloat = 200.00
    const expectedCashInDrawer = openingFloat + cashSales

    return NextResponse.json({
      locationId,
      date: startOfDay.toISOString().split('T')[0],
      financials: {
        grossSales: Number(grossSales.toFixed(2)),
        taxCollected: Number(taxCollected.toFixed(2)),
        tipsCollected: Number(tipsCollected.toFixed(2)),
        voidsAmount: Number(totalVoidsAmount.toFixed(2)),
        voidsCount: voids.length,
        netRevenue: Number(totalSettled.toFixed(2)),
      },
      tenders: {
        cash: Number(cashSales.toFixed(2)),
        card: Number(cardSales.toFixed(2)),
        applePay: Number(applePaySales.toFixed(2)),
        other: Number(otherSales.toFixed(2)),
        totalTenders: Number((cashSales + cardSales + applePaySales + otherSales).toFixed(2)),
      },
      cashReconciliation: {
        openingFloat: Number(openingFloat.toFixed(2)),
        cashSales: Number(cashSales.toFixed(2)),
        expectedCashInDrawer: Number(expectedCashInDrawer.toFixed(2)),
      },
      operations: {
        totalOrders: payments.length,
        totalGuests,
        avgSpendPerGuest: Number(avgSpendPerGuest.toFixed(2)),
      },
    })
  } catch (error: any) {
    console.error('[GET /api/reports/z-report]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
