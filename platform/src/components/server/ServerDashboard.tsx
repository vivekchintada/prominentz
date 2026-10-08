'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import DreamPosShell, { NavGroup, QuickLink } from '@/components/layout/DreamPosShell'

/* ── Types ────────────────────────────────────────────────── */
export interface TableSummary {
  id: string
  name: string
  status: string
  capacity: number
  floor?: string
  order: {
    id: string
    status: string
    guestCount: number
    itemCount: number
    total: number
    elapsedMins: number
  } | null
}

interface CurrentUser {
  id: string
  name: string
  role: string
  email: string
}

interface Kpi {
  todayRevenue: number
  openChecks: number
  locationName: string
}

interface Props {
  currentUser: CurrentUser
  locationId: string
  kpi: Kpi
  onSignOut: () => void
}

type MeaningfulTableState =
  | 'Available'
  | 'Ordering'
  | 'Sent to kitchen'
  | 'Ready'
  | 'Payment due'
  | 'Reserved'

/* ── State Resolvers ──────────────────────────────────────── */
function resolveTableState(table: TableSummary): {
  state: MeaningfulTableState
  label: string
  color: string
  bg: string
  borderColor: string
} {
  if (table.status === 'RESERVED') {
    return {
      state: 'Reserved',
      label: 'Reserved',
      color: '#3B82F6',
      bg: '#EFF6FF',
      borderColor: '#BFDBFE',
    }
  }

  if (!table.order) {
    return {
      state: 'Available',
      label: 'Available',
      color: '#16B364',
      bg: '#EAF8F0',
      borderColor: '#A6F4C5',
    }
  }

  const orderStatus = table.order.status
  if (orderStatus === 'READY' || orderStatus === 'PARTIALLY_READY') {
    return {
      state: 'Ready',
      label: orderStatus === 'PARTIALLY_READY' ? 'Part Ready' : 'Ready',
      color: '#16B364',
      bg: '#EAF8F0',
      borderColor: '#16B364',
    }
  }

  if (orderStatus === 'PAYING' || table.status === 'PAYING') {
    return {
      state: 'Payment due',
      label: 'Payment Due',
      color: '#F79009',
      bg: '#FFF4E5',
      borderColor: '#FEDF89',
    }
  }

  if (orderStatus === 'SENT_TO_KITCHEN') {
    return {
      state: 'Sent to kitchen',
      label: 'Sent to Kitchen',
      color: '#F79009',
      bg: '#FFF4E5',
      borderColor: '#FDB022',
    }
  }

  return {
    state: 'Ordering',
    label: 'Ordering',
    color: '#6547F5',
    bg: '#EEEAFE',
    borderColor: '#D3C8FE',
  }
}

function resolveSection(table: TableSummary): string {
  const name = table.name.toLowerCase()
  const floor = (table.floor || '').toLowerCase()

  if (name.includes('bar') || floor.includes('bar')) return 'Bar'
  if (name.includes('patio') || floor.includes('patio') || name.startsWith('p')) return 'Patio'
  if (name.includes('private') || name.includes('room') || floor.includes('private')) return 'Private Room'
  return 'Main Dining'
}

