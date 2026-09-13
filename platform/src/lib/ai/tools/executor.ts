import { prisma } from '@/lib/prisma'
import {
  getLiveOperations,
  getKitchenHealth,
  getInventoryHealth,
  getLaborHealth,
  getCrmAndReservations,
  execute86Action,
  executePrioritizeTicket,
  executeCompAction,
  AgentContext,
} from '@/lib/ai-agent'

export interface ToolExecutionResult {
  toolName: string
  success: boolean
  data?: any
  error?: string
  summary: string
}

/**
 * Executes any registered Resto IQ tool safely with Prisma database isolation.
 */
export async function executeRestoIqTool(
  toolName: string,
  args: Record<string, any>,
  ctx: AgentContext
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      // 1. Live POS Operations
      case 'getLiveOperations': {
        const data = await getLiveOperations(ctx)
        return {
          toolName,
          success: true,
          data,
          summary: `Live POS: $${data.todayCompletedSales.toFixed(2)} completed sales (${data.completedChecksCount} checks, avg check $${data.averageCheckSize}), ${data.openTabsCount} open tabs ($${data.openTabsEstimatedValue.toFixed(2)} estimated value), ${data.activeTablesCount} tables active.`,
        }
      }

      // 2. Kitchen KDS Bottlenecks
      case 'getKitchenHealth': {
        const data = await getKitchenHealth(ctx)
        const delayedSummary = data.delayedTicketsCount > 0
          ? `⚠️ ${data.delayedTicketsCount} delayed ticket(s) exceeding 15m threshold.`
          : 'All tickets on time (< 15 mins).'
        return {
          toolName,
          success: true,
          data,
          summary: `Kitchen KDS: ${data.activeQueueCount} active tickets in queue. ${delayedSummary} Slowest station: ${data.slowestStation ? `${data.slowestStation.station} (${data.slowestStation.averageCookMins}m avg)` : 'None'}.`,
        }
      }

      // 3. Floor Plan & Table Capacity
      case 'getTableFloorStatus': {
        const tables = await prisma.table.findMany({
          where: {
            locationId: ctx.locationId,
            ...(args.floor && args.floor !== 'All' ? { floor: args.floor } : {}),
          },
          include: {
            orders: {
              where: { status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'HOLD', 'PARTIALLY_READY', 'READY'] } },
              select: { id: true, total: true, guestCount: true, createdAt: true },
              take: 1,
            },
            reservations: {
              where: { status: { in: ['CONFIRMED', 'PENDING'] } },
              select: { id: true, guestName: true, partySize: true, scheduledAt: true },
              take: 1,
            },
          },
          orderBy: { name: 'asc' },
        })

        const totalCount = tables.length
        let occupiedCount = 0
        let payingCount = 0
        let emptyCount = 0
        let banquetCount = 0
        const idleLongWaitTables: Array<{ table: string; waitMins: number; total: number }> = []

        tables.forEach((t) => {
          if (t.capacity >= 8) banquetCount++
          const activeOrder = t.orders[0]
          if (t.status === 'PAYING') {
            payingCount++
          } else if (t.status === 'ACTIVE' || activeOrder) {
            occupiedCount++
            if (activeOrder) {
              const waitMins = Math.round((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000)
              if (waitMins > 45) {
                idleLongWaitTables.push({ table: t.name, waitMins, total: Number(activeOrder.total || 0) })
              }
            }
          } else {
            emptyCount++
          }
        })

        const occupancyRate = totalCount > 0 ? Math.round(((occupiedCount + payingCount) / totalCount) * 100) : 0

        const data = {
          totalTables: totalCount,
          occupiedTables: occupiedCount,
          payingTables: payingCount,
          emptyTables: emptyCount,
          banquetTables: banquetCount,
          occupancyRate: `${occupancyRate}%`,
          idleLongWaitTables,
          tablesList: tables.map((t) => ({
            name: t.name,
            capacity: t.capacity,
            status: t.orders[0] ? 'ACTIVE' : t.status,
            floor: t.floor,
            activeOrderTotal: t.orders[0] ? Number(t.orders[0].total) : 0,
            activeReservation: t.reservations[0]
              ? `${t.reservations[0].guestName} (${t.reservations[0].partySize}p)`
              : null,
          })),
        }

        return {
          toolName,
          success: true,
          data,
          summary: `Floor Plan: ${occupancyRate}% occupancy (${occupiedCount + payingCount}/${totalCount} tables occupied/paying, ${emptyCount} free). ${idleLongWaitTables.length} table(s) seated > 45 mins.`,
        }
      }

      // 4. Reservations & Waitlist
      case 'getReservationsAndWaitlist': {
        const data = await getCrmAndReservations(ctx)
        return {
          toolName,
          success: true,
          data,
          summary: `Reservations & Waitlist: ${data.todayReservationsCount} booked reservations today (${data.vipDiners.length} VIP guests), ${data.activeWaitlistQueue} parties waiting in line.`,
        }
      }

      // 5. Inventory Depletion & Auto-86
      case 'getInventoryAndDepletion': {
        const data = await getInventoryHealth(ctx)
        return {
          toolName,
          success: true,
          data,
          summary: `Inventory: ${data.criticalStockCount} items at or below safety stock. ${data.currently86dMenuCount} menu items currently 86'd. ${data.pendingPurchaseOrdersCount} pending supplier purchase orders.`,
        }
      }

      // 6. Sales, P&L & Ticket Tiers
      case 'getSalesAndAOVMetrics': {
        const timeframe = args.timeframe || 'last_30_days'
        const days = timeframe === 'today' ? 1 : timeframe === 'last_7_days' ? 7 : 30
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const [ordersAgg, paymentsAgg, allOrders] = await Promise.all([
          prisma.order.aggregate({
            _count: { id: true },
            _sum: { total: true, subtotal: true, tax: true },
            where: {
              table: { locationId: ctx.locationId },
              createdAt: { gte: startDate },
            },
          }),
          prisma.payment.aggregate({
            _sum: { total: true, subtotal: true, tax: true, tip: true },
            where: {
              order: { table: { locationId: ctx.locationId } },
              status: 'COMPLETED',
              createdAt: { gte: startDate },
            },
          }),
          prisma.order.findMany({
            where: {
              table: { locationId: ctx.locationId },
              createdAt: { gte: startDate },
            },
            select: { total: true, guestCount: true },
          }),
        ])

        const orderCount = ordersAgg._count.id || 1
        const completedSales = Number(paymentsAgg._sum.total || ordersAgg._sum.total || 0)
        const aov = Number((completedSales / orderCount).toFixed(2))

        let tierUnder25 = 0
        let tier25to75 = 0
        let tier75to150 = 0
        let tierOver150 = 0
        let totalGuests = 0

        allOrders.forEach((o) => {
          const val = Number(o.total || 0)
          totalGuests += (o.guestCount || 1)
          if (val < 25) tierUnder25++
          else if (val <= 75) tier25to75++
          else if (val <= 150) tier75to150++
          else tierOver150++
        })

        const spendPerGuest = totalGuests > 0 ? Number((completedSales / totalGuests).toFixed(2)) : Number((aov / 2.5).toFixed(2))

        const data = {
          timeframe,
          totalSales: completedSales,
          orderCount,
          avgOrderValue: aov,
          spendPerGuest,
          totalTax: Number(paymentsAgg._sum.tax || 0),
          totalTips: Number(paymentsAgg._sum.tip || 0),
          tierDistribution: {
            under25: { count: tierUnder25, percentage: Math.round((tierUnder25 / orderCount) * 100) },
            tier25to75: { count: tier25to75, percentage: Math.round((tier25to75 / orderCount) * 100) },
            tier75to150: { count: tier75to150, percentage: Math.round((tier75to150 / orderCount) * 100) },
            tierOver150: { count: tierOver150, percentage: Math.round((tierOver150 / orderCount) * 100) },
          },
        }

        return {
          toolName,
          success: true,
          data,
          summary: `Financials (${timeframe}): $${completedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} sales across ${orderCount} orders. AOV: $${aov.toFixed(2)}, Spend/guest: $${spendPerGuest.toFixed(2)}. Highest tier (>$150): ${data.tierDistribution.tierOver150.percentage}%.`,
        }
      }

      // 7. Loss Prevention & Fraud Auditing
      case 'getLossPreventionAudit': {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [voidEvents, compEvents, voidedOrders] = await Promise.all([
          prisma.orderEvent.findMany({
            where: {
              order: { table: { locationId: ctx.locationId } },
              eventType: { in: ['order.voided', 'item.voided', 'drawer.opened_no_sale'] },
              createdAt: { gte: today },
            },
            include: {
              order: { select: { total: true, table: { select: { name: true } } } },
            },
          }),
          prisma.orderEvent.findMany({
            where: {
              order: { table: { locationId: ctx.locationId } },
              eventType: { in: ['order.comp_applied', 'discount.applied'] },
              createdAt: { gte: today },
            },
            include: {
              order: { select: { total: true, table: { select: { name: true } } } },
            },
          }),
          prisma.order.findMany({
            where: {
              table: { locationId: ctx.locationId },
              status: 'VOIDED',
              createdAt: { gte: today },
            },
            select: { id: true, total: true, table: { select: { name: true } } },
          }),
        ])

        const totalVoidAmount = voidedOrders.reduce((sum, v) => sum + Number(v.total || 0), 0)
        const totalCompCount = compEvents.length

        const data = {
          voidEventsCount: voidEvents.length + voidedOrders.length,
          totalVoidAmount,
          compEventsCount: totalCompCount,
          riskLevel: totalVoidAmount > 150 ? 'HIGH' : totalVoidAmount > 50 ? 'MODERATE' : 'NORMAL',
          recentEvents: [...voidEvents, ...compEvents].slice(0, 8).map((e) => ({
            type: e.eventType,
            actor: e.actorId,
            table: e.order?.table?.name || 'Walk-in',
            time: e.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            metadata: e.metadata,
          })),
        }

        return {
          toolName,
          success: true,
          data,
          summary: `Loss Prevention Audit: ${data.voidEventsCount} void events ($${totalVoidAmount.toFixed(2)} total value), ${totalCompCount} discount/comp events. Risk Level: ${data.riskLevel}.`,
        }
      }

      // 8. Labor Efficiency
      case 'getLaborEfficiency': {
        const data = await getLaborHealth(ctx)
        return {
          toolName,
          success: true,
          data,
          summary: `Labor: ${data.currentlyClockedInCount} staff clocked in ($${data.todayEstimatedLaborCost.toFixed(2)} estimated wage burn). Labor cost is ${data.laborPercentage}% of sales (${data.laborHealthStatus}).`,
        }
      }

      // 9. Customer CRM & VIP Diners
      case 'getCrmAndLoyalty': {
        const query = args.searchNameOrPhone?.toLowerCase().trim()
        const customers = await prisma.customer.findMany({
          where: {
            restaurantId: ctx.restaurantId,
            ...(query
              ? {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                  ],
                }
              : {}),
          },
          orderBy: { lifetimeSpend: 'desc' },
          take: 10,
        })

        const data = {
          totalReturned: customers.length,
          customers: customers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            lifetimeSpend: Number(c.lifetimeSpend || 0),
            totalVisits: c.totalVisits || 1,
            points: c.pointsBalance || 0,
            isVip: Number(c.lifetimeSpend || 0) > 300,
          })),
        }

        return {
          toolName,
          success: true,
          data,
          summary: `CRM: Loaded ${data.totalReturned} profiles. Top guest: ${data.customers[0]?.name || 'None'} ($${data.customers[0]?.lifetimeSpend?.toFixed(2) || 0} spend, ${data.customers[0]?.points || 0} points).`,
        }
      }

      // 10. Direct Action: 86 / Restore Menu Item
      case 'eightySixMenuItem':
      case 'execute86Item': {
        const res = await execute86Action(ctx, args.itemName, Boolean(args.is86d))
        return {
          toolName,
          success: res.success,
          data: res,
          summary: res.message,
        }
      }

      // 11. Direct Action: Expedite KDS Ticket
      case 'rushOrderTicket':
      case 'executePrioritizeKdsTicket': {
        const res = await executePrioritizeTicket(ctx, args.tableIdentifier)
        return {
          toolName,
          success: res.success,
          data: res,
          summary: res.message,
        }
      }

      // 12. Direct Action: Apply Courtesy Comp
      case 'executeCompTableOrder': {
        const res = await executeCompAction(ctx, args.tableIdentifier, args.discountPercent, args.reason)
        return {
          toolName,
          success: res.success,
          data: res,
          summary: res.message,
        }
      }

      // 13. Direct Action: Create Restock Purchase Order
      case 'createRestockPurchaseOrder':
      case 'executeCreatePurchaseOrder': {
        let supplier = await prisma.supplier.findFirst({
          where: { locationId: ctx.locationId },
        })
        if (!supplier) {
          supplier = await prisma.supplier.create({
            data: {
              locationId: ctx.locationId,
              name: 'Metro Food Distributors',
              contactName: 'Dispatch Team',
              email: 'orders@metrofood.local',
              phone: '555-0199',
            },
          })
        }
        const poNum = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        const po = await prisma.purchaseOrder.create({
          data: {
            locationId: ctx.locationId,
            supplierId: supplier.id,
            poNumber: poNum,
            status: 'DRAFT',
            totalCost: 385.50,
            notes: `Auto-generated by Resto IQ Autonomous Agent. Reason: ${args.notes || 'Emergency restock for low safety threshold ingredients before dinner rush'}. Authorized by ${ctx.userName}.`,
          },
        })
        return {
          toolName,
          success: true,
          data: po,
          summary: `Created Purchase Order #${po.poNumber} with supplier "${supplier.name}" (Status: DRAFT, Estimated Value: $385.50). Staged for manager sign-off.`,
        }
      }

      default:
        return {
          toolName,
          success: false,
          error: `Unknown tool "${toolName}".`,
          summary: `Tool "${toolName}" is not registered in the 360° Resto IQ tool execution layer.`,
        }
    }
  } catch (err: any) {
    console.error(`[Resto IQ Tool Execution Error - ${toolName}]:`, err)
    return {
      toolName,
      success: false,
      error: err.message || 'Internal error during tool execution',
      summary: `Failed to execute ${toolName}: ${err.message}`,
    }
  }
}
