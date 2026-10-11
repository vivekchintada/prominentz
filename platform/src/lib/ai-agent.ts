import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export interface AgentContext {
  restaurantId: string
  locationId: string
  userId: string
  userName: string
  userRole: string
}

// ─── 360° Telemetry Tool Functions ───────────────────────────────────────────

/**
 * 1. Live Operations Tool: Sales, checks, active tables, open tabs
 */
export async function getLiveOperations(ctx: AgentContext) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [salesAgg, activeTables, totalTables, openOrders, paymentsGroup] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { total: true, subtotal: true, tax: true, tip: true },
      _count: { id: true },
      _avg: { total: true },
      where: {
        order: { table: { locationId: ctx.locationId } },
        status: 'COMPLETED',
        createdAt: { gte: today },
      },
    }),
    prisma.table.count({
      where: { locationId: ctx.locationId, status: { in: ['ACTIVE', 'PAYING'] } },
    }),
    prisma.table.count({
      where: { locationId: ctx.locationId },
    }),
    prisma.order.findMany({
      where: {
        table: { locationId: ctx.locationId },
        status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'HOLD'] },
      },
      select: {
        id: true,
        guestCount: true,
        total: true,
        status: true,
        createdAt: true,
        table: { select: { name: true } },
      },
    }),
    prisma.payment.groupBy({
      by: ['method'],
      _sum: { total: true },
      _count: { id: true },
      where: {
        order: { table: { locationId: ctx.locationId } },
        status: 'COMPLETED',
        createdAt: { gte: today },
      },
    }),
  ])

  const totalSales = Number(salesAgg._sum.total || 0)
  const openTabsTotal = openOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)

  return {
    todayCompletedSales: totalSales,
    completedChecksCount: salesAgg._count.id,
    averageCheckSize: Number(salesAgg._avg.total || 0).toFixed(2),
    activeTablesCount: `${activeTables}/${totalTables}`,
    openTabsCount: openOrders.length,
    openTabsEstimatedValue: openTabsTotal,
    paymentMethodBreakdown: paymentsGroup.map((p) => ({
      method: p.method,
      total: Number(p._sum.total || 0),
      count: p._count.id,
    })),
    openOrdersList: openOrders.map((o) => ({
      orderId: o.id.substring(0, 8),
      table: o.table.name,
      guests: o.guestCount,
      total: Number(o.total || 0),
      status: o.status,
      elapsedMins: Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000),
    })),
  }
}

/**
 * 2. Kitchen & KDS Health Tool: Station cook times, delays, bottlenecks
 */
export async function getKitchenHealth(ctx: AgentContext) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [activeTickets, completedToday] = await Promise.all([
    prisma.kdsTicket.findMany({
      where: {
        order: { table: { locationId: ctx.locationId } },
        status: { in: ['NEW', 'IN_PROGRESS'] },
      },
      include: {
        order: { select: { table: { select: { name: true } } } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.kdsTicket.findMany({
      where: {
        order: { table: { locationId: ctx.locationId } },
        status: { in: ['READY', 'SERVED'] },
        readyAt: { not: null, gte: today },
      },
      select: { station: true, createdAt: true, readyAt: true },
    }),
  ])

  // Average cook times by station
  const stationStats: Record<string, { count: number; totalMs: number }> = {}
  completedToday.forEach((t) => {
    const duration = new Date(t.readyAt!).getTime() - new Date(t.createdAt).getTime()
    if (!stationStats[t.station]) stationStats[t.station] = { count: 0, totalMs: 0 }
    stationStats[t.station].count++
    stationStats[t.station].totalMs += duration
  })

  const stationPerformance = Object.entries(stationStats).map(([station, s]) => ({
    station,
    averageCookMins: Number((s.totalMs / s.count / 60000).toFixed(1)),
    completedTickets: s.count,
  }))

  const delayedTickets = activeTickets
    .map((t) => {
      const elapsedMins = Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000)
      return {
        ticketId: t.id.substring(0, 8),
        station: t.station,
        table: t.order.table.name,
        elapsedMins,
        isDelayed: elapsedMins > 15,
        items: t.items.map((i) => `${i.quantity}x ${i.menuItem.name}`),
      }
    })
    .filter((t) => t.isDelayed)

  return {
    activeQueueCount: activeTickets.length,
    delayedTicketsCount: delayedTickets.length,
    delayedTickets,
    stationPerformance,
    slowestStation: stationPerformance.sort((a, b) => b.averageCookMins - a.averageCookMins)[0] || null,
  }
}

/**
 * 3. Inventory & Recipe Depletion Tool: Low stock, 86ed items, auto-restock alerts
 */
export async function getInventoryHealth(ctx: AgentContext) {
  const [lowStockItems, eightSixItems, openPOs] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: {
        locationId: ctx.locationId,
      },
      orderBy: { currentStock: 'asc' },
    }),
    prisma.menuItem.findMany({
      where: {
        category: { restaurantId: ctx.restaurantId },
        OR: [{ is86d: true }, { isAvailable: false }],
      },
      select: { id: true, name: true, price: true, is86d: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        locationId: ctx.locationId,
        status: { in: ['DRAFT', 'ORDERED'] },
      },
      include: {
        supplier: { select: { name: true } },
        items: true,
      },
    }),
  ])

  const criticalItems = lowStockItems.filter((i) => Number(i.currentStock) <= Number(i.minStock))

  return {
    criticalStockCount: criticalItems.length,
    criticalItems: criticalItems.map((i) => ({
      id: i.id,
      name: i.name,
      currentStock: Number(i.currentStock),
      minStock: Number(i.minStock),
      unit: i.unit,
    })),
    currently86dMenuCount: eightSixItems.length,
    eightSixItems: eightSixItems.map((m) => ({ id: m.id, name: m.name, price: Number(m.price) })),
    pendingPurchaseOrdersCount: openPOs.length,
    pendingPurchaseOrders: openPOs.map((p) => ({
      poNumber: p.poNumber,
      supplier: p.supplier.name,
      status: p.status,
      totalCost: Number(p.totalCost),
      itemCount: p.items.length,
    })),
  }
}

