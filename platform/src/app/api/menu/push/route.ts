import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface MenuPushRequest {
  targetLocationIds: string[]
  masterMenuItemIds?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role && !['OWNER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to push menus' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'No active restaurant tenant found' }, { status: 400 })
    }

    const { targetLocationIds, masterMenuItemIds }: MenuPushRequest = await req.json()

    if (!Array.isArray(targetLocationIds) || targetLocationIds.length === 0) {
      return NextResponse.json({ error: 'Target locations required' }, { status: 400 })
    }

    // Verify all target locations belong to user's restaurant tenant
    const validLocations = await prisma.location.findMany({
      where: {
        id: { in: targetLocationIds },
        restaurantId,
      },
      select: { id: true },
    })
    const validLocationIds = validLocations.map((l) => l.id)

    if (validLocationIds.length === 0) {
      return NextResponse.json({ error: 'No valid locations found for this restaurant' }, { status: 400 })
    }

    // Fetch master menu categories/items for this tenant
    const masterCategories = await prisma.menuCategory.findMany({
      where: {
        restaurantId,
        locationId: null, // HQ Master categories have locationId = null
      },
      include: {
        items: masterMenuItemIds && masterMenuItemIds.length > 0
          ? { where: { id: { in: masterMenuItemIds } } }
          : true,
      },
    })

    let syncedCount = 0

    // Loop through each verified store location
    for (const targetLocId of validLocationIds) {
      for (const masterCat of masterCategories) {
        // Find or create category at target location
        let targetCat = await prisma.menuCategory.findFirst({
          where: {
            restaurantId,
            locationId: targetLocId,
            masterCategoryId: masterCat.id,
          },
        })

        if (!targetCat) {
          targetCat = await prisma.menuCategory.create({
            data: {
              restaurantId,
              locationId: targetLocId,
              masterCategoryId: masterCat.id,
              name: masterCat.name,
              displayOrder: masterCat.displayOrder,
              isActive: masterCat.isActive,
            },
          })
        } else {
          await prisma.menuCategory.update({
            where: { id: targetCat.id },
            data: { name: masterCat.name, displayOrder: masterCat.displayOrder },
          })
        }

        // Sync items inside category
        for (const masterItem of masterCat.items) {
          const existingTargetItem = await prisma.menuItem.findFirst({
            where: {
              categoryId: targetCat.id,
              masterItemId: masterItem.id,
            },
          })

          if (!existingTargetItem) {
            await prisma.menuItem.create({
              data: {
                categoryId: targetCat.id,
                masterItemId: masterItem.id,
                name: masterItem.name,
                description: masterItem.description,
                price: masterItem.price,
                imageUrl: masterItem.imageUrl,
                isAvailable: masterItem.isAvailable,
                is86d: masterItem.is86d,
                taxRate: masterItem.taxRate,
                kdsStation: masterItem.kdsStation,
              },
            })
            syncedCount++
          } else {
            await prisma.menuItem.update({
              where: { id: existingTargetItem.id },
              data: {
                name: masterItem.name,
                description: masterItem.description,
                price: masterItem.price,
                imageUrl: masterItem.imageUrl,
                isAvailable: masterItem.isAvailable,
                is86d: masterItem.is86d,
                taxRate: masterItem.taxRate,
                kdsStation: masterItem.kdsStation,
              },
            })
            syncedCount++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Master menu successfully synchronized across ${targetLocationIds.length} store location(s). (${syncedCount} item records updated)`,
    })
  } catch (error) {
    console.error('[POST /api/menu/push]', error)
    return NextResponse.json({ error: 'Failed to push master menu' }, { status: 500 })
  }
}