/* ── Component ────────────────────────────────────────────── */
export default function ServerDashboard({ currentUser, locationId, kpi, onSignOut }: Props) {
  const [tables, setTables] = useState<TableSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState<string>('dashboard')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Available' | 'Active' | 'Ready'>('ALL')
  const [sectionFilter, setSectionFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [assistanceMap, setAssistanceMap] = useState<
    Record<string, { tableId: string; tableName?: string; type: string; notes?: string; requestedAt: string }>
  >({})

  // Shift & Break state
  const [clockStatus, setClockStatus] = useState<{
    isClockedIn: boolean
    shift: { id: string; clockIn: string; elapsedMinutes: number } | null
  }>({ isClockedIn: true, shift: null })
  const [onBreak, setOnBreak] = useState(false)

  // 86'd & Menu Items state
  const [allMenuItems, setAllMenuItems] = useState<any[]>([])
  const [eightySixedItems, setEightySixedItems] = useState<Array<{ id: string; name: string; category?: { name: string } }>>([])
  const [eightySixedDismissed, setEightySixedDismissed] = useState(false)
  const [menuSearchQuery, setMenuSearchQuery] = useState('')
  const [menuDietaryFilter, setMenuDietaryFilter] = useState<'ALL' | 'VEG' | '86D'>('ALL')

  // Table Transfer Modal state
  const [transferModal, setTransferModal] = useState<{
    isOpen: boolean
    orderId: string
    currentTableId: string
    currentTableName: string
  } | null>(null)
  const [transferTargetTableId, setTransferTargetTableId] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Shift Reservations state
  const [isReservationsModalOpen, setIsReservationsModalOpen] = useState(false)
  const [reservations, setReservations] = useState<any[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(false)

  // Read-only Kitchen Status Modal state
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false)
  const [kitchenTickets, setKitchenTickets] = useState<any[]>([])
  const [kitchenLoading, setKitchenLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /* ── Chime Alert ────────────────────────────────────────── */
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12) // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  /* ── Data Fetching ──────────────────────────────────────── */
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/server/tables')
      if (res.ok) {
        const data = await res.json()
        setTables(data)
      }
    } catch (err) {
      console.error('Failed to load server tables', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAssistance = useCallback(async () => {
    try {
      const res = await fetch(`/api/table-order/assistance?locationId=${locationId}`)
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, any> = {}
        data.requests?.forEach((r: unknown) => {
          map[r.tableId] = r
        })
        setAssistanceMap(map)
      }
    } catch (err) {
      console.error('Failed to fetch assistance requests', err)
    }
  }, [locationId])

  const fetchClock = useCallback(async () => {
    try {
      const res = await fetch('/api/server/clock')
      if (res.ok) {
        const data = await res.json()
        setClockStatus({
          isClockedIn: data.isClockedIn,
          shift: data.shift,
        })
      }
    } catch {}
  }, [])

  const fetchEightySixed = useCallback(async () => {
    try {
      const res = await fetch('/api/menu/items?includeUnavailable=true')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setAllMenuItems(data)
          setEightySixedItems(data.filter((item: unknown) => !item.isAvailable))
        }
      }
    } catch (err) {
      console.error('Failed to load 86d items', err)
    }
  }, [])

  const handleTransferTable = async () => {
    if (!transferModal || !transferTargetTableId) return
    try {
      setTransferring(true)
      const res = await fetch(`/api/orders/${transferModal.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: transferTargetTableId }),
      })
      if (res.ok) {
        setTransferModal(null)
        setTransferTargetTableId('')
        fetchTables()
      }
    } catch (err) {
      console.error('Failed to transfer table', err)
    } finally {
      setTransferring(false)
    }
  }

  const fetchReservations = useCallback(async () => {
    try {
      setReservationsLoading(true)
      const res = await fetch('/api/reservations')
      if (res.ok) {
        const data = await res.json()
        setReservations(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load reservations', err)
    } finally {
      setReservationsLoading(false)
    }
  }, [])

  const fetchKitchenTickets = async () => {
    try {
      setKitchenLoading(true)
      const res = await fetch('/api/kds/tickets')
      if (res.ok) {
        const data = await res.json()
        setKitchenTickets(data)
      }
    } catch {
    } finally {
      setKitchenLoading(false)
    }
  }

  const handleAcknowledgeAssistance = async (tableId: string) => {
    try {
      await fetch('/api/table-order/assistance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, tableId }),
      })
      setAssistanceMap((prev) => {
        const next = { ...prev }
        delete next[tableId]
        return next
      })
    } catch (err) {
      console.error('Failed to acknowledge assistance', err)
    }
  }

  const handleMarkOrderServed = async (orderId: string, tableId: string) => {
    try {
      // Optimistic instant UI update
      setTables((prev) =>
        prev.map((t) => (t.id === tableId && t.order ? { ...t, order: { ...t.order, status: 'OPEN' } } : t))
      )
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OPEN' }),
      })
      if (res.ok) {
        fetchTables()
      }
    } catch (err) {
      console.error('Failed to mark order served', err)
    }
  }

  const handleToggleBreak = () => {
    setOnBreak((prev) => !prev)
  }

  useEffect(() => {
    fetchTables()
    fetchAssistance()
    fetchClock()
    fetchEightySixed()
    fetchReservations()

    const interval = setInterval(() => {
      fetchTables()
      fetchAssistance()
      fetchEightySixed()
    }, 20000)

    // SSE connection for real-time order, menu, reservation & assistance updates
    let es: EventSource | null = null
    const connectSSE = () => {
      es = new EventSource('/api/events')
      es.addEventListener('order.created', () => fetchTables())
      es.addEventListener('order.sent_to_kitchen', () => fetchTables())
      es.addEventListener('payment.processed', () => fetchTables())
      es.addEventListener('ticket.status.updated', () => fetchTables())
      es.addEventListener('table.status.changed', () => fetchTables())
      es.addEventListener('menu.item.updated', () => fetchEightySixed())
      es.addEventListener('reservation.created', () => fetchReservations())
      es.addEventListener('reservation.updated', () => fetchReservations())
      es.addEventListener('table.assistance.requested', (e: unknown) => {
        try {
          const payload = JSON.parse(e.data)
          setAssistanceMap((prev) => ({ ...prev, [payload.tableId]: payload }))
          playChime()
        } catch {}
      })
      es.addEventListener('table.assistance.acknowledged', (e: unknown) => {
        try {
          const payload = JSON.parse(e.data)
          setAssistanceMap((prev) => {
            const next = { ...prev }
            delete next[payload.tableId]
            return next
          })
        } catch {}
      })
      es.onerror = () => {
        es?.close()
        setTimeout(connectSSE, 4000)
      }
    }
    connectSSE()

    return () => {
      clearInterval(interval)
      es?.close()
    }
  }, [fetchTables, fetchAssistance, fetchClock, fetchEightySixed, fetchReservations])

  /* ── Derived Metrics ────────────────────────────────────── */
  const activeTablesList = useMemo(() => tables.filter((t) => t.order !== null), [tables])
  const openChecksList   = useMemo(() => tables.filter((t) => t.order && !['PAID', 'VOIDED'].includes(t.order.status)), [tables])
  const readyOrdersList  = useMemo(() => tables.filter((t) => t.order && ['READY', 'PARTIALLY_READY'].includes(t.order.status)), [tables])
  const availableTables  = useMemo(() => tables.filter((t) => t.order === null && t.status !== 'RESERVED'), [tables])

  // Filtered tables based on status filter pills, section filter & search
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const { state } = resolveTableState(table)
      const section = resolveSection(table)

      if (statusFilter === 'Available' && state !== 'Available') return false
      if (statusFilter === 'Active' && table.order === null) return false
      if (statusFilter === 'Ready' && state !== 'Ready') return false

      if (sectionFilter !== 'ALL' && section !== sectionFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = table.name.toLowerCase().includes(q)
        const matchesSection = section.toLowerCase().includes(q)
        if (!matchesName && !matchesSection) return false
      }

      return true
    })
  }, [tables, statusFilter, sectionFilter, searchQuery])

  // Group filtered tables by Section
  const groupedSections = useMemo(() => {
    const sections: Record<string, TableSummary[]> = {
      'Main Dining': [],
      'Patio': [],
      'Bar': [],
      'Private Room': [],
    }

    filteredTables.forEach((table) => {
      const s = resolveSection(table)
      if (!sections[s]) sections[s] = []
      sections[s].push(table)
    })

    return sections
  }, [filteredTables])

  /* ── Navigation Definition ──────────────────────────────── */
  const urgentCount = readyOrdersList.length + Object.keys(assistanceMap).length

  const navGroups: NavGroup[] = [
    {
      id: 'main',
      label: 'MAIN',
      railIcon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ),
        },
        {
          id: 'floor',
          label: 'Table Floor',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M6 12v6M18 12v6M4 8V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
            </svg>
          ),
        },
        {
          id: 'orders',
          label: 'My Orders',
          badge: openChecksList.length > 0 ? openChecksList.length : undefined,
          badgeVariant: 'primary',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          ),
        },
        {
          id: 'alerts',
          label: 'Alerts',
          badge: urgentCount > 0 ? urgentCount : undefined,
          badgeVariant: urgentCount > 0 ? 'danger' : undefined,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          ),
        },
        {
          id: 'reservations',
          label: 'Reservations',
          badge: reservations.filter((r) => r.status !== 'CANCELLED').length > 0 ? reservations.filter((r) => r.status !== 'CANCELLED').length : undefined,
          badgeVariant: 'primary',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
            </svg>
          ),
        },
        {
          id: 'menu',
          label: "86'd & Menu",
          badge: eightySixedItems.length > 0 ? eightySixedItems.length : undefined,
          badgeVariant: 'danger',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-4.5a1 1 0 0 1-2 0V7a1 1 0 0 1 2 0z" />
            </svg>
          ),
        },
        {
          id: 'shifts',
          label: 'My Shifts',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ),
        },
        {
          id: 'availability',
          label: 'Availability',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
        },
      ],
    },
  ]

  const quickLinks: QuickLink[] = [
    {
      id: 'pos',
      label: 'POS',
      href: '/pos',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: 'Orders',
      active: activeNav === 'orders',
      onClick: () => setActiveNav('orders'),
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
    {
      id: 'kitchen-status',
      label: 'Kitchen Status',
      readOnlyBadge: 'Read Only',
      onClick: () => {
        setIsKitchenModalOpen(true)
        fetchKitchenTickets()
      },
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
        </svg>
      ),
    },
    {
      id: 'reservations',
      label: 'Shift Bookings',
      active: isReservationsModalOpen,
      onClick: () => {
        setIsReservationsModalOpen(true)
        fetchReservations()
      },
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
        </svg>
      ),
    },
    {
      id: 'table',
      label: 'Table Floor',
      active: activeNav === 'floor',
      onClick: () => setActiveNav('floor'),
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M6 12v6M18 12v6" />
        </svg>
      ),
    },
  ]

  return (
    <DreamPosShell
      role="SERVER"
      workstationTitle="Server Floor"
      user={currentUser}
      navGroups={navGroups}
      activeNavId={activeNav}
      onSelectNav={(id) => setActiveNav(id)}
      quickLinks={quickLinks}
      onSignOut={onSignOut}
      topBarRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Offline Sync Queue Indicator */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: isOnline ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.15)',
              color: isOnline ? 'var(--brand-emerald, #059669)' : 'var(--brand-amber, #d97706)',
              border: isOnline ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(217, 119, 6, 0.3)',
              fontSize: '12px',
              fontWeight: 700,
            }}
            title={isOnline ? 'Online - All tickets and sync events real-time connected' : 'Offline - Actions queued locally and will auto-sync upon reconnection'}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isOnline ? 'var(--brand-emerald, #059669)' : 'var(--brand-amber, #d97706)',
              }}
            />
            {isOnline ? 'Cloud Synced' : 'Offline Queue'}
          </span>

          {/* Clock In Status Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: clockStatus.isClockedIn ? 'var(--success-soft)' : 'var(--danger-soft)',
              color: clockStatus.isClockedIn ? 'var(--success)' : 'var(--danger)',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: clockStatus.isClockedIn ? 'var(--success)' : 'var(--danger)',
              }}
            />
            {clockStatus.isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </span>

          {/* Break Status Button */}
          {clockStatus.isClockedIn && (
            <button
              onClick={handleToggleBreak}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: onBreak ? '1px solid var(--warning)' : '1px solid var(--border)',
                backgroundColor: onBreak ? 'var(--warning-soft)' : 'var(--surface)',
                color: onBreak ? 'var(--warning)' : 'var(--text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{onBreak ? 'End Break' : 'Start Break'}</span>
            </button>
          )}
        </div>
      }
    >
      <div style={{ padding: '24px 28px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        {/* ── Server Floor Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {activeNav === 'dashboard'
                ? 'Server Shift Cockpit'
                : activeNav === 'floor'
                ? 'Dining Room Floor Plan'
                : activeNav === 'orders'
                ? 'My Orders & Checks'
                : activeNav === 'alerts'
                ? 'Service Alerts & Expo Pass'
                : 'My Shifts & Attendance'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {activeNav === 'dashboard'
                ? `${kpi.locationName} · Shift Cockpit · ${currentUser.name}`
                : activeNav === 'floor'
                ? `${kpi.locationName} · ${tables.length} Total Tables (${activeTablesList.length} Occupied, ${availableTables.length} Free)`
                : activeNav === 'orders'
                ? `${openChecksList.length} Open checks across all tables`
                : activeNav === 'alerts'
                ? `${readyOrdersList.length + Object.keys(assistanceMap).length} Active alerts waiting`
                : `Logged in as ${currentUser.name}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeNav === 'dashboard' ? (
              <button
                onClick={() => setActiveNav('floor')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(101, 71, 245, 0.2)',
                }}
              >
                <span>🗺️</span>
                <span>Open Floor Plan</span>
              </button>
            ) : activeNav === 'floor' ? (
              <button
                onClick={() => setActiveNav('dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>←</span>
                <span>Back to Cockpit</span>
              </button>
            ) : null}

            <button
              onClick={() => {
                setIsReservationsModalOpen(true)
                fetchReservations()
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
              </svg>
              <span>Shift Bookings ({reservations.filter((r) => r.status !== 'CANCELLED').length})</span>
            </button>

            <button
              onClick={() => {
                fetchTables()
                fetchAssistance()
                fetchEightySixed()
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Live 86'd Items Bulletin Bar ── */}
        {eightySixedItems.length > 0 && !eightySixedDismissed && (
          <div
            style={{
              backgroundColor: '#FEF3F2',
              border: '1.5px solid #FECDCA',
              borderRadius: '14px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(240, 68, 56, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: '#F04438',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                <span>🚫</span>
                <span>86&apos;d TODAY (SOLD OUT)</span>
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#B42318' }}>
                Notify guests before taking orders:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {eightySixedItems.map((item) => (
                  <span
                    key={item.id}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-bg-card)',
                      border: '1px solid #FDA29B',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#B42318',
                      textDecoration: 'line-through',
                    }}
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setEightySixedDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#98A2B3',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px',
                lineHeight: 1,
              }}
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── View: Server Shift Cockpit (Dashboard) ── */}
        {activeNav === 'dashboard' && (
          <div>
            {/* ── 4 Summary Status Cards (NO Floor Revenue) ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
          {/* 1. Active Table */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(7, 21, 46, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '120px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {activeTablesList.length}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                  Active Table{activeTablesList.length === 1 ? '' : 's'}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                setStatusFilter('Active')
                setActiveNav('floor')
              }}
              style={{
                alignSelf: 'flex-start',
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              View table →
            </button>
          </div>

          {/* 2. Open Check */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(7, 21, 46, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '120px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {openChecksList.length}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                  Open Check{openChecksList.length === 1 ? '' : 's'}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--warning-soft)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setActiveNav('orders')}
              style={{
                alignSelf: 'flex-start',
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              View check →
            </button>
          </div>

          {/* 3. Ready Order */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: readyOrdersList.length > 0 ? '1.5px solid var(--success)' : '1px solid var(--border)',
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: readyOrdersList.length > 0 ? '0 2px 10px rgba(22, 179, 100, 0.15)' : '0 1px 3px rgba(7, 21, 46, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '120px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: readyOrdersList.length > 0 ? 'var(--success)' : 'var(--text)', letterSpacing: '-0.03em' }}>
                  {readyOrdersList.length}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                  Ready Order{readyOrdersList.length === 1 ? '' : 's'}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success-soft)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                setStatusFilter('Ready')
                setActiveNav('floor')
              }}
              style={{
                alignSelf: 'flex-start',
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: readyOrdersList.length > 0 ? 'var(--success)' : 'var(--primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              Serve now →
            </button>
          </div>

          {/* 4. Available */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(7, 21, 46, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '120px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {availableTables.length}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                  Available Table{availableTables.length === 1 ? '' : 's'}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--canvas)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="4" rx="1" />
                  <path d="M6 12v6M18 12v6" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                setStatusFilter('Available')
                setActiveNav('floor')
              }}
              style={{
                alignSelf: 'flex-start',
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              View floor →
            </button>
          </div>
        </div>

        {/* ── 5. Urgent Service Panel ("Needs attention") ── */}
        {(readyOrdersList.length > 0 || Object.keys(assistanceMap).length > 0) && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1.5px solid var(--warning)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              boxShadow: '0 4px 16px rgba(247, 144, 9, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--warning-soft)',
                    color: 'var(--warning)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>Needs attention</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--warning-soft)',
                  color: 'var(--warning)',
                }}
              >
                {readyOrdersList.length + Object.keys(assistanceMap).length} Active Alert{readyOrdersList.length + Object.keys(assistanceMap).length === 1 ? '' : 's'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Ready orders to serve */}
              {readyOrdersList.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--canvas)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--success)',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      — Order ready for {Math.max(1, t.order?.elapsedMins ?? 1)} minute{t.order?.elapsedMins === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      href={`/pos?table=${t.id}`}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => t.order && handleMarkOrderServed(t.order.id, t.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--success)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Mark Served
                    </button>
                  </div>
                </div>
              ))}

              {/* QR Assistance requests */}
              {Object.values(assistanceMap).map((req) => (
                <div
                  key={req.tableId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--canvas)',
                    border: '1px solid var(--warning)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--warning)',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                      {req.tableName || `Table ${req.tableId.slice(-4)}`}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      — Guest requested {req.type === 'REQUEST_BILL' ? 'bill' : req.type === 'WATER' ? 'water' : 'waiter'}
                      {req.notes ? ` (${req.notes})` : ''}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAcknowledgeAssistance(req.tableId)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--warning)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Dashboard Two-Column Cockpit Workspace ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Active Tables Under Care */}
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '22px',
                  boxShadow: '0 1px 3px rgba(7, 21, 46, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                      Active Tables Under My Care
                    </h2>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Currently dining tables with open checks
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav('floor')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--primary-soft)',
                      color: 'var(--primary)',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Full Floor Plan</span>
                    <span>→</span>
                  </button>
                </div>

                {activeTablesList.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍽️</div>
                    <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '15px', margin: '0 0 6px' }}>
                      No active dining tables
                    </p>
                    <p style={{ fontSize: '13px', margin: '0 0 16px' }}>
                      All tables are currently clear. Seat incoming guests from the floor plan.
                    </p>
                    <button
                      onClick={() => setActiveNav('floor')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Seat Guests on Floor
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeTablesList.map((table) => {
                      const stateMeta = resolveTableState(table)
                      const isReady = stateMeta.state === 'Ready'
                      return (
                        <div
                          key={table.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: `1px solid ${isReady ? 'var(--success)' : 'var(--border)'}`,
                            borderLeft: `4px solid ${isReady ? 'var(--success)' : stateMeta.borderColor}`,
                            backgroundColor: 'var(--canvas)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>
                                {table.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  backgroundColor: stateMeta.bg,
                                  color: stateMeta.color,
                                }}
                              >
                                {stateMeta.label}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                ({resolveSection(table)})
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '10px' }}>
                              <span>👥 {table.order?.guestCount || 2} guests</span>
                              <span>·</span>
                              <span>⏱️ {table.order?.elapsedMins || 0}m seated</span>
                              <span>·</span>
                              <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                                ${(table.order?.total || 0).toFixed(2)} check
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isReady && table.order && (
                              <button
                                onClick={() => handleMarkOrderServed(table.order!.id, table.id)}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: '#16B364',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                🍽️ Delivered
                              </button>
                            )}
                            <Link
                              href={`/pos?table=${table.id}`}
                              style={{
                                padding: '7px 14px',
                                borderRadius: '8px',
                                backgroundColor: isReady ? 'var(--surface)' : 'var(--primary)',
                                color: isReady ? 'var(--text)' : '#ffffff',
                                border: isReady ? '1px solid var(--border)' : 'none',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              POS Check
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Shift Hub & Intelligence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Upcoming Shift Bookings Preview */}
                <div
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(7, 21, 46, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>📅</span>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                        Shift Bookings
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setIsReservationsModalOpen(true)
                        fetchReservations()
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      View all ({reservations.filter((r) => r.status !== 'CANCELLED').length}) →
                    </button>
                  </div>

                  {reservations.filter((r) => r.status !== 'CANCELLED').length === 0 ? (
                    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No incoming reservations for this shift.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reservations.filter((r) => r.status !== 'CANCELLED').slice(0, 3).map((r: unknown) => (
                        <div
                          key={r.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--canvas)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                              {r.guestName} ({r.partySize}p)
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              🕒 {new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.table?.name || 'Unassigned'}
                            </div>
                          </div>
                          {r.table && r.status !== 'SEATED' && (
                            <Link
                              href={`/pos?table=${r.table.id}`}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                fontSize: '11px',
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              Seat
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kitchen Status Glance */}
                <div
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(7, 21, 46, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🍳</span>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                        Kitchen Queue
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setIsKitchenModalOpen(true)
                        fetchKitchenTickets()
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Open monitor →
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                    Live kitchen tickets cooking and expo pass items ready to deliver.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── View: Table Floor Plan ── */}
        {activeNav === 'floor' && (
          <div>
            {/* Table Floor Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                  Table Floor
                </span>

                {/* Section Filter Tabs */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '3px',
                  }}
                >
                  {[
                    { id: 'ALL', label: 'All Areas' },
                    { id: 'Main Dining', label: 'Main Dining' },
                    { id: 'Patio', label: 'Patio' },
                    { id: 'Bar', label: 'Bar' },
                    { id: 'Private Room', label: 'Private' },
                  ].map((s) => {
                    const active = sectionFilter === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSectionFilter(s.id)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: active ? 'var(--primary-soft)' : 'transparent',
                          color: active ? 'var(--primary)' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>

                {/* Status Filter Pills */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '3px',
                  }}
                >
                  {(['ALL', 'Available', 'Active', 'Ready'] as const).map((filter) => {
                    const active = statusFilter === filter
                    return (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: active ? 'var(--primary)' : 'transparent',
                          color: active ? '#ffffff' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {filter === 'ALL' ? 'All' : filter}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', width: '240px' }}>
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>

            {/* ── Section Groups ── */}
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '300px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid var(--primary)',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Loading table floor...</span>
              </div>
            ) : filteredTables.length === 0 ? (
              <div
                style={{
                  padding: '48px',
                  textAlign: 'center',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>No tables found</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search or status filter.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {Object.entries(groupedSections).map(([sectionName, sectionTables]) => {
                  if (sectionTables.length === 0) return null

                  return (
                    <div key={sectionName}>
                      {/* Section Title */}
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>{sectionName}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--canvas)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {sectionTables.length} table{sectionTables.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Section Tables Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '16px',
                        }}
                      >
                        {sectionTables.map((table) => {
                          const stateMeta = resolveTableState(table)
                          const hasAssistance = !!assistanceMap[table.id]
                          const isAvailable = stateMeta.state === 'Available'

                          return (
                            <motion.div
                              key={table.id}
                              layout
                              style={{
                                backgroundColor: 'var(--surface)',
                                border: hasAssistance
                                  ? '2px solid var(--warning)'
                                  : `1px solid var(--border)`,
                                borderTop: hasAssistance
                                  ? '4px solid var(--warning)'
                                  : `4px solid ${stateMeta.borderColor}`,
                                borderRadius: '14px',
                                padding: '16px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: isAvailable ? '110px' : '180px',
                                boxShadow: hasAssistance
                                  ? '0 4px 16px rgba(247, 144, 9, 0.15)'
                                  : '0 1px 3px rgba(7, 21, 46, 0.04)',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                              }}
                            >
                              {/* Header row: Table Name + Status Chip */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                                    {table.name}
                                  </span>

                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      backgroundColor: stateMeta.bg,
                                      color: stateMeta.color,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    {stateMeta.label}
                                  </span>
                                </div>

                                {/* Seats or Guest Details */}
                                {isAvailable ? (
                                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    {table.capacity} seats
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '10px' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                                      <span>{table.order?.guestCount || 2} guests</span>
                                      <span>·</span>
                                      <span>{Math.max(0, table.order?.elapsedMins || 0)} minutes</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                      {table.order?.itemCount || 0} items
                                    </div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '12px',
                                        paddingTop: '10px',
                                        borderTop: '1px solid var(--border)',
                                      }}
                                    >
                                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        Open check
                                      </span>
                                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                                        ${(table.order?.total || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action Button */}
                              <div style={{ marginTop: isAvailable ? '12px' : '14px' }}>
                                {isAvailable ? (
                                  <Link
                                    href={`/pos?table=${table.id}`}
                                    style={{
                                      display: 'block',
                                      textAlign: 'center',
                                      padding: '7px 0',
                                      borderRadius: '8px',
                                      backgroundColor: 'var(--canvas)',
                                      border: '1px solid var(--border)',
                                      color: 'var(--text)',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      textDecoration: 'none',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    Seat Guests
                                  </Link>
                                ) : (
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {stateMeta.state === 'Ready' && table.order && (
                                      <button
                                        onClick={() => handleMarkOrderServed(table.order!.id, table.id)}
                                        style={{
                                          flex: 1,
                                          padding: '8px 0',
                                          borderRadius: '8px',
                                          backgroundColor: '#16B364',
                                          color: '#ffffff',
                                          border: 'none',
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px',
                                          boxShadow: '0 2px 6px rgba(22, 179, 100, 0.25)',
                                        }}
                                      >
                                        <span>🍽️</span>
                                        <span>Delivered</span>
                                      </button>
                                    )}
                                    <Link
                                      href={`/pos?table=${table.id}`}
                                      style={{
                                        flex: 1,
                                        display: 'block',
                                        textAlign: 'center',
                                        padding: '8px 0',
                                        borderRadius: '8px',
                                        backgroundColor: stateMeta.state === 'Ready' ? 'var(--canvas)' : 'var(--primary)',
                                        color: stateMeta.state === 'Ready' ? 'var(--text)' : '#ffffff',
                                        border: stateMeta.state === 'Ready' ? '1px solid var(--border)' : 'none',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        boxShadow: stateMeta.state === 'Ready' ? 'none' : '0 2px 6px rgba(101, 71, 245, 0.2)',
                                      }}
                                    >
                                      View Order
                                    </Link>
                                    <button
                                      onClick={() =>
                                        table.order &&
                                        setTransferModal({
                                          isOpen: true,
                                          orderId: table.order.id,
                                          currentTableId: table.id,
                                          currentTableName: table.name,
                                        })
                                      }
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--canvas)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                      title="Transfer check to another table"
                                    >
                                      ⇄ Move
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Service Alerts & Expo Pass View ── */}
        {activeNav === 'alerts' && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Service Alerts & Expo Pass Hot Pickups
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Food ready under kitchen heat lamps and guest QR service calls
                </p>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: urgentCount > 0 ? 'var(--warning-soft)' : 'var(--success-soft)',
                  color: urgentCount > 0 ? 'var(--warning)' : 'var(--success)',
                }}
              >
                {urgentCount > 0 ? `${urgentCount} Active Alerts` : 'All Caught Up'}
              </span>
            </div>

            {urgentCount === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
                  All clear at the pass!
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  No hot food waiting to be delivered and no pending guest assistance requests.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Ready orders to serve */}
                {readyOrdersList.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--canvas)',
                      border: '1.5px solid var(--success)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--success)',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                          {t.name} · Food Ready at Kitchen Pass
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Under heat lamps for {Math.max(1, t.order?.elapsedMins ?? 1)} minutes · {t.order?.itemCount || 0} items
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link
                        href={`/pos?table=${t.id}`}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        POS Check
                      </Link>
                      <button
                        onClick={() => t.order && handleMarkOrderServed(t.order.id, t.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--success)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🍽️ Mark Delivered to Guests
                      </button>
                    </div>
                  </div>
                ))}

                {/* QR Assistance requests */}
                {Object.values(assistanceMap).map((req) => (
                  <div
                    key={req.tableId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--canvas)',
                      border: '1.5px solid var(--warning)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--warning)',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                          {req.tableName || `Table ${req.tableId.slice(-4)}`} · Guest Call
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Requested: {req.type === 'REQUEST_BILL' ? 'Check / Bill' : req.type === 'WATER' ? 'Water Refill' : 'Server Assistance'}
                          {req.notes ? ` · Note: "${req.notes}"` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcknowledgeAssistance(req.tableId)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--warning)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Acknowledge & Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── My Orders View ── */}
        {activeNav === 'orders' && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Active Orders & Checks
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {openChecksList.length} Open check{openChecksList.length === 1 ? '' : 's'} across all tables
                </p>
              </div>
            </div>

            {openChecksList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No open checks right now. All tables are settled.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Table</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Guests</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Items</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Total</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Elapsed</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openChecksList.map((t) => {
                      const state = resolveTableState(t)
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '14px', fontWeight: 800, color: 'var(--text)' }}>{t.name}</td>
                          <td style={{ padding: '14px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: state.bg,
                                color: state.color,
                              }}
                            >
                              {state.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{t.order?.guestCount}</td>
                          <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{t.order?.itemCount}</td>
                          <td style={{ padding: '14px', fontWeight: 800, color: 'var(--text)' }}>
                            ${(t.order?.total || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                            {t.order?.elapsedMins} min
                          </td>
                          <td style={{ padding: '14px' }}>
                            <Link
                              href={`/pos?table=${t.id}`}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--primary)',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-block',
                              }}
                            >
                              Open in POS
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Shift Reservations View ── */}
        {activeNav === 'reservations' && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Shift Bookings & Scheduled Arrivals
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {reservations.filter((r) => r.status !== 'CANCELLED').length} Bookings scheduled for this shift
                </p>
              </div>
              <button
                onClick={() => fetchReservations()}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--canvas)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Refresh Bookings
              </button>
            </div>

            {reservationsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading shift bookings...
              </div>
            ) : reservations.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>No reservations today</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>All tables are available for walk-in dining.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reservations.map((res: unknown) => {
                  const timeStr = new Date(res.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const dateStr = new Date(res.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  const isSeated = res.status === 'SEATED'
                  const isCancelled = res.status === 'CANCELLED'

                  return (
                    <div
                      key={res.id}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        borderLeft: `4px solid ${isSeated ? 'var(--success)' : isCancelled ? 'var(--danger)' : 'var(--primary)'}`,
                        backgroundColor: 'var(--canvas)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)' }}>
                            {res.guestName}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor: isSeated ? 'var(--success-soft)' : 'var(--primary-soft)',
                              color: isSeated ? 'var(--success)' : 'var(--primary)',
                            }}
                          >
                            {res.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>🕒 {dateStr} at {timeStr}</span>
                          <span>👥 {res.partySize} Guests</span>
                          {res.table ? <span>🪑 Assigned: {res.table.name}</span> : <span>🪑 Table Unassigned</span>}
                          {res.guestPhone && <span>📞 {res.guestPhone}</span>}
                        </div>
                        {res.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '6px', fontWeight: 600 }}>
                            📌 Special Request: {res.notes}
                          </div>
                        )}
                      </div>

                      <div>
                        {res.table && !isSeated && !isCancelled && (
                          <Link
                            href={`/pos?table=${res.table.id}`}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--primary)',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-block',
                            }}
                          >
                            Seat at {res.table.name} →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 86'd & Menu Reference View ── */}
        {activeNav === 'menu' && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Menu Reference & 86&apos;d Sold-Out Items
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Live kitchen item availability, dietary info, and server dish lookup
                </p>
              </div>

              {/* Menu Filter and Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--canvas)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {(['ALL', '86D', 'VEG'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setMenuDietaryFilter(filter)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: menuDietaryFilter === filter ? 'var(--primary)' : 'transparent',
                        color: menuDietaryFilter === filter ? '#ffffff' : 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {filter === 'ALL' ? 'All Items' : filter === '86D' ? `86'd (${eightySixedItems.length})` : 'Veg Only'}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search dish or ingredient..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '12px',
                    width: '220px',
                  }}
                />
              </div>
            </div>

            {/* Menu Items Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '14px',
              }}
            >
              {allMenuItems
                .filter((item) => {
                  if (menuDietaryFilter === '86D' && item.isAvailable) return false
                  if (menuDietaryFilter === 'VEG' && !item.isVeg) return false
                  if (menuSearchQuery.trim()) {
                    const q = menuSearchQuery.toLowerCase()
                    const matchesName = item.name.toLowerCase().includes(q)
                    const matchesDesc = (item.description || '').toLowerCase().includes(q)
                    if (!matchesName && !matchesDesc) return false
                  }
                  return true
                })
                .map((item) => {
                  const is86 = !item.isAvailable
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: is86 ? '1.5px solid #FECDCA' : '1px solid var(--border)',
                        backgroundColor: is86 ? '#FEF3F2' : 'var(--canvas)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: is86 ? '#B42318' : 'var(--text)', textDecoration: is86 ? 'line-through' : 'none' }}>
                            {item.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor: is86 ? '#F04438' : 'var(--success-soft)',
                              color: is86 ? '#ffffff' : 'var(--success)',
                            }}
                          >
                            {is86 ? "86'D (OUT)" : 'Available'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {item.category?.name || 'Main Course'} · {item.isVeg ? '🌱 Vegetarian' : '🥩 Non-Veg'}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                        ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── Shifts & Availability View ── */}
        {(activeNav === 'shifts' || activeNav === 'availability') && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {activeNav === 'shifts' ? 'My Shift & Attendance' : 'Table Availability'}
            </h2>
            <p style={{ margin: '4px 0 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Logged in as {currentUser.name} ({currentUser.role})
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--canvas)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Shift Status</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: clockStatus.isClockedIn ? 'var(--success)' : 'var(--danger)', marginTop: '4px' }}>
                  {clockStatus.isClockedIn ? 'Currently Clocked In' : 'Clocked Out'}
                </div>
                {onBreak && (
                  <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 700 }}>
                    (On Break)
                  </span>
                )}
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--canvas)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Available Capacity</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
                  {availableTables.reduce((sum, t) => sum + t.capacity, 0)} Seats Free
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Across {availableTables.length} free tables
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Read-Only Kitchen Status Modal for Servers ── */}
      <AnimatePresence>
        {isKitchenModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(7, 21, 46, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '680px',
                maxHeight: '85vh',
                backgroundColor: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text)' }}>
                      Kitchen Preparation Status
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      Read Only
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Live kitchen status for food items preparing or ready
                  </p>
                </div>

                <button
                  onClick={() => setIsKitchenModalOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {kitchenLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading kitchen queue...
                  </div>
                ) : kitchenTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>No tickets currently in kitchen</p>
                    <p style={{ fontSize: '13px' }}>All orders have been prepared or served.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {kitchenTickets.map((t) => {
                      const isReady = t.status === 'READY'
                      return (
                        <div
                          key={t.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: `1px solid ${isReady ? 'var(--success)' : 'var(--border)'}`,
                            borderLeft: `4px solid ${isReady ? 'var(--success)' : 'var(--primary)'}`,
                            backgroundColor: 'var(--canvas)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text)' }}>
                              #{t.id.slice(-4).toUpperCase()} · {t.order?.table?.name || 'Table'}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: isReady ? 'var(--success-soft)' : 'var(--primary-soft)',
                                color: isReady ? 'var(--success)' : 'var(--primary)',
                              }}
                            >
                              {t.status === 'READY' ? 'Ready to Serve' : t.status === 'IN_PROGRESS' ? 'Cooking' : 'In Queue'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {t.items?.map((item: unknown) => (
                              <div
                                key={item.id}
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--text)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span>{item.quantity}× {item.menuItem?.name || 'Dish'}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.station} Line</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Shift Reservations Hub Modal ── */}
        {isReservationsModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(7, 21, 46, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '720px',
                maxHeight: '85vh',
                backgroundColor: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text)' }}>
                      Shift Bookings & Reservations
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      {reservations.filter((r) => r.status !== 'CANCELLED').length} Active
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Upcoming guest arrivals and table assignments for current service
                  </p>
                </div>

                <button
                  onClick={() => setIsReservationsModalOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {reservationsLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading shift reservations...
                  </div>
                ) : reservations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>No reservations found</p>
                    <p style={{ fontSize: '13px', margin: 0 }}>All incoming guests today are walk-ins.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reservations.map((res: unknown) => {
                      const timeStr = new Date(res.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      const dateStr = new Date(res.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                      const isSeated = res.status === 'SEATED'
                      const isCancelled = res.status === 'CANCELLED'

                      return (
                        <div
                          key={res.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: `1px solid var(--border)`,
                            borderLeft: `4px solid ${isSeated ? 'var(--success)' : isCancelled ? 'var(--danger)' : 'var(--primary)'}`,
                            backgroundColor: 'var(--canvas)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>
                                {res.guestName}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  backgroundColor: isSeated ? 'var(--success-soft)' : 'var(--primary-soft)',
                                  color: isSeated ? 'var(--success)' : 'var(--primary)',
                                }}
                              >
                                {res.status}
                              </span>
                            </div>

                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span>🕒 {dateStr} at {timeStr}</span>
                              <span>👥 {res.partySize} Guests</span>
                              {res.table && <span>🪑 {res.table.name}</span>}
                              {res.guestPhone && <span>📞 {res.guestPhone}</span>}
                            </div>

                            {res.notes && (
                              <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '6px', fontWeight: 600 }}>
                                📌 Note: {res.notes}
                              </div>
                            )}
                          </div>

                          {res.table && !isSeated && !isCancelled && (
                            <Link
                              href={`/pos?table=${res.table.id}`}
                              onClick={() => setIsReservationsModalOpen(false)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--primary)',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Seat at {res.table.name} →
                            </Link>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Table Transfer Modal ── */}
        {transferModal && transferModal.isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(7, 21, 46, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                    Transfer Table Check
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Move guest check from {transferModal.currentTableName} to an empty table
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTransferModal(null)
                    setTransferTargetTableId('')
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Select Destination Table
                  </label>
                  <select
                    value={transferTargetTableId}
                    onChange={(e) => setTransferTargetTableId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--canvas)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Choose an empty table --</option>
                    {availableTables
                      .filter((t) => t.id !== transferModal.currentTableId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.capacity} seats · {resolveSection(t)})
                        </option>
                      ))}
                  </select>
                </div>

                {availableTables.filter((t) => t.id !== transferModal.currentTableId).length === 0 && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--danger)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--danger-soft)',
                    }}
                  >
                    No empty tables available right now to transfer to.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      setTransferModal(null)
                      setTransferTargetTableId('')
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--canvas)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferTable}
                    disabled={!transferTargetTableId || transferring}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: !transferTargetTableId || transferring ? 'var(--border)' : 'var(--primary)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: !transferTargetTableId || transferring ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {transferring ? 'Transferring...' : 'Confirm Move'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DreamPosShell>
  )
}
