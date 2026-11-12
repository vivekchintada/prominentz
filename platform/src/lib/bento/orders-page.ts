import { prisma } from '@/lib/prisma'
import type { KdsStation } from '@prisma/client'
import { minutesBetween } from './time'
import { CHANNELS, channelOf, orderRef, orderStatusBadge, sourceName, type BadgeTone, type Channel } from './channels'

/** Everything the Orders · live board shows, from real records only. */
export interface OrdersBoard {
  openCount: number
  todayCount: number
  byChannel: { channel: Channel; open: number }[]
  needsYou: { id: string; title: string; ago: string; cta: string; href: string }[]
  today: { netSales: number; orders: number; avgTicket: number | null; avgPrepMin: number | null }
  recent: {
    id: string
    ref: string
    where: string
    items: number
    total: number
    status: { label: string; tone: BadgeTone }
    placedAt: Date
  }[]
  prep: { station: string; minutes: number }[]
  voids: { id: string; label: string; who: string; amount: number }[]
  voidCount: number
  voidTotal: number
}

export const EMPTY_ORDERS_BOARD: OrdersBoard = {
  openCount: 0,
  todayCount: 0,
  byChannel: CHANNELS.map((channel) => ({ channel, open: 0 })),
  needsYou: [],
  today: { netSales: 0, orders: 0, avgTicket: null, avgPrepMin: null },
  recent: [],
  prep: [],
  voids: [],
  voidCount: 0,
  voidTotal: 0,
}

const STATION_NAME: Record<KdsStation, string> = { HOT: 'Hot kitchen', COLD: 'Cold', BAR: 'Bar', EXPO: 'Expo' }
const OPEN_STATUSES = ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'READY', 'HOLD'] as const

