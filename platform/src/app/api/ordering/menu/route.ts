import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const locationId = new URL(req.url).searchParams.get('locationId')
    if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })
    const location = await prisma.location.findUnique({ where: { id: locationId } })
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    const config = await prisma.onlineOrderingConfig.upsert({
      where: { locationId }, create: { locationId }, update: {}, include: { hours: true },
    })
    if (!config.isEnabled) return NextResponse.json({ error: 'Online ordering unavailable' }, { status: 403 })
    const categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId: location.restaurantId,
        isActive: true,
        OR: [{ locationId: null }, { locationId }],
      },
      include: {
        items: {
          where: { isAvailable: true, is86d: false },
          include: {
            modifiers: {
              orderBy: { displayOrder: 'asc' },
              include: { options: { orderBy: { displayOrder: 'asc' } } },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })
    return NextResponse.json({
      location: { id: location.id, name: location.name, address: location.address, timezone: location.timezone },
      config,
      categories,
    })
  } catch (error) {
    console.error('[GET /api/ordering/menu]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load ordering menu' },
      { status: 500 }
    )
  }
}
