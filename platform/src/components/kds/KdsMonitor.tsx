'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import ThemeToggle from '../ui/ThemeToggle'
import { useToast, ToastContainer } from '../ui/Toast'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

/* ── Types ────────────────────────────────────────────────── */
interface KdsTicketItem {
  id: string
  ticketId: string
  menuItemId: string
  quantity: number
  modifiers: any
  specialNote: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'READY'
  menuItem?: {
    name: string
    isVeg?: boolean
  }
}

interface KdsTicket {
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
    customer?: { name: string; phone?: string } | null
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
function isVegDish(name: string, isVeg?: boolean): boolean {
  if (typeof isVeg === 'boolean') return isVeg
  const lower = name.toLowerCase()
  if (
    lower.includes('chicken') ||
    lower.includes('beef') ||
    lower.includes('steak') ||
    lower.includes('pork') ||
    lower.includes('bacon') ||
    lower.includes('fish') ||
    lower.includes('salmon') ||
    lower.includes('lobster') ||
    lower.includes('shrimp') ||
    lower.includes('taco') ||
    lower.includes('meat') ||
    lower.includes('lamb')
  ) {
    return false
  }
  return true
}

function resolveDiningType(ticket: KdsTicket): 'Dine In' | 'Take Away' | 'Delivery' {
  const notes = ticket.order?.notes?.toLowerCase() || ''
  if (notes.includes('take away') || notes.includes('takeaway')) return 'Take Away'
  if (notes.includes('delivery') || ticket.order?.orderSource?.includes('DELIVERY')) return 'Delivery'
  return 'Dine In'
}

function formatTicketDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    return `${day}, ${time}`
  } catch {
    return '15 Nov 2026, 06:00 PM'
  }
}

function tokenNumber(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return (hash % 89) + 11 // 11 to 99
}

