import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createAddonSchema } from '@/lib/validations/menu'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addons = await prisma.menuAddon.findMany({
      where: { restaurantId: session.user.restaurantId },
      orderBy: [{ parentItem: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error('[GET /api/menu/addons]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createAddonSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const addon = await prisma.menuAddon.create({
      data: {
        restaurantId: session.user.restaurantId,
        parentItem: parsed.data.parentItem,
        name: parsed.data.name,
        price: parsed.data.price,
        status: parsed.data.status || 'ACTIVE',
      },
    })

    return NextResponse.json(addon, { status: 201 })
  } catch (error) {
    console.error('[POST /api/menu/addons]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
