import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateReceiptEscPos } from '@/lib/escpos'
import { getPrintSettings } from '@/lib/settings-helpers'

export const dynamic = 'force-dynamic'

// ─── POST /api/print ───────────────────────────────────────────────────────────
// Generates ESC/POS bytes for guest checks & receipts.
// Returns base64 payload in JSON or raw binary depending on Accept header.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, type = 'RECEIPT', format = 'json' } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Load restaurant print settings
    const printSettings = await getPrintSettings(session.user.restaurantId)

    // Check if printing is enabled
    if (!printSettings.enablePrint) {
      return NextResponse.json({ error: 'Printing is disabled in restaurant settings.' }, { status: 403 })
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        table: { location: { restaurantId: session.user.restaurantId } },
      },
      include: {
        table: {
          include: {
            location: {
              include: {
                restaurant: { select: { name: true } },
              },
            },
          },
        },
        server: { select: { name: true } },
        items: {
          include: { menuItem: { select: { name: true } } },
        },
        payments: {
          where: { status: 'COMPLETED' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const payment = order.payments[0]
    const location = order.table.location
    const restaurantName = location.restaurant.name

    const receiptData = {
      restaurantName: printSettings.showStoreDetails ? restaurantName : '',
      address: printSettings.showStoreDetails ? location.address : undefined,
      phone: printSettings.showStoreDetails ? location.phone : undefined,
      // Custom header/footer from print settings (overrides defaults if set)
      customHeader: printSettings.header || undefined,
      customFooter: printSettings.footer || undefined,
      orderId: order.id,
      tableName: order.table.name,
      serverName: order.server?.name || session.user.name || 'Staff',
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        priceAtOrder: Number(i.priceAtOrder),
        modifiers: (i.modifiers as Array<{ optionName?: string; name?: string }>) || [],
      })),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      tip: payment ? Number(payment.tip) : 0,
      total: Number(order.total),
      paymentMethod: payment ? payment.method : 'UNPAID / CHECK',
      showNotes: printSettings.showNotes,
      notes: printSettings.showNotes ? order.notes : undefined,
    }

    const escPosBytes = generateReceiptEscPos(receiptData)
    const base64Bytes = Buffer.from(escPosBytes).toString('base64')

    if (format === 'binary') {
      return new Response(Buffer.from(escPosBytes), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="receipt-${orderId.substring(0, 8)}.bin"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      type,
      receiptData,
      escPosBase64: base64Bytes,
    })
  } catch (error: unknown) {
    console.error('[POST /api/print]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
