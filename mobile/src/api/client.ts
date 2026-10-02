import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  AttendanceEntry,
  CustomerProfile,
  InventoryItem,
  KdsTicket,
  LiveOrder,
  MenuItem,
  OnlineOrder,
  OrderItem,
  PendingShiftApproval,
  Reservation,
  RestaurantLocation,
  RestaurantTable,
  UserProfile,
  WaitlistEntry,
  OwnerStats,
} from '../types/models'

const BACKEND_URL_KEY = '@resto_backend_url'
const TOKEN_KEY = '@resto_mobile_auth_token'
const USER_KEY = '@resto_mobile_user_profile'

export const DEFAULT_BACKEND_URL = 'http://192.168.0.187:3000'

class ApiClient {
  private baseURL: string = DEFAULT_BACKEND_URL

  constructor() {
    this.loadBaseURL()
  }

  async loadBaseURL(): Promise<string> {
    try {
      const saved = await AsyncStorage.getItem(BACKEND_URL_KEY)
      if (saved) this.baseURL = saved
    } catch {}
    return this.baseURL
  }

  getBaseURL(): string { return this.baseURL }

  async setBaseURL(url: string): Promise<void> {
    const cleanUrl = url.trim().replace(/\/+$/, '')
    this.baseURL = cleanUrl
    await AsyncStorage.setItem(BACKEND_URL_KEY, cleanUrl)
  }

