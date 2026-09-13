import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { createItemSchema, updateItemSchema } from '@/lib/validations/menu'

// ─── GET /api/menu/items ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const includeUnavailable = searchParams.get('includeUnavailable') === 'true'

    const items = await prisma.menuItem.findMany({
      where: {
        category: { restaurantId: session.user.restaurantId },
        ...(categoryId ? { categoryId } : {}),
        ...(!includeUnavailable ? { isAvailable: true } : {}),
      },
      include: {
        modifiers: {
          include: { options: { orderBy: { displayOrder: 'asc' } } },
          orderBy: { displayOrder: 'asc' },
        },
        category: { select: { id: true, name: true } },
      },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('[GET /api/menu/items]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/menu/items ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify the category belongs to this restaurant
    const category = await prisma.menuCategory.findFirst({
      where: { id: parsed.data.categoryId, restaurantId: session.user.restaurantId },
    })
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const item = await prisma.menuItem.create({
      data: {
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        netPrice: parsed.data.netPrice || null,
        taxRate: parsed.data.taxRate,
        imageUrl: parsed.data.imageUrl,
        isVeg: parsed.data.isVeg || false,
        isAvailable: parsed.data.isAvailable,
        displayOrder: parsed.data.displayOrder,
        kdsStation: parsed.data.kdsStation,
      },
      include: {
        category: { select: { id: true, name: true } },
        modifiers: true,
      },
    })

    // Publish to event bus so POS picks up the new item
    await publishEvent(EVENTS.MENU_ITEM_UPDATED, {
      id: item.id,
      name: item.name,
      price: item.price,
      isAvailable: item.isAvailable,
      categoryId: item.categoryId,
      kdsStation: item.kdsStation,
      action: 'created',
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('[POST /api/menu/items]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
