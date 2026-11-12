import { prisma } from '@/lib/prisma'
import type { OnlineOrderStatus, OrderSource } from '@prisma/client'
import { minutesBetween } from './time'
import { DAY_MS } from './time'
import { ONLINE_SOURCES, orderRef, sourceName } from './channels'

const LIVE: OnlineOrderStatus[] = ['PENDING_ACCEPTANCE', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']
const DEAD: OnlineOrderStatus[] = ['REJECTED', 'CANCELLED', 'PAYMENT_FAILED', 'REFUNDED']

const STATE_LABEL: Partial<Record<OnlineOrderStatus, string>> = {
  PENDING_ACCEPTANCE: 'New',
  ACCEPTED: 'Accepted',
  PREPARING: 'Cooking',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'On the way',
}

/** Everything the Delivery · apps and riders board shows. */
export interface DeliveryBoard {
  liveCount: number
  onTheWay: { id: string; ref: string; who: string; mins: number }[]
  queue: { id: string; label: string; minsLeft: number | null; late: boolean; state: string }[]
  apps: { name: string; detail: string; on: boolean }[]
  paused: boolean
  today: { live: number; sales: number; avgPrep: number | null; late: number; cancelled: number }
  commission: { total: number; gross: number; byApp: { name: string; amount: number }[] } | null
  recent: { id: string; ref: string; app: string; who: string; total: number; state: string }[]
  soldOut: { id: string; name: string }[]
  soldOutCount: number
}

export const EMPTY_DELIVERY_BOARD: DeliveryBoard = {
  liveCount: 0,
  onTheWay: [],
  queue: [],
  apps: [],
  paused: false,
  today: { live: 0, sales: 0, avgPrep: null, late: 0, cancelled: 0 },
  commission: null,
  recent: [],
  soldOut: [],
  soldOutCount: 0,
}

export async function getDeliveryBoard(restaurantId: string, locationId: string | null, todayStart: Date): Promise<DeliveryBoard> {
  if (!locationId) return EMPTY_DELIVERY_BOARD
  const now = new Date()
  const atLocation = { table: { locationId } }

  const [live, todayOrders, config, providers, statements, soldOut] = await Promise.all([
    prisma.order.findMany({
      where: { ...atLocation, orderSource: { in: ONLINE_SOURCES }, onlineStatus: { in: LIVE } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        publicOrderNumber: true,
        orderSource: true,
        onlineStatus: true,
        customerName: true,
        createdAt: true,
        updatedAt: true,
        estimatedReadyAt: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.findMany({
      where: { ...atLocation, orderSource: { in: ONLINE_SOURCES }, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicOrderNumber: true,
        orderSource: true,
        onlineStatus: true,
        customerName: true,
        total: true,
        createdAt: true,
        acceptedAt: true,
        readyAt: true,
        estimatedReadyAt: true,
      },
    }),
    prisma.onlineOrderingConfig.findUnique({ where: { locationId } }),
    prisma.deliveryProvider.findMany({ where: { locationId }, orderBy: { name: 'asc' }, select: { name: true, slug: true, isActive: true } }),
    prisma.deliveryStatement.findMany({
      where: { locationId, periodEnd: { gte: new Date(todayStart.getTime() - 30 * DAY_MS) } },
      select: { totalCommission: true, totalGross: true, provider: { select: { name: true } } },
    }),
    prisma.menuItem.findMany({
      where: { category: { restaurantId, OR: [{ locationId }, { locationId: null }] }, OR: [{ is86d: true }, { isAvailable: false }] },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const items = (o: { items: { quantity: number }[] }) => o.items.reduce((s, i) => s + i.quantity, 0)

  const onTheWay = live
    .filter((o) => o.onlineStatus === 'OUT_FOR_DELIVERY')
    .map((o) => ({ id: o.id, ref: orderRef(o), who: o.customerName ?? sourceName(o.orderSource), mins: minutesBetween(o.updatedAt, now) }))

  const queue = live
    .filter((o) => o.onlineStatus !== 'OUT_FOR_DELIVERY')
    .slice(0, 4)
    .map((o) => {
      const left = o.estimatedReadyAt ? Math.round((o.estimatedReadyAt.getTime() - now.getTime()) / 60000) : null
      return {
        id: o.id,
        label: `${sourceName(o.orderSource)} ${orderRef(o)} · ${items(o)} item${items(o) === 1 ? '' : 's'}`,
        minsLeft: left,
        late: left !== null && left < 0 && o.onlineStatus !== 'READY',
        state: STATE_LABEL[o.onlineStatus!] ?? 'Live',
      }
    })

  // Apps: each connected provider plus our own online ordering, with today's order count
  const countBy = new Map<OrderSource, number>()
  for (const o of todayOrders) countBy.set(o.orderSource, (countBy.get(o.orderSource) ?? 0) + 1)
  const ownCount = (countBy.get('WEB_PICKUP') ?? 0) + (countBy.get('WEB_DELIVERY') ?? 0)
  const appCount = (countBy.get('DELIVERY_DOORDASH') ?? 0) + (countBy.get('DELIVERY_UBEREATS') ?? 0) + (countBy.get('DELIVERY_OTHER') ?? 0)
  const paused = Boolean(config?.isPaused)
  const apps: DeliveryBoard['apps'] = providers.map((p) => ({
    name: p.name,
    detail: p.isActive ? 'Connected' : 'Switched off',
    on: p.isActive,
  }))
  if (providers.length > 0 || appCount > 0) {
    apps.push({ name: 'Orders from apps', detail: `${appCount} today`, on: appCount > 0 })
  }
  apps.push({
    name: 'Own online ordering',
    detail: !config ? 'Not set up' : paused ? `Paused${config.pauseReason ? ` · ${config.pauseReason}` : ''}` : `${ownCount} today`,
    on: Boolean(config?.isEnabled && !paused),
  })

  // Today
  const kept = todayOrders.filter((o) => !o.onlineStatus || !DEAD.includes(o.onlineStatus))
  const prep = kept
    .filter((o) => o.readyAt)
    .map((o) => (o.readyAt!.getTime() - (o.acceptedAt ?? o.createdAt).getTime()) / 60000)
    .filter((m) => m > 0 && m < 240)
  const late = kept.filter((o) => o.readyAt && o.estimatedReadyAt && o.readyAt > o.estimatedReadyAt).length

  // Commission from imported statements
  let commission: DeliveryBoard['commission'] = null
  if (statements.length > 0) {
    const byApp = new Map<string, number>()
    let total = 0
    let gross = 0
    for (const s of statements) {
      total += s.totalCommission
      gross += s.totalGross
      byApp.set(s.provider.name, (byApp.get(s.provider.name) ?? 0) + s.totalCommission)
    }
    commission = { total, gross, byApp: [...byApp.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount) }
  }

  return {
    liveCount: live.length,
    onTheWay: onTheWay.slice(0, 3),
    queue,
    apps,
    paused,
    today: {
      live: live.length,
      sales: kept.reduce((s, o) => s + Number(o.total), 0),
      avgPrep: prep.length ? Math.round(prep.reduce((a, b) => a + b, 0) / prep.length) : null,
      late,
      cancelled: todayOrders.length - kept.length,
    },
    commission,
    recent: todayOrders.slice(0, 5).map((o) => ({
      id: o.id,
      ref: orderRef(o),
      app: sourceName(o.orderSource),
      who: o.customerName ?? '',
      total: Number(o.total),
      state: o.onlineStatus ? STATE_LABEL[o.onlineStatus] ?? o.onlineStatus.charAt(0) + o.onlineStatus.slice(1).replace(/_/g, ' ').toLowerCase() : 'Placed',
    })),
    soldOut: soldOut.slice(0, 5),
    soldOutCount: soldOut.length,
  }
}
