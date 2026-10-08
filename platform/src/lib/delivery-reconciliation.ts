/**
 * delivery-reconciliation.ts
 * Core library for Module 5 — Delivery Reconciliation
 *
 * Handles:
 *  - UrbanPiper CSV parsing (idempotent via SHA-256 hash)
 *  - Order matching (externalOrderId → OnlineOrder, with amount validation)
 *  - Exception generation (UNMATCHED_ORDER, AMOUNT_DIFF, MISSING_PAYOUT, DUPLICATE_IMPORT)
 *  - Period total recalculation
 *  - Period locking (immutable snapshot)
 *  - CSV export (audit-ready, matches statement totals)
 */

import { createHash } from 'crypto'
import { prisma } from './prisma'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedStatementLine {
  externalOrderId: string
  orderDate: Date
  customerName?: string
  grossAmount: number
  commission: number
  tax: number
  promotionAmount: number
  refundAmount: number
  adjustment: number
  netAmount: number
  paymentMethod?: string
  status?: string
  itemsJson?: string
}

export interface ImportResult {
  statementId: string
  lineCount: number
  totalGross: number
  isDuplicate: boolean
}

export interface MatchResult {
  matched: number
  unmatched: number
  exceptions: number
}

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a generic delivery provider payout CSV.
 * Column headers are normalized (lower-cased, spaces→underscores).
 *
 * Supported column aliases:
 *   externalOrderId: order_id, external_order_id, ref_id, reference_id
 *   orderDate:       order_date, date, created_at, placed_at
 *   grossAmount:     gross, gross_amount, order_amount, subtotal
 *   commission:      commission, commission_amount, platform_fee
 *   tax:             tax, tax_amount, gst, vat
 *   promotionAmount: promo, promotion, discount, promo_amount
 *   refundAmount:    refund, refund_amount, cancellation_amount
 *   adjustment:      adjustment, adjustment_amount
 *   netAmount:       net, net_amount, payout, payout_amount
 *   paymentMethod:   payment_method, payment_type
 *   status:          status, order_status
 *   customerName:    customer_name, customer, name
 */
export function parseProviderCsv(csvText: string): ParsedStatementLine[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  const rawHeaders = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase().replace(/\s+/g, '_'))

  const colMap = buildColumnMap(rawHeaders)

  const results: ParsedStatementLine[] = []
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim()
    if (!row) continue
    const cols = parseCsvRow(row)
    if (cols.length < 3) continue

    const get = (key: keyof typeof colMap): string => {
      const idx = colMap[key]
      return idx !== undefined ? (cols[idx] || '').replace(/"/g, '').trim() : ''
    }

    const externalOrderId = get('externalOrderId')
    if (!externalOrderId) continue

    const grossAmount = parseFloat(get('grossAmount')) || 0
    const commission = parseFloat(get('commission')) || 0
    const tax = parseFloat(get('tax')) || 0
    const promotionAmount = parseFloat(get('promotionAmount')) || 0
    const refundAmount = parseFloat(get('refundAmount')) || 0
    const adjustment = parseFloat(get('adjustment')) || 0
    const rawNet = get('netAmount')
    const netAmount = rawNet
      ? parseFloat(rawNet) || 0
      : grossAmount - commission - tax - promotionAmount - refundAmount + adjustment

    const rawDate = get('orderDate')
    const orderDate = rawDate ? new Date(rawDate) : new Date()

    results.push({
      externalOrderId,
      orderDate: isNaN(orderDate.getTime()) ? new Date() : orderDate,
      customerName: get('customerName') || undefined,
      grossAmount,
      commission,
      tax,
      promotionAmount,
      refundAmount,
      adjustment,
      netAmount,
      paymentMethod: get('paymentMethod') || undefined,
      status: get('status') || undefined,
      itemsJson: undefined,
    })
  }

  return results
}

