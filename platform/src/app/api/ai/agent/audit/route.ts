import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  getLiveOperations,
  getKitchenHealth,
  getInventoryHealth,
  getLaborHealth,
  getCrmAndReservations,
  AgentContext,
} from '@/lib/ai-agent'

export const dynamic = 'force-dynamic'

export interface AgentFinding {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO'
  category: 'KITCHEN' | 'LABOR' | 'INVENTORY' | 'FINANCIAL' | 'VIP_CRM'
  title: string
  description: string
  metric?: string
  actionLabel?: string
  actionDirective?: string
  timestamp: string
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let locationId = searchParams.get('locationId') || undefined

    if (!locationId) {
      const employee = await prisma.employee.findFirst({
        where: { userId: session.user.id, isActive: true },
      })
      locationId = employee?.locationId || undefined
    }

    if (!locationId) {
      const fallbackLocation = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = fallbackLocation?.id || undefined
    }

    if (!locationId) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const agentCtx: AgentContext = {
      restaurantId: session.user.restaurantId,
      locationId,
      userId: session.user.id,
      userName: session.user.name || 'Manager',
      userRole: session.user.role,
    }

    // Run parallel 360° telemetry inspection
    const [liveOps, kitchen, inventory, labor, crm] = await Promise.all([
      getLiveOperations(agentCtx),
      getKitchenHealth(agentCtx),
      getInventoryHealth(agentCtx),
      getLaborHealth(agentCtx),
      getCrmAndReservations(agentCtx),
    ])

    const findings: AgentFinding[] = []
    const nowIso = new Date().toISOString()

    // 1. Kitchen Bottleneck Check
    if (kitchen.delayedTicketsCount > 0) {
      findings.push({
        id: `kds-delay-${Date.now()}`,
        severity: 'CRITICAL',
        category: 'KITCHEN',
        title: `${kitchen.delayedTicketsCount} Delayed Kitchen Ticket(s)`,
        description: `Tickets at ${kitchen.slowestStation?.station || 'Hot'} station exceed the 15-minute SLA. Oldest ticket has been waiting ${kitchen.delayedTickets[0]?.elapsedMins || 16} mins.`,
        metric: `${kitchen.delayedTicketsCount} tickets > 15m`,
        actionLabel: 'Ping Kitchen Expo',
        actionDirective: `Expedite delayed tickets at ${kitchen.slowestStation?.station || 'Hot'} station`,
        timestamp: nowIso,
      })
    } else if (kitchen.slowestStation && kitchen.slowestStation.averageCookMins > 14) {
      findings.push({
        id: `kds-speed-${Date.now()}`,
        severity: 'WARNING',
        category: 'KITCHEN',
        title: `Elevated Prep Times at ${kitchen.slowestStation.station} Station`,
        description: `Average cook duration is ${kitchen.slowestStation.averageCookMins} mins (target < 12 mins).`,
        metric: `${kitchen.slowestStation.averageCookMins}m avg`,
        actionLabel: 'Inspect Station',
        actionDirective: `Check workflow at ${kitchen.slowestStation.station} station`,
        timestamp: nowIso,
      })
    }

    // 2. Inventory Low-Stock Check
    if (inventory.criticalStockCount > 0) {
      const topCritical = inventory.criticalItems.slice(0, 2).map((i) => i.name).join(', ')
      findings.push({
        id: `inv-critical-${Date.now()}`,
        severity: inventory.criticalStockCount >= 3 ? 'CRITICAL' : 'WARNING',
        category: 'INVENTORY',
        title: `${inventory.criticalStockCount} Critical Low-Stock Ingredient(s)`,
        description: `${topCritical} are below their minimum threshold and at risk of stockout during dinner service.`,
        metric: `${inventory.criticalStockCount} items low`,
        actionLabel: 'Draft Restock PO',
        actionDirective: `Create purchase order for low stock items`,
        timestamp: nowIso,
      })
    }

    // 3. Labor Cost Percentage Check
    if (labor.laborPercentage > 35) {
      findings.push({
        id: `labor-high-${Date.now()}`,
        severity: 'WARNING',
        category: 'LABOR',
        title: `Labor Cost Ratio Elevated (${labor.laborPercentage}%)`,
        description: `Current wage cost ($${labor.todayEstimatedLaborCost}) is ${labor.laborPercentage}% of completed sales (target is ≤30%).`,
        metric: `${labor.laborPercentage}% labor ratio`,
        actionLabel: 'Review Floor Shifts',
        actionDirective: 'Analyze labor efficiency and suggest shift adjustments',
        timestamp: nowIso,
      })
    } else if (labor.laborPercentage > 0 && labor.laborPercentage <= 28) {
      findings.push({
        id: `labor-optimal-${Date.now()}`,
        severity: 'OPPORTUNITY',
        category: 'LABOR',
        title: `Highly Efficient Labor Margin (${labor.laborPercentage}%)`,
        description: `Staffing is operating at peak profitability while maintaining fast order turnaround.`,
        metric: `${labor.laborPercentage}% labor ratio`,
        timestamp: nowIso,
      })
    }

    // 4. VIP Diner Alert
    const vipBookings = crm.reservations.filter((r) => r.isVip)
    if (vipBookings.length > 0) {
      findings.push({
        id: `vip-crm-${Date.now()}`,
        severity: 'INFO',
        category: 'VIP_CRM',
        title: `${vipBookings.length} High-LTV VIP Diner(s) Booked Tonight`,
        description: `VIP guests (${vipBookings.map((v) => v.guestName).join(', ')}) dining tonight. Alert server team for priority hospitality.`,
        metric: `${vipBookings.length} VIP tables`,
        actionLabel: 'View VIP Details',
        actionDirective: "List tonight's VIP guests and their dining preferences",
        timestamp: nowIso,
      })
    }

    // 5. Open Table Velocity
    if (liveOps.openTabsCount > 0) {
      findings.push({
        id: `ops-velocity-${Date.now()}`,
        severity: 'INFO',
        category: 'FINANCIAL',
        title: `Active Dining Floor: ${liveOps.activeTablesCount} Tables Seated`,
        description: `${liveOps.openTabsCount} open checks in progress with estimated in-flight value of $${liveOps.openTabsEstimatedValue.toFixed(2)}.`,
        metric: `$${liveOps.openTabsEstimatedValue.toFixed(2)} in-flight`,
        timestamp: nowIso,
      })
    }

    return NextResponse.json({
      status: 'AGENT_ACTIVE',
      lastScanAt: nowIso,
      findingsCount: findings.length,
      criticalCount: findings.filter((f) => f.severity === 'CRITICAL').length,
      findings,
      telemetry: {
        liveSales: liveOps.todayCompletedSales,
        activeTables: liveOps.activeTablesCount,
        kitchenQueue: kitchen.activeQueueCount,
        delayedTickets: kitchen.delayedTicketsCount,
        laborPercentage: labor.laborPercentage,
        criticalStockCount: inventory.criticalStockCount,
        vipGuestsTonight: vipBookings.length,
      },
    })
  } catch (error) {
    console.error('[GET /api/ai/agent/audit]', error)
    return NextResponse.json({ error: 'Failed to run autonomous agent audit' }, { status: 500 })
  }
}
