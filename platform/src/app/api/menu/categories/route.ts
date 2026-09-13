import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations/menu'

// ─── GET /api/menu/categories ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')
    const includeAll = searchParams.get('all') === 'true'

    let restaurantId = session?.user?.restaurantId

    // If unauthenticated diner scanning a QR code with locationId
    if (!restaurantId && locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { restaurantId: true },
      })
      if (location) {
        restaurantId = location.restaurantId
      }
    }

    // If still no restaurantId, fallback to primary demo restaurant for public demo viewing
    if (!restaurantId) {
      const fb = await prisma.restaurant.findFirst({ select: { id: true } })
      restaurantId = fb?.id
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    let categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId,
        ...(includeAll ? {} : { isActive: true }),
        OR: [
          { locationId: null },
          ...(locationId ? [{ locationId }] : []),
        ],
      },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            isAvailable: true,
            is86d: true,
            imageUrl: true,
            kdsStation: true,
            displayOrder: true,
            modifiers: {
              include: {
                options: true,
              },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    // If no menu categories exist yet, auto-seed delicious categories & items
    if (categories.length === 0) {
      const catAppetizers = await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: '🍕 Appetizers & Starters',
          displayOrder: 1,
          items: {
            create: [
              {
                name: 'Truffle Arancini',
                description: 'Crispy risotto balls filled with wild mushrooms, fontina cheese, and black truffle aioli.',
                price: 14.50,
                kdsStation: 'HOT',
                displayOrder: 1,
              },
              {
                name: 'Burrata Caprese',
                description: 'Heirloom tomatoes, fresh Puglia burrata, aged balsamic glaze, and fresh basil oil.',
                price: 16.00,
                kdsStation: 'COLD',
                displayOrder: 2,
              },
            ],
          },
        },
      })

      const catMains = await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: '🍝 Pastas & Mains',
          displayOrder: 2,
          items: {
            create: [
              {
                name: 'Handcrafted Truffle Tagliolini',
                description: 'Fresh pasta ribbons, rich butter emulsion, Parmigiano-Reggiano, and shaved summer truffles.',
                price: 26.00,
                kdsStation: 'HOT',
                displayOrder: 1,
              },
              {
                name: 'Prime Wagyu Ribeye (12oz)',
                description: 'Charred broccolini, roasted garlic pomme puree, and rosemary red wine demi-glace.',
                price: 48.00,
                kdsStation: 'HOT',
                displayOrder: 2,
              },
            ],
          },
        },
      })

      const catDrinks = await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: '🍷 Cocktails & Drinks',
          displayOrder: 3,
          items: {
            create: [
              {
                name: 'Smoked Rosemary Old Fashioned',
                description: 'Bourbon, aromatic bitters, charred orange peel, and torched rosemary sprig.',
                price: 15.00,
                kdsStation: 'BAR',
                displayOrder: 1,
              },
              {
                name: 'San Pellegrino Sparkling (750ml)',
                description: 'Crisp Italian sparkling mineral water.',
                price: 6.50,
                kdsStation: 'BAR',
                displayOrder: 2,
              },
            ],
          },
        },
      })

      categories = await prisma.menuCategory.findMany({
        where: {
          restaurantId,
          isActive: true,
        },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              isAvailable: true,
              is86d: true,
              imageUrl: true,
              kdsStation: true,
              displayOrder: true,
              modifiers: {
                include: {
                  options: true,
                },
              },
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      })
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error('[GET /api/menu/categories]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/menu/categories ────────────────────────────────────────────────
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
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, displayOrder, imageUrl, isActive } = parsed.data

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: session.user.restaurantId,
        name,
        displayOrder: displayOrder ?? 0,
        imageUrl: imageUrl || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('[POST /api/menu/categories]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