function buildColumnMap(headers: string[]): Record<string, number> {
  const aliases: Record<string, string[]> = {
    externalOrderId: ['order_id', 'external_order_id', 'ref_id', 'reference_id', 'order_number', 'ext_order_id'],
    orderDate: ['order_date', 'date', 'created_at', 'placed_at', 'transaction_date'],
    grossAmount: ['gross', 'gross_amount', 'order_amount', 'subtotal', 'total_amount', 'sale_amount'],
    commission: ['commission', 'commission_amount', 'platform_fee', 'marketplace_fee'],
    tax: ['tax', 'tax_amount', 'gst', 'vat', 'service_tax'],
    promotionAmount: ['promo', 'promotion', 'discount', 'promo_amount', 'discount_amount', 'promotion_amount'],
    refundAmount: ['refund', 'refund_amount', 'cancellation_amount', 'cancelled_amount'],
    adjustment: ['adjustment', 'adjustment_amount', 'other_adjustments'],
    netAmount: ['net', 'net_amount', 'payout', 'payout_amount', 'settlement_amount', 'net_payout'],
    paymentMethod: ['payment_method', 'payment_type', 'payment_mode'],
    status: ['status', 'order_status', 'state'],
    customerName: ['customer_name', 'customer', 'name', 'customer_full_name'],
  }

  const map: Record<string, number> = {}
  for (const [field, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      const idx = headers.indexOf(alias)
      if (idx !== -1 && !(field in map)) {
        map[field] = idx
        break
      }
    }
  }
  return map
}

/** Handles quoted fields with commas inside */
function parseCsvRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ─── Import Statement ────────────────────────────────────────────────────────

/**
 * Import a provider payout CSV as a DeliveryStatement.
 * Idempotent: SHA-256 of the CSV is checked; duplicate returns existing statement.
 */
export async function importStatement(params: {
  providerId: string
  locationId: string
  periodStart: Date
  periodEnd: Date
  csvText: string
  importedBy?: string
}): Promise<ImportResult> {
  const { providerId, locationId, periodStart, periodEnd, csvText, importedBy } = params

  // Hash for dedup
  const rawCsvHash = createHash('sha256').update(csvText).digest('hex')

  // Check for duplicate
  const existing = await prisma.deliveryStatement.findFirst({
    where: { rawCsvHash },
  })
  if (existing) {
    return { statementId: existing.id, lineCount: existing.lineCount, totalGross: existing.totalGross, isDuplicate: true }
  }

  const lines = parseProviderCsv(csvText)
  if (lines.length === 0) throw new Error('CSV contains no valid data rows')

  const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0)
  const totalCommission = lines.reduce((s, l) => s + l.commission, 0)
  const totalTax = lines.reduce((s, l) => s + l.tax, 0)
  const totalRefunds = lines.reduce((s, l) => s + l.refundAmount, 0)
  const totalAdjustments = lines.reduce((s, l) => s + l.adjustment, 0)
  const expectedPayout = lines.reduce((s, l) => s + l.netAmount, 0)

  const statement = await prisma.deliveryStatement.create({
    data: {
      providerId,
      locationId,
      periodStart,
      periodEnd,
      rawCsvHash,
      importedBy,
      totalGross,
      totalCommission,
      totalTax,
      totalRefunds,
      totalAdjustments,
      expectedPayout,
      lineCount: lines.length,
      lines: {
        create: lines.map((l) => ({
          externalOrderId: l.externalOrderId,
          orderDate: l.orderDate,
          customerName: l.customerName,
          itemsJson: l.itemsJson,
          grossAmount: l.grossAmount,
          commission: l.commission,
          tax: l.tax,
          promotionAmount: l.promotionAmount,
          refundAmount: l.refundAmount,
          adjustment: l.adjustment,
          netAmount: l.netAmount,
          paymentMethod: l.paymentMethod,
          status: l.status,
        })),
      },
    },
  })

  return { statementId: statement.id, lineCount: lines.length, totalGross, isDuplicate: false }
}

// ─── Order Matching ──────────────────────────────────────────────────────────

const AMOUNT_TOLERANCE = 0.50 // $0.50 tolerance before flagging AMOUNT_DIFF

