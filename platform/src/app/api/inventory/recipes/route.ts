import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const linkRecipeSchema = z.object({
  menuItemId:       z.string().min(1),
  inventoryItemId:  z.string().min(1),
  quantityRequired: z.number().positive(),
})

// ─── GET /api/inventory/recipes ──────────────────────────────────────────────
// Returns all recipe items and menu items with calculated food cost & gross margins
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const menuItemIdParam = searchParams.get('menuItemId')

    const menuItems = await prisma.menuItem.findMany({
      where: {
        category: {
          restaurantId: session.user.restaurantId,
          OR: [{ locationId: location.id }, { locationId: null }],
        },
        ...(menuItemIdParam ? { id: menuItemIdParam } : {}),
      },
      include: {
        category: { select: { name: true } },
        recipeItems: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentStock: true,
                minStock: true,
                unitCost: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const recipesWithCost = menuItems.map((item) => {
      let totalFoodCost = 0
      const recipeLines = item.recipeItems.map((r) => {
        const lineCost = r.quantityRequired * Number(r.inventoryItem.unitCost)
        totalFoodCost += lineCost
        return {
          id:               r.id,
          inventoryItemId:  r.inventoryItemId,
          ingredientName:   r.inventoryItem.name,
          unit:             r.inventoryItem.unit,
          quantityRequired: r.quantityRequired,
          unitCost:         Number(r.inventoryItem.unitCost),
          lineCost:         Number(lineCost.toFixed(4)),
          currentStock:     r.inventoryItem.currentStock,
        }
      })

      const retailPrice = Number(item.price)
      const foodCostPercentage = retailPrice > 0 ? (totalFoodCost / retailPrice) * 100 : 0
      const grossProfit = Math.max(0, retailPrice - totalFoodCost)

      return {
        menuItemId:         item.id,
        menuItemName:       item.name,
        categoryName:       item.category.name,
        retailPrice,
        totalFoodCost:      Number(totalFoodCost.toFixed(4)),
        foodCostPercentage: Number(foodCostPercentage.toFixed(1)),
        grossProfit:        Number(grossProfit.toFixed(2)),
        is86d:              item.is86d,
        recipes:            recipeLines,
      }
    })

    return NextResponse.json({
      items: recipesWithCost,
      count: recipesWithCost.length,
    })
  } catch (error) {
    console.error('[GET /api/inventory/recipes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/inventory/recipes ─────────────────────────────────────────────
// Links or updates an ingredient portion to a menu item
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = linkRecipeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { menuItemId, inventoryItemId, quantityRequired } = parsed.data

    // Verify inventory item belongs to this location
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, locationId: location.id },
    })
    if (!inventoryItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Verify menu item belongs to this restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: menuItemId, category: { restaurantId: session.user.restaurantId } },
    })
    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const recipe = await prisma.recipeItem.upsert({
      where: {
        menuItemId_inventoryItemId: {
          menuItemId,
          inventoryItemId,
        },
      },
      update: {
        quantityRequired,
      },
      create: {
        menuItemId,
        inventoryItemId,
        quantityRequired,
      },
      include: {
        menuItem:      { select: { id: true, name: true, price: true } },
        inventoryItem: { select: { id: true, name: true, unit: true, unitCost: true } },
      },
    })

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/recipes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/inventory/recipes ───────────────────────────────────────────
// Removes an ingredient portion from a menu item recipe
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const recipeId = searchParams.get('recipeId')
    const menuItemId = searchParams.get('menuItemId')
    const inventoryItemId = searchParams.get('inventoryItemId')

    if (!recipeId && (!menuItemId || !inventoryItemId)) {
      return NextResponse.json({ error: 'recipeId or (menuItemId and inventoryItemId) required' }, { status: 400 })
    }

    if (recipeId) {
      await prisma.recipeItem.delete({
        where: { id: recipeId },
      })
    } else if (menuItemId && inventoryItemId) {
      await prisma.recipeItem.deleteMany({
        where: { menuItemId, inventoryItemId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/inventory/recipes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
