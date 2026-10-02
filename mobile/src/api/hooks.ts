/**
 * Centralized TanStack Query hooks for all API data.
 * These replace raw useState + useEffect + Api.xyz() patterns.
 *
 * Benefits:
 *  - Automatic background refetch
 *  - Loading / error states built-in
 *  - Optimistic updates
 *  - Shared cache across screens
 */

import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { Api } from './client'
import { OrderItem, RestaurantTable, TableStatus } from '../types/models'

// ── Query Keys ────────────────────────────────────────────────────────────────
export const QK = {
  tables: ['tables'] as const,
  menuItems: ['menuItems'] as const,
  orders: (statuses?: string[]) => ['orders', statuses] as const,
  kdsTickets: (station: string) => ['kdsTickets', station] as const,
  waitlist: ['waitlist'] as const,
  reservations: (date?: string) => ['reservations', date] as const,
  inventory: ['inventory'] as const,
  attendance: ['attendance'] as const,
  customers: (q?: string) => ['customers', q] as const,
  onlineOrders: (status?: string) => ['onlineOrders', status] as const,
  ownerStats: ['ownerStats'] as const,
  shiftApprovals: ['shiftApprovals'] as const,
} as const

// ── Tables ────────────────────────────────────────────────────────────────────
export function useTables(refetchInterval?: number) {
  return useQuery({
    queryKey: QK.tables,
    queryFn: () => Api.getTables(),
    refetchInterval: refetchInterval ?? 30_000, // 30s auto-refresh
    staleTime: 10_000,
  })
}

export function useUpdateTableStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tableId,
      status,
      force = true,
    }: {
      tableId: string
      status: TableStatus
      force?: boolean
    }) => Api.updateTableStatus(tableId, status, force),
    onMutate: async ({ tableId, status }) => {
      await qc.cancelQueries({ queryKey: QK.tables })
      const previousTables = qc.getQueryData<RestaurantTable[]>(QK.tables)
      if (previousTables) {
        qc.setQueryData<RestaurantTable[]>(QK.tables, (old) =>
          (old || []).map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  status,
                  isOccupied: status === 'ACTIVE' || status === 'PAYING',
                }
              : t
          )
        )
      }
      return { previousTables }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTables) {
        qc.setQueryData(QK.tables, context.previousTables)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.tables })
    },
  })
}


// ── Menu Items ────────────────────────────────────────────────────────────────
export function useMenuItems() {
  return useQuery({
    queryKey: QK.menuItems,
    queryFn: () => Api.getMenuItems(),
    staleTime: 60_000, // menu doesn't change often
  })
}

// ── KDS Tickets ───────────────────────────────────────────────────────────────
export function useKdsTickets(station: string, refetchInterval?: number) {
  return useQuery({
    queryKey: QK.kdsTickets(station),
    queryFn: () => Api.getKdsTickets(station),
    refetchInterval: refetchInterval ?? 10_000, // 10s auto-refresh for kitchen
    staleTime: 5_000,
  })
}

export function useBumpTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: string) => Api.bumpKdsTicket(ticketId),
    onMutate: async (ticketId) => {
      // Optimistic: remove ticket immediately from all station caches
      await qc.cancelQueries({ queryKey: ['kdsTickets'] })
      const previousData = qc.getQueriesData({ queryKey: ['kdsTickets'] })
      qc.setQueriesData({ queryKey: ['kdsTickets'] }, (old: any) =>
        Array.isArray(old) ? old.filter((t: any) => t.id !== ticketId) : old
      )
      return { previousData }
    },
    onError: (_err, _ticketId, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => qc.setQueryData(key, data))
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['kdsTickets'] })
    },
  })
}

export function useRecallTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: string) => Api.updateKdsTicketStatus(ticketId, 'IN_PROGRESS'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kdsTickets'] })
    },
  })
}

// ── Orders ────────────────────────────────────────────────────────────────────
export function useOrders(statuses?: string[]) {
  return useQuery({
    queryKey: QK.orders(statuses),
    queryFn: () => Api.getOrders(statuses),
    refetchInterval: 20_000,
    staleTime: 5_000,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { tableId: string; guestCount: number; items: OrderItem[]; notes?: string }) =>
      Api.createOrder(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.tables })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kdsTickets'] })
    },
  })
}

export function useVoidOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      Api.voidOrder(orderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.tables })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kdsTickets'] })
    },
  })
}

// ── Waitlist ──────────────────────────────────────────────────────────────────
export function useWaitlist() {
  return useQuery({
    queryKey: QK.waitlist,
    queryFn: () => Api.getWaitlist(),
    refetchInterval: 15_000,
  })
}

