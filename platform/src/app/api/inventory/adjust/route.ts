import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { sendWhatsAppLowStockAlert } from '@/lib/whatsapp'
import { sendLowStockAlert } from '@/lib/twilio'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { inventoryItemId, type, quantity, notes } = body as {
      inventoryItemId: string
      type: 'STOCK_IN' | 'WASTE' | 'ADJUSTMENT'
      quantity: number
      notes?: string
    }

    if (!inventoryItemId || !type || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!['STOCK_IN', 'WASTE', 'ADJUSTMENT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 })
    }

    // Determine the delta change on currentStock
    const delta = type === 'WASTE' ? -qty : qty

    // Execute adjustment and check for auto-restores in a transaction
    const { updatedItem, restoredMenuItems } = await prisma.$transaction(async (tx) => {
      // 1. Update the stock
      const updatedItem = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          currentStock: {
            increment: delta,
          },
        },
      })

      // 2. Create the Transaction log
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId,
          type,
          quantity: delta,
          notes: notes || undefined,
        },
      })

      // 3. Find 86'd menu items linked to this inventory item
      const linkedRecipes = await tx.recipeItem.findMany({
        where: {
          inventoryItemId,
          menuItem: { is86d: true },
        },
        include: {
          menuItem: true,
        },
      })

      const restoredMenuItems = []

      // For each 86'd menu item, check if ALL its recipe ingredients are now sufficiently in stock
      for (const recipe of linkedRecipes) {
        const menuItemId = recipe.menuItemId
        
        // Fetch all recipe requirements for this menu item
        const itemRecipes = await tx.recipeItem.findMany({
          where: { menuItemId },
          include: { inventoryItem: true },
        })

        // Check if every ingredient's currentStock (with our updated item stock) is sufficient
        let isFullyRestocked = true
        for (const reqRecipe of itemRecipes) {
          const ingredient = reqRecipe.inventoryItemId === updatedItem.id
            ? updatedItem
            : reqRecipe.inventoryItem

          if (ingredient.currentStock < reqRecipe.quantityRequired) {
            isFullyRestocked = false
            break
          }
        }

        if (isFullyRestocked) {
          // Un-86 the item!
          await tx.menuItem.update({
            where: { id: menuItemId },
            data: { is86d: false },
          })

          // Log availability
          await tx.availabilityLog.create({
            data: {
              menuItemId,
              action: 'RESTORED',
              reason: `Auto-restored: ingredient restocked (${updatedItem.name})`,
              changedBy: session.user.id,
            },
          })

          restoredMenuItems.push(recipe.menuItem)
        }
      }

      return { updatedItem, restoredMenuItems }
    })

    // Broadcast restock un-86 notifications to all POS terminals
    for (const menuItem of restoredMenuItems) {
      await publishEvent(EVENTS.MENU_ITEM_86D, {
        menuItemId: menuItem.id,
        name: menuItem.name,
        is86d: false,
        reason: `Restocked: ${updatedItem.name}`,
      })
    }

    // If stock is below min threshold, trigger inventory alert & manager WhatsApp notification
    if (updatedItem.currentStock <= updatedItem.minStock) {
      await prisma.inventoryAlert.create({
        data: {
          inventoryItemId: updatedItem.id,
          locationId: updatedItem.locationId,
          type: updatedItem.currentStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          message: `${updatedItem.name} is ${updatedItem.currentStock <= 0 ? 'out of stock' : 'running low'} (${updatedItem.currentStock} ${updatedItem.unit} remaining, threshold: ${updatedItem.minStock} ${updatedItem.unit})`,
        },
      }).catch((err) => console.error('[Inventory Alert DB] Error:', err))

      // Notify store manager
      const location = await prisma.location.findUnique({
        where: { id: updatedItem.locationId },
        include: {
          restaurant: { select: { name: true } },
          employees: {
            where: { user: { role: { in: ['OWNER', 'MANAGER'] } }, phone: { not: null } },
            select: { phone: true, user: { select: { name: true } } },
            take: 1,
          },
        },
      })

      const manager = location?.employees[0]
      if (manager?.phone) {
        sendWhatsAppLowStockAlert({
          to: manager.phone,
          managerName: manager.user.name,
          restaurantName: location?.restaurant?.name ?? 'Resto AI',
          locationName: location?.name ?? 'Main Location',
          items: [{
            name: updatedItem.name,
            currentStock: updatedItem.currentStock,
            unit: updatedItem.unit,
            minStock: updatedItem.minStock,
          }],
        }).catch((err) => console.error('[Inventory] WhatsApp alert error:', err))

        sendLowStockAlert(
          manager.phone,
          manager.user.name,
          location?.name ?? 'Location',
          [updatedItem.name]
        ).catch((err) => console.error('[Inventory] SMS alert error:', err))
      }
    }

    return NextResponse.json({
      success: true,
      updatedItem,
      restoredCount: restoredMenuItems.length,
    })
  } catch (error) {
    console.error('[POST /api/inventory/adjust]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
