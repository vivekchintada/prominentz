export type UserRole = 'OWNER' | 'MANAGER' | 'SERVER' | 'KITCHEN' | 'CASHIER'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  restaurantId?: string
  restaurantName: string
  planTier: string
  locationId?: string
  locationName?: string
  employeeId?: string
}

export type TableStatus = 'EMPTY' | 'ACTIVE' | 'PAYING' | 'RESERVED'

export interface RestaurantTable {
  id: string
  name: string
  capacity: number
  status: TableStatus
  isOccupied: boolean
  floor?: string
  guestCount?: number
  serverName?: string
  activeOrderId?: string
  orderTotal?: number
  elapsedMinutes?: number
}

export type OrderItemCourse = 'STARTER' | 'MAIN' | 'DESSERT' | 'BEVERAGE'

export interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  price?: number
  selectedModifiers?: string[]
  specialNote?: string
  course: OrderItemCourse
  isCooked?: boolean
  status?: string
}


export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  category: string
  imageUrl?: string
  isVeg: boolean
  isAvailable: boolean
  is86d?: boolean
  kdsStation?: string
  prepTimeEstimateMin?: number
}

export interface LiveOrder {
  id: string
  orderNumber: string
  tableName: string
  tableId?: string
  serverName: string
  status: string
  guestCount: number
  total: number
  subtotal?: number
  tax?: number
  discount?: number
  createdAt: string
  orderSource?: 'DINE_IN' | 'TAKEAWAY' | 'ONLINE_DELIVERY'
  items: {
    id: string
    menuItemId?: string
    name: string
    quantity: number
    price: number
    unitPrice?: number
    totalPrice?: number
    modifiers?: string[]
    specialNote?: string
    status?: string
    course?: OrderItemCourse
  }[]
}

export type OnlineOrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'

export interface OnlineOrder {
  id: string
  orderNumber: string
  customerName: string
  customerPhone?: string
  deliveryAddress?: string
  onlineStatus: OnlineOrderStatus
  orderType: 'DELIVERY' | 'TAKEOUT'
  channel: 'WEB' | 'DOORDASH' | 'UBEREATS'
  subtotal: number
  deliveryFee: number
  tip: number
  total: number
  createdAt: string
  scheduledFor?: string
  estimatedReadyAt?: string
  items: {
    id: string
    name: string
    quantity: number
    price: number
    specialNote?: string
  }[]
}

export type WaitlistStatus = 'WAITING' | 'SEATED' | 'LEFT'

export interface WaitlistEntry {
  id: string
  guestName: string
  guestPhone: string
  partySize: number
  quotedWaitMins: number
  status: WaitlistStatus
  arrivedAt: string
  seatedAt?: string
  tableName?: string
  notes?: string
}

export interface CustomerProfile {
  id: string
  name: string
  phone?: string
  email?: string
  totalVisits: number
  totalSpent: number
  loyaltyPoints: number
  tierName: string
  lastVisitAt?: string
  allergyTags?: string[]
  notes?: string
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  suggestions?: string[]
}

export interface RestaurantLocation {
  id: string
  name: string
  address?: string
  phone?: string
  isHeadquarters: boolean
  tablesCount?: number
  employeesCount?: number
}

export interface KdsTicketItem {
  id: string
  name: string
  quantity: number
  isCooked: boolean
  modifiers?: string[]
  specialNote?: string
  course?: string
}

export interface KdsTicket {
  id: string
  orderId: string        // ← ADDED for void event matching
  ticketNumber: string
  tableName: string
  serverName: string
  guestCount?: number
  notes?: string
  station: string
  status: 'NEW' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'VOIDED'
  items: KdsTicketItem[]
  createdAt: string
  elapsedSeconds: number
}

export interface Reservation {
  id: string
  guestName: string
  guestPhone: string
  partySize: number
  scheduledAt: string
  status: 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'PENDING'
  tableName?: string
  tableId?: string
  notes?: string
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  currentStock: number
  minStock: number
  parStock?: number
  unit: string
  unitCost: number
}

export interface AttendanceEntry {
  id: string
  employeeName: string
  jobTitle?: string
  clockedInAt: string
  durationMinutes: number
  employeeId?: string
  status?: string
}

export interface PendingShiftApproval {
  id: string
  requesterName: string
  targetName: string
  shiftDate: string
  shiftTime: string
  reason?: string
}

export interface OwnerStats {
  todaySales: number
  salesGrowthPercent: number
  openOrdersCount: number
  openOrdersValue: number
  occupiedTablesCount: number
  totalTablesCount: number
  laborCostPercent: number
  activeStaffCount: number
  pendingApprovals: PendingShiftApproval[]
}

export type RealtimeEventType =
  | 'order.created'
  | 'order.modified'
  | 'order.voided'
  | 'order.paid'
  | 'ticket.created'
  | 'ticket.status'
  | 'ticket.completed'
  | 'table.status'
  | 'waitlist.updated'

export interface RealtimeEvent {
  type: RealtimeEventType
  payload: Record<string, any>
  timestamp: string
}