export function useAddWaitlistEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      guestName: string
      guestPhone: string
      partySize: number
      quotedWaitMins: number
      notes?: string
    }) => Api.addWaitlistEntry(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.waitlist })
    },
  })
}

export function useUpdateWaitlistStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      notify = false,
      tableName,
    }: {
      id: string
      status: 'WAITING' | 'SEATED' | 'LEFT'
      notify?: boolean
      tableName?: string
    }) => Api.updateWaitlistStatus(id, status, notify, tableName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.waitlist })
      qc.invalidateQueries({ queryKey: QK.tables })
    },
  })
}

// ── Reservations ──────────────────────────────────────────────────────────────
export function useReservations(date?: string) {
  return useQuery({
    queryKey: QK.reservations(date),
    queryFn: () => Api.getReservations(date),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

export function useUpdateReservationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      Api.updateReservationStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
    },
  })
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export function useInventory() {
  return useQuery({
    queryKey: QK.inventory,
    queryFn: () => Api.getInventory(),
    refetchInterval: 60_000, // 1 min
    staleTime: 30_000,
  })
}

// ── Attendance ────────────────────────────────────────────────────────────────
export function useAttendance() {
  return useQuery({
    queryKey: QK.attendance,
    queryFn: () => Api.getAttendance(),
    refetchInterval: 30_000,
  })
}

// ── Shift Approvals ───────────────────────────────────────────────────────────
export function useShiftApprovals() {
  return useQuery({
    queryKey: QK.shiftApprovals,
    queryFn: () => Api.getPendingShiftApprovals(),
    refetchInterval: 30_000,
  })
}

export function useResolveShiftApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      Api.resolveShiftApproval(id, approve),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.shiftApprovals })
      qc.invalidateQueries({ queryKey: QK.ownerStats })
    },
  })
}

// ── Customers ─────────────────────────────────────────────────────────────────
export function useCustomers(query?: string) {
  return useQuery({
    queryKey: QK.customers(query),
    queryFn: () => Api.getCustomers(query),
    staleTime: 30_000,
  })
}

// ── Online Orders ─────────────────────────────────────────────────────────────
export function useOnlineOrders(status?: string) {
  return useQuery({
    queryKey: QK.onlineOrders(status),
    queryFn: () => Api.getOnlineOrders(status),
    refetchInterval: 15_000,
  })
}

export function useUpdateOnlineOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      Api.updateOnlineOrderStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onlineOrders'] })
      qc.invalidateQueries({ queryKey: ['kdsTickets'] })
    },
  })
}

// ── Owner Dashboard Stats ─────────────────────────────────────────────────────
export function useOwnerStats() {
  return useQuery({
    queryKey: QK.ownerStats,
    queryFn: () => Api.getOwnerDashboardStats(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

// ── Menu 86 Toggle ────────────────────────────────────────────────────────────
export function useToggle86() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is86d }: { id: string; is86d: boolean }) =>
      Api.toggle86Item(id, is86d),
    onMutate: async ({ id, is86d }) => {
      await qc.cancelQueries({ queryKey: QK.menuItems })
      const previous = qc.getQueryData(QK.menuItems)
      qc.setQueryData(QK.menuItems, (old: any) =>
        Array.isArray(old) ? old.map((item: any) => item.id === id ? { ...item, is86d } : item) : old
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QK.menuItems, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.menuItems }),
  })
}

// ── Menu Availability Toggle ──────────────────────────────────────────────────
export function useToggleAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      Api.toggleMenuItemAvailability(id, isAvailable),
    onMutate: async ({ id, isAvailable }) => {
      await qc.cancelQueries({ queryKey: QK.menuItems })
      const previous = qc.getQueryData(QK.menuItems)
      qc.setQueryData(QK.menuItems, (old: any) =>
        Array.isArray(old) ? old.map((item: any) => item.id === id ? { ...item, isAvailable } : item) : old
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QK.menuItems, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.menuItems }),
  })
}

// ── Payments ──────────────────────────────────────────────────────────────────
export function useCollectPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      orderId: string
      method: 'CASH' | 'CARD'
      subtotal: number
      tax: number
      tip: number
      total: number
      cashReceived?: number
      cashChange?: number
      stripePaymentIntentId?: string
    }) => Api.collectPayment(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.tables })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: QK.ownerStats })
    },
  })
}

export function useCollectCashPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { orderId: string; cashReceived: number; tip?: number }) =>
      Api.collectCashPayment(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.tables })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: QK.ownerStats })
    },
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => Api.getNotifications(),
    refetchInterval: 15_000,
    staleTime: 5_000,
  })
}


// ── Shared QueryClient ────────────────────────────────────────────────────────
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false, // React Native doesn't have windows
      refetchOnReconnect: true,
    },
  },
})
