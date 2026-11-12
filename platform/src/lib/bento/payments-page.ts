import { prisma } from '@/lib/prisma'
import type { PaymentMethod, PaymentStatus } from '@prisma/client'
import { ONLINE_SOURCES, orderRef, sourceName, type BadgeTone } from './channels'

/** Everything the Payments · day-end close board shows, from real records only. */
export interface PaymentsBoard {
  takings: number
  count: number
  byMethod: { key: string; label: string; total: number; count: number }[]
  close: {
    openTables: { count: number; names: string[] }
    tips: { total: number; people: number }
    refunds: { count: number; total: number }
  }
  drawer: { cashSales: number; cashCount: number; received: number; change: number; refundedCash: number; expected: number }
  recent: { id: string; at: Date; ref: string; method: string; amount: number; status: { label: string; tone: BadgeTone } }[]
  appOrders: { source: string; count: number; total: number }[]
}

export const EMPTY_PAYMENTS_BOARD: PaymentsBoard = {
  takings: 0,
  count: 0,
  byMethod: [],
  close: { openTables: { count: 0, names: [] }, tips: { total: 0, people: 0 }, refunds: { count: 0, total: 0 } },
  drawer: { cashSales: 0, cashCount: 0, received: 0, change: 0, refundedCash: 0, expected: 0 },
  recent: [],
  appOrders: [],
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: 'Card',
  CASH: 'Cash',
  APPLE_PAY: 'Apple Pay',
  GOOGLE_PAY: 'Google Pay',
  GIFT_CARD: 'Gift card',
}

function statusBadge(status: PaymentStatus, method: PaymentMethod): { label: string; tone: BadgeTone } {
  if (status === 'REFUNDED') return { label: 'Refunded', tone: 'accent' }
  if (status === 'VOIDED') return { label: 'Voided', tone: 'quiet' }
  if (status === 'PENDING') return { label: 'Pending', tone: 'outline' }
  return method === 'CASH' ? { label: 'In drawer', tone: 'outline' } : { label: 'Settled', tone: 'ink' }
}

export async function getPaymentsBoard(locationId: string | null, todayStart: Date): Promise<PaymentsBoard> {
  if (!locationId) return EMPTY_PAYMENTS_BOARD
  const atLocation = { order: { table: { locationId } } }

  const [payments, openTables, refunds, appOrders] = await Promise.all([
    prisma.payment.findMany({
      where: { ...atLocation, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        method: true,
        status: true,
        total: true,
        tip: true,
        cashReceived: true,
        cashChange: true,
        processedBy: true,
        createdAt: true,
        order: { select: { id: true, publicOrderNumber: true, orderSource: true, table: { select: { name: true } } } },
      },
    }),
    prisma.table.findMany({
      where: { locationId, status: { not: 'EMPTY' } },
      select: { name: true },
      orderBy: { updatedAt: 'asc' },
    }),
    prisma.void.findMany({
      where: { payment: atLocation, createdAt: { gte: todayStart } },
      select: { refundAmount: true, payment: { select: { total: true, method: true } } },
    }),
    prisma.order.findMany({
      where: { table: { locationId }, createdAt: { gte: todayStart }, orderSource: { in: ONLINE_SOURCES }, status: { not: 'VOIDED' } },
      select: { orderSource: true, total: true },
    }),
  ])

  const settled = payments.filter((p) => p.status === 'COMPLETED')
  const takings = settled.reduce((s, p) => s + Number(p.total), 0)

  // Split by method, biggest first
  const byMethod = new Map<PaymentMethod, { total: number; count: number }>()
  for (const p of settled) {
    const cur = byMethod.get(p.method) ?? { total: 0, count: 0 }
    cur.total += Number(p.total)
    cur.count += 1
    byMethod.set(p.method, cur)
  }

  // Tips
  const tipped = settled.filter((p) => Number(p.tip) > 0)
  const tips = { total: tipped.reduce((s, p) => s + Number(p.tip), 0), people: new Set(tipped.map((p) => p.processedBy)).size }

  // Refunds today
  const refundTotal = refunds.reduce((s, v) => s + Number(v.refundAmount ?? v.payment.total), 0)
  const refundedCash = refunds.filter((v) => v.payment.method === 'CASH').reduce((s, v) => s + Number(v.refundAmount ?? v.payment.total), 0)

  // Cash drawer, from what the till recorded
  const cash = settled.filter((p) => p.method === 'CASH')
  const cashSales = cash.reduce((s, p) => s + Number(p.total), 0)
  const received = cash.reduce((s, p) => s + Number(p.cashReceived ?? p.total), 0)
  const change = cash.reduce((s, p) => s + Number(p.cashChange ?? 0), 0)

  // Orders paid through a delivery or ordering app
  const apps = new Map<string, { count: number; total: number }>()
  for (const o of appOrders) {
    const name = sourceName(o.orderSource)
    const cur = apps.get(name) ?? { count: 0, total: 0 }
    cur.count += 1
    cur.total += Number(o.total)
    apps.set(name, cur)
  }

  return {
    takings,
    count: settled.length,
    byMethod: [...byMethod.entries()]
      .map(([key, v]) => ({ key, label: METHOD_LABEL[key], ...v }))
      .sort((a, b) => b.total - a.total),
    close: {
      openTables: { count: openTables.length, names: openTables.slice(0, 3).map((t) => t.name) },
      tips,
      refunds: { count: refunds.length, total: refundTotal },
    },
    drawer: { cashSales, cashCount: cash.length, received, change, refundedCash, expected: cashSales - refundedCash },
    recent: payments.slice(0, 8).map((p) => ({
      id: p.id,
      at: p.createdAt,
      ref: orderRef(p.order),
      method: `${METHOD_LABEL[p.method]}${p.order.table?.name ? ` · ${p.order.table.name}` : ''}`,
      amount: p.status === 'REFUNDED' ? -Number(p.total) : Number(p.total),
      status: statusBadge(p.status, p.method),
    })),
    appOrders: [...apps.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.total - a.total),
  }
}
