import { prisma } from '@/lib/prisma'

/**
 * Recalculates and persists subtotal / tax / total for the given order.
 *
 * Formula:
 *   lineBase  = (priceAtOrder + sum(modifierPriceDeltas)) * quantity
 *   subtotal  = Σ lineBase
 *   tax       = Σ lineBase * menuItem.taxRate
 *   total     = subtotal + tax
 *
 * Called after every item add / update / remove.
 */
export async function recalculateOrderTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where:   { orderId },
    include: { menuItem: { select: { taxRate: true } } },
  })

  let subtotal = 0
  let tax = 0

  for (const item of items) {
    const mods = (item.modifiers as Array<{ priceDelta?: number }>) ?? []
    const modSum = mods.reduce((s, m) => s + (m.priceDelta ?? 0), 0)
    const lineBase = (Number(item.priceAtOrder) + modSum) * item.quantity

    subtotal += lineBase
    tax      += lineBase * Number(item.menuItem.taxRate)
  }

  const total = subtotal + tax

  return prisma.order.update({
    where: { id: orderId },
    data:  { subtotal, tax, total },
  })
}