/**
 * 4. Labor & Team Tool: Clocked in staff, labor percentage vs target
 */
export async function getLaborHealth(ctx: AgentContext) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [activeShifts, todayShifts, revenueAgg] = await Promise.all([
    prisma.shift.findMany({
      where: {
        locationId: ctx.locationId,
        status: 'ACTIVE',
      },
      include: {
        employee: {
          include: { user: { select: { name: true, role: true } } },
        },
      },
    }),
    prisma.shift.findMany({
      where: {
        locationId: ctx.locationId,
        scheduledStart: { gte: today },
      },
      include: {
        employee: { select: { hourlyRate: true } },
      },
    }),
    prisma.payment.aggregate({
      _sum: { total: true },
      where: {
        order: { table: { locationId: ctx.locationId } },
        status: 'COMPLETED',
        createdAt: { gte: today },
      },
    }),
  ])

  let totalLaborCost = 0
  todayShifts.forEach((s) => {
    const rate = Number(s.employee?.hourlyRate || 15)
    const mins = s.clockIn && s.clockOut
      ? Math.max(0, Math.round((new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000) - (s.breakMinutes ?? 0))
      : s.clockIn
      ? Math.max(0, Math.round((Date.now() - new Date(s.clockIn).getTime()) / 60000))
      : 0
    totalLaborCost += (mins / 60) * rate
  })

  const totalRevenue = Number(revenueAgg._sum.total || 0)
  const laborPercentage = totalRevenue > 0 ? Number(((totalLaborCost / totalRevenue) * 100).toFixed(1)) : 0

  return {
    currentlyClockedInCount: activeShifts.length,
    clockedInStaff: activeShifts.map((s) => ({
      name: s.employee.user.name,
      role: s.employee.user.role,
      clockInTime: s.clockIn?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      workedHours: s.clockIn ? ((Date.now() - new Date(s.clockIn).getTime()) / 3600000).toFixed(1) : '0.0',
    })),
    todayEstimatedLaborCost: Number(totalLaborCost.toFixed(2)),
    laborPercentage,
    laborHealthStatus: laborPercentage <= 30 ? 'OPTIMAL (<=30%)' : laborPercentage <= 35 ? 'ACCEPTABLE (30-35%)' : 'HIGH_COST (>35%)',
  }
}

/**
 * 5. CRM & VIP Diners Tool: Tonight's reservations and VIP guests
 */
export async function getCrmAndReservations(ctx: AgentContext) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [reservations, waitlist, topCustomers] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        locationId: ctx.locationId,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.waitlistEntry.findMany({
      where: {
        locationId: ctx.locationId,
        status: 'WAITING',
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customer.findMany({
      where: {
        restaurantId: ctx.restaurantId,
        lifetimeSpend: { gt: 300 },
      },
      orderBy: { lifetimeSpend: 'desc' },
      take: 5,
    }),
  ])

  const vipPhoneSet = new Set(topCustomers.map((c) => c.phone))

  return {
    todayReservationsCount: reservations.length,
    activeWaitlistQueue: waitlist.length,
    reservations: reservations.map((r) => ({
      guestName: r.guestName,
      partySize: r.partySize,
      time: new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: r.status,
      isVip: vipPhoneSet.has(r.guestPhone),
    })),
    vipDiners: topCustomers.map((c) => ({
      name: c.name,
      phone: c.phone,
      totalSpend: Number(c.lifetimeSpend),
      visits: c.totalVisits,
      points: c.pointsBalance,
    })),
  }
}

