import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateEscPosKOT } from '@/lib/escpos'

// ─── POST /api/print/kot ───────────────────────────────────────────────────────
// Generates both ESC/POS base64 bytes and HTML layout for Kitchen Order Tickets
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, station = 'ALL', reprint = false } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, table: { location: { restaurantId: session.user.restaurantId } } },
      include: {
        table: true,
        server: { select: { name: true } },
        items: {
          include: {
            menuItem: { select: { name: true, kdsStation: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const filteredItems = station === 'ALL'
      ? order.items
      : order.items.filter((i) => i.menuItem.kdsStation === station)

    if (filteredItems.length === 0) {
      return NextResponse.json({ error: `No items found for station ${station}` }, { status: 400 })
    }

    const kotData = {
      orderId: order.id,
      tableName: order.table.name,
      serverName: order.server?.name || session.user.name || 'Staff',
      station,
      createdAt: order.createdAt.toISOString(),
      reprint,
      items: filteredItems.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        modifiers: (item.modifiers as Array<{ optionName: string }>) || [],
        specialNote: item.specialNote,
      })),
    }

    // Generate binary ESC/POS buffer & base64 encoding
    const escPosBuffer = generateEscPosKOT(kotData)
    const base64EscPos = Buffer.from(escPosBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      kot: kotData,
      escPosBase64: base64EscPos,
    })
  } catch (error) {
    console.error('[POST /api/print/kot]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
