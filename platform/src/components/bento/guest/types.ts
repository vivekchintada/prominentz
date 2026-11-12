/** Shapes used by the guest QR ordering screens. Prices are plain numbers once loaded. */

export interface GuestModifierOption {
  id: string
  name: string
  priceAdjustment: number
}

export interface GuestModifierGroup {
  id: string
  name: string
  isRequired: boolean
  maxSelect: number
  options: GuestModifierOption[]
}

export interface GuestMenuItem {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  is86d: boolean
  kdsStation: string | null
  modifiers: GuestModifierGroup[]
}

export interface GuestCategory {
  id: string
  name: string
  items: GuestMenuItem[]
}

export interface CartLine {
  key: string
  item: GuestMenuItem
  qty: number
  mods: GuestModifierOption[]
  note: string
}

export interface QrCombo {
  id: string
  name: string
  itemNames: string[]
}

export interface QrConfig {
  welcomeMessage?: string
  promoText?: string
  hiddenCategoryIds?: string[]
  combos?: QrCombo[]
}

export type AssistanceType = 'WATER' | 'CUTLERY' | 'CALL_WAITER' | 'REQUEST_BILL' | 'OTHER'

export interface ActiveAssistance {
  type: string
  notes?: string | null
  requestedAt: string
}

export interface TrackedItem {
  id: string
  name: string
  quantity: number
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'VOIDED'
  station: string | null
}

export interface TrackedOrder {
  orderNumber: string | null
  orderStatus: string
  tableName: string | null
  total: number
  paymentStatus: string
  createdAt: string
  items: TrackedItem[]
}

/** Turns the public menu API response (Decimals as strings) into typed numbers. */
export function normaliseMenu(raw: unknown): GuestCategory[] {
  if (!Array.isArray(raw)) return []
  return raw.map((c: Record<string, unknown>) => ({
    id: String(c.id),
    name: String(c.name ?? ''),
    items: (Array.isArray(c.items) ? c.items : [])
      .filter((i: Record<string, unknown>) => i.isAvailable !== false)
      .map((i: Record<string, unknown>) => ({
        id: String(i.id),
        name: String(i.name ?? ''),
        description: (i.description as string | null) ?? null,
        price: Number(i.price ?? 0),
        imageUrl: (i.imageUrl as string | null) ?? null,
        is86d: Boolean(i.is86d),
        kdsStation: (i.kdsStation as string | null) ?? null,
        modifiers: (Array.isArray(i.modifiers) ? i.modifiers : []).map((g: Record<string, unknown>) => ({
          id: String(g.id),
          name: String(g.name ?? ''),
          isRequired: Boolean(g.isRequired),
          maxSelect: Math.max(1, Number(g.maxSelect ?? 1)),
          options: (Array.isArray(g.options) ? g.options : []).map((o: Record<string, unknown>) => ({
            id: String(o.id),
            name: String(o.name ?? ''),
            priceAdjustment: Number(o.priceAdjustment ?? 0),
          })),
        })),
      })),
  }))
}

export function lineUnitPrice(line: Pick<CartLine, 'item' | 'mods'>): number {
  return line.item.price + line.mods.reduce((s, m) => s + m.priceAdjustment, 0)
}

export function lineKey(itemId: string, mods: GuestModifierOption[], note: string): string {
  return `${itemId}|${mods.map((m) => m.id).sort().join(',')}|${note.trim()}`
}

export const STATION_WORD: Record<string, string> = { HOT: 'kitchen', COLD: 'cold section', BAR: 'bar', EXPO: 'pass' }
