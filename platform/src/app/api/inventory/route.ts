import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).nullable().optional(),
  unit: z.string().trim().min(1).max(20),
  unitCost: z.coerce.number().min(0).default(0),
  currentStock: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
  parStock: z.coerce.number().min(0).default(0),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })

    const since = new Date()
    since.setDate(since.getDate() - 30)

    const [items, recentTransactions, suppliers, menuItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { locationId: location.id },
        include: {
          recipes: {
            include: {
              menuItem: { select: { id: true, name: true, price: true, is86d: true } },
            },
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.inventoryTransaction.findMany({
        where: { inventoryItem: { locationId: location.id } },
        include: { inventoryItem: { select: { name: true, unit: true, unitCost: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.supplier.findMany({
        where: { locationId: location.id },
        orderBy: { name: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: {
          category: {
            restaurantId: session.user.restaurantId,
            OR: [{ locationId: location.id }, { locationId: null }],
          },
        },
        include: {
          recipeItems: { include: { inventoryItem: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ])

    const serializedItems = items.map((item) => {
      const unitCost = Number(item.unitCost)
      const stockValue = item.currentStock * unitCost
      const status = item.currentStock <= 0
        ? 'OUT_OF_STOCK'
        : item.currentStock <= item.minStock
          ? 'LOW_STOCK'
          : 'HEALTHY'
      return { ...item, unitCost, stockValue, status }
    })

    const wasteCost30d = recentTransactions
      .filter((transaction) => transaction.type === 'WASTE' && transaction.createdAt >= since)
      .reduce((total, transaction) => total + Math.abs(transaction.quantity) * Number(transaction.inventoryItem.unitCost), 0)

    const menuCosting = menuItems.map((item) => {
      const recipeCost = item.recipeItems.reduce(
        (sum, recipe) => sum + recipe.quantityRequired * Number(recipe.inventoryItem.unitCost),
        0,
      )
      const price = Number(item.price)
      return {
        id: item.id,
        name: item.name,
        price,
        recipeCost,
        foodCostPercent: price > 0 ? (recipeCost / price) * 100 : 0,
        grossMargin: price - recipeCost,
        ingredientCount: item.recipeItems.length,
      }
    })

    if (req.nextUrl.searchParams.get('format') === 'list') {
      return NextResponse.json(serializedItems)
    }

    return NextResponse.json({
      location,
      summary: {
        totalItems: serializedItems.length,
        lowStock: serializedItems.filter((item) => item.status === 'LOW_STOCK').length,
        outOfStock: serializedItems.filter((item) => item.status === 'OUT_OF_STOCK').length,
        stockValue: serializedItems.reduce((total, item) => total + item.stockValue, 0),
        wasteCost30d,
      },
      items: serializedItems,
      recentTransactions: recentTransactions.map((transaction) => ({
        ...transaction,
        unitCost: Number(transaction.inventoryItem.unitCost),
      })),
      suppliers,
      menuCosting,
    })
  } catch (error) {
    console.error('[GET /api/inventory]', error)
    return NextResponse.json({ error: 'Unable to load inventory' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = createItemSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: { locationId: location.id, ...parsed.data, category: parsed.data.category || null },
      })
      if (parsed.data.currentStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: created.id,
            type: 'STOCK_IN',
            quantity: parsed.data.currentStock,
            actorId: session.user.id,
            notes: 'Opening stock',
          },
        })
      }
      return created
    })

    return NextResponse.json({ ...item, unitCost: Number(item.unitCost) }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory]', error)
    return NextResponse.json({ error: 'Unable to create inventory item' }, { status: 500 })
  }
}