export default function KdsMonitor({ currentUser, locationId, onSignOut }: KdsMonitorProps) {
  const [tickets, setTickets] = useState<KdsTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEW' | 'IN_KITCHEN' | 'DELAYED' | 'COMPLETED'>('ALL')
  const [stationFilter, setStationFilter] = useState<'ALL' | 'HOT' | 'COLD' | 'BAR' | 'EXPO'>('ALL')
  const [activeCookingTimers, setActiveCookingTimers] = useState<Record<string, { startTime: number; running: boolean }>>({})
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [kpiData, setKpiData] = useState<KdsKpiData | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  // 86'd Items Management State
  const [is86ModalOpen, setIs86ModalOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [menuSearch, setMenuSearch] = useState('')
  const [toggling86Id, setToggling86Id] = useState<string | null>(null)

  // Timeclock & Shift Status
  const [clockStatus, setClockStatus] = useState<{
    isClockedIn: boolean
    shift: { id: string; clockIn: string; elapsedMinutes: number } | null
  }>({ isClockedIn: false, shift: null })
  const [clockLoading, setClockLoading] = useState(false)

  // Beep Audio Alert
  const playAlertBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }

  // Fetch Menu Items for 86 Manager
  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch('/api/menu/items?includeUnavailable=true')
      if (res.ok) {
        const data = await res.json()
        setMenuItems(data)
      }
    } catch {}
  }, [])

  // Toggle 86 status for dish
  const handleToggle86 = async (itemId: string, currentIs86d: boolean) => {
    setToggling86Id(itemId)
    try {
      const res = await fetch(`/api/menu/items/${itemId}/86`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is86d: !currentIs86d, reason: 'Kitchen out of stock' }),
      })
      if (res.ok) {
        showToast(!currentIs86d ? 'Item marked 86 (Out of Stock)' : 'Item restored to menu', 'success')
        fetchMenuItems()
      } else {
        showToast('Failed to update 86 status', 'error')
      }
    } catch {
      showToast('Error updating item', 'error')
    } finally {
      setToggling86Id(null)
    }
  }

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/kds/tickets')
      if (res.ok) {
        const data = await res.json()
        setTickets(data)
      }
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch KPIs
  const fetchKpi = useCallback(async () => {
    try {
      const res = await fetch('/api/kds/kpi')
      if (res.ok) {
        const json = await res.json()
        setKpiData(json)
      }
    } catch {}
  }, [])

  // Fetch Timeclock
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

  const handleToggleClock = async () => {
    setClockLoading(true)
    try {
      const res = await fetch('/api/server/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: clockStatus.isClockedIn ? 'CLOCK_OUT' : 'CLOCK_IN',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setClockStatus({
          isClockedIn: data.isClockedIn,
          shift: data.shift,
        })
        showToast(data.isClockedIn ? 'Clocked in successfully' : 'Clocked out', 'success')
      } else {
        showToast(data.error || 'Failed to update timeclock', 'error')
      }
    } catch {
      showToast('Connection error to timeclock', 'error')
    } finally {
      setClockLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    fetchKpi()
    fetchClockStatus()
    fetchMenuItems()

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    const kpiTimer = setInterval(fetchKpi, 15000)

    // SSE Sync
    const es = new EventSource('/api/events')
    es.addEventListener('order.sent_to_kitchen', () => {
      fetchTickets()
      fetchKpi()
      playAlertBeep()
      showToast('New order received in kitchen!', 'info')
    })
    es.addEventListener('ticket.status.updated', () => {
      fetchTickets()
      fetchKpi()
    })
    es.addEventListener('ticket.completed', () => {
      fetchTickets()
      fetchKpi()
    })
    es.addEventListener('order.modified', () => {
      fetchTickets()
      fetchKpi()
    })
    es.addEventListener('menu.item.86d', () => {
      fetchMenuItems()
    })

    return () => {
      clearInterval(timer)
      clearInterval(kpiTimer)
      es.close()
    }
  }, [fetchTickets, fetchKpi, fetchClockStatus, fetchMenuItems])

  // Timer Play / Pause
  const togglePlayTimer = (ticketId: string) => {
    setActiveCookingTimers((prev) => {
      const existing = prev[ticketId]
      if (existing && existing.running) {
        return { ...prev, [ticketId]: { ...existing, running: false } }
      }
      return {
        ...prev,
        [ticketId]: {
          startTime: existing?.startTime || Date.now(),
          running: true,
        },
      }
    })

    const target = tickets.find((t) => t.id === ticketId)
    if (target && target.status === 'NEW') {
      handleUpdateStatus(ticketId, 'IN_PROGRESS')
    }
  }

  // Advance individual item status in KDS
  const handleAdvanceItemStatus = async (orderId: string, itemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'READY'
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        showToast(`Item moved to ${nextStatus}`, 'success')
        fetchTickets()
        fetchKpi()
      }
    } catch {
      showToast('Failed to advance item', 'error')
    }
  }

  // Handle Status Update (Mark Done, Start Cooking, Bump)
  const handleUpdateStatus = async (ticketId: string, nextStatus: 'IN_PROGRESS' | 'READY' | 'SERVED') => {
    try {
      const res = await fetch(`/api/kds/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update ticket status')
      }

      showToast(`Ticket status updated to ${nextStatus}`, 'success')
      fetchTickets()
      fetchKpi()
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error')
    }
  }

  // Counts for Top Filter Pills
  const newOrderCount = tickets.filter((t) => t.status === 'NEW').length
  const inKitchenCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length
  const delayedCount = tickets.filter((t) => {
    if (t.status === 'READY' || t.status === 'SERVED') return false
    const mins = (currentTime.getTime() - new Date(t.createdAt).getTime()) / 60000
    return mins > 15
  }).length
  const completedCount = tickets.filter((t) => t.status === 'READY' || t.status === 'SERVED').length

  // Filtered List
  const filteredTickets = tickets.filter((ticket) => {
    const isDelayed =
      ticket.status !== 'READY' &&
      ticket.status !== 'SERVED' &&
      (currentTime.getTime() - new Date(ticket.createdAt).getTime()) / 60000 > 15

    if (activeFilter === 'NEW' && ticket.status !== 'NEW') return false
    if (activeFilter === 'IN_KITCHEN' && ticket.status !== 'IN_PROGRESS') return false
    if (activeFilter === 'DELAYED' && !isDelayed) return false
    if (activeFilter === 'COMPLETED' && ticket.status !== 'READY' && ticket.status !== 'SERVED') return false

    // Station Routing filter
    if (stationFilter !== 'ALL' && ticket.station !== stationFilter) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const ticketNum = `#${ticket.id.slice(-5).toLowerCase()}`
      const custName = (ticket.order?.customer?.name || ticket.order?.table?.name || '').toLowerCase()
      const hasItem = ticket.items.some((i) => (i.menuItem?.name || '').toLowerCase().includes(q))
      if (!ticketNum.includes(q) && !custName.includes(q) && !hasItem) return false
    }
    return true
  })

  return (
    <div className="dream-pos-container">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── TOP HEADER / NAVBAR (DREAMS POS STYLE) ────────────────────────── */}
      <header className="dream-pos-header">
        <div className="dream-pos-header__left">
          {/* App Switcher 4-dot icon */}
          <Link href={currentUser.role === 'KITCHEN' ? '/kds' : currentUser.role === 'SERVER' ? '/server' : '/dashboard'} style={{ display: 'flex', color: 'var(--color-text-secondary)', textDecoration: 'none' }} title={currentUser.role === 'KITCHEN' ? 'Kitchen KDS' : 'Dashboard'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </Link>

          {/* Logo */}
          <Link href={currentUser.role === 'KITCHEN' ? '/kds' : currentUser.role === 'SERVER' ? '/server' : '/dashboard'} className="dream-pos-logo">
            <ProminentzLogo variant="full" size="sm" />
            {currentUser.role === 'KITCHEN' && (
              <span style={{ fontSize: '10px', background: 'rgba(249,115,22,0.15)', color: '#fb923c', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 800 }}>
                KITCHEN
              </span>
            )}
          </Link>

          {/* Navigation Pills (Role-gated) */}
          <div className="dream-pos-nav-pills">
            <Link href="/kds" className="dream-pos-nav-btn dream-pos-nav-btn--active">
              🍳 Kitchen (KDS)
            </Link>
            {['OWNER', 'MANAGER', 'SERVER'].includes(currentUser.role) && (
              <Link href="/server" className="dream-pos-nav-btn">
                🍽️ Server Floor
              </Link>
            )}
            {['OWNER', 'MANAGER', 'SERVER'].includes(currentUser.role) && (
              <Link href="/pos" className="dream-pos-nav-btn">
                🛍️ POS
              </Link>
            )}
            {['OWNER', 'MANAGER'].includes(currentUser.role) && (
              <Link href="/dashboard" className="dream-pos-nav-btn">
                📊 Manager Console
              </Link>
            )}
          </div>
        </div>

        {/* Right Tools: Timeclock, Theme, Avatar */}
        <div className="dream-pos-header__right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="kds-header-clock"
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: 'var(--color-text-tertiary)',
              fontWeight: 600,
            }}
          >
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>

          {/* Shift Timeclock Toggle */}
          <button
            onClick={handleToggleClock}
            disabled={clockLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              border: clockStatus.isClockedIn ? '1px solid #16a34a' : '1px solid var(--color-border)',
              backgroundColor: clockStatus.isClockedIn ? 'rgba(22, 163, 74, 0.12)' : 'var(--color-bg-card)',
              color: clockStatus.isClockedIn ? '#16a34a' : 'var(--color-text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={clockStatus.isClockedIn ? 'You are Clocked In. Tap to Clock Out.' : 'You are Clocked Out. Tap to Clock In.'}
          >
            <span>{clockStatus.isClockedIn ? '🟢' : '⏰'}</span>
            <span>
              {clockLoading
                ? 'Updating...'
                : clockStatus.isClockedIn
                ? 'Clocked In'
                : 'Clock In'}
            </span>
          </button>

          {/* 86'd Dishes Quick Manager */}
          <button
            onClick={() => setIs86ModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Manage 86'd (Sold Out) Items"
          >
            <span>🚫 86&apos;d Dishes</span>
            {menuItems.filter((i) => i.is86d || !i.isAvailable).length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                {menuItems.filter((i) => i.is86d || !i.isAvailable).length}
              </span>
            )}
          </button>

          <ThemeToggle />

          {/* User Profile Avatar */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#5b45f5',
              color: '#fff',
              fontWeight: 800,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={currentUser.name}
          >
            {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'KD'}
          </div>

          <button
            onClick={onSignOut}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── TOP KPI METRIC STRIP (MATCHING POS DESIGN) ────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '12px 24px',
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {[
          {
            label: 'Orders / Hour',
            value: kpiData ? `${kpiData.ordersPerHour}` : '—',
            icon: '📦',
            color: '#5b45f5',
          },
          {
            label: 'Avg Ticket Time',
            value: kpiData ? `${kpiData.avgTicketTimeMins} min` : '—',
            icon: '⏱️',
            color: (kpiData?.avgTicketTimeMins ?? 0) <= 12 ? '#16a34a' : '#f59e0b',
          },
          {
            label: 'Active Tickets',
            value: `${tickets.length}`,
            icon: '🎫',
            color: '#5b45f5',
          },
          {
            label: 'Delayed (>15m)',
            value: `${delayedCount}`,
            icon: '🚨',
            color: delayedCount > 0 ? '#ef4444' : '#16a34a',
          },
          {
            label: 'Kitchen Staff',
            value: kpiData ? `${kpiData.activeKitchenStaff}` : '1',
            icon: '🧑‍🍳',
            color: '#16a34a',
          },
          {
            label: "Today's Volume",
            value: kpiData ? `$${kpiData.todayRevenue.toFixed(0)}` : '—',
            icon: '💰',
            color: '#16a34a',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              minWidth: '140px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '18px' }}>{kpi.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {kpi.label}
              </span>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: kpi.color,
                  letterSpacing: '-0.02em',
                }}
              >
                {kpi.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTER TABS & SEARCH BAR ───────────────────────────────────────── */}
      <div
        style={{
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          flexShrink: 0,
        }}
      >
        {/* Status & Station Filter Pills Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '100%', minWidth: 0 }}>
          {/* Station Routing Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px', maxWidth: '100%', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4, flexShrink: 0 }}>
              Station:
            </span>
            {[
              { id: 'ALL', label: 'All Stations' },
              { id: 'HOT', label: '🔥 Hot Line' },
              { id: 'COLD', label: '🥗 Cold Prep' },
              { id: 'BAR', label: '🍹 Bar' },
              { id: 'EXPO', label: '🛎️ Expo' },
            ].map((st) => {
              const active = stationFilter === st.id
              return (
                <button
                  key={st.id}
                  onClick={() => setStationFilter(st.id as any)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: active ? '1px solid #5b45f5' : '1px solid var(--color-border)',
                    backgroundColor: active ? 'rgba(91,69,245,0.15)' : 'var(--color-bg-card)',
                    color: active ? '#60a5fa' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st.label}
                </button>
              )
            })}
          </div>

          {/* Ticket Lifecycle Status Pills */}
          <div className="dream-filter-pills" style={{ flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Tickets', count: tickets.length, color: '#5b45f5' },
              { id: 'NEW', label: 'New Order', count: newOrderCount, color: '#1e293b', dot: '🔵' },
              { id: 'IN_KITCHEN', label: 'In Kitchen', count: inKitchenCount, color: '#f59e0b', dot: '🟠' },
              { id: 'DELAYED', label: 'Delayed', count: delayedCount, color: '#ef4444', dot: '🔴' },
              { id: 'COMPLETED', label: 'Completed', count: completedCount, color: '#16a34a', dot: '🟢' },
            ].map((item) => {
              const active = activeFilter === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveFilter(item.id as any)}
                  className={`dream-filter-pill ${active ? 'dream-filter-pill--active' : ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  {item.dot && <span>{item.dot}</span>}
                  <span>{item.label}</span>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 800,
                      background: active ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-raised)',
                      color: active ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    {String(item.count).padStart(2, '0')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Live Search & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: 220 }}>
            <input
              type="text"
              placeholder="Search table, ticket #, dish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 30px 7px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 12 }}>
              🔍
            </span>
          </div>

          <button
            onClick={() => {
              fetchTickets()
              fetchKpi()
            }}
            title="Refresh"
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* ── TICKETS MAIN GRID CONTAINER ───────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          background: 'var(--color-bg)',
        }}
      >
        {filteredTickets.length === 0 ? (
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              padding: '60px 24px',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🍳</div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              No tickets matching current filter
            </p>
            <span style={{ fontSize: '13px' }}>Kitchen tickets sent from POS or tables will appear here in real time.</span>
          </div>
        ) : (
          <div className="kds-tickets-grid">
            {filteredTickets.map((ticket, index) => {
              const diningType = resolveDiningType(ticket)
              const ticketNum = `#${ticket.id.slice(-5).toUpperCase()}`
              const token = tokenNumber(ticket.id)
              const dateFormatted = formatTicketDate(ticket.createdAt)
              const customerName =
                ticket.order?.customer?.name ||
                (ticket.order?.table?.name ? `Table ${ticket.order.table.name}` : 'Walk in Customer')

              const elapsedMins = (currentTime.getTime() - new Date(ticket.createdAt).getTime()) / 60000
              const isDelayed = ticket.status !== 'READY' && ticket.status !== 'SERVED' && elapsedMins > 15

              let headerBg = '#1e293b' // New Order default
              if (isDelayed) {
                headerBg = '#ef4444' // Red Delayed
              } else if (ticket.status === 'READY' || ticket.status === 'SERVED') {
                headerBg = '#16a34a' // Green Completed
              } else if (ticket.status === 'IN_PROGRESS') {
                headerBg = index % 2 === 0 ? '#f59e0b' : '#f97316'
              }

              const timerState = activeCookingTimers[ticket.id]
              const isPlaying = timerState?.running

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(index * 0.05, 0.4),
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  layout
                  layoutId={ticket.id}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow var(--transition-fast)',
                  }}
                >
                  {/* Card Header Banner */}
                  <div
                    style={{
                      backgroundColor: headerBg,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: headerBg,
                          fontWeight: 800,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        🍳
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                          {customerName}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>
                          {diningType} {ticket.order?.server?.name ? `• ${ticket.order.server.name}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Station & Ticket Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {ticket.station === 'HOT'
                          ? '🔥 HOT'
                          : ticket.station === 'COLD'
                          ? '🥗 COLD'
                          : ticket.station === 'BAR'
                          ? '🍹 BAR'
                          : '📋 EXPO'}
                      </span>
                      <div
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.22)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {ticketNum}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    {/* Token No & Timestamp */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        paddingBottom: 4,
                        borderBottom: '1px dashed var(--color-border)',
                      }}
                    >
                      <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        Token No: #{token}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{dateFormatted}</span>
                    </div>

                    {/* Dish Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                      {ticket.items.map((item, iIdx) => {
                        const dishName = item.menuItem?.name || 'Kitchen Dish'
                        const isVeg = isVegDish(dishName, item.menuItem?.isVeg)
                        const isAllergy =
                          item.specialNote &&
                          /allergy|gluten|nut|peanut|dairy|lactose|celiac|vegan|no /i.test(item.specialNote)

                        return (
                          <div
                            key={item.id || iIdx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              paddingBottom: 6,
                              borderBottom: '1px solid var(--color-separator)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, gap: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: isVeg ? '#16a34a' : '#ef4444' }}>
                                  {isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 13,
                                    color: 'var(--color-text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {dishName}
                                </span>
                                <span style={{ fontWeight: 800, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
                                  ×{item.quantity}
                                </span>
                              </div>

                              {/* 1-Tap Item Progression Button */}
                              <button
                                onClick={() => handleAdvanceItemStatus(ticket.orderId, item.id, item.status)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  backgroundColor:
                                    item.status === 'READY'
                                      ? 'rgba(34,197,94,0.15)'
                                      : item.status === 'IN_PROGRESS'
                                      ? 'rgba(245,158,11,0.15)'
                                      : 'var(--color-bg)',
                                  borderColor:
                                    item.status === 'READY'
                                      ? '#16a34a'
                                      : item.status === 'IN_PROGRESS'
                                      ? '#d97706'
                                      : 'var(--color-border)',
                                  color:
                                    item.status === 'READY'
                                      ? '#16a34a'
                                      : item.status === 'IN_PROGRESS'
                                      ? '#d97706'
                                      : 'var(--color-text-secondary)',
                                }}
                              >
                                {item.status === 'READY' ? '✅ Ready' : item.status === 'IN_PROGRESS' ? '🍳 Prep → Done' : '🔥 Fire'}
                              </button>
                            </div>

                            {/* Loud Allergy / Special Note */}
                            {item.specialNote && (
                              <div
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: isAllergy ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-bg-raised)',
                                  border: isAllergy ? '1.5px solid #ef4444' : '1px solid var(--color-border)',
                                  color: isAllergy ? '#ef4444' : 'var(--color-text-secondary)',
                                  fontWeight: isAllergy ? 800 : 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  width: 'fit-content',
                                }}
                              >
                                {isAllergy && <span>⚠️ ALLERGY:</span>}
                                <span>{item.specialNote}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Cook Progress Bar & Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <div className="dream-order-progress" style={{ flex: 1 }}>
                        <div
                          className="dream-order-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(15, (elapsedMins / 20) * 100))}%`,
                            background: isDelayed ? '#ef4444' : '#16a34a',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: isDelayed ? '#ef4444' : 'var(--color-text-tertiary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        ⏱ {isDelayed ? 'DELAYED' : `${Math.floor(elapsedMins)}m / 20m`}
                      </span>
                    </div>

                    {/* Footer Buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        onClick={() => togglePlayTimer(ticket.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          backgroundColor: isPlaying ? 'rgba(37,99,235,0.1)' : 'var(--color-bg)',
                          color: isPlaying ? '#5b45f5' : 'var(--color-text-primary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {isPlaying ? <>⏸ Pause</> : <>▷ Play Timer</>}
                      </button>

                      <button
                        onClick={() => {
                          const next = ticket.status === 'READY' ? 'SERVED' : 'READY'
                          handleUpdateStatus(ticket.id, next)
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: ticket.status === 'READY' || ticket.status === 'SERVED' ? '#16a34a' : '#5b45f5',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ {ticket.status === 'READY' ? 'Mark Served' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── 86'D ITEMS (OUT OF STOCK) MODAL ────────────────────────────── */}
      {is86ModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setIs86ModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--color-bg)',
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚫</span> Kitchen 86&apos;d Dishes (Sold Out)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                  Marking dishes 86 instantly disables them on Server POS and Customer QR Menus.
                </div>
              </div>
              <button
                onClick={() => setIs86ModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Search filter in modal */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <input
                type="text"
                placeholder="Search dish to 86 or restore..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Menu Items List */}
            <div style={{ overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {menuItems
                .filter((item) => !menuSearch.trim() || item.name.toLowerCase().includes(menuSearch.toLowerCase()))
                .map((item) => {
                  const is86 = item.is86d || !item.isAvailable
                  const isToggling = toggling86Id === item.id

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: is86 ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-bg)',
                        border: is86 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--color-border)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: is86 ? '#ef4444' : 'var(--color-text-primary)' }}>
                            {item.name}
                          </span>
                          {is86 && (
                            <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              86&apos;D
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                          {item.category?.name || 'Main Menu'} • ${Number(item.price || 0).toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggle86(item.id, is86)}
                        disabled={isToggling}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: isToggling ? 'not-allowed' : 'pointer',
                          border: is86 ? '1px solid #16a34a' : '1px solid #ef4444',
                          backgroundColor: is86 ? '#16a34a' : 'rgba(239, 68, 68, 0.12)',
                          color: is86 ? '#ffffff' : '#ef4444',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isToggling ? 'Updating...' : is86 ? '✓ Restore' : '🚫 Mark 86'}
                      </button>
                    </div>
                  )
                })}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setIs86ModalOpen(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
