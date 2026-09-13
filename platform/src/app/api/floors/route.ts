import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    let restaurantId = session?.user?.restaurantId
    if (!restaurantId) {
      const fallbackRestaurant = await prisma.restaurant.findFirst()
      restaurantId = fallbackRestaurant?.id
    }

    if (!restaurantId) {
      return NextResponse.json(['1st Floor', '2nd Floor', '3rd Floor'])
    }

    // Get distinct floors from tables
    const tables = await prisma.table.findMany({
      where: { location: { restaurantId } },
      select: { floor: true },
      distinct: ['floor'],
    })

    const dbFloors = tables.map((t) => t.floor).filter(Boolean) as string[]

    // Standard floors set
    const defaultFloors = ['1st Floor', '2nd Floor', '3rd Floor']
    const combinedFloors = Array.from(new Set([...defaultFloors, ...dbFloors]))

    return NextResponse.json(combinedFloors)
  } catch (error) {
    console.error('[GET /api/floors]', error)
    return NextResponse.json(['1st Floor', '2nd Floor', '3rd Floor'])
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const body = await req.json()
    const { floorName, locationId } = body

    if (!floorName || !floorName.trim()) {
      return NextResponse.json({ error: 'Floor name is required' }, { status: 400 })
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
        const fallback = await prisma.restaurant.findFirst()
        restaurantId = fallback?.id
      }
      validLocation = await prisma.location.findFirst({
        where: { ...(restaurantId ? { restaurantId } : {}) },
        select: { id: true },
      })
    }

    if (!validLocation) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // To add a new floor, we can create an initial placeholder Table 1 on that floor
    // or return the floor name
    const cleanFloor = floorName.trim()

    // Check if table already exists on this floor
    const existing = await prisma.table.findFirst({
      where: { locationId: validLocation.id, floor: cleanFloor },
    })

    if (!existing) {
      await prisma.table.create({
        data: {
          locationId: validLocation.id,
          name: `${cleanFloor} Table 1`,
          capacity: 4,
          floor: cleanFloor,
          shape: 'square',
          status: 'EMPTY',
        },
      })
    }

    return NextResponse.json({ success: true, floor: cleanFloor }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/floors]', error)
    return NextResponse.json({ error: error.message || 'Failed to add floor' }, { status: 500 })
  }
}