export async function getOrdersBoard(locationId: string | null, todayStart: Date): Promise<OrdersBoard> {
  if (!locationId) return EMPTY_ORDERS_BOARD
  const now = new Date()
  const atLocation = { table: { locationId } }

  const [open, todayOrders, payments, tickets, orderVoids, paymentVoids, stations, paying, pending] = await Promise.all([
    prisma.order.findMany({
      where: { ...atLocation, status: { in: [...OPEN_STATUSES] } },
      select: { id: true, orderSource: true, fulfilmentType: true },
    }),
    prisma.order.findMany({
      where: { ...atLocation, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicOrderNumber: true,
        status: true,
        onlineStatus: true,
        orderSource: true,
        fulfilmentType: true,
        total: true,
        createdAt: true,
        readyAt: true,
        customerName: true,
        table: { select: { name: true } },
        items: { where: { status: { not: 'VOIDED' } }, select: { quantity: true } },
      },
    }),
    prisma.payment.findMany({
      where: { order: atLocation, status: 'COMPLETED', createdAt: { gte: todayStart } },
      select: { total: true, orderId: true },
    }),
    prisma.kdsTicket.findMany({
      where: { order: atLocation, createdAt: { gte: todayStart }, readyAt: { not: null } },
      select: { station: true, createdAt: true, readyAt: true },
    }),
    prisma.orderVoid.findMany({
      where: { order: atLocation, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reason: true, voidedByUser: { select: { name: true } }, order: { select: { id: true, publicOrderNumber: true, total: true } } },
    }),
    prisma.void.findMany({
      where: { payment: { order: atLocation }, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reason: true,
        refundAmount: true,
        voidedByUser: { select: { name: true } },
        payment: { select: { total: true, order: { select: { id: true, publicOrderNumber: true } } } },
      },
    }),
    prisma.kdsStationConfig.findMany({ where: { locationId }, select: { station: true, name: true } }),
    prisma.order.findMany({
      where: { ...atLocation, status: { notIn: ['PAID', 'VOIDED'] }, table: { locationId, status: 'PAYING' } },
      orderBy: { updatedAt: 'asc' },
      take: 3,
      select: { id: true, tableId: true, updatedAt: true, table: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { ...atLocation, onlineStatus: 'PENDING_ACCEPTANCE' },
      orderBy: { createdAt: 'asc' },
      take: 3,
      select: { id: true, publicOrderNumber: true, orderSource: true, createdAt: true, notes: true },
    }),
  ])

  // Open orders by channel
  const openBy = new Map<Channel, number>(CHANNELS.map((c) => [c, 0]))
  for (const o of open) {
    const c = channelOf(o.orderSource, o.fulfilmentType)
    openBy.set(c, (openBy.get(c) ?? 0) + 1)
  }

  // Needs you: bills first, then food waiting at the pass, then online orders to accept
  const needsYou: OrdersBoard['needsYou'] = []
  for (const p of paying) {
    needsYou.push({
      id: `bill-${p.id}`,
      title: `${p.table?.name ?? 'A table'} waiting for the bill`,
      ago: `${minutesBetween(p.updatedAt, now)} min`,
      cta: 'Take payment',
      href: `/pos?tableId=${p.tableId}&orderId=${p.id}`,
    })
  }
  const ready = todayOrders
    .filter((o) => o.status === 'READY' && o.readyAt)
    .sort((a, b) => a.readyAt!.getTime() - b.readyAt!.getTime())
  for (const o of ready) {
    if (needsYou.length >= 3) break
    needsYou.push({
      id: `ready-${o.id}`,
      title: `${o.table?.name ?? orderRef(o)}: food ready at the pass`,
      ago: `${minutesBetween(o.readyAt!, now)} min`,
      cta: 'Open order',
      href: '/kds',
    })
  }
  for (const o of pending) {
    if (needsYou.length >= 3) break
    needsYou.push({
      id: `accept-${o.id}`,
      title: `${sourceName(o.orderSource)} ${orderRef(o)} needs accepting`,
      ago: `${minutesBetween(o.createdAt, now)} min`,
      cta: 'Review',
      href: '/dashboard/online-orders',
    })
  }

  // Today so far
  const netSales = payments.reduce((s, p) => s + Number(p.total), 0)
  const paidOrders = new Set(payments.map((p) => p.orderId)).size
  const counted = todayOrders.filter((o) => o.status !== 'VOIDED')
  const prepMins = counted
    .filter((o) => o.readyAt)
    .map((o) => (o.readyAt!.getTime() - o.createdAt.getTime()) / 60000)
    .filter((m) => m > 0 && m < 240)

  // Prep time by station
  const stationName = new Map<KdsStation, string>(stations.map((s) => [s.station, s.name]))
  const byStation = new Map<KdsStation, number[]>()
  for (const t of tickets) {
    const m = (t.readyAt!.getTime() - t.createdAt.getTime()) / 60000
    if (!(m > 0 && m < 240)) continue
    const list = byStation.get(t.station) ?? []
    list.push(m)
    byStation.set(t.station, list)
  }
  const prep = [...byStation.entries()]
    .map(([station, list]) => ({
      station: stationName.get(station) || STATION_NAME[station],
      minutes: Math.round(list.reduce((a, b) => a + b, 0) / list.length),
    }))
    .sort((a, b) => b.minutes - a.minutes)

  // Voids and refunds
  const voids = [
    ...orderVoids.map((v) => ({
      id: v.id,
      label: `Void · ${orderRef(v.order)}${v.reason ? ` ${v.reason}` : ''}`,
      who: v.voidedByUser?.name ?? '',
      amount: Number(v.order.total),
    })),
    ...paymentVoids.map((v) => ({
      id: v.id,
      label: `Refund · ${orderRef(v.payment.order)}${v.reason ? ` ${v.reason}` : ''}`,
      who: v.voidedByUser?.name ?? '',
      amount: Number(v.refundAmount ?? v.payment.total),
    })),
  ]

  return {
    openCount: open.length,
    todayCount: counted.length,
    byChannel: CHANNELS.map((channel) => ({ channel, open: openBy.get(channel) ?? 0 })),
    needsYou,
    today: {
      netSales,
      orders: counted.length,
      avgTicket: paidOrders > 0 ? netSales / paidOrders : null,
      avgPrepMin: prepMins.length ? Math.round(prepMins.reduce((a, b) => a + b, 0) / prepMins.length) : null,
    },
    recent: todayOrders.slice(0, 6).map((o) => {
      const channel = channelOf(o.orderSource, o.fulfilmentType)
      const where =
        channel === 'dine'
          ? o.table?.name ?? 'Dine-in'
          : channel === 'qr'
            ? `QR · ${o.table?.name ?? 'table'}`
            : [sourceName(o.orderSource), o.customerName].filter(Boolean).join(' · ')
      return {
        id: o.id,
        ref: orderRef(o),
        where,
        items: o.items.reduce((s, i) => s + i.quantity, 0),
        total: Number(o.total),
        status: orderStatusBadge(o.status, o.onlineStatus),
        placedAt: o.createdAt,
      }
    }),
    prep,
    voids: voids.slice(0, 3),
    voidCount: voids.length,
    voidTotal: voids.reduce((s, v) => s + v.amount, 0),
  }
}
