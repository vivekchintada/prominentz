'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/* ── Types ────────────────────────────────────────────────── */
export interface KdsTicketItem {
  id: string
  ticketId: string
  menuItemId: string
  quantity: number
  modifiers: unknown
  specialNote: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'READY'
  menuItem?: {
    name: string
    isVeg?: boolean
  }
}

export interface KdsTicket {
  id: string
  orderId: string
  station: 'HOT' | 'COLD' | 'BAR' | 'EXPO'
  status: 'NEW' | 'IN_PROGRESS' | 'READY' | 'SERVED'
  createdAt: string
  updatedAt: string
  readyAt: string | null
  servedAt: string | null
  items: KdsTicketItem[]
  order: {
    id: string
    createdAt: string
    guestCount: number
    notes: string | null
    orderSource?: string
    server?: { name: string } | null
    customer?: { name: string; phone?: string; allergyTags?: string[] } | null
    table?: { name: string } | null
  }
}

interface KdsKpiData {
  ordersPerHour: number
  avgTicketTimeMins: number
  activeTickets: number
  overdueTickets: number
  activeKitchenStaff: number
  todayRevenue: number
}

interface KdsMonitorProps {
  currentUser: { id: string; name: string; role: string; email: string }
  locationId: string
  onSignOut: () => void
}

/* ── Helpers ──────────────────────────────────────────────── */
function getElapsedTimer(createdAt: string): { mins: number; secs: number; formatted: string; isDelayed: boolean; tier: 'normal' | 'warning' | 'urgent' } {
  const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime())
  const totalSecs = Math.floor(diffMs / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const isDelayed = mins >= 15
  const tier: 'normal' | 'warning' | 'urgent' = mins < 10 ? 'normal' : mins < 20 ? 'warning' : 'urgent'
  return { mins, secs, formatted, isDelayed, tier }
}

function extractAllergies(ticket: KdsTicket): string[] {
  const list: string[] = []
  const notes = (ticket.order?.notes || '').toLowerCase()
  if (notes.includes('allergy') || notes.includes('peanut') || notes.includes('gluten') || notes.includes('dairy') || notes.includes('shellfish')) {
    list.push(ticket.order.notes!)
  }
  if (ticket.order?.customer?.allergyTags && Array.isArray(ticket.order.customer.allergyTags)) {
    ticket.order.customer.allergyTags.forEach((t) => list.push(t))
  }
  ticket.items.forEach((item) => {
    if (item.specialNote && item.specialNote.toLowerCase().includes('allerg')) {
      list.push(item.specialNote)
    }
  })
  return Array.from(new Set(list))
}

const STATION_CONFIG = {
  HOT: {
    name: 'Hot Line',
    icon: '🔥',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.1)',
    border: 'rgba(249, 115, 22, 0.3)',
    desc: 'Grill, sauté, fry & oven line',
  },
  COLD: {
    name: 'Cold & Salad',
    icon: '🥗',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.3)',
    desc: 'Salads, raw bar & cold prep',
  },
  BAR: {
    name: 'Bar & Drinks',
    icon: '🍸',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.1)',
    border: 'rgba(168, 85, 247, 0.3)',
    desc: 'Cocktails, beers & table drinks',
  },
  EXPO: {
    name: 'Expo & Pass',
    icon: '🛎️',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    desc: 'Quality check & runner dispatch',
  },
} as const

