import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  buildKotEscposBuffer,
  buildReceiptEscposBuffer,
  KotPrintData,
  ReceiptPrintData,
} from '@/lib/escpos-printer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { type, printerIp, orderId, station } = body

    if (!type || !orderId) {
      return NextResponse.json({ error: 'Missing type (KOT|RECEIPT) or orderId' }, { status: 400 })
    }

    // Fetch order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: { include: { location: { include: { restaurant: true } } } },
        items: {
          include: { menuItem: true },
        },
        payments: {
          where: { status: 'COMPLETED' },
          take: 1,
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.table.location.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let buffer: Buffer

    if (type === 'KOT') {
      const kotData: KotPrintData = {
        restaurantName: order.table.location.restaurant.name,
        tableName: order.table.name,
        orderNumber: order.id.substring(0, 6).toUpperCase(),
        serverName: session.user.name || 'Server',
        station: station || 'MAIN KITCHEN',
        notes: order.notes || undefined,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: order.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          seatNumber: i.seatNumber,
          modifiers: Array.isArray(i.modifiers)
            ? (i.modifiers as any[]).map((m) => m.name || m)
            : undefined,
          specialNote: i.specialNote || undefined,
        })),
      }
      buffer = buildKotEscposBuffer(kotData)
    } else {
      const payment = order.payments[0]
      const receiptData: ReceiptPrintData = {
        restaurantName: order.table.location.restaurant.name,
        address: order.table.location.address || undefined,
        phone: order.table.location.phone || undefined,
        tableName: order.table.name,
        orderNumber: order.id.substring(0, 6).toUpperCase(),
        serverName: session.user.name || 'Server',
        createdAt: new Date().toLocaleString(),
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        tip: payment ? Number(payment.tip) : 0,
        total: Number(order.total),
        paymentMethod: payment ? payment.method : 'CASH',
        items: order.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: Number(i.priceAtOrder),
          modifiers: Array.isArray(i.modifiers)
            ? (i.modifiers as any[]).map((m) => m.name || m)
            : undefined,
        })),
      }
      buffer = buildReceiptEscposBuffer(receiptData)
    }

    // Cloud deployments must never open arbitrary TCP connections from
    // user-supplied printer addresses. Local printing uses the returned
    // ESC/POS payload through the browser/local bridge.
    if (printerIp && typeof printerIp === 'string') {
      return NextResponse.json(
        { error: 'Direct network printing is disabled. Use the authorized local print bridge.' },
        { status: 400 },
      )
    }

    // Return binary base64 ESC/POS payload for client WebUSB / Serial printing
    return NextResponse.json({
      success: true,
      rawEscposBase64: buffer.toString('base64'),
      message: 'ESC/POS binary stream ready for local printer.',
    })
  } catch (error: any) {
    console.error('[POST /api/print/escpos]', error)
    return NextResponse.json({ error: error.message || 'Printing error' }, { status: 500 })
  }
}
