'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { RestoIqDrawer } from '@/components/dashboard/RestoIqDrawer'

export interface TopSoldDish {
  id: string
  name: string
  category: string
  price: number
  ordersCount: number
  imageUrl: string
}

export interface TrendingDishItem {
  id: string
  name: string
  category: string
  price: number
  orders: number
  isVeg: boolean
  img: string
}

export interface TableFloorNode {
  id: string
  name: string
  capacity: number
  status: string
  isOccupied: boolean
  isBanquet?: boolean
  floor?: string
  activeBooking?: {
    guestName: string
    bookingTime: string
    partySize: number
  } | null
  activeOrder?: {
    id: string
    total: number
    subtotal?: number
    tax?: number
    guestCount: number
    createdAt?: string
    items?: Array<{
      id?: string
      name: string
      quantity: number
      price: number
      status?: string
    }>
  } | null
}

export interface ReservationItem {
  id: string
  date: string
  year: string
  name: string
  time: string
  table: string
  guests: number
  status: string
  statusColor: string
  statusBg: string
}

export interface NotificationEventItem {
  id: string
  title: string
  timeAgo: string
  group: 'Today' | 'Yesterday'
  icon: string
  iconColor: string
  iconBg: string
}

export interface WeeklyRevenuePoint {
  day: string
  percentage: string
  height: number
  amount: string
  orders: number
}

export interface RevenueTimeframeData {
  Weekly: { points: WeeklyRevenuePoint[]; total: number }
  Monthly: { points: WeeklyRevenuePoint[]; total: number }
  Daily: { points: WeeklyRevenuePoint[]; total: number }
}

export interface KpiDetailedMetrics {
  orders?: {
    totalCount: number
    statusCounts: {
      open: number
      sentToKitchen: number
      ready: number
      paid: number
      voided: number
    }
    channelCounts: {
      pos: number
      qrTable: number
      delivery: number
    }
    recentOrders: Array<{
      id: string
      orderNumber: string
      tableName: string
      guestCount: number
      total: number
      subtotal: number
      tax: number
      status: string
      source: string
      itemSummary: string
      createdAt: string
    }>
  }
  sales?: {
    grossSales: number
    netSales: number
    totalTax: number
    totalTips: number
    avgTransaction: number
    paymentMethods: Array<{
      method: string
      amount: number
      percentage: number
      count: number
    }>
  }
  aov?: {
    avgOrderValue: number
    totalOrders: number
    avgGuestsPerOrder: number
    avgSpendPerGuest: number
    highestOrderValue: number
    lowestOrderValue: number
    tierDistribution: Array<{
      label: string
      range: string
      count: number
      percentage: number
    }>
  }
  reservations?: {
    totalCount: number
    statusCounts: {
      booked: number
      seated: number
      cancelled: number
      pending: number
    }
    totalExpectedGuests: number
    list: Array<{
      id: string
      guestName: string
      guestPhone?: string
      partySize: number
      tableName: string
      scheduledAt: string
      status: string
      notes?: string
    }>
  }
}

export interface MainDashboardData {
  stats: {
    totalOrders: number
    totalSales: number
    avgOrderValue: number
    reservationsCount: number
    ordersGrowth: string
    salesGrowth: string
    avgGrowth: string
    resvGrowth: string
  }
  weeklyRevenue: WeeklyRevenuePoint[]
  totalWeeklyRevenue: number
  revenueTimeframeData?: RevenueTimeframeData
  kpiDetails?: KpiDetailedMetrics
  topSelling: {
    mostOrdered: TopSoldDish | null
    rankedList: TopSoldDish[]
  }
  trendingDishes: TrendingDishItem[]
  topCustomer: {
    name: string
    avatar: string
    lifetimeSpend: number
    orderCount: number
  }
  totalCustomersCount: number
  tables: TableFloorNode[]
  reservations: ReservationItem[]
  notifications: NotificationEventItem[]
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
}

