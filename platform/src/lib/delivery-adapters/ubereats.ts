import type { NormalizedDeliveryOrder } from './index'

/**
 * Parses an Uber Eats webhook order payload
 * into the internal NormalizedDeliveryOrder format.
 *
 * Reference: https://developer.uber.com/docs/eats/references/api/v2/post-eats-report-order
 */
export function parseUberEatsOrder(payload: Record<string, unknown>): NormalizedDeliveryOrder {
  const order: any = payload

  const items = Array.isArray(order.cart?.items)
    ? order.cart.items.map((item: any) => ({
        externalItemId: String(item.id ?? ''),
        name:           String(item.title ?? item.name ?? 'Unknown Item'),
        quantity:       Number(item.quantity ?? 1),
        unitPrice:      Number(item.price?.amount ?? 0) / 100,
        modifiers:      Array.isArray(item.selected_modifier_groups)
          ? item.selected_modifier_groups.flatMap((g: any) =>
              (g.selected_items ?? []).map((m: any) => ({
                name:       String(m.title ?? m.name ?? ''),
                priceDelta: Number(m.price?.amount ?? 0) / 100,
              }))
            )
          : [],
        specialNote: item.special_instructions ?? undefined,
      }))
    : []

  const subtotal = Number(order.payment?.charges?.subtotal?.amount ?? 0) / 100
  const tax      = Number(order.payment?.charges?.tax?.amount ?? 0) / 100
  const total    = Number(order.payment?.charges?.total?.amount ?? subtotal + tax) / 100

  return {
    platformOrderId: String(order.id ?? order.order_id ?? 'unknown'),
    platform:        'UBEREATS',
    guestName:       String(order.eater?.first_name ?? 'Uber Eats Customer'),
    guestPhone:      order.eater?.phone ?? undefined,
    items,
    subtotal,
    tax,
    total,
    notes:           order.special_instructions ?? undefined,
    deliveredAt:     order.estimated_ready_for_pickup_at ?? undefined,
  }
}