export default function KdsMonitor({ currentUser, locationId, onSignOut }: KdsMonitorProps) {
  const [tickets, setTickets] = useState<KdsTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState<string>('dashboard')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'PREPARING' | 'DELAYED' | 'READY'>('ALL')
  const [stationFilter, setStationFilter] = useState<'ALL' | 'HOT' | 'COLD' | 'BAR' | 'EXPO'>('ALL')
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [kpiData, setKpiData] = useState<KdsKpiData | null>(null)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(5)

  // 86'd Items Management State
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [menuSearch, setMenuSearch] = useState('')
  const [toggling86Id, setToggling86Id] = useState<string | null>(null)
  const [showAllDayBar, setShowAllDayBar] = useState(true)
  const [runnerPagedId, setRunnerPagedId] = useState<string | null>(null)
  const [lastBumpedTicket, setLastBumpedTicket] = useState<{
    id: string
    prevStatus: 'NEW' | 'IN_PROGRESS' | 'READY'
    tableName: string
    orderId: string
  } | null>(null)

  // Timeclock & Shift Status
  const [clockStatus, setClockStatus] = useState<{
    isClockedIn: boolean
    shift: { id: string; clockIn: string; elapsedMinutes: number } | null
  }>({ isClockedIn: true, shift: null })

  /* ── Beep Audio Alert ───────────────────────────────────── */
  const playAlertBeep = () => {
    if (!alertsEnabled) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  /* ── Data Fetching ──────────────────────────────────────── */
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/kds/tickets')
      if (res.ok) {
        const data = await res.json()
        setTickets(data)
        setLastSyncTime(0)
      }
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchKpi = useCallback(async () => {
    try {
      const res = await fetch('/api/kds/kpi')
      if (res.ok) {
        const json = await res.json()
        setKpiData(json)
      }
    } catch {}
  }, [])

  const fetchClockStatus = useCallback(async () => {
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

  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch('/api/menu/items?includeUnavailable=true')
      if (res.ok) {
        const data = await res.json()
        setMenuItems(data)
      }
    } catch {}
  }, [])

  const handleToggle86 = async (itemId: string, currentIs86d: boolean) => {
    setToggling86Id(itemId)
    try {
      const res = await fetch(`/api/menu/items/${itemId}/86`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is86d: !currentIs86d, reason: 'Kitchen out of stock' }),
      })
      if (res.ok) {
        fetchMenuItems()
      }
    } catch {
    } finally {
      setToggling86Id(null)
    }
  }

  const handleUpdateStatus = async (ticketId: string, nextStatus: 'IN_PROGRESS' | 'READY' | 'SERVED') => {
    const targetTicket = tickets.find((t) => t.id === ticketId)
    if (targetTicket && (nextStatus === 'SERVED' || nextStatus === 'READY')) {
      setLastBumpedTicket({
        id: ticketId,
        prevStatus: targetTicket.status as any,
        tableName: targetTicket.order?.table?.name || 'Order',
        orderId: targetTicket.orderId,
      })
    }

    try {
      const res = await fetch(`/api/kds/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        fetchTickets()
        fetchKpi()
      }
    } catch (err) {
      console.error('Error updating ticket status', err)
    }
  }

  const handleRecallLastTicket = async () => {
    if (!lastBumpedTicket) return
    const { id, prevStatus } = lastBumpedTicket
    try {
      const res = await fetch(`/api/kds/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: prevStatus }),
      })
      if (res.ok) {
        setLastBumpedTicket(null)
        fetchTickets()
        fetchKpi()
      }
    } catch (err) {
      console.error('Error recalling ticket', err)
    }
  }

  const handlePageRunner = (ticket: KdsTicket) => {
    setRunnerPagedId(ticket.id)
    playAlertBeep()

    // Dispatch notification
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'FOOD_READY',
        title: 'Expo Pass Alert',
        message: `Dishes for ${ticket.order?.table?.name || 'Table'} are READY at Expo pass!`,
        targetRole: 'SERVER',
        locationId,
      }),
    }).catch(() => {})

    setTimeout(() => {
      setRunnerPagedId((current) => (current === ticket.id ? null : current))
    }, 4000)
  }

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    fetchKpi()
    fetchClockStatus()
    fetchMenuItems()

    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    const kpiTimer = setInterval(fetchKpi, 15000)
    const syncTimer = setInterval(() => setLastSyncTime((s) => s + 1), 1000)

    // SSE Sync
    const es = new EventSource('/api/events')
    es.addEventListener('order.sent_to_kitchen', () => {
      fetchTickets()
      fetchKpi()
      playAlertBeep()
    })
    es.addEventListener('ticket.status.updated', () => {
      fetchTickets()
      fetchKpi()
    })
    es.addEventListener('ticket.completed', () => {
      fetchTickets()
      fetchKpi()
    })
    es.addEventListener('menu.item.86d', () => {
      fetchMenuItems()
    })

    return () => {
      clearInterval(clockTimer)
      clearInterval(kpiTimer)
      clearInterval(syncTimer)
      es.close()
    }
  }, [fetchTickets, fetchKpi, fetchClockStatus, fetchMenuItems])

  /* ── Filtered Tickets & Counts ── */
  const activeTicketsList = useMemo(() => {
    return tickets.filter((t) => t.status !== 'SERVED')
  }, [tickets])

  const newCount = useMemo(() => {
    return activeTicketsList.filter((t) => t.status === 'NEW').length
  }, [activeTicketsList])

  const prepCount = useMemo(() => {
    return activeTicketsList.filter((t) => t.status === 'IN_PROGRESS').length
  }, [activeTicketsList])

  const delayedCount = useMemo(() => {
    return activeTicketsList.filter((t) => getElapsedTimer(t.createdAt).isDelayed).length
  }, [activeTicketsList])

  const readyCount = useMemo(() => {
    return activeTicketsList.filter((t) => t.status === 'READY').length
  }, [activeTicketsList])

  const filteredTickets = useMemo(() => {
    return activeTicketsList.filter((t) => {
      // Station filter
      if (stationFilter !== 'ALL' && t.station !== stationFilter) return false

      // Status filter
      if (statusFilter === 'NEW' && t.status !== 'NEW') return false
      if (statusFilter === 'PREPARING' && t.status !== 'IN_PROGRESS') return false
      if (statusFilter === 'READY' && t.status !== 'READY') return false
      if (statusFilter === 'DELAYED' && !getElapsedTimer(t.createdAt).isDelayed) return false

      return true
    })
  }, [activeTicketsList, stationFilter, statusFilter])

  // Completed tickets for Completed tab
  const completedTickets = useMemo(() => {
    return tickets.filter((t) => t.status === 'SERVED')
  }, [tickets])

  // Prep List aggregation
  const prepListItems = useMemo(() => {
    const itemMap: Record<string, { name: string; quantity: number; station: string }> = {}
    activeTicketsList.forEach((ticket) => {
      ticket.items.forEach((item) => {
        const name = item.menuItem?.name || 'Dish'
        if (!itemMap[name]) {
          itemMap[name] = { name, quantity: 0, station: ticket.station }
        }
        itemMap[name].quantity += item.quantity
      })
    })
    return Object.values(itemMap).sort((a, b) => b.quantity - a.quantity)
  }, [activeTicketsList])

  const urgentTickets = useMemo(() => {
    return activeTicketsList
      .filter((t) => getElapsedTimer(t.createdAt).isDelayed || extractAllergies(t).length > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [activeTicketsList])

  /* ── Navigation Groups ── */
  const navGroups: NavGroup[] = [
    {
      id: 'kitchen',
      label: 'KITCHEN',
      railIcon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
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
          id: 'board',
          label: 'Ticket Board',
          badge: activeTicketsList.length > 0 ? activeTicketsList.length : undefined,
          badgeVariant: 'primary',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          ),
        },
        {
          id: 'completed',
          label: 'Completed',
          badge: completedTickets.length > 0 ? completedTickets.length : undefined,
          badgeVariant: 'success',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
        },
        {
          id: '86',
          label: "86'd Items",
          badge: menuItems.filter((i) => i.is86d || !i.isAvailable).length > 0
            ? menuItems.filter((i) => i.is86d || !i.isAvailable).length
            : undefined,
          badgeVariant: 'danger',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          ),
        },
        {
          id: 'prep',
          label: 'Prep List',
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
          id: 'performance',
          label: 'Performance',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          ),
        },
      ],
    },
  ]

  return (
    <div style={{ padding: '8px 24px 32px', width: '100%', maxWidth: '1600px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Operational Header Bar (Matching Owner Dashboard) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🍳</span>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Kitchen Display System (KDS)
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Station: {stationFilter === 'ALL' ? 'All Kitchen Stations' : STATION_CONFIG[stationFilter as keyof typeof STATION_CONFIG]?.name} · {activeTicketsList.length} Active Tickets in Queue · Synced {lastSyncTime}s ago
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Station Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value as any)}
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: '6px 28px 6px 12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                outline: 'none',
              }}
            >
              <option value="ALL">Station: All Stations</option>
              <option value="HOT">Station: Hot Line</option>
              <option value="COLD">Station: Cold Prep</option>
              <option value="BAR">Station: Bar</option>
              <option value="EXPO">Station: Expo</option>
            </select>
            <span
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                fontSize: '10px',
                color: 'var(--color-text-tertiary)',
              }}
            >
              ▼
            </span>
          </div>

          {/* Clock In Status Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: clockStatus.isClockedIn ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: clockStatus.isClockedIn ? '#22c55e' : '#ef4444',
              border: clockStatus.isClockedIn ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: clockStatus.isClockedIn ? '#22c55e' : '#ef4444',
              }}
            />
            {clockStatus.isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </span>

          {/* Alerts Toggle Button */}
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              backgroundColor: alertsEnabled ? 'var(--color-bg-card)' : 'transparent',
              color: alertsEnabled ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title={alertsEnabled ? 'Mute Audio Alerts' : 'Enable Audio Alerts'}
          >
            {alertsEnabled ? '🔊 Alerts On' : '🔇 Alerts Off'}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? '⤢ Normal View' : '⤢ Fullscreen'}
          </button>

          <button
            onClick={() => {
              setLoading(true)
              fetchTickets()
              fetchKpi()
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            🔄 {loading ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs (Exact Owner Dashboard Style) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '20px',
        }}
      >
        {[
          { id: 'board', label: 'Live Bump Board', icon: '🍳', badge: activeTicketsList.length },
          { id: 'dashboard', label: 'Executive Telemetry', icon: '📊' },
          { id: 'stations', label: 'All Station Overview', icon: '🔥' },
          { id: '86', label: "86'd Menu Manager", icon: '🚫', badge: eightySixedItems.length },
        ].map((tab) => {
          const isActive = activeNav === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveNav(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid',
                borderColor: isActive ? 'var(--brand, #5b45f5)' : 'var(--color-border)',
                backgroundColor: isActive ? 'var(--color-bg-card)' : 'transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--brand, #5b45f5)' : 'var(--surface-raised)',
                    color: '#ffffff',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
        {/* ── 1. Kitchen Executive Dashboard (Manager Dashboard Style) ── */}
        {activeNav === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Telemetry Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px 20px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#16a34a',
                      display: 'inline-block',
                      boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)',
                    }}
                  />
                  LIVE KITCHEN TELEMETRY
                </span>

                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👨‍🍳 Station: {stationFilter === 'ALL' ? 'All Kitchen Stations' : STATION_CONFIG[stationFilter as keyof typeof STATION_CONFIG]?.name}</span>
                  <span>·</span>
                  <span>Synced {lastSyncTime}s ago</span>
                  {clockStatus.shift && (
                    <>
                      <span>·</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Shift: {Math.floor(clockStatus.shift.elapsedMinutes / 60)}h {clockStatus.shift.elapsedMinutes % 60}m
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    setLoading(true)
                    fetchTickets()
                    fetchKpi()
                  }}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🔄 {loading ? 'Syncing...' : 'Refresh'}
                </button>

                <button
                  onClick={() => setActiveNav('board')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--brand, #5b45f5)',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(91, 69, 245, 0.25)',
                  }}
                >
                  <span>🍳 Open Bump Board →</span>
                </button>
              </div>
            </div>

            {/* 5 KPI Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
              }}
            >
              {[
                {
                  label: 'Active Queue',
                  value: `${activeTicketsList.length}`,
                  subtitle: `${newCount} new · ${prepCount} prep`,
                  icon: '🔥',
                  color: 'var(--brand, #5b45f5)',
                  bg: 'rgba(91, 69, 245, 0.1)',
                },
                {
                  label: 'In Alert (>15m)',
                  value: `${delayedCount}`,
                  subtitle: delayedCount > 0 ? 'Urgent expediting needed' : 'All tickets on pace',
                  icon: '⚠️',
                  color: delayedCount > 0 ? '#ef4444' : '#22c55e',
                  bg: delayedCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  border: delayedCount > 0 ? '1.5px solid #ef4444' : undefined,
                },
                {
                  label: 'Avg Ticket Time',
                  value: kpiData && kpiData.avgTicketTimeMins > 0
                    ? `${String(Math.floor(kpiData.avgTicketTimeMins)).padStart(2, '0')}:${String(Math.round((kpiData.avgTicketTimeMins % 1) * 60)).padStart(2, '0')}`
                    : '11:24',
                  subtitle: 'Target: < 15:00 min',
                  icon: '⏱️',
                  color: 'var(--color-text-primary)',
                  bg: 'rgba(34, 197, 94, 0.1)',
                },
                {
                  label: 'Hourly Velocity',
                  value: `${kpiData?.ordersPerHour || 18}`,
                  subtitle: 'Tickets fired / hr',
                  icon: '📦',
                  color: '#f59e0b',
                  bg: 'rgba(245, 158, 11, 0.1)',
                },
                {
                  label: 'Line Staff Active',
                  value: `${kpiData?.activeKitchenStaff || 2}`,
                  subtitle: 'Clocked-in culinary team',
                  icon: '👨‍🍳',
                  color: '#10b981',
                  bg: 'rgba(16, 185, 129, 0.1)',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: item.border || '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '16px 18px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.label}
                    </div>
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: item.color, letterSpacing: '-0.02em' }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                      {item.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Station Breakdown Grid (Manager Dashboard Style) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Culinary Station Telemetry</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--canvas)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    4 Stations Live
                  </span>
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Click any station to view its bump rail
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '16px',
                }}
              >
                {(['HOT', 'COLD', 'BAR', 'EXPO'] as const).map((stKey) => {
                  const conf = STATION_CONFIG[stKey]
                  const stTickets = activeTicketsList.filter((t) => t.station === stKey)
                  const stOverdue = stTickets.filter((t) => getElapsedTimer(t.createdAt).isDelayed).length

                  return (
                    <div
                      key={stKey}
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderTop: `4px solid ${conf.color}`,
                        borderRadius: '16px',
                        padding: '18px 20px',
                        boxShadow: '0 1px 3px rgba(7, 21, 46, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '220px',
                      }}
                    >
                      <div>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '22px' }}>{conf.icon}</span>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                                {conf.name}
                              </h3>
                              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                                {conf.desc}
                              </p>
                            </div>
                          </div>

                          {stOverdue > 0 && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--danger-soft)',
                                color: 'var(--danger)',
                                border: '1px solid rgba(240, 68, 56, 0.3)',
                              }}
                            >
                              {stOverdue} Alert
                            </span>
                          )}
                        </div>

                        {/* Station Queue Count */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '16px' }}>
                          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)' }}>
                            {stTickets.length}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            ticket{stTickets.length === 1 ? '' : 's'} in queue
                          </span>
                        </div>

                        {/* Station Dish Preview */}
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {stTickets.length === 0 ? (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                              Queue clear · No active fires
                            </div>
                          ) : (
                            stTickets.slice(0, 3).map((t) => (
                              <div
                                key={t.id}
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--text)',
                                  backgroundColor: 'var(--canvas)',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                  {t.order?.table?.name || 'Tbl'} · {t.items.map((i) => `${i.quantity}× ${i.menuItem?.name || 'Item'}`).join(', ')}
                                </span>
                                <span style={{ fontSize: '11px', color: getElapsedTimer(t.createdAt).isDelayed ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                                  {getElapsedTimer(t.createdAt).formatted}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Station Action Button */}
                      <button
                        onClick={() => {
                          setStationFilter(stKey)
                          setActiveNav('board')
                        }}
                        style={{
                          marginTop: '16px',
                          padding: '8px 0',
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--canvas)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>View Station Board</span>
                        <span>→</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Urgent Rush & Delayed Tickets Alert Section */}
            {delayedCount > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1.5px solid var(--danger)',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(240, 68, 56, 0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🚨</span>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--danger)' }}>
                      Chef Rush Alert: {delayedCount} Overdue Ticket{delayedCount === 1 ? '' : 's'} (&gt;15m)
                    </h3>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Immediate expediting recommended
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {urgentTickets.map((t) => {
                    const timer = getElapsedTimer(t.createdAt)
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--canvas)',
                          border: '1px solid var(--danger)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text)' }}>
                              #{t.id.slice(-4).toUpperCase()} · {t.order?.table?.name || 'Table'}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--danger)', fontFamily: 'monospace' }}>
                              ⏱️ {timer.formatted}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Station: {t.station} · Server: {t.order?.server?.name || 'Staff'}
                          </div>
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {t.items.map((i) => (
                              <div key={i.id} style={{ fontSize: '12px', color: 'var(--text)' }}>
                                • {i.quantity}× {i.menuItem?.name || 'Dish'}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'READY')}
                            style={{
                              flex: 1,
                              padding: '6px 0',
                              borderRadius: '8px',
                              backgroundColor: 'var(--primary)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Mark Ready
                          </button>
                          <button
                            onClick={() => handlePageRunner(t)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--warning-soft)',
                              color: 'var(--warning)',
                              border: '1px solid var(--warning)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            🔔 Page
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* All-Day Prep Batching & 86'd Snapshot 2-Column Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Left: Top Prep Tally */}
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
                    <span style={{ fontSize: '18px' }}>📋</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                      Active Batch Prep Tally
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveNav('prep')}
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
                    View all prep ({prepListItems.length}) →
                  </button>
                </div>

                {prepListItems.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No batch items currently in queue.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {prepListItems.slice(0, 4).map((item) => (
                      <div
                        key={item.name}
                        style={{
                          padding: '10px 14px',
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
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.station} Line
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            padding: '2px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--primary-soft)',
                          }}
                        >
                          {item.quantity}×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: 86'd Out of Stock Snapshot */}
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
                    <span style={{ fontSize: '18px' }}>🚫</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                      86'd Sold Out Snapshot
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveNav('86')}
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
                    Manage items ({menuItems.filter((i) => i.is86d || !i.isAvailable).length}) →
                  </button>
                </div>

                {menuItems.filter((i) => i.is86d || !i.isAvailable).length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>✨</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Full Kitchen Stock Available</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>No items marked 86’d across the kitchen line.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {menuItems
                      .filter((i) => i.is86d || !i.isAvailable)
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--danger-soft)',
                            border: '1px solid var(--danger)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                              86’d (Kitchen out of stock)
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggle86(item.id, true)}
                            disabled={toggling86Id === item.id}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--success)',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {toggling86Id === item.id ? '...' : 'Restore'}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 2. Combined Single Filter Row ── */}
        {activeNav === 'board' && (
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
            {/* Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All ${activeTicketsList.length}` },
                { id: 'NEW', label: `New ${newCount}` },
                { id: 'PREPARING', label: `Preparing ${prepCount}` },
                { id: 'DELAYED', label: `Delayed ${delayedCount}` },
                { id: 'READY', label: `Ready ${readyCount}` },
              ].map((pill) => {
                const active = statusFilter === pill.id
                return (
                  <button
                    key={pill.id}
                    onClick={() => setStatusFilter(pill.id as any)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '10px',
                      border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                      color: active ? '#ffffff' : 'var(--text)',
                      fontSize: '13px',
                      fontWeight: active ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: active ? '0 2px 6px rgba(101, 71, 245, 0.2)' : 'none',
                    }}
                  >
                    {pill.label}
                  </button>
                )
              })}

              {/* All-Day Prep Tally Toggle Button */}
              <button
                onClick={() => setShowAllDayBar((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: showAllDayBar ? '1px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: showAllDayBar ? 'var(--primary-soft)' : 'var(--surface)',
                  color: showAllDayBar ? 'var(--primary)' : 'var(--text)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Toggle All-Day Item Prep counts"
              >
                <span>📋 All-Day Prep</span>
                <span
                  style={{
                    backgroundColor: showAllDayBar ? 'var(--primary)' : 'var(--border)',
                    color: showAllDayBar ? '#ffffff' : 'var(--text-muted)',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {prepListItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </button>

              {/* Undo / Recall Last Bumped Ticket */}
              {lastBumpedTicket && (
                <button
                  onClick={handleRecallLastTicket}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#FEF3C7',
                    border: '1.5px solid #F59E0B',
                    color: '#B45309',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                  }}
                  title="Undo last bumped ticket"
                >
                  <span>↩️ Recall {lastBumpedTicket.tableName}</span>
                </button>
              )}
            </div>

            {/* Sync Status Info */}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Last synchronized {lastSyncTime}s ago
            </div>
          </div>
        )}

        {/* ── 2b. All-Day Prep Summary Shelf (Active Item Batching) ── */}
        {activeNav === 'board' && showAllDayBar && prepListItems.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflowX: 'auto',
              padding: '12px 16px',
              marginBottom: '20px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              boxShadow: '0 1px 3px rgba(7, 21, 46, 0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '14px' }}>🍳</span>
              <span>All-Day Tally</span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--primary)',
                  backgroundColor: 'var(--primary-soft)',
                  padding: '1px 7px',
                  borderRadius: '5px',
                  fontWeight: 800,
                }}
              >
                {prepListItems.reduce((acc, i) => acc + i.quantity, 0)} total
              </span>
            </div>

            <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border)', flexShrink: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
              {prepListItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--canvas)',
                    border: '1px solid var(--border)',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 800,
                    }}
                  >
                    {item.quantity}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--border)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.station}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 1 & 4 & 5. Primary Workspace: Ticket Board ── */}
        {activeNav === 'board' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  minHeight: '350px',
                  color: 'var(--text-muted)',
                  fontSize: '15px',
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
                <span>Loading active tickets...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              /* Centered Small Clean Empty State as Requested */
              <div
                style={{
                  margin: 'auto',
                  maxWidth: '420px',
                  textAlign: 'center',
                  padding: '48px 24px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 2px 8px rgba(7, 21, 46, 0.05)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>
                  No active tickets
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                  New orders will appear automatically.
                </p>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Last synchronized {lastSyncTime} seconds ago.
                </span>
              </div>
            ) : (
              /* Ticket Board Grid */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '16px',
                  alignItems: 'start',
                }}
              >
                {filteredTickets.map((ticket) => {
                  const timer = getElapsedTimer(ticket.createdAt)
                  const isDelayed = timer.isDelayed
                  const isNew = ticket.status === 'NEW'
                  const isPreparing = ticket.status === 'IN_PROGRESS'
                  const isReady = ticket.status === 'READY'
                  const allergies = extractAllergies(ticket)

                  // Semantic Card Borders
                  let cardBorder = '1px solid var(--border)'
                  let topBorder = 'none'

                  if (timer.tier === 'urgent') {
                    cardBorder = '3px solid #ef4444'
                  } else if (timer.tier === 'warning') {
                    cardBorder = '2px solid #d97706'
                  } else if (isNew) {
                    topBorder = '4px solid var(--primary)'
                  } else if (isPreparing) {
                    topBorder = '4px solid #d97706'
                  } else if (isReady) {
                    topBorder = '4px solid #059669'
                  }

                  return (
                    <motion.div
                      key={ticket.id}
                      layout
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: cardBorder,
                        borderTop: isDelayed ? '3px solid var(--danger)' : topBorder,
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '260px',
                        boxShadow: isDelayed
                          ? '0 6px 20px rgba(240, 68, 56, 0.15)'
                          : '0 2px 6px rgba(7, 21, 46, 0.04)',
                      }}
                    >
                      <div>
                        {/* Header: Ticket / Table Number (18-20px) + Timer (18-22px bold) */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '10px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                              #{ticket.id.slice(-4).toUpperCase()} · {ticket.order?.table?.name || 'TABLE 01'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  color: isDelayed
                                    ? 'var(--danger)'
                                    : isNew
                                    ? 'var(--primary)'
                                    : isPreparing
                                    ? 'var(--warning)'
                                    : 'var(--success)',
                                }}
                              >
                                {isDelayed ? 'DELAYED' : ticket.status === 'IN_PROGRESS' ? 'PREPARING' : ticket.status}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                ({ticket.station} LINE)
                              </span>
                            </div>
                          </div>

                          {/* Elapsed Timer: 18-22px bold */}
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              color: isDelayed ? 'var(--danger)' : isPreparing ? 'var(--warning)' : 'var(--text)',
                              backgroundColor: isDelayed ? 'var(--danger-soft)' : 'var(--canvas)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                            }}
                          >
                            {timer.formatted}
                          </div>
                        </div>

                        {/* Allergy Warning Panel */}
                        {allergies.length > 0 && (
                          <div
                            style={{
                              backgroundColor: 'var(--danger-soft)',
                              border: '1.5px solid var(--danger)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              marginBottom: '12px',
                              color: 'var(--danger)',
                              fontSize: '13px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>⚠</span>
                            <span>{allergies.join(' · ').toUpperCase()}</span>
                          </div>
                        )}

                        {/* Order Notes */}
                        {ticket.order?.notes && !allergies.includes(ticket.order.notes) && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                              marginBottom: '10px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--canvas)',
                            }}
                          >
                            Note: {ticket.order.notes}
                          </div>
                        )}

                        {/* Item List: Item Name (17-18px), Modifiers (15-16px) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' }}>
                          {ticket.items.map((item) => (
                            <div key={item.id}>
                              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                                {item.quantity}× {item.menuItem?.name || 'Dish'}
                              </div>

                              {/* Modifiers (15-16px) */}
                              {item.specialNote && (
                                <div style={{ fontSize: '15px', color: 'var(--danger)', fontWeight: 600, marginLeft: '18px' }}>
                                  ↳ {item.specialNote}
                                </div>
                              )}
                              {item.modifiers && Array.isArray(item.modifiers) && item.modifiers.map((m: unknown, idx: number) => (
                                <div key={idx} style={{ fontSize: '15px', color: 'var(--text-muted)', marginLeft: '18px' }}>
                                  ↳ {typeof m === 'string' ? m : m.name || m.label}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Large Action Button (16-18px, 52-60px height) */}
                      <div style={{ marginTop: '16px' }}>
                        {isNew && (
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                            style={{
                              width: '100%',
                              height: '56px',
                              borderRadius: '12px',
                              backgroundColor: 'var(--primary)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '17px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(101, 71, 245, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span>Start Preparing</span>
                          </button>
                        )}

                        {isPreparing && (
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, 'READY')}
                            style={{
                              width: '100%',
                              height: '56px',
                              borderRadius: '12px',
                              backgroundColor: 'var(--success)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '17px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(22, 179, 100, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Mark Ready</span>
                          </button>
                        )}

                        {isReady && (
                          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <button
                              onClick={() => handlePageRunner(ticket)}
                              style={{
                                flex: 1,
                                height: '56px',
                                borderRadius: '12px',
                                backgroundColor: runnerPagedId === ticket.id ? '#16B364' : '#F59E0B',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '15px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
                                transition: 'all 0.15s ease',
                              }}
                              title="Ring / Page Food Runner to pick up dishes"
                            >
                              <span>🔔 {runnerPagedId === ticket.id ? 'Runner Paged!' : 'Page Runner'}</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(ticket.id, 'SERVED')}
                              style={{
                                flex: 1,
                                height: '56px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--canvas)',
                                color: 'var(--text)',
                                border: '1.5px solid var(--border)',
                                fontSize: '15px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                              </svg>
                              <span>Bump</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Completed View ── */}
        {activeNav === 'completed' && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '0 0 16px' }}>
              Completed Tickets (Today)
            </h2>
            {completedTickets.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No tickets bumped yet today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {completedTickets.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--canvas)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                        #{t.id.slice(-4).toUpperCase()} · {t.order?.table?.name || 'Table'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t.items.map((i) => `${i.quantity}× ${i.menuItem?.name}`).join(', ')}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--success-soft)',
                        color: 'var(--success)',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      SERVED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 86'd Items Management View ── */}
        {activeNav === '86' && (
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
                  86’d (Out of Stock) Management
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Toggle dishes that are temporarily sold out in the kitchen
                </p>
              </div>

              <input
                type="text"
                placeholder="Search dish..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--canvas)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  width: '220px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {menuItems
                .filter((item) => item.name.toLowerCase().includes(menuSearch.toLowerCase()))
                .map((item) => {
                  const is86 = item.is86d || !item.isAvailable
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        backgroundColor: is86 ? 'var(--danger-soft)' : 'var(--canvas)',
                        border: is86 ? '1.5px solid var(--danger)' : '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '12px', color: is86 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '2px', fontWeight: is86 ? 700 : 500 }}>
                          {is86 ? 'Out of Stock (86’d)' : 'Available'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggle86(item.id, is86)}
                        disabled={toggling86Id === item.id}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: is86 ? 'var(--success)' : 'var(--danger)',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {toggling86Id === item.id ? '...' : is86 ? 'Restore' : '86 Item'}
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── Prep List View ── */}
        {activeNav === 'prep' && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>
              Active Prep List
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Consolidated counts of items required across all {activeTicketsList.length} active tickets
            </p>

            {prepListItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No items to prep right now.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {prepListItems.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--canvas)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.station} Line
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: 'var(--primary)',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--primary-soft)',
                      }}
                    >
                      {item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Performance View (Relocated Nonessential Metrics) ── */}
        {activeNav === 'performance' && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>
              Kitchen Performance Metrics
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Operational volume and efficiency analytics
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: 'var(--canvas)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Orders Per Hour</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                  {kpiData ? kpiData.ordersPerHour : 18}
                </div>
              </div>

              <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: 'var(--canvas)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Kitchen Staff on Shift</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
                  {kpiData ? kpiData.activeKitchenStaff : 2}
                </div>
              </div>

              <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: 'var(--canvas)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Today’s Volume</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                  ${kpiData ? kpiData.todayRevenue.toFixed(0) : '0'}
                </div>
              </div>

              <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: 'var(--canvas)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Average Ticket Time</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--warning)', marginTop: '4px', fontFamily: 'monospace' }}>
                  {kpiData?.avgTicketTimeMins ? `${kpiData.avgTicketTimeMins}m` : '11m 24s'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
