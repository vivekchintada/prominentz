import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveUserLocation } from '@/lib/location-resolver'

export const dynamic = 'force-dynamic'

function formatInvoiceNumber(index: number, id: string): string {
  const num = (index + 1).toString().padStart(4, '0')
  return `#INV${num}`
}

function formatDateDisplay(date: Date): string {
  try {
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  } catch {
    return '01 Nov 2026'
  }
}

function mapOrderSource(source: string, tableName?: string | null): 'Dine In' | 'Take Away' | 'Delivery' {
  if (source.includes('DELIVERY')) return 'Delivery'
  if (source === 'QR_TABLE') return 'Dine In'
  if (tableName && (tableName.toLowerCase().includes('bar') || tableName.toLowerCase().includes('take'))) {
    return 'Take Away'
  }
  return 'Dine In'
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ invoices: [], stats: { totalPaid: 0, pendingCount: 0, completedCount: 0, cancelledCount: 0 } })
    }

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').toLowerCase().trim()
    const orderTypeFilter = searchParams.get('orderType') // 'All' | 'Dine In' | 'Take Away' | 'Delivery'
    const statusFilter = searchParams.get('status') // 'All' | 'Paid' | 'Voided'
    const sortBy = searchParams.get('sortBy') || 'newest' // 'newest' | 'oldest' | 'highest' | 'lowest'

    // Fetch payments for this restaurant
    const payments = await prisma.payment.findMany({
      where: {
        order: {
          table: {
            location: { restaurantId },
          },
        },
      },
      include: {
        order: {
          include: {
            customer: true,
            server: { select: { name: true } },
            table: { select: { id: true, name: true, floor: true } },
            items: {
              include: {
                menuItem: { select: { id: true, name: true, price: true } },
              },
            },
          },
        },
        processor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Avatar color palettes
    const AVATAR_COLORS = [
      '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
      '#7b68f7', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
    ]

    // Format into Invoices
    let invoices = payments.map((p, idx) => {
      // Use invoice number derived from position or sequential ID
      const invNumber = `#INV${(payments.length - idx).toString().padStart(4, '0')}`
      const dateObj = new Date(p.createdAt)
      const dateStr = formatDateDisplay(dateObj)
      const orderType = mapOrderSource(p.order.orderSource, p.order.table?.name)
      const customerName = p.order.customer?.name || (p.order.notes && p.order.notes.startsWith('Guest:') ? p.order.notes.replace('Guest:', '').trim() : 'Walk-in Guest')
      const customerPhone = p.order.customer?.phone || null
      const customerEmail = p.order.customer?.email || null

      const colorIndex = Math.abs(customerName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % AVATAR_COLORS.length
      const avatarColor = AVATAR_COLORS[colorIndex]

      const items = p.order.items.map((item) => ({
        id: item.id,
        name: item.menuItem?.name || 'Dish Item',
        quantity: item.quantity,
        price: Number(item.priceAtOrder),
        total: Number(item.priceAtOrder) * item.quantity,
        specialNote: item.specialNote,
      }))

      let statusDisplay: 'Paid' | 'Voided' | 'Refunded' = 'Paid'
      if (p.status === 'VOIDED') statusDisplay = 'Voided'
      if (p.status === 'REFUNDED') statusDisplay = 'Refunded'

      return {
        id: p.id,
        orderId: p.orderId,
        invoiceId: invNumber,
        customer: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          avatarColor,
          initials: customerName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
        },
        date: dateStr,
        rawDate: p.createdAt,
        orderType,
        amount: Number(p.total),
        subtotal: Number(p.subtotal),
        tax: Number(p.tax),
        tip: Number(p.tip),
        paymentMethod: p.method,
        status: statusDisplay,
        tableName: p.order.table?.name || 'Table',
        floor: p.order.table?.floor || '1st Floor',
        serverName: p.order.server?.name || p.processor?.name || 'Server',
        items,
      }
    })

    // Filter by search
    if (search) {
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceId.toLowerCase().includes(search) ||
          inv.customer.name.toLowerCase().includes(search) ||
          inv.orderType.toLowerCase().includes(search) ||
          inv.tableName.toLowerCase().includes(search) ||
          inv.amount.toString().includes(search),
      )
    }

    // Filter by orderType
    if (orderTypeFilter && orderTypeFilter !== 'All') {
      invoices = invoices.filter((inv) => inv.orderType.toLowerCase() === orderTypeFilter.toLowerCase())
    }

    // Filter by status
    if (statusFilter && statusFilter !== 'All') {
      invoices = invoices.filter((inv) => inv.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Sort
    if (sortBy === 'oldest') {
      invoices.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
    } else if (sortBy === 'highest') {
      invoices.sort((a, b) => b.amount - a.amount)
    } else if (sortBy === 'lowest') {
      invoices.sort((a, b) => a.amount - b.amount)
    } else {
      // newest
      invoices.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
    }

    return NextResponse.json({
      invoices,
      totalCount: invoices.length,
      totalRevenue: invoices.reduce((acc, inv) => acc + inv.amount, 0),
    })
  } catch (error: any) {
    console.error('[GET /api/invoices]', error)
    return NextResponse.json({ error: error?.message || 'Failed to load invoices' }, { status: 500 })
  }
}
