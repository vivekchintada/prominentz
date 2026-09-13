import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const recipeSchema = z.object({
  menuItemId:       z.string().min(1),
  quantityRequired: z.number().positive(),
})

// ─── POST /api/inventory/[id]/recipes ─────────────────────────────────────────
// Links a menu item to this raw ingredient with quantity requirements
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: inventoryItemId } = await params
    const body   = await req.json()
    const parsed = recipeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { menuItemId, quantityRequired } = parsed.data

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }

    // Verify inventory item belongs here
    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, locationId },
    })
    if (!item) {
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
        menuItem: { select: { id: true, name: true, is86d: true } },
      },
    })

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/:id/recipes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/inventory/[id]/recipes ───────────────────────────────────────
// Unlinks a menu item from this ingredient
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: inventoryItemId } = await params
    const { searchParams } = new URL(req.url)
    const recipeId = searchParams.get('recipeId')
    const menuItemId = searchParams.get('menuItemId')

    if (!recipeId && !menuItemId) {
      return NextResponse.json({ error: 'recipeId or menuItemId is required' }, { status: 400 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }

    // Verify inventory item belongs here
    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, locationId },
    })
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Delete the recipe
    await prisma.recipeItem.deleteMany({
      where: {
        inventoryItemId,
        ...(recipeId ? { id: recipeId } : {}),
        ...(menuItemId ? { menuItemId } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/inventory/:id/recipes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
