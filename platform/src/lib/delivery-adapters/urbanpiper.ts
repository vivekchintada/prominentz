import { NormalizedDeliveryOrder } from './index'

export interface UrbanPiperWebhookPayload {
  order: {
    details: {
      id: number | string
      ext_platforms?: Array<{ id: string; name: string }>
      channel?: string // 'zomato' | 'swiggy' | 'talabat' | 'deliveroo'
      order_state?: string
      payable_amount: number
      order_subtotal: number
      total_tax: number
      created: number
      delivery_datetime?: number
      instructions?: string
    }
    customer: {
      name: string
      phone?: string
      address?: {
        line_1?: string
        city?: string
      }
    }
    items: Array<{
      title: string
      merchant_id?: string
      quantity: number
      price: number
      options_to_add?: Array<{ title: string; price: number }>
      instructions?: string
    }>
  }
}

/**
 * Normalizes an UrbanPiper webhook payload (Zomato, Swiggy, Talabat, Deliveroo)
 */
export function normalizeUrbanPiperOrder(payload: UrbanPiperWebhookPayload): NormalizedDeliveryOrder {
  const details = payload.order.details
  const customer = payload.order.customer
  const channel = details.channel?.toUpperCase() || details.ext_platforms?.[0]?.name?.toUpperCase() || 'URBANPIPER'

  const items = (payload.order.items || []).map((item) => ({
    externalItemId: item.merchant_id,
    name: item.title,
    quantity: item.quantity,
    unitPrice: item.price,
    modifiers: item.options_to_add?.map((opt) => ({
      name: opt.title,
      priceDelta: opt.price,
    })),
    specialNote: item.instructions || undefined,
  }))

  const subtotal = details.order_subtotal || items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const tax = details.total_tax || 0
  const total = details.payable_amount || subtotal + tax

  return {
    platformOrderId: String(details.id),
    platform: 'OTHER',
    guestName: `${customer.name || 'Delivery Customer'} [${channel}]`,
    guestPhone: customer.phone || undefined,
    items,
    subtotal,
    tax,
    total,
    notes: details.instructions || `Channel: ${channel}`,
    deliveredAt: details.delivery_datetime ? new Date(details.delivery_datetime).toISOString() : undefined,
  }
}
