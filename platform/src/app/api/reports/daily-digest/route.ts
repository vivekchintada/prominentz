import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateDailyDigestHtml } from '@/lib/email-templates/daily-digest'

export const dynamic = 'force-dynamic'

// ─── GET /api/reports/daily-digest ────────────────────────────────────────────
// Sends yesterday's performance digest to all OWNER + MANAGER users.
// Can be triggered manually or via a Vercel cron (vercel.json: {"crons": [{"path": "/api/reports/daily-digest","schedule": "0 1 * * *"}]})
export async function GET() {
  try {
    const session = await auth()
    // Allow unauthenticated for cron triggers; gate on a secret in production
    const cronSecret = process.env.CRON_SECRET
    if (!session?.user && cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Yesterday's window
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const start = new Date(yesterday); start.setHours(0, 0, 0, 0)
    const end   = new Date(yesterday); end.setHours(23, 59, 59, 999)

    // Fetch all active locations
    const locations = await prisma.location.findMany({
      include: {
        restaurant: { select: { id: true, name: true } },
      },
    })

    const Resend = (await import('resend')).Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'Prominentz <onboarding@resend.dev>'

    let totalSent = 0

    for (const location of locations) {
      // Revenue aggregates
      const revenueAgg = await prisma.payment.aggregate({
        _sum: { subtotal: true, tax: true, tip: true, total: true },
        _count: { id: true },
        _avg: { total: true },
        where: {
          order: { table: { locationId: location.id } },
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
      })

      // Top 5 menu items by quantity
      const topItemsRaw = await prisma.orderItem.groupBy({
        by: ['menuItemId'],
        _sum: { quantity: true },
        where: {
          order: {
            table: { locationId: location.id },
            status: 'PAID',
            createdAt: { gte: start, lte: end },
          },
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      })

      const menuItemIds = topItemsRaw.map((r) => r.menuItemId)
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds } },
        select: { id: true, name: true, price: true },
      })

      const topItems = topItemsRaw.map((r) => {
        const mi = menuItems.find((m) => m.id === r.menuItemId)
        return {
          name: mi?.name ?? 'Unknown',
          qty: r._sum.quantity ?? 0,
          revenue: (r._sum.quantity ?? 0) * Number(mi?.price ?? 0),
        }
      })

      // Void count
      const voidCount = await prisma.payment.count({
        where: {
          order: { table: { locationId: location.id } },
          status: 'VOIDED',
          createdAt: { gte: start, lte: end },
        },
      })

      // Labor cost
      const shifts = await prisma.shift.findMany({
        where: { locationId: location.id, scheduledStart: { gte: start, lte: end } },
        include: { employee: { select: { hourlyRate: true } } },
      })
      let laborCost = 0
      shifts.forEach((s) => {
        const rate = Number(s.employee?.hourlyRate ?? 0)
        const mins = s.clockIn && s.clockOut
          ? Math.max(0, (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000)
          : 0
        laborCost += (mins / 60) * rate
      })

      const totalRevenue = Number(revenueAgg._sum.total ?? 0)
      const laborPct = totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0

      const digestData = {
        restaurantName: location.restaurant.name,
        locationName: location.name,
        date: yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        totalRevenue,
        totalOrders: revenueAgg._count.id,
        avgCheck: Number(revenueAgg._avg.total ?? 0),
        totalTips: Number(revenueAgg._sum.tip ?? 0),
        totalTax: Number(revenueAgg._sum.tax ?? 0),
        voidCount,
        laborCost,
        laborPct,
        topItems,
      }

      const html = generateDailyDigestHtml(digestData)

      // Get all OWNER + MANAGER emails for this restaurant
      const managers = await prisma.user.findMany({
        where: {
          restaurantId: location.restaurant.id,
          role: { in: ['OWNER', 'MANAGER'] },
          isActive: true,
        },
        select: { email: true, name: true },
      })

      for (const manager of managers) {
        try {
          await resend.emails.send({
            from: fromEmail,
            to: manager.email,
            subject: `📊 Daily Report — ${location.restaurant.name} | ${digestData.date}`,
            html,
          })
          totalSent++
        } catch (emailErr) {
          console.error(`[DailyDigest] Failed to send to ${manager.email}:`, emailErr)
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent: totalSent })
  } catch (error) {
    console.error('[GET /api/reports/daily-digest]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
