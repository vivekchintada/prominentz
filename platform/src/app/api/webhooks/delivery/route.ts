import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { parseDoorDashOrder } from '@/lib/delivery-adapters/doordash'
import { parseUberEatsOrder } from '@/lib/delivery-adapters/ubereats'
import { normalizeUrbanPiperOrder } from '@/lib/delivery-adapters/urbanpiper'
import type { NormalizedDeliveryOrder } from '@/lib/delivery-adapters/index';
import { verifyDeliverySignature } from '@/lib/delivery-adapters/verifySignature';

export const dynamic = 'force-dynamic'



// ─── POST /api/webhooks/delivery?platform=doordash|ubereats|urbanpiper|generic ───────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const platform = (searchParams.get('platform') ?? 'generic').toLowerCase()

    const bodyText = await req.text()
    if (!bodyText) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
    }

    // Cryptographic HMAC validation
    const { isValid, reason } = verifyDeliverySignature(req, platform, bodyText)
    if (!isValid) {
      console.warn(`[Delivery Webhook] Unauthorized ${platform} request: ${reason}`)
      return NextResponse.json({ error: 'Unauthorized: ' + reason }, { status: 401 })
    }

    const rawBody = JSON.parse(bodyText)
    let normalized: NormalizedDeliveryOrder

    switch (platform) {
      case 'doordash':
        normalized = parseDoorDashOrder(rawBody)
        break
      case 'ubereats':
        normalized = parseUberEatsOrder(rawBody)
        break
      case 'urbanpiper':
      case 'zomato':
      case 'swiggy':
        normalized = normalizeUrbanPiperOrder(rawBody)
        break
      default:
        // Generic adapter — expects NormalizedDeliveryOrder shape directly
        normalized = rawBody as NormalizedDeliveryOrder
    }

    // Strict multi-tenant location routing: require locationId or restaurantId
    const locationId = searchParams.get('locationId') || req.headers.get('x-location-id')
    const restaurantId = searchParams.get('restaurantId') || req.headers.get('x-restaurant-id')

    if (!locationId && !restaurantId) {
      return NextResponse.json(
        { error: 'Missing locationId or restaurantId parameter for multi-tenant delivery routing' },
        { status: 400 }
      )
    }

    const location = await prisma.location.findFirst({
      where: {
        ...(locationId ? { id: locationId } : {}),
        ...(restaurantId ? { restaurantId } : {}),
      },
      include: {
        tables: { where: { name: { contains: 'Delivery' } }, take: 1 },
      },
    })

    if (!location) {
      return NextResponse.json({ error: 'Active restaurant location not found for tenant' }, { status: 404 })
    }

    // Use existing Delivery table or create one
    let deliveryTable = location.tables[0]
    if (!deliveryTable) {
      deliveryTable = await prisma.table.create({
        data: {
          locationId: location.id,
          name: 'Delivery',
          capacity: 1,
          status: 'ACTIVE',
        },
      })
    }

    // Resolve menu items by name (fuzzy best-match)
    const allMenuItems = await prisma.menuItem.findMany({
      where: { category: { restaurantId: location.restaurantId }, isAvailable: true },
      select: { id: true, name: true, price: true, kdsStation: true },
    })

    // Create the Order
    const order = await prisma.order.create({
      data: {
        tableId: deliveryTable.id,
        status: 'SENT_TO_KITCHEN',
        orderSource: platform === 'doordash'
          ? 'DELIVERY_DOORDASH'
          : platform === 'ubereats'
          ? 'DELIVERY_UBEREATS'
          : 'DELIVERY_OTHER',
        deliveryPlatformOrderId: normalized.platformOrderId,
        guestCount: 1,
        notes: `[${platform.toUpperCase()} ORDER #${normalized.platformOrderId.slice(-8)}] ${normalized.notes ?? ''}`.trim(),
        subtotal: normalized.subtotal,
        tax: normalized.tax,
        total: normalized.total,
      },
    })

    // Create OrderItems — match by name or fall back to first item
    for (const lineItem of normalized.items) {
      const menuItem = allMenuItems.find(
        (m) => m.name.toLowerCase() === lineItem.name.toLowerCase()
      ) ?? allMenuItems[0]

      if (!menuItem) continue

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: menuItem.id,
          quantity: lineItem.quantity,
          priceAtOrder: lineItem.unitPrice || Number(menuItem.price),
          modifiers: lineItem.modifiers ?? [],
          specialNote: lineItem.specialNote ?? null,
          status: 'PENDING',
        },
      })
    }

    // Create KDS tickets by station
    const stationMap = new Map<string, typeof normalized.items>()
    for (const lineItem of normalized.items) {
      const menuItem = allMenuItems.find(
        (m) => m.name.toLowerCase() === lineItem.name.toLowerCase()
      )
      const station = menuItem?.kdsStation ?? 'HOT'
      if (!stationMap.has(station)) stationMap.set(station, [])
      stationMap.get(station)!.push(lineItem)
    }

    for (const [station, stationItems] of stationMap.entries()) {
      const ticket = await prisma.kdsTicket.create({
        data: {
          orderId: order.id,
          station: station as any,
          status: 'NEW',
        },
      })

      for (const lineItem of stationItems) {
        const menuItem = allMenuItems.find(
          (m) => m.name.toLowerCase() === lineItem.name.toLowerCase()
        ) ?? allMenuItems[0]
        if (!menuItem) continue

        await prisma.kdsTicketItem.create({
          data: {
            ticketId: ticket.id,
            menuItemId: menuItem.id,
            quantity: lineItem.quantity,
            modifiers: lineItem.modifiers ?? [],
            specialNote: lineItem.specialNote ?? null,
            status: 'PENDING',
          },
        })
      }
    }

    // Fire real-time event
    await publishEvent(
      'delivery.order.received',
      {
        orderId: order.id,
        platform,
        platformOrderId: normalized.platformOrderId,
        guestName: normalized.guestName,
        total: normalized.total,
        itemCount: normalized.items.length,
      },
      location.id
    )

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        eventType: 'delivery.order.received',
        metadata: { platform, platformOrderId: normalized.platformOrderId },
      },
    })

    return NextResponse.json({
      received: true,
      orderId: order.id,
      platform,
      platformOrderId: normalized.platformOrderId,
    })
  } catch (error) {
    console.error('[POST /api/webhooks/delivery]', error)
    return NextResponse.json({ error: 'Failed to process delivery order' }, { status: 500 })
  }
}
