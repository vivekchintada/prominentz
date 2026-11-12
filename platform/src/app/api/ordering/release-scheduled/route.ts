import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { fireOnlineOrder } from '@/lib/online-order-orchestration'
import { isAuthorizedCron } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'

// Vercel Cron calls GET. GET is cron-only so a link or prefetch can't trigger the sweep for a
// signed-in manager; managers use POST from the dashboard.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return releaseScheduled(req)
}

export async function POST(req: NextRequest) {
  return releaseScheduled(req)
}

async function releaseScheduled(req: NextRequest) {
  const session = await auth()
  const cronAllowed = isAuthorizedCron(req)

  if (!cronAllowed && (!session?.user?.restaurantId || !['OWNER', 'MANAGER'].includes(session.user.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // The cron sweeps every restaurant; a signed-in manager only ever touches their own.
  const tenantScope = cronAllowed ? {} : { table: { location: { restaurantId: session!.user.restaurantId } } }

  const now = new Date()
  // Coarse prefilter only. Each order is released at its own location's lead time below, and those
  // are configurable (a 60-minute delivery lead must be visible before it is 45 minutes out).
  const lookaheadWindow = new Date(now.getTime() + 24 * 60 * 60000)

  // 1. Release scheduled orders that have reached their kitchen prep lead time
  const scheduledOrders = await prisma.order.findMany({
    where: {
      ...tenantScope,
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
      ...tenantScope,
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