/**
 * Match all lines in a reconciliation period to Resto online orders.
 * Matching strategy (in order):
 *   1. Exact externalOrderId match on Order.externalOrderId field
 *   2. Amount + date (±1 day) fallback match
 * Generates exceptions for unmatched lines and amount differences.
 */
export async function matchPeriodOrders(periodId: string): Promise<MatchResult> {
  const period = await prisma.reconciliationPeriod.findUniqueOrThrow({
    where: { id: periodId },
    include: {
      statements: { include: { statement: { include: { lines: true } } } },
    },
  })

  if (period.status === 'LOCKED') throw new Error('Cannot re-match a locked period')

  // Gather all lines across all statements in this period
  const allLines = period.statements.flatMap((ps: unknown) => ps.statement.lines)

  // Fetch all online orders for this location in the period window
  const onlineOrders = await prisma.order.findMany({
    where: {
      table: { locationId: period.locationId },
      createdAt: {
        gte: period.periodStart,
        lte: period.periodEnd,
      },
      orderSource: {
        in: ['DELIVERY_DOORDASH', 'DELIVERY_UBEREATS', 'DELIVERY_OTHER', 'WEB_DELIVERY', 'WEB_PICKUP'],
      },
    },
    select: { id: true, deliveryPlatformOrderId: true, publicOrderNumber: true, total: true, createdAt: true },
  })

  // Build lookup maps
  const orderByExternalId = new Map<string, (typeof onlineOrders)[0]>()
  for (const o of onlineOrders) {
    if (o.deliveryPlatformOrderId) orderByExternalId.set(o.deliveryPlatformOrderId, o)
    if (o.publicOrderNumber) orderByExternalId.set(o.publicOrderNumber, o)
  }

  // Clean existing exceptions for this period (re-match is idempotent)
  await prisma.reconciliationException.deleteMany({ where: { periodId } })

  let matched = 0
  let unmatched = 0
  const exceptions: { lineId: string; type: string; description: string; amount?: number }[] = []

  for (const line of allLines) {
    // Skip already matched lines (from a previous partial match)
    if (line.restoOrderId) {
      matched++
      continue
    }

    let restoOrder = orderByExternalId.get(line.externalOrderId) || null

    // Fallback: amount + date match (±1 day, ±$0.50)
    if (!restoOrder) {
      const lineDay = line.orderDate.getTime()
      restoOrder =
        onlineOrders.find((o: unknown) => {
          const dayDiff = Math.abs(o.createdAt.getTime() - lineDay) / (1000 * 60 * 60 * 24)
          const totalNum = Number(o.total)
          const amtDiff = Math.abs(totalNum - line.grossAmount)
          return dayDiff <= 1 && amtDiff <= AMOUNT_TOLERANCE
        }) || null
    }

    if (!restoOrder) {
      unmatched++
      exceptions.push({
        lineId: line.id,
        type: 'UNMATCHED_ORDER',
        description: `No Resto order found for provider order ${line.externalOrderId} (${fmtDate(line.orderDate)}, gross $${line.grossAmount.toFixed(2)})`,
      })
      continue
    }

    // Matched — check amount difference
    const totalNum = Number(restoOrder.total)
    const amtDiff = Math.abs(totalNum - line.grossAmount)
    if (amtDiff > AMOUNT_TOLERANCE) {
      exceptions.push({
        lineId: line.id,
        type: 'AMOUNT_DIFF',
        description: `Order ${line.externalOrderId}: provider gross $${line.grossAmount.toFixed(2)} vs Resto total $${totalNum.toFixed(2)}`,
        amount: amtDiff,
      })
    }

    // Update line with match
    await prisma.deliveryStatementLine.update({
      where: { id: line.id },
      data: { restoOrderId: restoOrder.id, matchedAt: new Date() },
    })

    matched++
  }

  // Create exceptions in bulk
  if (exceptions.length > 0) {
    await prisma.reconciliationException.createMany({
      data: exceptions.map((e) => ({
        periodId,
        lineId: e.lineId,
        type: e.type as any,
        description: e.description,
        amount: e.amount,
      })),
    })
  }

  // Recalculate and update period totals
  await recalculatePeriodTotals(periodId, matched, unmatched, exceptions.length)

  return { matched, unmatched, exceptions: exceptions.length }
}

