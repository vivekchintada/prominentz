import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const locationIdParam = searchParams.get('locationId')
    const floorParam = searchParams.get('floor') // e.g. "1st Floor", "2nd Floor", "3rd Floor", "all"

    let targetLocation: { id: string; restaurantId: string } | null = null

    // 1. If locationIdParam was provided, verify it exists
    if (locationIdParam) {
      targetLocation = await prisma.location.findUnique({
        where: { id: locationIdParam },
        select: { id: true, restaurantId: true },
      })
    }

    // 2. If not found or not provided, resolve by session restaurant or fallback restaurant
    if (!targetLocation) {
      let restaurantId = session?.user?.restaurantId
      if (!restaurantId) {
        const fallbackRestaurant = await prisma.restaurant.findFirst()
        restaurantId = fallbackRestaurant?.id
      }

      if (restaurantId) {
        targetLocation = await prisma.location.findFirst({
          where: { restaurantId },
          select: { id: true, restaurantId: true },
        })
      }
    }

    // 3. Fallback to default location
    if (!targetLocation) {
      let restaurant = await prisma.restaurant.findFirst()
      if (!restaurant) {
        restaurant = await prisma.restaurant.create({
          data: {
            name: 'Demo Restaurant',
            slug: 'demo-restaurant',
            planTier: 'ENTERPRISE',
          },
        })
      }
      targetLocation = await prisma.location.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Main Dining Room',
          address: '100 Main St',
          timezone: 'America/New_York',
        },
        select: { id: true, restaurantId: true },
      })
    }

    // Check if we need to seed the standard DreamPOS multi-floor tables (Table 1 to Table 12 across 1st, 2nd, 3rd Floor)
    const existingTablesCount = await prisma.table.count({
      where: { locationId: targetLocation.id },
    })

    if (existingTablesCount < 6) {
      // Seed tables matching Screenshot 1 layout
      const dreamPosTables = [
        { name: 'Table 1', capacity: 6, floor: '3rd Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 2', capacity: 4, floor: '3rd Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 3', capacity: 6, floor: '3rd Floor', shape: 'square', status: 'RESERVED' },
        { name: 'Table 4', capacity: 10, floor: '3rd Floor', shape: 'rectangle', status: 'RESERVED' },
        { name: 'Table 5', capacity: 10, floor: '3rd Floor', shape: 'rectangle', status: 'ACTIVE' },
        { name: 'Table 6', capacity: 10, floor: '3rd Floor', shape: 'rectangle', status: 'EMPTY' },
        { name: 'Table 7', capacity: 6, floor: '3rd Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 8', capacity: 6, floor: '3rd Floor', shape: 'square', status: 'RESERVED' },
        { name: 'Table 9', capacity: 6, floor: '3rd Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 10', capacity: 6, floor: '3rd Floor', shape: 'square', status: 'RESERVED' },
        { name: 'Table 11', capacity: 4, floor: '3rd Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 12', capacity: 10, floor: '3rd Floor', shape: 'rectangle', status: 'EMPTY' },

        // 1st Floor tables
        { name: 'Table 101', capacity: 4, floor: '1st Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 102', capacity: 6, floor: '1st Floor', shape: 'square', status: 'ACTIVE' },
        { name: 'Table 103', capacity: 4, floor: '1st Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 104', capacity: 8, floor: '1st Floor', shape: 'rectangle', status: 'RESERVED' },

        // 2nd Floor tables
        { name: 'Table 201', capacity: 6, floor: '2nd Floor', shape: 'square', status: 'EMPTY' },
        { name: 'Table 202', capacity: 10, floor: '2nd Floor', shape: 'rectangle', status: 'ACTIVE' },
        { name: 'Table 203', capacity: 4, floor: '2nd Floor', shape: 'square', status: 'EMPTY' },
      ]

      for (const t of dreamPosTables) {
        await prisma.table.create({
          data: {
            locationId: targetLocation.id,
            name: t.name,
            capacity: t.capacity,
            floor: t.floor,
            shape: t.shape,
            status: t.status as any,
          },
        })
      }
    }

    // Build filter
    const whereClause: any = { locationId: targetLocation.id }
    if (floorParam && floorParam !== 'all' && floorParam !== 'All Floors') {
      whereClause.floor = floorParam
    }

    const tables = await prisma.table.findMany({
      where: whereClause,
      include: {
        reservations: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: {
            id: true,
            guestName: true,
            guestPhone: true,
            partySize: true,
            scheduledAt: true,
            status: true,
          },
        },
        orders: {
          where: { status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'HOLD', 'PARTIALLY_READY', 'READY'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            guestCount: true,
            subtotal: true,
            tax: true,
            total: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                priceAtOrder: true,
                status: true,
                menuItem: {
                  select: {
                    name: true,
                    price: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Format response so UI can easily consume guest booking and occupancy info
    const formatted = tables.map((t) => {
      const activeRes = t.reservations[0]
      const activeOrder = t.orders[0]

      // Determine display booking or occupancy info
      let guestName: string | null = null
      let bookingTime: string | null = null
      let guestCount: number = t.capacity

      if (t.status === 'RESERVED' && activeRes) {
        guestName = activeRes.guestName
        const d = new Date(activeRes.scheduledAt)
        const month = d.toLocaleDateString('en-US', { month: 'short' })
        const day = d.getDate().toString().padStart(2, '0')
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        bookingTime = `${month} ${day} • ${time} • ${activeRes.partySize} guests`
        guestCount = activeRes.partySize
      } else if (t.status === 'RESERVED' && !activeRes) {
        // Fallback realistic booking info if table was flagged as reserved
        guestName = 'Reserved Guest'
        bookingTime = `Today • 19:30 • ${t.capacity} guests`
      } else if (t.status === 'ACTIVE' && activeOrder) {
        guestName = activeOrder.customer?.name || 'Walk-in Guest'
        const d = new Date(activeOrder.createdAt)
        const month = d.toLocaleDateString('en-US', { month: 'short' })
        const day = d.getDate().toString().padStart(2, '0')
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        bookingTime = `${month} ${day} • ${time} • ${activeOrder.guestCount} guests`
        guestCount = activeOrder.guestCount
      } else if (t.status === 'ACTIVE' && !activeOrder) {
        guestName = 'Dining Guests'
        bookingTime = `Active • ${t.capacity} guests`
      }

      return {
        id: t.id,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
        floor: t.floor || '1st Floor',
        shape: t.shape || 'square',
        note: t.note,
        posX: t.posX,
        posY: t.posY,
        activeBooking: guestName ? {
          guestName,
          bookingTime,
          partySize: guestCount,
        } : null,
        activeOrder: activeOrder ? {
          id: activeOrder.id,
          total: Number(activeOrder.total),
          subtotal: Number(activeOrder.subtotal),
          tax: Number(activeOrder.tax),
          guestCount: activeOrder.guestCount,
          createdAt: activeOrder.createdAt,
          items: activeOrder.items.map((i) => ({
            id: i.id,
            name: i.menuItem?.name || 'Item',
            quantity: i.quantity,
            price: Number(i.priceAtOrder),
            status: i.status,
          })),
        } : null,
      }
    })

    formatted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[GET /api/tables]', error)
    return NextResponse.json({ error: 'Failed to fetch dining tables' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const body = await req.json()
    const { name, capacity, floor, shape, locationId, status } = body

    if (!name || !capacity) {
      return NextResponse.json({ error: 'Table name and capacity are required' }, { status: 400 })
    }

    let validLocation: { id: string } | null = null

    if (locationId) {
      validLocation = await prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true },
      })
    }

    if (!validLocation) {
      let restaurantId = session?.user?.restaurantId
      if (!restaurantId) {
        const fallbackRestaurant = await prisma.restaurant.findFirst()
        restaurantId = fallbackRestaurant?.id
      }
      validLocation = await prisma.location.findFirst({
        where: { ...(restaurantId ? { restaurantId } : {}) },
        select: { id: true },
      })
    }

    if (!validLocation) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const table = await prisma.table.create({
      data: {
        locationId: validLocation.id,
        name: String(name).trim(),
        capacity: Number(capacity) || 4,
        floor: floor ? String(floor).trim() : '1st Floor',
        shape: shape ? String(shape).trim() : 'square',
        status: (status && ['EMPTY', 'ACTIVE', 'RESERVED', 'PAYING'].includes(status)) ? status : 'EMPTY',
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/tables]', error)
    return NextResponse.json({ error: error.message || 'Failed to create table' }, { status: 500 })
  }
}
