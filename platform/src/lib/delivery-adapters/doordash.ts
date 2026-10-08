import type { NormalizedDeliveryOrder } from './index'

/**
 * Parses a DoorDash Drive/Marketplace webhook order payload
 * into the internal NormalizedDeliveryOrder format.
 *
 * Reference: https://developer.doordash.com/en-US/docs/drive/reference/order_webhooks
 */
export function parseDoorDashOrder(payload: Record<string, unknown>): NormalizedDeliveryOrder {
  // DoorDash sends different shapes for Drive vs Marketplace — normalize both
  const order: unknown = payload.order ?? payload

  const items = Array.isArray(order.items ?? order.line_items)
    ? (order.items ?? order.line_items).map((item: unknown) => ({
        externalItemId: String(item.id ?? item.item_id ?? ''),
        name: String(item.name ?? item.item_name ?? 'Unknown Item'),
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unit_price ?? item.price ?? 0) / 100, // DoorDash uses cents
        modifiers: Array.isArray(item.options ?? item.modifiers)
          ? (item.options ?? item.modifiers).map((m: unknown) => ({
              name: String(m.name ?? m.option_name ?? ''),
              priceDelta: Number(m.price ?? m.price_delta ?? 0) / 100,
            }))
          : [],
        specialNote: item.special_instructions ?? item.note ?? undefined,
      }))
    : []

  const subtotal = Number(order.subtotal ?? order.order_subtotal ?? 0) / 100
  const tax      = Number(order.tax ?? order.sales_tax ?? 0) / 100
  const total    = Number(order.total ?? order.order_total ?? subtotal + tax) / 100

  return {
    platformOrderId: String(order.id ?? order.order_id ?? order.external_delivery_id ?? 'unknown'),
    platform:        'DOORDASH',
    guestName:       String(order.customer?.name ?? order.consumer?.first_name ?? 'DoorDash Customer'),
    guestPhone:      order.customer?.phone_number ?? order.consumer?.phone ?? undefined,
    items,
    subtotal,
    tax,
    total,
    notes:           order.special_instructions ?? order.order_notes ?? undefined,
    deliveredAt:     order.estimated_delivery_time ?? order.pickup_time ?? undefined,
  }
}
