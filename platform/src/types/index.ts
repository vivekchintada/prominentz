// ─── Prominentz — Core TypeScript Types (Phase 1) ───────────────────────────────

export type UserRole = 'OWNER' | 'MANAGER' | 'SERVER' | 'KITCHEN'

export type TableStatus = 'EMPTY' | 'ACTIVE' | 'PAYING' | 'RESERVED'

export type OrderStatus =
  | 'OPEN'
  | 'SENT_TO_KITCHEN'
  | 'PARTIALLY_READY'
  | 'READY'
  | 'PAID'
  | 'VOIDED'

export type OrderItemStatus = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED'

export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'READY' | 'SERVED'

export type TicketItemStatus = 'PENDING' | 'IN_PROGRESS' | 'READY'

export type PaymentMethod = 'CARD' | 'CASH' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'GIFT_CARD'

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'

export type KdsStation = 'HOT' | 'COLD' | 'BAR' | 'EXPO'

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  restaurantId: string
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
export interface ModifierOption {
  id: string
  name: string
  priceDelta: number
}

export interface MenuModifier {
  id: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: ModifierOption[]
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable: boolean
  is86d: boolean
  taxRate: number
  displayOrder: number
  kdsStation: KdsStation
  modifiers: MenuModifier[]
}

export interface MenuCategory {
  id: string
  locationId: string
  name: string
  displayOrder: number
  isActive: boolean
  items: MenuItem[]
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export interface SelectedModifier {
  modifierId: string
  modifierName: string
  optionId: string
  optionName: string
  priceDelta: number
}

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  menuItemName: string
  quantity: number
  priceAtOrder: number
  modifiers: SelectedModifier[]
  specialNote?: string
  status: OrderItemStatus
}

export interface Order {
  id: string
  tableId: string
  tableName: string
  serverId: string
  serverName: string
  status: OrderStatus
  guestCount: number
  notes?: string
  subtotal: number
  tax: number
  total: number
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export interface Table {
  id: string
  locationId: string
  name: string
  capacity: number
  status: TableStatus
  posX?: number
  posY?: number
  activeOrderId?: string
}

// ─── KDS ──────────────────────────────────────────────────────────────────────
export interface KdsTicketItem {
  id: string
  menuItemId: string
  menuItemName: string
  quantity: number
  modifiers: SelectedModifier[]
  specialNote?: string
  status: TicketItemStatus
  startedAt?: string
  completedAt?: string
}

export interface KdsTicket {
  id: string
  orderId: string
  tableNumber: string
  guestCount: number
  station: KdsStation
  status: TicketStatus
  items: KdsTicketItem[]
  createdAt: string
  updatedAt: string
  readyAt?: string
  ageSeconds: number // computed: now - createdAt
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export interface PaymentSplit {
  guestRef: string
  method: PaymentMethod
  subtotal: number
  tip: number
  total: number
  stripePaymentIntentId?: string
}

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  status: PaymentStatus
  subtotal: number
  tax: number
  tip: number
  total: number
  stripePaymentIntentId?: string
  splits?: PaymentSplit[]
  createdAt: string
}

// ─── Events (Real-time) ───────────────────────────────────────────────────────
export interface RestoEventPayload {
  event: string
  payload: Record<string, unknown>
  ts: number
}

// ─── Reporting ────────────────────────────────────────────────────────────────
export interface DailySummary {
  date: string
  totalRevenue: number
  totalOrders: number
  totalCovers: number
  totalTips: number
  totalVoids: number
  totalTax: number
  netRevenue: number
  byPaymentMethod: Record<PaymentMethod, number>
  topItems: { name: string; qty: number; revenue: number }[]
  avgTicketTime: number // minutes
}
