import { prisma } from '@/lib/prisma'
import type { KdsStation } from '@prisma/client'
import { DAY_MS } from './time'

export const STATION_LABEL: Record<KdsStation, string> = { HOT: 'Hot', COLD: 'Cold', BAR: 'Bar', EXPO: 'Expo' }

/** Everything the Menu editor board shows. */
export interface MenuBoard {
  itemCount: number
  categories: { id: string; name: string; items: number; active: boolean }[]
  featured: {
    name: string
    items: { id: string; name: string; price: number; station: string; available: boolean; isVeg: boolean }[]
    more: number
  } | null
  topSeller: { name: string; sold: number; price: number; foodCost: number | null; marginPct: number | null } | null
  soldOut: { id: string; name: string; category: string }[]
  soldOutCount: number
  modifiers: { name: string; usedOn: number; options: string[] }[]
  channels: { name: string; detail: string; live: boolean }[]
}

export const EMPTY_MENU_BOARD: MenuBoard = {
  itemCount: 0,
  categories: [],
  featured: null,
  topSeller: null,
  soldOut: [],
  soldOutCount: 0,
  modifiers: [],
  channels: [],
}

export async function getMenuBoard(restaurantId: string, locationId: string | null, todayStart: Date): Promise<MenuBoard> {
  const categoryWhere = locationId
    ? { restaurantId, OR: [{ locationId }, { locationId: null }] }
    : { restaurantId }

  const [categories, modifiers, online, providers] = await Promise.all([
    prisma.menuCategory.findMany({
      where: categoryWhere,
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        items: {
          orderBy: { displayOrder: 'asc' },
          select: { id: true, name: true, price: true, kdsStation: true, isAvailable: true, is86d: true, isVeg: true },
        },
      },
    }),
    prisma.menuModifier.findMany({
      where: { menuItem: { category: categoryWhere } },
      select: { name: true, menuItemId: true, options: { orderBy: { displayOrder: 'asc' }, select: { name: true } } },
    }),
    locationId ? prisma.onlineOrderingConfig.findUnique({ where: { locationId } }) : Promise.resolve(null),
    locationId
      ? prisma.deliveryProvider.findMany({ where: { locationId }, select: { name: true, isActive: true } })
      : Promise.resolve([] as { name: string; isActive: boolean }[]),
  ])

  const allItems = categories.flatMap((c) => c.items.map((i) => ({ ...i, category: c.name })))
  const availableCount = allItems.filter((i) => i.isAvailable && !i.is86d).length

  // The biggest category gets the item list
  const biggest = [...categories].sort((a, b) => b.items.length - a.items.length)[0]
  const featured: MenuBoard['featured'] =
    biggest && biggest.items.length > 0
      ? {
          name: biggest.name,
          items: biggest.items.slice(0, 7).map((i) => ({
            id: i.id,
            name: i.name,
            price: Number(i.price),
            station: STATION_LABEL[i.kdsStation],
            available: i.isAvailable && !i.is86d,
            isVeg: i.isVeg,
          })),
          more: Math.max(0, biggest.items.length - 7),
        }
      : null

  // Top seller over the last 7 days, with its recipe cost when recipes are set up
  let topSeller: MenuBoard['topSeller'] = null
  if (locationId && allItems.length > 0) {
    const since = new Date(todayStart.getTime() - 6 * DAY_MS)
    const [top] = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      where: { status: { not: 'VOIDED' }, order: { table: { locationId }, status: { not: 'VOIDED' }, createdAt: { gte: since } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1,
    })
    if (top) {
      const item = await prisma.menuItem.findUnique({
        where: { id: top.menuItemId },
        select: { name: true, price: true, recipeItems: { select: { quantityRequired: true, inventoryItem: { select: { unitCost: true } } } } },
      })
      if (item) {
        const price = Number(item.price)
        const cost = item.recipeItems.length
          ? item.recipeItems.reduce((s, r) => s + r.quantityRequired * Number(r.inventoryItem.unitCost), 0)
          : null
        topSeller = {
          name: item.name,
          sold: top._sum.quantity ?? 0,
          price,
          foodCost: cost,
          marginPct: cost !== null && price > 0 ? Math.round(((price - cost) / price) * 100) : null,
        }
      }
    }
  }

  // Modifier groups by name, with how many dishes use them
  const groups = new Map<string, { items: Set<string>; options: Set<string> }>()
  for (const mod of modifiers) {
    const g = groups.get(mod.name) ?? { items: new Set<string>(), options: new Set<string>() }
    g.items.add(mod.menuItemId)
    for (const o of mod.options) g.options.add(o.name)
    groups.set(mod.name, g)
  }

  const soldOut = allItems.filter((i) => !i.isAvailable || i.is86d)
  const activeApps = providers.filter((p) => p.isActive)

  const channels: MenuBoard['channels'] = [
    { name: 'POS and captain app', detail: `${availableCount} of ${allItems.length} items`, live: allItems.length > 0 },
    {
      name: 'QR table menu',
      detail: online ? (online.dineInEnabled ? `${availableCount} items` : 'Dine-in ordering is off') : 'Not set up',
      live: Boolean(online?.isEnabled && online.dineInEnabled && !online.isPaused),
    },
    {
      name: 'Online pickup and delivery',
      detail: online
        ? online.isPaused
          ? `Paused${online.pauseReason ? ` · ${online.pauseReason}` : ''}`
          : [online.pickupEnabled ? 'Pickup' : null, online.deliveryEnabled ? 'Delivery' : null].filter(Boolean).join(' and ') || 'Both off'
        : 'Not set up',
      live: Boolean(online?.isEnabled && !online.isPaused && (online.pickupEnabled || online.deliveryEnabled)),
    },
  ]
  if (providers.length > 0) {
    channels.push({
      name: 'Delivery apps',
      detail: activeApps.length ? activeApps.map((p) => p.name).join(', ') : 'All switched off',
      live: activeApps.length > 0,
    })
  }

  return {
    itemCount: allItems.length,
    categories: categories.map((c) => ({ id: c.id, name: c.name, items: c.items.length, active: c.isActive })),
    featured,
    topSeller,
    soldOut: soldOut.slice(0, 4).map((i) => ({ id: i.id, name: i.name, category: i.category })),
    soldOutCount: soldOut.length,
    modifiers: [...groups.entries()]
      .map(([name, g]) => ({ name, usedOn: g.items.size, options: [...g.options].slice(0, 4) }))
      .sort((a, b) => b.usedOn - a.usedOn)
      .slice(0, 4),
    channels,
  }
}