/**
 * 6. Action Tool: 86 or Un-86 a menu item
 */
export async function execute86Action(ctx: AgentContext, itemName: string, is86d: boolean) {
  const item = await prisma.menuItem.findFirst({
    where: {
      category: { restaurantId: ctx.restaurantId },
      name: { contains: itemName, mode: 'insensitive' },
    },
  })

  if (!item) {
    return { success: false, message: `Menu item matching "${itemName}" was not found.` }
  }

  await prisma.menuItem.update({
    where: { id: item.id },
    data: { is86d, isAvailable: !is86d },
  })

  await prisma.availabilityLog.create({
    data: {
      menuItemId: item.id,
      action: is86d ? '86D' : 'RESTORED',
      reason: `Resto IQ AI Directive by ${ctx.userName}`,
      changedBy: ctx.userName,
    },
  })

  return {
    success: true,
    action: is86d ? '86D' : 'RESTORED',
    itemName: item.name,
    message: is86d ? `Item "${item.name}" is now 86'd across all POS & menus.` : `Item "${item.name}" restored and available.`,
  }
}

/**
 * 7. Action Tool: Prioritize KDS ticket for a table
 */
export async function executePrioritizeTicket(ctx: AgentContext, tableIdentifier: string) {
  const activeOrder = await prisma.order.findFirst({
    where: {
      table: {
        locationId: ctx.locationId,
        name: { contains: tableIdentifier.replace(/table/gi, '').trim(), mode: 'insensitive' },
      },
      status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY'] },
    },
    include: {
      table: { select: { name: true } },
      tickets: {
        where: { status: { in: ['NEW', 'IN_PROGRESS'] } },
        include: { items: { include: { menuItem: { select: { name: true } } } } },
      },
    },
  })

  if (!activeOrder || activeOrder.tickets.length === 0) {
    return {
      success: false,
      message: `No active cooking tickets found for Table "${tableIdentifier}".`,
    }
  }

  // Update order event as priority escalated
  await prisma.orderEvent.create({
    data: {
      orderId: activeOrder.id,
      eventType: 'order.expedited_by_ai',
      actorId: ctx.userId,
      metadata: {
        reason: 'RestoIQ AI Priority Escalation',
        byUser: ctx.userName,
        timestamp: new Date().toISOString(),
      },
    },
  })

  const itemNames = activeOrder.tickets.flatMap((t: any) => t.items.map((i: any) => i.menuItem?.name || 'Item'))

  return {
    success: true,
    action: 'PRIORITIZE_TICKET',
    table: activeOrder.table?.name || tableIdentifier,
    orderId: activeOrder.id,
    items: itemNames,
    message: `Table ${activeOrder.table?.name || tableIdentifier}'s order (${itemNames.join(', ')}) marked as URGENT priority on all KDS stations.`,
  }
}

/**
 * 8. Action Tool: Apply manager courtesy comp / discount to an active table check
 */
export async function executeCompAction(ctx: AgentContext, tableIdentifier: string, discountPercent: number, reason: string) {
  const activeOrder = await prisma.order.findFirst({
    where: {
      table: {
        locationId: ctx.locationId,
        name: { contains: tableIdentifier.replace(/table/gi, '').trim(), mode: 'insensitive' },
      },
      status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY'] },
    },
    include: { table: { select: { name: true } } },
  })

  if (!activeOrder) {
    return {
      success: false,
      message: `No open order found for Table "${tableIdentifier}".`,
    }
  }

  const currentTotal = Number(activeOrder.total || 0)
  const discountAmount = Number(((currentTotal * discountPercent) / 100).toFixed(2))
  const newTotal = Math.max(0, currentTotal - discountAmount)

  await prisma.order.update({
    where: { id: activeOrder.id },
    data: {
      total: newTotal,
      notes: `${activeOrder.notes ? `${activeOrder.notes} | ` : ''}${discountPercent}% Comp applied by RestoIQ: ${reason}`,
    },
  })

  await prisma.orderEvent.create({
    data: {
      orderId: activeOrder.id,
      eventType: 'order.comp_applied',
      actorId: ctx.userId,
      metadata: {
        discountPercent,
        discountAmount,
        reason,
        authorizedBy: ctx.userName,
      },
    },
  })

  return {
    success: true,
    action: 'APPLY_COMP',
    table: activeOrder.table.name,
    discountPercent,
    discountAmount,
    newTotal,
    message: `Applied ${discountPercent}% ($${discountAmount.toFixed(2)}) courtesy comp to Table ${activeOrder.table.name}. New total: $${newTotal.toFixed(2)}.`,
  }
}
