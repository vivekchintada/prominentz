import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createModifierSchema } from '@/lib/validations/menu'

// ─── POST /api/menu/modifiers ─────────────────────────────────────────────────
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
    const parsed = createModifierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { menuItemId, name, isRequired, minSelect, maxSelect, displayOrder, options } = parsed.data

    // Verify item belongs to this restaurant
    const item = await prisma.menuItem.findFirst({
      where: { id: menuItemId, category: { restaurantId: session.user.restaurantId } },
    })
    if (!item) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const modifier = await prisma.menuModifier.create({
      data: {
        menuItemId,
        name,
        isRequired,
        minSelect,
        maxSelect,
        displayOrder,
        options: {
          create: options.map((opt) => ({
            name: opt.name,
            priceAdjustment: opt.priceAdjustment,
            displayOrder: opt.displayOrder,
          })),
        },
      },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    })

    return NextResponse.json(modifier, { status: 201 })
  } catch (error) {
    console.error('[POST /api/menu/modifiers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