  private async getAuthToken(): Promise<string | null> {
    try { return await AsyncStorage.getItem(TOKEN_KEY) } catch { return null }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
    try {
      const token = await this.getAuthToken()
      const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-client': 'mobile',
        ...(options.headers as Record<string, string> || {}),
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(url, { ...options, headers, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errMessage = `Server error (${response.status})`
        try {
          const errData = await response.json()
          errMessage = errData.error || errData.message || errMessage
        } catch {}
        return { data: null, error: errMessage }
      }

      const data = await response.json()
      return { data, error: null }
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError'
      return {
        data: null,
        error: isTimeout ? 'Connection timed out. Check if backend is running.' : err.message || 'Network request failed',
      }
    }
  }

  // ── Authentication ────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const res = await this.request<{ success: boolean; token: string; user: UserProfile }>(
      '/api/auth/mobile-login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    )
    if (res.data?.success && res.data.token && res.data.user) {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, res.data.token],
        [USER_KEY, JSON.stringify(res.data.user)],
      ])
      return { user: res.data.user, error: null }
    }
    return { user: null, error: res.error || 'Invalid credentials' }
  }

  // ── Tables & Floor ────────────────────────────────────────────────────────────
  async getTables(): Promise<RestaurantTable[]> {
    const res = await this.request<any[]>('/api/tables')
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((t) => {
        const activeOrder = t.activeOrder || t.orders?.[0]
        const isOccupied = t.status === 'ACTIVE' || t.status === 'PAYING' || !!activeOrder
        return {
          id: t.id,
          name: t.name,
          capacity: t.capacity || 4,
          status: (t.status || 'EMPTY') as any,
          floor: t.floor || 'Main Dining',
          isOccupied,
          guestCount: activeOrder?.guestCount || t.capacity,
          serverName: activeOrder?.server?.name || 'Available',
          activeOrderId: activeOrder?.id,
          orderTotal: activeOrder?.total ? Number(activeOrder.total) : undefined,
          elapsedMinutes: activeOrder?.createdAt
            ? Math.max(1, Math.round((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000))
            : undefined,
        }
      })
    }
    return []
  }

  async updateTableStatus(
    tableId: string,
    status: 'EMPTY' | 'ACTIVE' | 'PAYING' | 'RESERVED',
    force: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.request(`/api/tables/${tableId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, force }),
    })
    if (!res.error) return { success: true }
    return { success: false, error: res.error || 'Failed to update table status' }
  }


  // ── Menu & 86 Item Availability ───────────────────────────────────────────────
  async getMenuItems(): Promise<MenuItem[]> {
    const res = await this.request<any[]>('/api/menu/items')
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category?.name || item.categoryName || 'Mains',
        imageUrl: item.imageUrl,
        isVeg: item.isVeg ?? false,
        isAvailable: item.isAvailable ?? true,
        is86d: item.is86d ?? false,
        kdsStation: item.kdsStation,
        prepTimeEstimateMin: item.prepTimeEstimateMin ?? 15,
      }))
    }
    return []
  }

  async toggleMenuItemAvailability(id: string, isAvailable: boolean): Promise<boolean> {
    const res = await this.request(`/api/menu/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    })
    return !res.error
  }

  async toggle86Item(id: string, is86d: boolean): Promise<boolean> {
    const res = await this.request(`/api/menu/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is86d }),
    })
    return !res.error
  }

  // ── Live POS Dine-In Orders (active only) ─────────────────────────────────────
  async getOrders(statuses?: string[]): Promise<LiveOrder[]> {
    const activeStatuses = statuses ?? ['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'READY', 'HOLD']
    const query = `?status=${activeStatuses.join(',')}`
    const res = await this.request<any[]>(`/api/orders${query}`)
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((o) => ({
        id: o.id,
        orderNumber: `#${o.id.slice(-5).toUpperCase()}`,
        tableName: o.table?.name || 'Takeout / Direct',
        serverName: o.server?.name || 'Staff',
        status: o.status || 'OPEN',
        guestCount: o.guestCount || 1,
        total: Number(o.total || 0),
        subtotal: Number(o.subtotal || 0),
        tax: Number(o.tax || 0),
        discount: Number(o.discount || 0),
        createdAt: o.createdAt || new Date().toISOString(),
        orderSource: o.table?.name?.toLowerCase().includes('online') ? 'ONLINE_DELIVERY' : 'DINE_IN',
        tableId: o.tableId,
        items: (o.items || []).map((i: any) => ({
          id: i.id,
          menuItemId: i.menuItemId,
          name: i.menuItem?.name || 'Dish',
          quantity: i.quantity || 1,
          unitPrice: Number(i.priceAtOrder || i.menuItem?.price || 0),
          totalPrice: Number(i.priceAtOrder || 0) * (i.quantity || 1),
          price: Number(i.priceAtOrder || i.menuItem?.price || 0),
          status: i.status,
          modifiers: i.modifiers,
          specialNote: i.specialNote,
          course: 'MAIN' as const,
        })),
      }))
    }
    return []
  }

  async createOrder(params: {
    tableId: string
    guestCount: number
    items: OrderItem[]
    notes?: string
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const payload = {
      tableId: params.tableId,
      guestCount: params.guestCount,
      notes: params.notes,
      items: params.items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        specialNote: i.specialNote,
      })),
    }
    const res = await this.request<any>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (res.data) return { success: true, orderId: res.data.id }
    return { success: false, error: res.error || 'Failed to fire order' }
  }

  async voidOrder(orderId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    const res = await this.request(`/api/orders/${orderId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    })
    if (!res.error) return { success: true }
    return { success: false, error: res.error }
  }

  async removeOrderItem(orderId: string, itemId: string, managerId?: string): Promise<boolean> {
    const res = await this.request(`/api/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
      ...(managerId ? { body: JSON.stringify({ managerId }) } : {}),
    })
    return !res.error
  }

  // ── Online Orders & Delivery ──────────────────────────────────────────────────
  async getOnlineOrders(status?: string): Promise<OnlineOrder[]> {
    const query = status && status !== 'ALL' ? `?status=${status}` : ''
    const res = await this.request<any[]>(`/api/ordering/manage${query}`)
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((o) => ({
        id: o.id,
        orderNumber: `#OL-${o.id.slice(-5).toUpperCase()}`,
        customerName: o.deliveryAddress?.recipientName || o.customerName || 'Online Customer',
        customerPhone: o.deliveryAddress?.phone || o.customerPhone || undefined,
        deliveryAddress: o.deliveryAddress
          ? `${o.deliveryAddress.street || ''} ${o.deliveryAddress.unit || ''}, ${o.deliveryAddress.city || ''}`.trim()
          : undefined,
        onlineStatus: o.onlineStatus || 'PENDING',
        orderType: o.deliveryAddress ? 'DELIVERY' : 'TAKEOUT',
        channel: o.orderSource === 'DELIVERY_DOORDASH' ? 'DOORDASH' : o.orderSource === 'DELIVERY_UBEREATS' ? 'UBEREATS' : 'WEB',
        subtotal: Number(o.subtotal || 0),
        deliveryFee: Number(o.deliveryFee || 0),
        tip: Number(o.tip || 0),
        total: Number(o.total || 0),
        createdAt: o.createdAt || new Date().toISOString(),
        scheduledFor: o.scheduledFor,
        estimatedReadyAt: o.estimatedReadyAt,
        items: (o.items || []).map((i: any) => ({
          id: i.id,
          name: i.menuItem?.name || 'Dish',
          quantity: i.quantity || 1,
          price: Number(i.priceAtOrder || 0),
          specialNote: i.specialNote,
        })),
      }))
    }
    return []
  }

  async updateOnlineOrderStatus(id: string, status: string, reason?: string): Promise<boolean> {
    const res = await this.request(`/api/ordering/manage/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    })
    return !res.error
  }

  // ── Kitchen KDS ───────────────────────────────────────────────────────────────
  async getKdsTickets(station?: string): Promise<KdsTicket[]> {
    const query = station && station !== 'ALL' ? `?station=${station}` : ''
    const res = await this.request<any[]>(`/api/kds/tickets${query}`)
    if (res.data && Array.isArray(res.data)) {
      return res.data
        .filter((t) => t.status !== 'VOIDED' && t.status !== 'SERVED') // exclude done tickets
        .map((t) => {
          const elapsedSecs = t.order?.createdAt
            ? Math.max(0, Math.floor((Date.now() - new Date(t.order.createdAt).getTime()) / 1000))
            : 0
          return {
            id: t.id,
            orderId: t.orderId,
            ticketNumber: `#${t.id.slice(-4).toUpperCase()}`,
            tableName: t.order?.table?.name || 'Takeout',
            serverName: t.order?.server?.name || 'Staff',
            guestCount: t.order?.guestCount || 1,
            notes: t.order?.notes,
            station: t.station || 'HOT',
            status: t.status || 'NEW',
            items: (t.items || []).map((i: any) => ({
              id: i.id,
              name: i.menuItem?.name || i.name || 'Dish',
              quantity: i.quantity || 1,
              isCooked: i.status === 'READY' || i.status === 'VOIDED',
              modifiers: Array.isArray(i.modifiers) ? i.modifiers : [],
              specialNote: i.specialNote || i.notes,
            })),
            createdAt: t.order?.createdAt || t.createdAt || new Date().toISOString(),
            elapsedSeconds: elapsedSecs,
          }
        })
    }
    return []
  }

  async bumpKdsTicket(ticketId: string): Promise<boolean> {
    // SERVED = fully done, removed from kitchen view
    const res = await this.request(`/api/kds/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'SERVED' }),
    })
    return !!res.data
  }

  async updateKdsTicketStatus(ticketId: string, status: 'IN_PROGRESS' | 'READY' | 'SERVED'): Promise<boolean> {
    const res = await this.request(`/api/kds/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return !!res.data
  }

  // ── Payments ──────────────────────────────────────────────────────────────────
  async collectPayment(params: {
    orderId: string
    method: 'CASH' | 'CARD'
    subtotal: number
    tax: number
    tip: number
    total: number
    cashReceived?: number
    cashChange?: number
    stripePaymentIntentId?: string
  }): Promise<{ success: boolean; change?: number; receiptUrl?: string; error?: string }> {
    const res = await this.request<any>('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        orderId: params.orderId,
        method: params.method,
        subtotal: Number(params.subtotal.toFixed(2)),
        tax: Number(params.tax.toFixed(2)),
        tip: Number((params.tip ?? 0).toFixed(2)),
        total: Number(params.total.toFixed(2)),
        cashReceived: params.cashReceived != null ? Number(params.cashReceived.toFixed(2)) : undefined,
        cashChange: params.cashChange != null ? Number(params.cashChange.toFixed(2)) : undefined,
        stripePaymentIntentId: params.stripePaymentIntentId,
      }),
    })
    if (res.data) {
      return {
        success: true,
        change: res.data.cashChange,
        receiptUrl: res.data.receipt?.url,
      }
    }
    return { success: false, error: res.error || 'Payment failed' }
  }

  // Alias for backward compatibility
  async collectCashPayment(params: {
    orderId: string
    cashReceived: number
    tip?: number
    subtotal?: number
    tax?: number
    total?: number
  }): Promise<{ success: boolean; change?: number; receiptUrl?: string; error?: string }> {
    const sub = params.subtotal ?? params.cashReceived * 0.9
    const tx = params.tax ?? params.cashReceived * 0.1
    const tot = params.total ?? params.cashReceived
    return this.collectPayment({
      orderId: params.orderId,
      method: 'CASH',
      subtotal: sub,
      tax: tx,
      tip: params.tip ?? 0,
      total: tot + (params.tip ?? 0),
      cashReceived: params.cashReceived,
      cashChange: Math.max(0, params.cashReceived - (tot + (params.tip ?? 0))),
    })
  }

  async createStripeIntent(orderId: string): Promise<{ clientSecret?: string; error?: string }> {
    const res = await this.request<any>('/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    })
    if (res.data?.clientSecret) return { clientSecret: res.data.clientSecret }
    return { error: res.error || 'Failed to create payment intent' }
  }

  // ── Walk-in Waitlist ──────────────────────────────────────────────────────────
  async getWaitlist(): Promise<WaitlistEntry[]> {
    const res = await this.request<any[]>('/api/waitlist')
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((w) => ({
        id: w.id,
        guestName: w.guestName,
        guestPhone: w.guestPhone,
        partySize: w.partySize || 2,
        quotedWaitMins: w.quotedWaitMins || 20,
        status: w.status || 'WAITING',
        arrivedAt: w.arrivedAt || new Date().toISOString(),
        seatedAt: w.seatedAt,
        tableName: w.tableName,
        notes: w.notes,
      }))
    }
    return []
  }

  async addWaitlistEntry(params: {
    guestName: string
    guestPhone: string
    partySize: number
    quotedWaitMins: number
    notes?: string
  }): Promise<{ success: boolean; error?: string }> {
    const res = await this.request('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    if (res.data) return { success: true }
    return { success: false, error: res.error || 'Failed to add to waitlist' }
  }

  async updateWaitlistStatus(
    id: string,
    status: 'WAITING' | 'SEATED' | 'LEFT',
    notify: boolean = false,
    tableName?: string
  ): Promise<boolean> {
    const res = await this.request(`/api/waitlist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notify, tableName }),
    })
    return !res.error
  }

  // ── Reservations ──────────────────────────────────────────────────────────────
  async getReservations(date?: string): Promise<Reservation[]> {
    const query = date ? `?date=${date}` : ''
    const res = await this.request<any[]>(`/api/reservations${query}`)
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((r) => ({
        id: r.id,
        guestName: r.guestName,
        guestPhone: r.guestPhone,
        partySize: r.partySize || 2,
        scheduledAt: r.scheduledAt,
        status: r.status || 'CONFIRMED',
        tableName: r.table?.name,
        tableId: r.tableId,
        notes: r.notes,
      }))
    }
    return []
  }

  async createReservation(params: {
    guestName: string
    guestPhone: string
    partySize: number
    scheduledAt: string
    notes?: string
    tableId?: string
  }): Promise<{ success: boolean; error?: string }> {
    const res = await this.request('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    if (res.data) return { success: true }
    return { success: false, error: res.error || 'Failed to create reservation' }
  }

  async updateReservationStatus(id: string, status: string): Promise<boolean> {
    const res = await this.request(`/api/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return !res.error
  }

  // ── Stock & Inventory ─────────────────────────────────────────────────────────
  async getInventory(): Promise<InventoryItem[]> {
    const res = await this.request<any>('/api/inventory')
    const items = Array.isArray(res.data) ? res.data : res.data?.items || []
    if (Array.isArray(items)) {
      return items.map((i: any) => ({
        id: i.id,
        name: i.name,
        category: i.category || 'Kitchen',
        currentStock: Number(i.currentStock || 0),
        minStock: Number(i.minStock || 0),
        parStock: Number(i.parStock || 0),
        unit: i.unit || 'units',
        unitCost: Number(i.unitCost || 0),
      }))
    }
    return []
  }

  async adjustInventoryStock(
    itemId: string,
    quantity: number,
    type: 'STOCK_IN' | 'WASTE' | 'ADJUSTMENT',
    notes?: string
  ): Promise<boolean> {
    const res = await this.request(`/api/inventory/${itemId}/transactions`, {
      method: 'POST',
      body: JSON.stringify({ type, quantity, notes }),
    })
    return !res.error
  }

  // ── Attendance & Workforce ────────────────────────────────────────────────────
  async getAttendance(): Promise<AttendanceEntry[]> {
    // Correct endpoint: /api/attendance?activeOnly=true
    const res = await this.request<any[]>('/api/attendance?activeOnly=true')
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((e) => {
        const start = new Date(e.clockIn || e.createdAt || Date.now()).getTime()
        const durationMins = Math.max(1, Math.round((Date.now() - start) / 60000))
        return {
          id: e.id,
          employeeName: e.employee?.user?.name || 'Staff Member',
          jobTitle: e.employee?.jobTitle || e.employee?.user?.role || 'Team Member',
          clockedInAt: new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          durationMinutes: durationMins,
          employeeId: e.employeeId,
          status: e.status || 'ACTIVE',
        }
      })
    }
    return []
  }

  // ── Shift Approvals ───────────────────────────────────────────────────────────
  async getPendingShiftApprovals(): Promise<PendingShiftApproval[]> {
    const res = await this.request<any[]>('/api/shifts/swap?status=PENDING_MANAGER')
    if (res.data && Array.isArray(res.data)) {
      return res.data.map((trade) => ({
        id: trade.id,
        requesterName: trade.requester?.user?.name || 'Staff Member',
        targetName: trade.target?.user?.name || 'Colleague',
        shiftDate: trade.requesterShift?.scheduledStart
          ? new Date(trade.requesterShift.scheduledStart).toLocaleDateString()
          : 'Today',
        shiftTime: trade.requesterShift?.scheduledStart
          ? new Date(trade.requesterShift.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Upcoming Shift',
        reason: trade.reason || undefined,
      }))
    }
    return []
  }

  async resolveShiftApproval(id: string, approve: boolean): Promise<boolean> {
    const res = await this.request(`/api/shifts/swap/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: approve ? 'APPROVE' : 'DENY' }),
    })
    return !res.error
  }

  // ── Customer CRM & Loyalty ────────────────────────────────────────────────────
  async getCustomers(query?: string): Promise<CustomerProfile[]> {
    const qParam = query ? `?q=${encodeURIComponent(query)}` : ''
    const res = await this.request<any>(`/api/customers${qParam}`)
    const list = Array.isArray(res.data) ? res.data : res.data?.customers || []
    if (Array.isArray(list)) {
      return list.map((c: any) => ({
        id: c.id,
        name: c.name || 'Guest',
        phone: c.phone,
        email: c.email,
        totalVisits: c.visitCount || c._count?.orders || 1,
        totalSpent: Number(c.totalSpend || c.lifetimeSpend || 0),
        loyaltyPoints: c.pointsBalance || c.loyaltyPoints || 0,
        tierName: c.tier?.name || 'Standard Guest',
        lastVisitAt: c.lastVisitAt,
        allergyTags: c.allergyTags,
        notes: c.notes,
      }))
    }
    return []
  }

  async addLoyaltyPoints(customerId: string, points: number, reason: string): Promise<boolean> {
    const res = await this.request(`/api/customers/${customerId}/loyalty`, {
      method: 'POST',
      body: JSON.stringify({ points, reason }),
    })
    return !res.error
  }

  // ── AI Copilot (Resto IQ) ─────────────────────────────────────────────────────
  async askAiCopilot(prompt: string, history: any[] = []): Promise<string> {
    const res = await this.request<any>('/api/ai/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, history, mode: 'operator' }),
    })
    if (res.data?.reply) return res.data.reply
    if (res.data?.response) return res.data.response
    if (res.data?.message) return res.data.message
    if (res.error) return `Error: ${res.error}`
    return 'Resto IQ processed your request successfully.'
  }

  // ── Locations & Multi-Location ────────────────────────────────────────────────
  async getLocations(): Promise<RestaurantLocation[]> {
    const res = await this.request<any>('/api/locations')
    const list = Array.isArray(res.data) ? res.data : res.data?.locations || []
    if (Array.isArray(list)) {
      return list.map((l: any) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        phone: l.phone,
        isHeadquarters: !!l.isHeadquarters,
        tablesCount: l._count?.tables || 0,
        employeesCount: l._count?.employees || 0,
      }))
    }
    return []
  }

  // ── Reports & Dashboard KPIs ──────────────────────────────────────────────────
  async getReports(): Promise<any> {
    const res = await this.request<any>('/api/reports')
    return res.data
  }

  async getServerKpis(): Promise<any> {
    const res = await this.request<any>('/api/server/kpi')
    return res.data
  }

  async getOwnerDashboardStats(): Promise<OwnerStats> {
    const [reportsRes, ordersRes, tablesRes, attendanceRes, approvalsRes] =
      await Promise.allSettled([
        this.getReports(),
        this.getOrders(),
        this.getTables(),
        this.getAttendance(),
        this.getPendingShiftApprovals(),
      ])

    const reports = reportsRes.status === 'fulfilled' ? reportsRes.value : null
    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : []
    const tables = tablesRes.status === 'fulfilled' ? tablesRes.value : []
    const attendance = attendanceRes.status === 'fulfilled' ? attendanceRes.value : []
    const approvals = approvalsRes.status === 'fulfilled' ? approvalsRes.value : []

    const openOrders = orders.filter(
      (o) => o.status !== 'PAID' && o.status !== 'VOIDED' && o.status !== 'CLOSED'
    )
    const openOrdersValue = openOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const occupiedTables = tables.filter((t) => t.isOccupied)
    const todaySales = reports?.summary?.total
      ? Number(reports.summary.total)
      : orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const laborCostPercent = reports?.summary?.laborPercentage
      ? Number(reports.summary.laborPercentage)
      : 28.5

    return {
      todaySales,
      salesGrowthPercent: reports?.summary?.salesGrowth ?? 0,
      openOrdersCount: openOrders.length,
      openOrdersValue,
      occupiedTablesCount: occupiedTables.length,
      totalTablesCount: Math.max(tables.length, 1),
      laborCostPercent,
      activeStaffCount: attendance.length,
      pendingApprovals: approvals,
    }
  }

  // ── Notifications ────────────────────────────────────────────────────────────
  async getNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
    const res = await this.request<any>('/api/notifications')
    if (res.data?.notifications) {
      return {
        notifications: res.data.notifications,
        unreadCount: res.data.unreadCount || 0,
      }
    }
    return { notifications: [], unreadCount: 0 }
  }

  // ── Health Check ──────────────────────────────────────────────────────────────
  async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now()
    const res = await this.request('/api/health')
    const latencyMs = Date.now() - start
    return { ok: !res.error, latencyMs }
  }
}


export const Api = new ApiClient()
