import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { minutesBetween } from './time'
import { DAY_MS } from './time'
import { QR_SOURCES, orderRef } from './channels'

/** Everything the QR ordering board shows. */
export interface QrBoard {
  qrSharePct: number | null
  table: { name: string; url: string; svg: string } | null
  tableCount: number
  waiting: { id: string; ref: string; table: string; items: number; total: number; note: string | null; ago: number }[]
  today: { orders: number; avgTicket: number | null; paidOnlinePct: number | null; dineIn: number }
  options: { name: string; detail: string; on: boolean }[]
  calls: { id: string; message: string; ago: number; table: string | null }[]
  topItems: { id: string; name: string; sold: number }[]
}

export const EMPTY_QR_BOARD: QrBoard = {
  qrSharePct: null,
  table: null,
  tableCount: 0,
  waiting: [],
  today: { orders: 0, avgTicket: null, paidOnlinePct: null, dineIn: 0 },
  options: [],
  calls: [],
  topItems: [],
}

export async function getQrBoard(restaurantId: string, locationId: string | null, todayStart: Date, origin: string): Promise<QrBoard> {
  if (!locationId) return EMPTY_QR_BOARD
  const now = new Date()
  const atLocation = { table: { locationId } }

  const [tables, waiting, todayOrders, config, restaurant, tasks, top] = await Promise.all([
    prisma.table.findMany({ where: { locationId }, select: { id: true, name: true } }),
    prisma.order.findMany({
      where: { ...atLocation, orderSource: { in: QR_SOURCES }, onlineStatus: 'PENDING_ACCEPTANCE' },
      orderBy: { createdAt: 'asc' },
      take: 3,
      select: {
        id: true,
        publicOrderNumber: true,
        total: true,
        notes: true,
        createdAt: true,
        table: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.findMany({
      where: { ...atLocation, status: { not: 'VOIDED' }, createdAt: { gte: todayStart }, orderSource: { in: ['POS', ...QR_SOURCES] }, OR: [{ fulfilmentType: null }, { fulfilmentType: 'DINE_IN' }] },
      select: { orderSource: true, total: true, paymentStatus: true },
    }),
    prisma.onlineOrderingConfig.findUnique({ where: { locationId } }),
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { settings: true } }),
    prisma.task.findMany({
      where: { locationId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, message: true, createdAt: true, tableId: true },
    }),
    prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      where: {
        status: { not: 'VOIDED' },
        order: { ...atLocation, orderSource: { in: QR_SOURCES }, status: { not: 'VOIDED' }, createdAt: { gte: new Date(todayStart.getTime() - 6 * DAY_MS) } },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 4,
    }),
  ])

  // A sample code for the first table, the same link the QR studio prints
  const first = [...tables].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0]
  let table: QrBoard['table'] = null
  if (first) {
    const url = `${origin}/table/${locationId}/${first.id}`
    const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#141416', light: '#FFFFFF' } })
    table = { name: first.name, url, svg }
  }

  const qr = todayOrders.filter((o) => QR_SOURCES.includes(o.orderSource))
  const qrTotal = qr.reduce((s, o) => s + Number(o.total), 0)
  const paidOnline = qr.filter((o) => o.paymentStatus === 'PAID').length

  const store = ((restaurant?.settings as Record<string, unknown> | null)?.store ?? {}) as Record<string, unknown>
  const flag = (k: string) => store[k] !== false

  const options: QrBoard['options'] = [
    { name: 'QR menu', detail: 'Guests can see the menu by scanning', on: flag('enableQrMenu') },
    { name: 'Order from the table', detail: 'Guests send orders from their phone', on: flag('enableOrderViaQr') && Boolean(config?.dineInEnabled ?? true) },
    {
      name: 'Approve each order first',
      detail: config?.acceptanceMode === 'AUTOMATIC' ? 'Orders go straight to the kitchen' : 'A manager accepts before the kitchen sees it',
      on: config ? config.acceptanceMode === 'MANUAL' : true,
    },
    {
      name: 'Ordering open now',
      detail: config?.isPaused ? `Paused${config.pauseReason ? ` · ${config.pauseReason}` : ''}` : 'Not paused',
      on: !(config?.isPaused ?? false) && (config?.isEnabled ?? true),
    },
  ]

  const tableName = new Map(tables.map((t) => [t.id, t.name]))
  const names = top.length ? await prisma.menuItem.findMany({ where: { id: { in: top.map((t) => t.menuItemId) } }, select: { id: true, name: true } }) : []

  return {
    qrSharePct: todayOrders.length > 0 ? Math.round((qr.length / todayOrders.length) * 100) : null,
    table,
    tableCount: tables.length,
    waiting: waiting.map((o) => ({
      id: o.id,
      ref: orderRef(o),
      table: o.table?.name ?? 'Table',
      items: o.items.reduce((s, i) => s + i.quantity, 0),
      total: Number(o.total),
      note: o.notes,
      ago: minutesBetween(o.createdAt, now),
    })),
    today: {
      orders: qr.length,
      avgTicket: qr.length > 0 ? qrTotal / qr.length : null,
      paidOnlinePct: qr.length > 0 ? Math.round((paidOnline / qr.length) * 100) : null,
      dineIn: todayOrders.length,
    },
    options,
    calls: tasks.map((t) => ({ id: t.id, message: t.message, ago: minutesBetween(t.createdAt, now), table: t.tableId ? tableName.get(t.tableId) ?? null : null })),
    topItems: top.map((t) => ({ id: t.menuItemId, name: names.find((n) => n.id === t.menuItemId)?.name ?? 'Dish', sold: t._sum.quantity ?? 0 })),
  }
}