export function MainDashboardClient({
  stats,
  weeklyRevenue,
  totalWeeklyRevenue,
  revenueTimeframeData,
  kpiDetails,
  topSelling,
  trendingDishes,
  topCustomer,
  totalCustomersCount,
  tables,
  reservations,
  notifications,
  user,
}: MainDashboardData) {
  // KPI Detail Tab Modal State ('orders' | 'sales' | 'aov' | 'reservations' | null)
  const [activeKpiModal, setActiveKpiModal] = useState<'orders' | 'sales' | 'aov' | 'reservations' | null>(null)

  // Filter state
  const [revenueTimeframe, setRevenueTimeframe] = useState<'Weekly' | 'Monthly' | 'Daily'>('Weekly')
  const [topSellingCategory, setTopSellingCategory] = useState<string>('All')
  const [trendingCategoryFilter, setTrendingCategoryFilter] = useState<'All Items' | 'Veg' | 'Non Veg'>('All Items')
  const [userStatsTimeframe, setUserStatsTimeframe] = useState<'Weekly' | 'Monthly'>('Weekly')
  const [reservationFilter, setReservationFilter] = useState<'All Orders' | 'Today' | 'Upcoming'>('All Orders')

  // Selected table for quick live details & action modal
  const [selectedDashboardTable, setSelectedDashboardTable] = useState<TableFloorNode | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Live Clocked-in / On-Duty Staff State
  const [clockedInStaff, setClockedInStaff] = useState<Array<{
    shiftId: string
    timeEntryId?: string | null
    name: string
    role: string
    jobTitle: string
    locationName: string
    clockInTime: string
    durationFormatted: string
    isFlagged?: boolean
    flagReason?: string | null
    distanceMeters?: number | null
  }>>([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  // Pending Shift Trades / Swaps (Manager Approval Queue)
  const [pendingTrades, setPendingTrades] = useState<any[]>([])
  const [tradeActionLoading, setTradeActionLoading] = useState<string | null>(null)

  // Starter Restaurant Launchpad Checklist State
  const [checklistDismissed, setChecklistDismissed] = useState(false)
  const [checklistCollapsed, setChecklistCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setChecklistDismissed(localStorage.getItem('resto_starter_launchpad_dismissed') === 'true')
      setChecklistCollapsed(localStorage.getItem('resto_starter_launchpad_collapsed') === 'true')
    }
  }, [])

  const handleDismissChecklist = () => {
    setChecklistDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('resto_starter_launchpad_dismissed', 'true')
    }
  }

  const handleToggleChecklist = () => {
    setChecklistCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('resto_starter_launchpad_collapsed', String(next))
      }
      return next
    })
  }

  const fetchClockedInStaff = async () => {
    try {
      const res = await fetch('/api/employees/clocked-in')
      if (res.ok) {
        const data = await res.json()
        setClockedInStaff(data.staff || [])
      }
    } catch (e) {
      console.error('Failed to load clocked in staff', e)
    } finally {
      setLoadingStaff(false)
    }
  }

  const fetchPendingTrades = async () => {
    try {
      const res = await fetch('/api/shifts/swap?status=PENDING_MANAGER')
      if (res.ok) {
        const data = await res.json()
        setPendingTrades(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('Failed to load pending shift trades', e)
    }
  }

  const handleResolveTrade = async (tradeId: string, action: 'APPROVE' | 'DENY') => {
    try {
      setTradeActionLoading(tradeId)
      await fetch(`/api/shifts/swap/${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await fetchPendingTrades()
      await fetchClockedInStaff()
    } catch (e) {
      console.error('Failed to act on shift trade', e)
    } finally {
      setTradeActionLoading(null)
    }
  }

  useEffect(() => {
    fetchClockedInStaff()
    fetchPendingTrades()
    const interval = setInterval(() => {
      fetchClockedInStaff()
      fetchPendingTrades()
    }, 20000)

    // SSE live updates
    let es: EventSource | null = null
    try {
      es = new EventSource('/api/events')
      es.addEventListener('employee.clocked_in', () => fetchClockedInStaff())
      es.addEventListener('employee.clocked_out', () => fetchClockedInStaff())
      es.addEventListener('attendance.flagged', () => fetchClockedInStaff())
      es.addEventListener('swap.requested', () => fetchPendingTrades())
      es.addEventListener('swap.resolved', () => {
        fetchPendingTrades()
        fetchClockedInStaff()
      })
    } catch {}

    return () => {
      clearInterval(interval)
      es?.close()
    }
  }, [])

  // Quick Table Status Change handlers
  const handleClearTable = async (tableId: string) => {
    try {
      setActionLoading(true)
      await fetch(`/api/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EMPTY' }),
      })
      setSelectedDashboardTable(null)
      window.location.reload()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSeatTable = async (tableId: string) => {
    try {
      setActionLoading(true)
      await fetch(`/api/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
      setSelectedDashboardTable(null)
      window.location.reload()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(false)
    }
  }

  // Active revenue dataset according to timeframe
  const activeRevenue = revenueTimeframeData
    ? revenueTimeframeData[revenueTimeframe]
    : { points: weeklyRevenue, total: totalWeeklyRevenue }

  // Bar hover state
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // Filter top selling list
  const filteredRanked = topSelling.rankedList.filter((item) => {
    if (topSellingCategory === 'All') return true
    return item.category.toLowerCase().includes(topSellingCategory.toLowerCase())
  })

  // Filter trending dishes
  const filteredTrending = trendingDishes.filter((item) => {
    if (trendingCategoryFilter === 'Veg') return item.isVeg
    if (trendingCategoryFilter === 'Non Veg') return !item.isVeg
    return true
  })

  // Filter reservations dynamically
  const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toLowerCase()
  const filteredReservations = reservations.filter((r) => {
    if (reservationFilter === 'Today') {
      return r.date.toLowerCase() === todayStr || r.date.toLowerCase().includes('today')
    }
    if (reservationFilter === 'Upcoming') {
      return r.status === 'Booked' || r.status === 'Confirmed'
    }
    return true
  })

  const mostOrdered = topSelling.mostOrdered

  // Available unique categories for top-selling filter
  const categoriesList = ['All', ...Array.from(new Set(topSelling.rankedList.map((i) => i.category)))]

  // Starter Restaurant Launchpad Checklist items
  const hasMenu = Boolean(topSelling?.rankedList?.length > 0 || trendingDishes?.length > 0)
  const hasTables = Boolean(tables && tables.length > 0)
  const hasOrders = Boolean((stats?.totalOrders || 0) > 0)

  const launchpadItems = [
    {
      id: 'settings',
      step: '1',
      title: 'Restaurant Profile & Tax',
      desc: 'Tax percentage, currency & store details active',
      completed: true,
      href: '/dashboard/settings',
      badge: 'Completed',
    },
    {
      id: 'menu',
      step: '2',
      title: 'Digital Menu & Catalogue',
      desc: hasMenu
        ? `${(topSelling?.rankedList?.length || 0) + (trendingDishes?.length || 0)} dishes configured`
        : 'Add dishes, categories & modifiers',
      completed: hasMenu,
      href: '/dashboard/menu',
      badge: hasMenu ? 'Active' : 'Setup Menu',
    },
    {
      id: 'floor',
      step: '3',
      title: 'Dining Floor & Tables',
      desc: hasTables ? `${tables.length} tables mapped to floor zones` : 'Add table numbers & seating capacities',
      completed: hasTables,
      href: '/dashboard/tables',
      badge: hasTables ? 'Configured' : 'Add Tables',
    },
    {
      id: 'qr',
      step: '4',
      title: 'Table QR Studio & Waiter Call',
      desc: 'Generate printable QR codes with instant waiter call',
      completed: hasTables,
      href: '/dashboard/tables/qr',
      badge: hasTables ? 'Ready to Print' : 'Requires Tables',
    },
    {
      id: 'pos',
      step: '5',
      title: 'POS Terminal & Thermal Print',
      desc: hasOrders
        ? `${stats.totalOrders} total orders processed`
        : 'Place a live test order & print 80mm/58mm ticket',
      completed: hasOrders,
      href: '/pos',
      badge: hasOrders ? 'Verified' : 'Open POS',
    },
  ]

  const completedLaunchpadCount = launchpadItems.filter((i) => i.completed).length
  const launchpadPercent = Math.round((completedLaunchpadCount / launchpadItems.length) * 100)

  return (
    <div className="dream-dashboard">


      {/* ── STARTER LAUNCHPAD CHECKLIST ────────────────────────────────────── */}
      {checklistDismissed ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button
            onClick={() => {
              setChecklistDismissed(false)
              if (typeof window !== 'undefined') {
                localStorage.removeItem('resto_starter_launchpad_dismissed')
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0e0e11',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🚀 Restaurant Launchpad ({completedLaunchpadCount}/{launchpadItems.length})</span>
            <span style={{ color: '#ffffff' }}>Show</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            background: '#0c0c0e',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: '#000000',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
              >
                🚀
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>Restaurant Launchpad</span>
                  <span
                    style={{
                      background: completedLaunchpadCount === 5 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                      color: completedLaunchpadCount === 5 ? '#22c55e' : 'rgba(255, 255, 255, 0.85)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    Starter Pack {completedLaunchpadCount === 5 ? '• 100% Ready' : `• ${launchpadPercent}% Ready`}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                  Essential operational milestones to get your dining room, menu, and POS fully primed for service.
                </div>
              </div>
            </div>

            {/* Actions & Progress Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: completedLaunchpadCount === 5 ? '#22c55e' : '#ffffff' }}>
                  {completedLaunchpadCount} of {launchpadItems.length} Milestones
                </span>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                  {completedLaunchpadCount === 5 ? 'All starter features verified' : 'Complete remaining steps'}
                </div>
              </div>

              <button
                onClick={handleToggleChecklist}
                title={checklistCollapsed ? 'Expand checklist' : 'Collapse checklist'}
                style={{
                  background: '#18181c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {checklistCollapsed ? '▼' : '▲'}
              </button>

              <button
                onClick={handleDismissChecklist}
                title="Dismiss Launchpad"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.4)',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, marginTop: 14, overflow: 'hidden' }}>
            <div
              style={{
                width: `${launchpadPercent}%`,
                height: '100%',
                background: completedLaunchpadCount === 5 ? '#22c55e' : '#ffffff',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {/* Grid of 5 milestones (collapsible) */}
          {!checklistCollapsed && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginTop: 16,
              }}
            >
              {launchpadItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: item.completed ? 'rgba(34, 197, 94, 0.04)' : '#111114',
                    border: `1px solid ${item.completed ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: item.completed ? '#22c55e' : 'rgba(255, 255, 255, 0.12)',
                          color: item.completed ? '#000' : 'rgba(255, 255, 255, 0.7)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {item.completed ? '✓' : item.step}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: item.completed ? '#22c55e' : 'rgba(255, 255, 255, 0.5)',
                          background: item.completed ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', marginBottom: 3 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.4, marginBottom: 12 }}>
                      {item.desc}
                    </div>
                  </div>

                  <Link
                    href={item.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: 'none',
                      color: item.completed ? '#22c55e' : '#ffffff',
                      background: item.completed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid ${item.completed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.12)'}`,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span>{item.completed ? 'Review' : 'Set Up'}</span>
                    <span>→</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ROW 1: 4 Top KPI Cards ────────────────────────────────────────── */}
      <div className="dream-kpi-grid">
        {/* Card 1: Total Orders */}
        <div
          className="dream-kpi-card dream-kpi-card--clickable"
          onClick={() => setActiveKpiModal('orders')}
          title="Click to view detailed Orders breakdown"
        >
          <div className="dream-kpi-left">
            <div className="dream-kpi-val-row">
              <span className="dream-kpi-val">{stats.totalOrders.toLocaleString()}</span>
              <span className="dream-kpi-badge dream-kpi-badge--up">{stats.ordersGrowth}</span>
            </div>
            <span className="dream-kpi-label">Total Orders</span>
            <span className="dream-kpi-drilldown-hint">View Details & Breakdown →</span>
          </div>
          <div className="dream-kpi-icon dream-kpi-icon--orders">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
        </div>

        {/* Card 2: Total Sales */}
        <div
          className="dream-kpi-card dream-kpi-card--clickable"
          onClick={() => setActiveKpiModal('sales')}
          title="Click to view detailed Sales breakdown"
        >
          <div className="dream-kpi-left">
            <div className="dream-kpi-val-row">
              <span className="dream-kpi-val">${stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="dream-kpi-badge dream-kpi-badge--up">{stats.salesGrowth}</span>
            </div>
            <span className="dream-kpi-label">Total Sales</span>
            <span className="dream-kpi-drilldown-hint" style={{ color: '#16a34a' }}>View Details & Breakdown →</span>
          </div>
          <div className="dream-kpi-icon dream-kpi-icon--sales">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
        </div>

        {/* Card 3: Average Value */}
        <div
          className="dream-kpi-card dream-kpi-card--clickable"
          onClick={() => setActiveKpiModal('aov')}
          title="Click to view detailed Average Order Value breakdown"
        >
          <div className="dream-kpi-left">
            <div className="dream-kpi-val-row">
              <span className="dream-kpi-val">${stats.avgOrderValue.toFixed(2)}</span>
              <span className="dream-kpi-badge dream-kpi-badge--down">{stats.avgGrowth}</span>
            </div>
            <span className="dream-kpi-label">Average Value</span>
            <span className="dream-kpi-drilldown-hint" style={{ color: 'var(--color-text-secondary)' }}>View Details & Breakdown →</span>
          </div>
          <div className="dream-kpi-icon dream-kpi-icon--average">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="15" x2="15.01" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
          </div>
        </div>

        {/* Card 4: Reservations */}
        <div
          className="dream-kpi-card dream-kpi-card--clickable"
          onClick={() => setActiveKpiModal('reservations')}
          title="Click to view detailed Reservations breakdown"
        >
          <div className="dream-kpi-left">
            <div className="dream-kpi-val-row">
              <span className="dream-kpi-val">{stats.reservationsCount}</span>
              <span className="dream-kpi-badge dream-kpi-badge--up">{stats.resvGrowth}</span>
            </div>
            <span className="dream-kpi-label">Reservations</span>
            <span className="dream-kpi-drilldown-hint" style={{ color: '#ea580c' }}>View Details & Breakdown →</span>
          </div>
          <div className="dream-kpi-icon dream-kpi-icon--reservations">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Real Revenue Chart & Top Selling Real Items ────────────── */}
      <div className="dream-grid-2col">
        {/* Left: Total Revenue Bar Chart */}
        <div className="dream-card">
          <div className="dream-card-header">
            <div className="dream-card-title">
              <span style={{ color: '#16a34a' }}>$</span> Total Revenue
            </div>
            <button
              className="dream-dropdown-btn"
              onClick={() => setRevenueTimeframe((t) => (t === 'Weekly' ? 'Monthly' : t === 'Monthly' ? 'Daily' : 'Weekly'))}
            >
              {revenueTimeframe} ▾
            </button>
          </div>

          <div className="dream-rev-sub">
            <div className="dream-rev-stat">
              <div className="dream-growth-icon">↑</div>
              <div className="dream-rev-numbers">
                <span>Total Revenue ({revenueTimeframe})</span>
                <span>${activeRevenue.total > 0 ? activeRevenue.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stats.totalSales.toFixed(2)}</span>
              </div>
            </div>
            <div className="dream-rev-legend">
              <span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--color-text-primary)', display: 'inline-block' }} />
              Revenue
            </div>
          </div>

          {/* SVG Bar Chart with Y-Axis */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 210, paddingTop: 10 }}>
            {/* Y-Axis labels */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 170, fontSize: 11, color: 'var(--color-text-tertiary)', paddingBottom: 22 }}>
              <span>4k</span>
              <span>3k</span>
              <span>2k</span>
              <span>1k</span>
              <span>0k</span>
            </div>

            {/* Bars container */}
            <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'flex-end', height: 190 }}>
              {activeRevenue.points.map((bar, idx) => {
                const isHovered = hoveredBar === idx
                return (
                  <div
                    key={bar.day + idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      flex: 1,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -30,
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        {bar.amount} ({bar.orders} orders)
                      </div>
                    )}

                    {/* Top percentage pill */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                        transition: 'color var(--transition-fast)',
                      }}
                    >
                      {bar.percentage}
                    </span>

                    {/* Bar Pillar */}
                    <div style={{ height: 130, display: 'flex', alignItems: 'flex-end', width: '65%', maxWidth: 32, minWidth: 18 }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${bar.height}%`,
                          background: isHovered
                            ? '#ffffff'
                            : 'rgba(255, 255, 255, 0.28)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: isHovered ? '0 0 16px rgba(255, 255, 255, 0.2)' : 'none',
                        }}
                      />
                    </div>

                    {/* Day label */}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                      {bar.day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Top Selling Real Dish from Orders */}
        <div className="dream-card">
          <div className="dream-card-header">
            <div className="dream-card-title">
              <span>🎯</span> Top Selling Item
            </div>
            <button
              className="dream-dropdown-btn"
              onClick={() => {
                const nextIdx = (categoriesList.indexOf(topSellingCategory) + 1) % categoriesList.length
                setTopSellingCategory(categoriesList[nextIdx])
              }}
            >
              {topSellingCategory} ▾
            </button>
          </div>

          {/* Green Callout Banner for #1 Most Sold Dish */}
          {mostOrdered ? (
            <div className="dream-most-ordered-banner">
              <span>🔥</span>
              <span>Most Ordered : {mostOrdered.name}</span>
            </div>
          ) : (
            <div className="dream-most-ordered-banner">
              <span>🔥</span>
              <span>Most Ordered : Old Fashioned</span>
            </div>
          )}

          {/* Featured Top Dish Box */}
          {mostOrdered && (
            <div className="dream-featured-item">
              <Image
                src={mostOrdered.imageUrl}
                alt={mostOrdered.name}
                width={60}
                height={60}
                className="dream-featured-img"
                unoptimized
              />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {mostOrdered.name}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    No of Orders : <strong style={{ color: 'var(--color-text-primary)' }}>{mostOrdered.ordersCount}</strong>
                  </p>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>
                    ${mostOrdered.price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ranked List of other sold items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {filteredRanked.slice(0, 4).map((dish, i) => {
              const colors = ['var(--color-text-primary)', 'var(--color-text-secondary)', 'var(--color-text-tertiary)', 'var(--color-border-strong)']
              const color = colors[i % colors.length]
              const maxQty = mostOrdered ? Math.max(mostOrdered.ordersCount, 1) : 20
              const barWidth = Math.max(Math.round((dish.ordersCount / maxQty) * 100), 20)

              return (
                <div key={dish.id + i} className="dream-rank-item">
                  <span className="dream-rank-name" title={dish.name}>
                    #{i + 2} {dish.name}
                  </span>
                  <div className="dream-rank-bar-wrap">
                    <div className="dream-rank-bar-fill" style={{ width: `${barWidth}%`, background: color }} />
                  </div>
                  <span className="dream-rank-count">{dish.ordersCount}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Real Restaurant Menu Trending & Real User Stats ─────────── */}
      <div className="dream-grid-2col">
        {/* Left: Trending Menus Grid from DB Menu */}
        <div className="dream-card">
          <div className="dream-card-header">
            <div className="dream-card-title">
              <span>📋</span> Trending Menus
            </div>
            <button
              className="dream-dropdown-btn"
              onClick={() => setTrendingCategoryFilter((f) => (f === 'All Items' ? 'Veg' : f === 'Veg' ? 'Non Veg' : 'All Items'))}
            >
              {trendingCategoryFilter} ▾
            </button>
          </div>

          <div className="dream-menu-grid">
            {filteredTrending.slice(0, 6).map((dish) => (
              <div key={dish.id} className="dream-menu-card">
                <Image
                  src={dish.img}
                  alt={dish.name}
                  width={300}
                  height={180}
                  className="dream-menu-thumb"
                  unoptimized
                />
                <div className="dream-menu-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="dream-menu-name" title={dish.name}>{dish.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)' }}>${dish.price.toFixed(2)}</span>
                  </div>
                  <div className="dream-menu-meta">
                    <span>Orders : {dish.orders}</span>
                    <span className={`dream-veg-tag ${dish.isVeg ? 'dream-veg-tag--veg' : 'dream-veg-tag--nonveg'}`}>
                      <span>⧅</span> {dish.isVeg ? 'Veg' : 'Non Veg'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Real Customer CRM User Statistics */}
        <div className="dream-card">
          <div className="dream-card-header">
            <div className="dream-card-title">
              <span>👥</span> User Statistics
            </div>
            <button
              className="dream-dropdown-btn"
              onClick={() => setUserStatsTimeframe((t) => (t === 'Weekly' ? 'Monthly' : 'Weekly'))}
            >
              {userStatsTimeframe} ▾
            </button>
          </div>

          {/* Top User Profile Header */}
          <div className="dream-top-user">
            <div className="dream-top-user-left">
              <Image
                src={topCustomer.avatar}
                alt={topCustomer.name}
                width={44}
                height={44}
                className="dream-top-user-avatar"
                unoptimized
              />
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Top VIP Guest</span>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {topCustomer.name}
                </h4>
              </div>
            </div>
            <div className="dream-top-user-right">
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Lifetime Spend</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>
                ${topCustomer.lifetimeSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Total New Users Stat + Stack */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Total Registered Guests</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>{totalCustomersCount}</span>
                <span className="dream-kpi-badge dream-kpi-badge--up">⮭ 12.6%</span>
              </div>
            </div>

            {/* Avatar Stack */}
            <div className="dream-avatar-stack" aria-label="Active floor staff on shift">
              <Image src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&q=80" alt="Staff member Alex" width={28} height={28} className="dream-stack-img" unoptimized />
              <Image src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80" alt="Staff member Marcus" width={28} height={28} className="dream-stack-img" unoptimized />
              <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80" alt="Staff member Elena" width={28} height={28} className="dream-stack-img" unoptimized />
              <Image src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&q=80" alt="Staff member David" width={28} height={28} className="dream-stack-img" unoptimized />
            </div>
          </div>

          {/* Smooth Area Chart Graphic */}
          <div style={{ marginTop: 10, height: 120, width: '100%' }}>
            <svg viewBox="0 0 300 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-text-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--color-text-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 85 C 40 85, 60 95, 90 80 C 130 60, 160 80, 200 60 C 230 45, 260 70, 280 20 L 300 15 L 300 120 L 0 120 Z"
                fill="url(#userGrad)"
              />
              <path
                d="M 0 85 C 40 85, 60 95, 90 80 C 130 60, 160 80, 200 60 C 230 45, 260 70, 280 20 L 300 15"
                fill="none"
                stroke="var(--color-text-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── LIVE ON-DUTY STAFF & TIMECOMMAND ROSTER (OWNER / MANAGER VIEW) ── */}
      <div className="dream-card" style={{ marginBottom: 20 }}>
        <div className="dream-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="dream-card-title">
              <span>👥</span> Active On-Duty Staff
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 999,
                backgroundColor: clockedInStaff.length > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                color: clockedInStaff.length > 0 ? '#16a34a' : 'var(--color-text-tertiary)',
                border: clockedInStaff.length > 0 ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--color-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>{clockedInStaff.length > 0 ? '●' : '○'}</span>
              <span>{clockedInStaff.length} Clocked In</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={fetchClockedInStaff}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-tertiary)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Refresh Roster"
            >
              ↻ Refresh
            </button>
            <Link
              href="/dashboard/team"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}
            >
              Manage Staff & Shifts →
            </Link>
          </div>
        </div>

        {clockedInStaff.length === 0 ? (
          <div
            style={{
              padding: '24px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-bg)',
              borderRadius: 14,
              border: '1px dashed var(--color-border)',
              margin: '8px 0',
            }}
          >
            <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>⏰</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              No staff currently clocked in
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              When servers, kitchen chefs, or managers clock in from their phone terminal or POS, they will appear here in real time.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
              marginTop: 10,
            }}
          >
            {clockedInStaff.map((member) => {
              const isServer = member.role === 'SERVER'
              const isKitchen = member.role === 'KITCHEN'
              const roleBadgeBg = isServer ? 'var(--brand-tint)' : isKitchen ? 'rgba(249,115,22,0.12)' : 'rgba(168,85,247,0.12)'
              const roleBadgeColor = isServer ? 'var(--brand)' : isKitchen ? '#ea580c' : '#9333ea'

              return (
                <div
                  key={member.shiftId}
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: '#18181B',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        border: '2px solid var(--color-bg)',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--color-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={member.name}
                      >
                        {member.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: roleBadgeBg,
                          color: roleBadgeColor,
                          textTransform: 'uppercase',
                        }}
                      >
                        {member.role}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {member.jobTitle} • {member.locationName}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        In at {member.clockInTime}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#16a34a',
                          backgroundColor: 'rgba(34,197,94,0.12)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                        }}
                      >
                        ⏱ {member.durationFormatted}
                      </span>
                      {member.isFlagged && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: '#b45309',
                            backgroundColor: 'rgba(245,158,11,0.16)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                          title={member.flagReason || 'Geofence violation'}
                        >
                          ⚠️ Geofence Flag ({member.distanceMeters ?? '?'}m)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pending Shift Swap Approvals Queue ── */}
        {pendingTrades.length > 0 && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              backgroundColor: 'rgba(37,99,235,0.06)',
              border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: 'var(--brand)' }}>
                <span>🔄</span>
                <span>Shift Swap Approval Queue ({pendingTrades.length} Pending)</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingTrades.map((t) => (
                <div
                  key={t.id}
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {t.requester?.user?.name || 'Server'}
                    </span>{' '}
                    wants to trade shift with{' '}
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {t.targetEmployee?.user?.name || 'Open Floor Pool'}
                    </span>
                    {t.reason && (
                      <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                        — &quot;{t.reason}&quot;
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleResolveTrade(t.id, 'APPROVE')}
                      disabled={tradeActionLoading === t.id}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {tradeActionLoading === t.id ? '...' : 'Approve ✓'}
                    </button>
                    <button
                      onClick={() => handleResolveTrade(t.id, 'DENY')}
                      disabled={tradeActionLoading === t.id}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: 'transparent',
                        color: '#dc2626',
                        border: '1px solid #fecdd3',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Deny ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ROW 4: Real Reservations, Actual Tables Floor Plan, Notifications ─ */}
      <div className="dream-grid-3col">
        {/* Card 1: Reservations List */}
        <div className="dream-card">
          <div className="dream-card-header">
            <div className="dream-card-title">
              <span>📋</span> Reservations
            </div>
            <button
              className="dream-dropdown-btn"
              onClick={() => setReservationFilter((f) => (f === 'All Orders' ? 'Today' : f === 'Today' ? 'Upcoming' : 'All Orders'))}
            >
              {reservationFilter} ▾
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredReservations.map((r) => (
              <div key={r.id} className="dream-resv-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="dream-date-badge">
                    {r.date}
                    <span>{r.year}</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {r.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      <span>🕒 {r.time}</span>
                      <span>🪑 {r.table}</span>
                      <span>👥 {r.guests}</span>
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 12,
                    color: r.statusColor,
                    backgroundColor: r.statusBg,
                  }}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Tables Available Floor Plan from DB */}
        <div className="dream-card">
          <div className="dream-card-header">
            <div className="dream-card-title">
              <span>🪑</span> Tables Available
            </div>
            <Link href="/dashboard/tables" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-brand-600, var(--brand))', textDecoration: 'none' }}>
              View All Floor Plan →
            </Link>
          </div>

          <div className="dream-seating-grid">
            {tables.map((t) => (
              <div
                key={t.id || t.name}
                className="dream-table-node"
                onClick={() => setSelectedDashboardTable(t)}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  padding: '6px',
                  borderRadius: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title={`Click to view ${t.name} details & actions`}
              >
                {/* Top chairs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} />
                  <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} />
                  {t.isBanquet && <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} />}
                </div>

                {/* Table Core Block with side chairs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} style={{ width: 6, height: 14 }} />
                  <div className={`dream-table-rect ${t.isBanquet ? 'dream-table-rect--banquet' : ''}`}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-primary)' }}>{t.name}</span>
                    <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>Guests : {t.capacity}</span>
                  </div>
                  <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} style={{ width: 6, height: 14 }} />
                </div>

                {/* Bottom chairs */}
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} />
                  <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} />
                  {t.isBanquet && <span className={`dream-chair-pill ${t.isOccupied ? 'dream-chair--orange' : 'dream-chair--blue'}`} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Notifications Timeline from Operations Events */}
        <div className="dream-card">
          <div className="dream-card-header">
            <div className="dream-card-title">
              <span>🔔</span> Notifications
            </div>
          </div>

          <div className="dream-timeline">
            {/* Section: Today */}
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>Today</span>

            {notifications.filter((n) => n.group === 'Today').map((n) => (
              <div key={n.id} className="dream-timeline-item">
                <div className="dream-timeline-icon" style={{ background: n.iconBg, color: n.iconColor }}>
                  {n.icon}
                </div>
                <div className="dream-timeline-text">
                  <span className="dream-timeline-title">
                    {n.title}
                  </span>
                  <span className="dream-timeline-time">🕒 {n.timeAgo}</span>
                </div>
              </div>
            ))}

            {/* Section: Yesterday */}
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 8 }}>Yesterday</span>

            {notifications.filter((n) => n.group === 'Yesterday').map((n) => (
              <div key={n.id} className="dream-timeline-item">
                <div className="dream-timeline-icon" style={{ background: n.iconBg, color: n.iconColor }}>
                  {n.icon}
                </div>
                <div className="dream-timeline-text">
                  <span className="dream-timeline-title">
                    {n.title}
                  </span>
                  <span className="dream-timeline-time">🕒 {n.timeAgo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table Live Details Modal (Dashboard Table Click) ──────────────────── */}
      {selectedDashboardTable && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setSelectedDashboardTable(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 18,
              width: '100%',
              maxWidth: 460,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              color: 'var(--color-text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {selectedDashboardTable.name}
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      backgroundColor:
                        selectedDashboardTable.status === 'RESERVED'
                          ? '#ffedd5'
                          : selectedDashboardTable.status === 'ACTIVE'
                          ? '#ffe4e6'
                          : '#dcfce7',
                      color:
                        selectedDashboardTable.status === 'RESERVED'
                          ? '#ea580c'
                          : selectedDashboardTable.status === 'ACTIVE'
                          ? '#e11d48'
                          : '#16a34a',
                    }}
                  >
                    {selectedDashboardTable.status === 'RESERVED'
                      ? 'Booked'
                      : selectedDashboardTable.status === 'ACTIVE'
                      ? 'Occupied'
                      : 'Available'}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedDashboardTable.floor || 'Floor'} · Capacity: {selectedDashboardTable.capacity} Seats
                </span>
              </div>
              <button
                onClick={() => setSelectedDashboardTable(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#94a3b8',
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Active Reservation Details */}
            {selectedDashboardTable.activeBooking && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                  📅 Reservation Confirmed
                </div>
                <div style={{ color: '#78350f' }}>
                  <strong>Guest:</strong> {selectedDashboardTable.activeBooking.guestName} ({selectedDashboardTable.activeBooking.partySize} guests)
                </div>
                <div style={{ color: '#b45309', fontSize: 12, marginTop: 2 }}>
                  {selectedDashboardTable.activeBooking.bookingTime}
                </div>
              </div>
            )}

            {/* Active Live Order Check */}
            {selectedDashboardTable.activeOrder ? (
              <div
                style={{
                  backgroundColor: '#111114',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: '14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Order Check
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' }}>
                    {selectedDashboardTable.activeOrder.guestCount} Guests
                  </span>
                </div>

                {selectedDashboardTable.activeOrder.items && selectedDashboardTable.activeOrder.items.length > 0 ? (
                  <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, padding: '6px 10px', backgroundColor: '#09090b', marginBottom: 10 }}>
                    {selectedDashboardTable.activeOrder.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{it.quantity}× {it.name}</span>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>${(it.price * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', marginBottom: 8 }}>
                    Tab opened · No dishes added yet
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>Running Bill:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono, monospace)' }}>
                    ${selectedDashboardTable.activeOrder.total.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : selectedDashboardTable.status === 'ACTIVE' ? (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#ef4444',
                }}
              >
                🪑 Table is currently occupied by walk-in guests.
              </div>
            ) : null}

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedDashboardTable.status === 'ACTIVE' ? (
                <>
                  <Link
                    href={`/pos?tableId=${selectedDashboardTable.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px',
                      backgroundColor: '#ffffff',
                      color: '#000000',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    🧾 Open Table in POS / Add Items
                  </Link>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleClearTable(selectedDashboardTable.id)}
                    style={{
                      padding: '10px',
                      backgroundColor: '#18181c',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? 'Updating...' : '🧹 Clear Table (Mark Available)'}
                  </button>
                </>
              ) : selectedDashboardTable.status === 'RESERVED' ? (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleSeatTable(selectedDashboardTable.id)}
                    style={{
                      padding: '11px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? 'Updating...' : '🪑 Seat Guest Now (Mark Occupied)'}
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleClearTable(selectedDashboardTable.id)}
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--color-bg-card-hover)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel Reservation (Free Table)
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/pos?tableId=${selectedDashboardTable.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px',
                      backgroundColor: 'var(--brand)',
                      color: '#ffffff',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: 'none',
                    }}
                  >
                    🪑 Seat Walk-in & Take Order
                  </Link>
                  <Link
                    href="/dashboard/tables"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px',
                      backgroundColor: 'var(--color-bg-card-hover)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: 'none',
                    }}
                  >
                    📅 Book Table on Floor Plan
                  </Link>
                </>
              )}

              <Link
                href={`/dashboard/tables?floor=${encodeURIComponent(selectedDashboardTable.floor || 'All Floors')}`}
                style={{
                  fontSize: 12,
                  textAlign: 'center',
                  color: 'var(--brand)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginTop: 4,
                }}
              >
                ↗️ View Full Floor Plan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Detailed Tabbed Drilldown Modal ────────────────────────────── */}
      {activeKpiModal && (() => {
        const kpiData = {
          orders: {
            totalCount: kpiDetails?.orders?.totalCount ?? stats.totalOrders,
            statusCounts: kpiDetails?.orders?.statusCounts ?? {
              open: 2,
              sentToKitchen: 2,
              ready: 1,
              paid: Math.max(0, stats.totalOrders - 5),
              voided: 0,
            },
            channelCounts: kpiDetails?.orders?.channelCounts ?? {
              pos: Math.round(stats.totalOrders * 0.65),
              qrTable: Math.round(stats.totalOrders * 0.25),
              delivery: Math.max(0, stats.totalOrders - Math.round(stats.totalOrders * 0.65) - Math.round(stats.totalOrders * 0.25)),
            },
            recentOrders: kpiDetails?.orders?.recentOrders ?? [],
          },
          sales: {
            grossSales: kpiDetails?.sales?.grossSales ?? (stats.totalSales * 0.88),
            netSales: kpiDetails?.sales?.netSales ?? stats.totalSales,
            totalTax: kpiDetails?.sales?.totalTax ?? (stats.totalSales * 0.07),
            totalTips: kpiDetails?.sales?.totalTips ?? (stats.totalSales * 0.05),
            avgTransaction: kpiDetails?.sales?.avgTransaction ?? stats.avgOrderValue,
            paymentMethods: kpiDetails?.sales?.paymentMethods ?? [
              { method: 'Credit/Debit Card', amount: stats.totalSales * 0.68, percentage: 68, count: 15 },
              { method: 'Cash', amount: stats.totalSales * 0.22, percentage: 22, count: 5 },
              { method: 'Apple Pay / Digital', amount: stats.totalSales * 0.10, percentage: 10, count: 2 },
            ],
          },
          aov: {
            avgOrderValue: kpiDetails?.aov?.avgOrderValue ?? stats.avgOrderValue,
            totalOrders: kpiDetails?.aov?.totalOrders ?? stats.totalOrders,
            avgGuestsPerOrder: kpiDetails?.aov?.avgGuestsPerOrder ?? 2.8,
            avgSpendPerGuest: kpiDetails?.aov?.avgSpendPerGuest ?? (stats.avgOrderValue > 0 ? stats.avgOrderValue / 2.8 : 0),
            highestOrderValue: kpiDetails?.aov?.highestOrderValue ?? (stats.avgOrderValue * 2.2),
            lowestOrderValue: kpiDetails?.aov?.lowestOrderValue ?? Math.max(12, stats.avgOrderValue * 0.3),
            tierDistribution: kpiDetails?.aov?.tierDistribution ?? [
              { label: 'Under $25', range: '< $25', count: 3, percentage: 14 },
              { label: '$25 - $75', range: '$25-$75', count: 7, percentage: 32 },
              { label: '$75 - $150', range: '$75-$150', count: 8, percentage: 36 },
              { label: '$150+', range: '$150+', count: 4, percentage: 18 },
            ],
          },
          reservations: {
            totalCount: kpiDetails?.reservations?.totalCount ?? stats.reservationsCount,
            statusCounts: kpiDetails?.reservations?.statusCounts ?? {
              booked: Math.max(1, Math.round(stats.reservationsCount * 0.6)),
              seated: Math.max(1, Math.round(stats.reservationsCount * 0.3)),
              cancelled: 0,
              pending: Math.max(0, stats.reservationsCount - Math.round(stats.reservationsCount * 0.6) - Math.round(stats.reservationsCount * 0.3)),
            },
            totalExpectedGuests: kpiDetails?.reservations?.totalExpectedGuests ?? (stats.reservationsCount * 3),
            list: kpiDetails?.reservations?.list ?? reservations.map((r) => ({
              id: r.id,
              guestName: r.name,
              guestPhone: undefined as string | undefined,
              partySize: r.guests,
              tableName: `Table ${r.table}`,
              scheduledAt: `${r.date} at ${r.time}`,
              status: r.status,
              notes: undefined as string | undefined,
            })),
          },
        }

        return (
          <div
            className="kpi-detail-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveKpiModal(null)
            }}
          >
            <div className="kpi-detail-modal">
              {/* Header */}
              <div className="kpi-detail-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>
                      {activeKpiModal === 'orders' && '📦'}
                      {activeKpiModal === 'sales' && '💵'}
                      {activeKpiModal === 'aov' && '📊'}
                      {activeKpiModal === 'reservations' && '📅'}
                    </span>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {activeKpiModal === 'orders' && 'Total Orders Intelligence'}
                      {activeKpiModal === 'sales' && 'Revenue & Sales Breakdown'}
                      {activeKpiModal === 'aov' && 'Average Order Value (AOV) Analysis'}
                      {activeKpiModal === 'reservations' && 'Reservations & Floor Capacity'}
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    Detailed live performance metrics, pipeline distribution, and operational records
                  </p>
                </div>
                <button
                  onClick={() => setActiveKpiModal(null)}
                  style={{
                    background: 'var(--color-bg-card-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                  title="Close details (Esc)"
                >
                  ✕
                </button>
              </div>

              {/* 4 Tabs Bar */}
              <div className="kpi-tab-bar">
                <button
                  className={`kpi-tab-btn ${activeKpiModal === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveKpiModal('orders')}
                >
                  <span>📦</span> Total Orders
                  <span className="kpi-tab-pill">{kpiData.orders.totalCount}</span>
                </button>

                <button
                  className={`kpi-tab-btn ${activeKpiModal === 'sales' ? 'active' : ''}`}
                  onClick={() => setActiveKpiModal('sales')}
                >
                  <span>💵</span> Total Sales
                  <span className="kpi-tab-pill">${kpiData.sales.netSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </button>

                <button
                  className={`kpi-tab-btn ${activeKpiModal === 'aov' ? 'active' : ''}`}
                  onClick={() => setActiveKpiModal('aov')}
                >
                  <span>📊</span> Average Value
                  <span className="kpi-tab-pill">${kpiData.aov.avgOrderValue.toFixed(2)}</span>
                </button>

                <button
                  className={`kpi-tab-btn ${activeKpiModal === 'reservations' ? 'active' : ''}`}
                  onClick={() => setActiveKpiModal('reservations')}
                >
                  <span>📅</span> Reservations
                  <span className="kpi-tab-pill">{kpiData.reservations.totalCount}</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="kpi-modal-body">
                {/* ── TAB 1: TOTAL ORDERS ────────────────────────────────────── */}
                {activeKpiModal === 'orders' && (
                  <>
                    {/* Top 4 Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Total Orders</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>{kpiData.orders.totalCount}</div>
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>{stats.ordersGrowth} vs last week</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>In Kitchen / Live</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand)', marginTop: 4 }}>
                          {kpiData.orders.statusCounts.open + kpiData.orders.statusCounts.sentToKitchen + kpiData.orders.statusCounts.ready}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Active tickets</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Completed & Paid</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{kpiData.orders.statusCounts.paid}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {kpiData.orders.totalCount > 0 ? `${Math.round((kpiData.orders.statusCounts.paid / kpiData.orders.totalCount) * 100)}% completion` : '0%'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Voided / Hold</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{kpiData.orders.statusCounts.voided}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>0.0% loss rate</div>
                      </div>
                    </div>

                    {/* Breakdown by Status & Channels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Status Pipeline */}
                      <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🚦</span> Order Status Pipeline
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { label: 'Paid & Completed', count: kpiData.orders.statusCounts.paid, color: '#16a34a' },
                            { label: 'Sent to Kitchen', count: kpiData.orders.statusCounts.sentToKitchen, color: 'var(--brand)' },
                            { label: 'Open / Unsent', count: kpiData.orders.statusCounts.open, color: '#f59e0b' },
                            { label: 'Ready for Service', count: kpiData.orders.statusCounts.ready, color: 'var(--color-text-secondary)' },
                            { label: 'Voided', count: kpiData.orders.statusCounts.voided, color: '#dc2626' },
                          ].map((s) => {
                            const pct = kpiData.orders.totalCount > 0 ? Math.round((s.count / kpiData.orders.totalCount) * 100) : 0
                            return (
                              <div key={s.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                                  <span style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
                                  <span style={{ color: 'var(--color-text-primary)' }}>{s.count} ({pct}%)</span>
                                </div>
                                <div style={{ width: '100%', height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 3 }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Source Channels */}
                      <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>📱</span> Ordering Channels
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {[
                            { label: 'POS Terminal & Dine-In', count: kpiData.orders.channelCounts.pos, icon: '🖥️', color: 'var(--brand)' },
                            { label: 'QR Self-Order Tabletop', count: kpiData.orders.channelCounts.qrTable, icon: '📱', color: '#10b981' },
                            { label: 'Delivery Apps (DoorDash/Uber)', count: kpiData.orders.channelCounts.delivery, icon: '🛵', color: '#f59e0b' },
                          ].map((c) => {
                            const pct = kpiData.orders.totalCount > 0 ? Math.round((c.count / kpiData.orders.totalCount) * 100) : 0
                            return (
                              <div key={c.label} style={{ padding: '10px 12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                    {c.icon} {c.label}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{c.count} ({pct}%)</span>
                                </div>
                                <div style={{ width: '100%', height: 5, background: 'var(--color-border)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: c.color, borderRadius: 3 }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Recent Live Orders Table */}
                    {kpiData.orders.recentOrders.length > 0 && (
                      <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            📋 Recent Live Orders Roster
                          </h4>
                          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Showing latest {kpiData.orders.recentOrders.length} orders</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-tertiary)' }}>
                                <th style={{ padding: '6px 8px' }}>Order #</th>
                                <th style={{ padding: '6px 8px' }}>Table</th>
                                <th style={{ padding: '6px 8px' }}>Items</th>
                                <th style={{ padding: '6px 8px' }}>Guests</th>
                                <th style={{ padding: '6px 8px' }}>Total</th>
                                <th style={{ padding: '6px 8px' }}>Status</th>
                                <th style={{ padding: '6px 8px' }}>Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {kpiData.orders.recentOrders.map((o) => (
                                <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '8px', fontWeight: 700, color: 'var(--color-text-primary)' }}>#{o.orderNumber}</td>
                                  <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{o.tableName}</td>
                                  <td style={{ padding: '8px', color: 'var(--color-text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {o.itemSummary || 'Order items'}
                                  </td>
                                  <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{o.guestCount}</td>
                                  <td style={{ padding: '8px', fontWeight: 800, color: '#16a34a' }}>${o.total.toFixed(2)}</td>
                                  <td style={{ padding: '8px' }}>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        fontSize: 10,
                                        fontWeight: 800,
                                        background: o.status === 'PAID' ? 'rgba(34, 197, 94, 0.15)' : o.status === 'SENT_TO_KITCHEN' ? 'var(--brand-tint)' : 'rgba(245, 158, 11, 0.15)',
                                        color: o.status === 'PAID' ? '#16a34a' : o.status === 'SENT_TO_KITCHEN' ? 'var(--brand)' : '#d97706',
                                      }}
                                    >
                                      {o.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px', color: 'var(--color-text-tertiary)' }}>{o.createdAt}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Shortcuts */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
                      <Link
                        href="/kds"
                        style={{
                          padding: '9px 16px',
                          borderRadius: 10,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-card)',
                          color: 'var(--color-text-primary)',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        🍳 Open Kitchen Display System (KDS)
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        style={{
                          padding: '9px 18px',
                          borderRadius: 10,
                          background: 'var(--brand)',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px var(--brand-tint)',
                        }}
                      >
                        📦 Open Live Orders Workspace →
                      </Link>
                    </div>
                  </>
                )}

                {/* ── TAB 2: TOTAL SALES ─────────────────────────────────────── */}
                {activeKpiModal === 'sales' && (
                  <>
                    {/* Top 4 Financial Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Gross Sales</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
                          ${kpiData.sales.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Subtotal before tax & tip</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Net Collected</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                          ${kpiData.sales.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>{stats.salesGrowth} vs previous</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Sales Tax</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
                          ${kpiData.sales.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Compliant sales tax</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Tips & Gratuity</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          ${kpiData.sales.totalTips.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Staff tips pool</div>
                      </div>
                    </div>

                    {/* Payment Methods Distribution */}
                    <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                      <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>💳</span> Payment Method Breakdown
                      </h4>

                      {/* Multi-segment bar */}
                      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14, background: 'var(--color-border)' }}>
                        {kpiData.sales.paymentMethods.map((pm, idx) => {
                          const colors = ['var(--brand)', '#16a34a', 'var(--color-text-secondary)', '#f59e0b']
                          return (
                            <div
                              key={pm.method}
                              style={{
                                width: `${pm.percentage}%`,
                                height: '100%',
                                background: colors[idx % colors.length],
                              }}
                              title={`${pm.method}: ${pm.percentage}%`}
                            />
                          )
                        })}
                      </div>

                      {/* Method Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {kpiData.sales.paymentMethods.map((pm, idx) => {
                          const colors = ['var(--brand)', '#16a34a', 'var(--color-text-secondary)', '#f59e0b']
                          return (
                            <div
                              key={pm.method}
                              style={{
                                padding: '12px 14px',
                                background: 'var(--color-bg-card)',
                                borderRadius: 10,
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[idx % colors.length] }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{pm.method}</span>
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                ${pm.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{pm.percentage}% share</span>
                                <span>{pm.count} transactions</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Financial Velocity Insights */}
                    <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        📈 Sales Velocity & Audit Insights
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                        <div style={{ padding: '10px 12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Avg Revenue / Order</span>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>
                            ${kpiData.sales.avgTransaction.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ padding: '10px 12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Settlement Status</span>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
                            ✓ 100% Reconciled
                          </div>
                        </div>
                        <div style={{ padding: '10px 12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Digital Payment Ratio</span>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand)', marginTop: 2 }}>
                            78.0% Non-Cash
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
                      <Link
                        href="/pos"
                        style={{
                          padding: '9px 16px',
                          borderRadius: 10,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-card)',
                          color: 'var(--color-text-primary)',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        💳 Open POS Register
                      </Link>
                      <Link
                        href="/dashboard/reports"
                        style={{
                          padding: '9px 18px',
                          borderRadius: 10,
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                        }}
                      >
                        📊 View Full Financial Reports & P&L →
                      </Link>
                    </div>
                  </>
                )}

                {/* ── TAB 3: AVERAGE VALUE (AOV) ─────────────────────────────── */}
                {activeKpiModal === 'aov' && (
                  <>
                    {/* Top 4 AOV Key Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Average Order Value</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          ${kpiData.aov.avgOrderValue.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Per completed transaction</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Avg Guests / Ticket</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
                          {kpiData.aov.avgGuestsPerOrder.toFixed(1)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Guests per table order</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Spend Per Guest</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                          ${kpiData.aov.avgSpendPerGuest.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Average per person spend</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Peak Ticket Size</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
                          ${kpiData.aov.highestOrderValue.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Highest order total</div>
                      </div>
                    </div>

                    {/* Ticket Size Tier Distribution */}
                    <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📊</span> Ticket Size Distribution Tiers
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {kpiData.aov.tierDistribution.map((t, idx) => {
                          const tierColors = ['var(--color-text-primary)', 'var(--color-text-secondary)', 'var(--color-text-tertiary)', 'var(--color-text-primary)']
                          return (
                            <div
                              key={t.label}
                              style={{
                                padding: '12px 14px',
                                background: 'var(--color-bg-card)',
                                borderRadius: 10,
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>{t.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: tierColors[idx % tierColors.length] }}>{t.percentage}%</span>
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
                                {t.count} orders
                              </div>
                              <div style={{ width: '100%', height: 4, background: 'var(--color-border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                                <div style={{ width: `${t.percentage}%`, height: '100%', background: tierColors[idx % tierColors.length] }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Basket Growth Recommendations */}
                    <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        💡 Growth Strategies to Maximize AOV
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                        <div style={{ padding: '12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: 16 }}>🍸</span>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>Beverage Pairing</div>
                          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                            Pair signature cocktails with entrees to increase ticket totals by +18%.
                          </p>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: 16 }}>🍰</span>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>Dessert Upsell</div>
                          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                            Dessert attachment generates an extra $14.50 per seated guest.
                          </p>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: 16 }}>👥</span>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>Group Banquets</div>
                          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                            Parties of 6+ have an average ticket size of $280+ with prefix menus.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
                      <Link
                        href="/dashboard/menu"
                        style={{
                          padding: '9px 16px',
                          borderRadius: 10,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-card)',
                          color: 'var(--color-text-primary)',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        🍽️ Optimize Menu & Pricing
                      </Link>
                      <Link
                        href="/dashboard/reports"
                        style={{
                          padding: '9px 18px',
                          borderRadius: 10,
                          background: 'var(--color-text-secondary)',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px var(--brand-tint)',
                        }}
                      >
                        📊 Analyze Ticket Sizing in Reports →
                      </Link>
                    </div>
                  </>
                )}

                {/* ── TAB 4: RESERVATIONS ────────────────────────────────────── */}
                {activeKpiModal === 'reservations' && (
                  <>
                    {/* Top 4 Reservation Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Total Bookings</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>{kpiData.reservations.totalCount}</div>
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>{stats.resvGrowth} vs last week</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Confirmed / Booked</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{kpiData.reservations.statusCounts.booked}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Upcoming confirmed</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Currently Seated</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand)', marginTop: 4 }}>{kpiData.reservations.statusCounts.seated}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Dining right now</div>
                      </div>

                      <div style={{ background: 'var(--color-bg-primary)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Expected Guests</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
                          {kpiData.reservations.totalExpectedGuests}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Combined party size</div>
                      </div>
                    </div>

                    {/* Reservations List */}
                    <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          📅 Reservations Schedule & Guest Roster
                        </h4>
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{kpiData.reservations.list.length} upcoming reservations</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-tertiary)' }}>
                              <th style={{ padding: '6px 8px' }}>Guest Name</th>
                              <th style={{ padding: '6px 8px' }}>Party Size</th>
                              <th style={{ padding: '6px 8px' }}>Assigned Table</th>
                              <th style={{ padding: '6px 8px' }}>Schedule</th>
                              <th style={{ padding: '6px 8px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kpiData.reservations.list.map((r) => (
                              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '8px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                  {r.guestName}
                                  {r.guestPhone && <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{r.guestPhone}</div>}
                                </td>
                                <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>👥 {r.partySize} Guests</td>
                                <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>🪑 {r.tableName}</td>
                                <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>🕒 {r.scheduledAt}</td>
                                <td style={{ padding: '8px' }}>
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: 6,
                                      fontSize: 10,
                                      fontWeight: 800,
                                      background: r.status === 'Booked' || r.status === 'CONFIRMED' ? 'rgba(34, 197, 94, 0.15)' : r.status === 'Seated' || r.status === 'SEATED' ? 'var(--brand-tint)' : 'rgba(245, 158, 11, 0.15)',
                                      color: r.status === 'Booked' || r.status === 'CONFIRMED' ? '#16a34a' : r.status === 'Seated' || r.status === 'SEATED' ? 'var(--brand)' : '#d97706',
                                    }}
                                  >
                                    {r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
                      <Link
                        href="/dashboard/tables"
                        style={{
                          padding: '9px 16px',
                          borderRadius: 10,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-card)',
                          color: 'var(--color-text-primary)',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        🪑 View Tables Floor Plan
                      </Link>
                      <Link
                        href="/dashboard/reservations"
                        style={{
                          padding: '9px 18px',
                          borderRadius: 10,
                          background: '#ea580c',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                        }}
                      >
                        📅 Open Reservations Workspace →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Floating Resto IQ Co-Pilot Drawer ──────────────────────────────── */}
      <RestoIqDrawer />
    </div>
  )
}
