import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { fireOnlineOrder } from '@/lib/online-order-orchestration'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  const cronAllowed =
    process.env.CRON_SECRET &&
    req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`

  if (!cronAllowed && (!session?.user || !['OWNER', 'MANAGER'].includes(session.user.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const lookaheadWindow = new Date(now.getTime() + 45 * 60000) // 45-minute default lead time window

  // 1. Release scheduled orders that have reached their kitchen prep lead time
  const scheduledOrders = await prisma.order.findMany({
    where: {
      onlineStatus: 'ACCEPTED',
      scheduledFor: { lte: lookaheadWindow },
      tickets: { none: {} }, // Ensure order hasn't already been fired to KDS (idempotent / release once)
    },
    include: {
      table: {
        include: {
          location: {
            include: { onlineOrderingConfig: true },
          },
        },
      },
    },
  })

  const released: string[] = []
  for (const order of scheduledOrders) {
    const leadMinutes =
      order.fulfilmentType === 'DELIVERY'
        ? order.table.location.onlineOrderingConfig?.deliveryLeadMinutes ?? 45
        : order.table.location.onlineOrderingConfig?.pickupLeadMinutes ?? 20

    const triggerTime = new Date(order.scheduledFor!.getTime() - leadMinutes * 60000)

    if (now >= triggerTime) {
      try {
        await fireOnlineOrder(order.id, session?.user?.id || 'CRON_SCHEDULER')
        released.push(order.id)
      } catch (err) {
        console.error(`[Release Scheduled Worker] Failed to fire order ${order.id}:`, err)
      }
    }
  }

  // 2. Abandoned draft cleanup: Expire unpaid pending drafts older than 2 hours
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60000)
  const expiredDrafts = await prisma.order.updateMany({
    where: {
      onlineStatus: 'PAYMENT_PENDING',
      createdAt: { lt: twoHoursAgo },
    },
    data: {
      onlineStatus: 'CANCELLED',
      status: 'VOIDED',
    },
  })

  return NextResponse.json({
    releasedCount: released.length,
    releasedOrderIds: released,
    expiredDraftCount: expiredDrafts.count,
    timestamp: now.toISOString(),
  })
}
