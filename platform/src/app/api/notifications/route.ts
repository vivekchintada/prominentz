import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export interface AppNotification {
  id: string
  type: 'ORDER' | 'STOCK' | 'WAITLIST' | 'PAYMENT' | 'SYSTEM'
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
  severity?: 'info' | 'warning' | 'success' | 'urgent'
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId

    // 1. Fetch recent 5 orders
    const recentOrders = await prisma.order.findMany({
      where: {
        table: { location: { restaurantId } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        table: { select: { name: true } },
        items: { select: { menuItem: { select: { name: true } }, quantity: true } },
      },
    })

    // 2. Fetch low stock inventory items
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        location: { restaurantId },
        currentStock: { lte: prisma.inventoryItem.fields.minStock },
      },
      take: 4,
      select: {
        id: true,
        name: true,
        currentStock: true,
        minStock: true,
        unit: true,
      },
    }).catch(() => [])

    // 3. Fetch active waitlist entries
    const activeWaitlist = await prisma.waitlistEntry.findMany({
      where: {
        location: { restaurantId },
        status: 'WAITING',
      },
      orderBy: { arrivedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        guestName: true,
        partySize: true,
        quotedWaitMins: true,
        arrivedAt: true,
      },
    }).catch(() => [])

    const notifications: AppNotification[] = []

    // Map recent orders
    for (const order of recentOrders) {
      const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0)
      const isPaid = order.status === 'PAID'
      const isReady = order.status === 'READY'
      
      notifications.push({
        id: `ord_${order.id}`,
        type: isPaid ? 'PAYMENT' : 'ORDER',
        title: isPaid
          ? `Check Settled • ${order.table?.name || 'Direct'}`
          : isReady
          ? `Order Ready for Pickup • ${order.table?.name || 'Order'}`
          : `New Order Placed • ${order.table?.name || 'Table'}`,
        message: isPaid
          ? `$${Number(order.total || 0).toFixed(2)} payment recorded successfully`
          : `${itemsCount} item(s) • Total: $${Number(order.total || 0).toFixed(2)}`,
        timestamp: order.createdAt.toISOString(),
        read: isPaid,
        link: '/dashboard/orders',
        severity: isPaid ? 'success' : isReady ? 'urgent' : 'info',
      })
    }

    // Map low stock warnings
    for (const item of lowStockItems) {
      notifications.push({
        id: `stk_${item.id}`,
        type: 'STOCK',
        title: `Low Stock: ${item.name}`,
        message: `Current: ${item.currentStock} ${item.unit} (Min threshold: ${item.minStock} ${item.unit})`,
        timestamp: new Date().toISOString(),
        read: false,
        link: '/dashboard/inventory',
        severity: 'warning',
      })
    }

    // Map waitlist parties
    for (const w of activeWaitlist) {
      const elapsedMins = Math.max(0, Math.floor((Date.now() - new Date(w.arrivedAt).getTime()) / 60000))
      const isOverdue = elapsedMins > w.quotedWaitMins
      notifications.push({
        id: `wait_${w.id}`,
        type: 'WAITLIST',
        title: `Waitlist: ${w.guestName} (${w.partySize} guests)`,
        message: isOverdue
          ? `Waiting for ${elapsedMins}m (Quoted ${w.quotedWaitMins}m — Overdue!)`
          : `Waiting for ${elapsedMins}m (Quoted ${w.quotedWaitMins}m)`,
        timestamp: w.arrivedAt.toISOString(),
        read: !isOverdue,
        link: '/dashboard/waitlist',
        severity: isOverdue ? 'urgent' : 'info',
      })
    }

    // Sort by timestamp descending
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const unreadCount = notifications.filter((n) => !n.read).length

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('[GET /api/notifications]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