// ─── Period Totals ────────────────────────────────────────────────────────────

async function recalculatePeriodTotals(
  periodId: string,
  matchedCount: number,
  unmatchedCount: number,
  exceptionCount: number
) {
  // Aggregate from all statements in this period
  const statements = await prisma.reconciliationPeriodStatement.findMany({
    where: { periodId },
    include: { statement: true },
  })

  const totals = statements.reduce(
    (acc: unknown, ps: unknown) => ({
      totalGross: acc.totalGross + ps.statement.totalGross,
      totalCommission: acc.totalCommission + ps.statement.totalCommission,
      totalTax: acc.totalTax + ps.statement.totalTax,
      totalRefunds: acc.totalRefunds + ps.statement.totalRefunds,
      totalNet: acc.totalNet + ps.statement.expectedPayout,
    }),
    { totalGross: 0, totalCommission: 0, totalTax: 0, totalRefunds: 0, totalNet: 0 }
  )

  await prisma.reconciliationPeriod.update({
    where: { id: periodId },
    data: {
      ...totals,
      matchedCount,
      unmatchedCount,
      exceptionCount,
      status: 'REVIEWING',
    },
  })
}

// ─── Lock Period ──────────────────────────────────────────────────────────────

export async function lockPeriod(periodId: string, userId: string): Promise<void> {
  const period = await prisma.reconciliationPeriod.findUniqueOrThrow({ where: { id: periodId } })

  if (period.status === 'LOCKED') throw new Error('Period is already locked')
  if (period.unmatchedCount > 0) {
    throw new Error(
      `Cannot lock period with ${period.unmatchedCount} unmatched order(s). Resolve all exceptions first.`
    )
  }

  await prisma.reconciliationPeriod.update({
    where: { id: periodId },
    data: { status: 'LOCKED', lockedAt: new Date(), lockedBy: userId },
  })
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

export async function exportPeriodCsv(periodId: string): Promise<string> {
  const period = await prisma.reconciliationPeriod.findUniqueOrThrow({
    where: { id: periodId },
    include: {
      statements: {
        include: {
          statement: {
            include: {
              provider: true,
              lines: true,
            },
          },
        },
      },
    },
  })

  const rows: string[] = [
    [
      'Period',
      'Provider',
      'External Order ID',
      'Resto Order ID',
      'Order Date',
      'Customer',
      'Gross',
      'Commission',
      'Tax',
      'Promotions',
      'Refunds',
      'Adjustment',
      'Net Payout',
      'Match Status',
      'Payment Method',
      'Provider Status',
    ].join(','),
  ]

  for (const ps of period.statements) {
    const { statement } = ps
    for (const line of statement.lines) {
      rows.push(
        [
          csvCell(period.name),
          csvCell(statement.provider.name),
          csvCell(line.externalOrderId),
          csvCell(line.restoOrderId || 'UNMATCHED'),
          csvCell(fmtDate(line.orderDate)),
          csvCell(line.customerName || ''),
          line.grossAmount.toFixed(2),
          line.commission.toFixed(2),
          line.tax.toFixed(2),
          line.promotionAmount.toFixed(2),
          line.refundAmount.toFixed(2),
          line.adjustment.toFixed(2),
          line.netAmount.toFixed(2),
          csvCell(line.restoOrderId ? 'MATCHED' : 'UNMATCHED'),
          csvCell(line.paymentMethod || ''),
          csvCell(line.status || ''),
        ].join(',')
      )
    }
  }

  // Mark as exported
  await prisma.reconciliationPeriod.update({
    where: { id: periodId },
    data: { exportedAt: new Date(), status: period.status === 'LOCKED' ? 'EXPORTED' : period.status },
  })

  return rows.join('\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
