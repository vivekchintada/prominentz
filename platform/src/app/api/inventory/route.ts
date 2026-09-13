import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve location ID
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })

    let locationId = employee?.locationId

    if (!locationId) {
      const fallbackLocation = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = fallbackLocation?.id
    }

    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const items = await prisma.inventoryItem.findMany({
      where: { locationId },
      include: {
        recipes: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                is86d: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('[GET /api/inventory]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })

    let locationId = employee?.locationId

    if (!locationId) {
      const fallbackLocation = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = fallbackLocation?.id
    }

    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const body = await req.json()
    const { name, unit, currentStock, minStock } = body as {
      name: string
      unit: string
      currentStock: number
      minStock: number
    }

    if (!name || !unit) {
      return NextResponse.json({ error: 'Name and unit are required' }, { status: 400 })
    }

    // Insert inventory item and initial transaction in a transaction
    const item = await prisma.$transaction(async (tx) => {
      const inventoryItem = await tx.inventoryItem.create({
        data: {
          locationId,
          name,
          unit,
          currentStock: Number(currentStock || 0),
          minStock: Number(minStock || 0),
        },
      })

      if (Number(currentStock || 0) > 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: inventoryItem.id,
            type: 'STOCK_IN',
            quantity: Number(currentStock),
            notes: 'Initial stock item setup',
          },
        })
      }

      return inventoryItem
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
