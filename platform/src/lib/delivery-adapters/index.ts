/**
 * Normalized delivery order structure — the common interface
 * all platform-specific adapters must produce.
 */
export interface NormalizedDeliveryOrder {
  platformOrderId: string       // external platform's order ID
  platform: 'DOORDASH' | 'UBEREATS' | 'OTHER'
  guestName: string
  guestPhone?: string
  items: Array<{
    externalItemId?: string
    name: string
    quantity: number
    unitPrice: number            // in dollars
    modifiers?: Array<{ name: string; priceDelta: number }>
    specialNote?: string
  }>
  subtotal: number               // pre-tax subtotal in dollars
  tax: number
  total: number
  notes?: string
  deliveredAt?: string           // ISO datetime when delivery is expected
}
