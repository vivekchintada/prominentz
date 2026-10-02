import { prisma } from '@/lib/prisma'
import { getEffectiveTaxRate } from '@/lib/settings-helpers'

/**
 * Recalculates and persists subtotal / tax / total for the given order.
 *
 * Formula:
 *   lineBase  = (priceAtOrder + sum(modifierPriceDeltas)) * quantity
 *   subtotal  = Σ lineBase
 *   taxRate   = menuItem.taxRate if set (> 0), otherwise restaurant settings effective rate
 *   tax       = Σ lineBase * effectiveTaxRate
 *   total     = subtotal + tax
 *
 * Called after every item add / update / remove.
 */
export async function recalculateOrderTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      menuItem: { select: { taxRate: true } },
      order: {
        select: {
          table: {
            select: {
              location: { select: { restaurantId: true } },
            },
          },
        },
      },
    },
  })

  // Resolve the restaurant-level effective tax rate (from settings) as a fallback
  const restaurantId = items[0]?.order?.table?.location?.restaurantId
  const settingsTaxRate = restaurantId ? await getEffectiveTaxRate(restaurantId) : 0.08

  let subtotal = 0
  let tax = 0

  for (const item of items) {
    const mods = (item.modifiers as Array<{ priceDelta?: number }>) ?? []
    const modSum = mods.reduce((s, m) => s + (m.priceDelta ?? 0), 0)
    const lineBase = (Number(item.priceAtOrder) + modSum) * item.quantity

    subtotal += lineBase

    // Use per-item taxRate if set, otherwise fall back to restaurant settings rate
    const itemTaxRate = Number(item.menuItem.taxRate)
    tax += lineBase * (itemTaxRate > 0 ? itemTaxRate : settingsTaxRate)
  }

  const total = subtotal + tax

  return prisma.order.update({
    where: { id: orderId },
    data:  { subtotal, tax, total },
  })
}
