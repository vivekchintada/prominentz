'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

/* ── Types ────────────────────────────────────────────────── */
interface MenuItem {
  id: string
  name: string
  imageUrl: string | null
  isVeg?: boolean
}

interface OrderItem {
  id: string
  menuItemId: string
  quantity: number
  unitPrice?: number
  specialNote?: string | null
  menuItem?: MenuItem
}

interface Payment {
  id: string
  status: string
  total?: number
}

interface Order {
  id: string
  status: string
  orderSource?: string
  notes?: string | null
  guestCount: number
  total: number
  createdAt: string
  table?: { id: string; name: string; locationId?: string } | null
  server?: { id: string; name: string } | null
  customer?: { id: string; name: string; phone?: string } | null
  items: OrderItem[]
  payments?: Payment[]
  tickets?: { id: string; station: string; status: string }[]
  _count?: { items: number; payments?: number }
}

interface Props {
  initialOrders: Order[]
}

/* ── Helpers for Veg/Non-Veg & Order Type ─────────────────── */
function isItemVeg(name: string, isVeg?: boolean): boolean {
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

function resolveOrderType(order: Order): { type: 'Dine In' | 'Take Away' | 'Delivery'; label: string } {
  const notes = order.notes || ''
  if (notes.toLowerCase().includes('take away') || notes.toLowerCase().includes('takeaway')) {
    return { type: 'Take Away', label: 'Take Away' }
  }
  if (notes.toLowerCase().includes('delivery') || order.orderSource?.startsWith('DELIVERY')) {
    return { type: 'Delivery', label: 'Delivery' }
  }
  const tableName = order.table?.name || 'Table'
  return { type: 'Dine In', label: `Dine In  Table No : ${tableName.replace(/[^0-9]/g, '') || '1'}` }
}

function formatOrderTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return '06:00 PM'
  }
}

function tokenNumber(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return (hash % 89) + 11 // 11 to 99
}

/* ── SVG Icons ───────────────────────────────────────────── */
function DineInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2v20M6 2v20M2 7h8a2 2 0 0 0 2-2V2H2v3a2 2 0 0 0 2 2zM14 15a4 4 0 0 0 8 0v-4h-8v4z" />
    </svg>
  )
}

function TakeAwayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function DeliveryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  )
}

function VegBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        border: '1.5px solid #16a34a',
        borderRadius: 3,
        flexShrink: 0,
        marginRight: 8,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16a34a' }} />
    </span>
  )
}

function NonVegBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        border: '1.5px solid #ef4444',
        borderRadius: 3,
        flexShrink: 0,
        marginRight: 8,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
    </span>
  )
}

export default function OrdersView({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('ALL')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dateRange] = useState('7 Aug 26 - 5 Sep 26')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Quick Order creation form state
  const [newOrderType, setNewOrderType] = useState<'Dine In' | 'Take Away' | 'Delivery'>('Dine In')
  const [newTableNum, setNewTableNum] = useState('3')
  const [newGuestCount, setNewGuestCount] = useState(2)
  const [newOrderNotes, setNewOrderNotes] = useState('Extra Spicy')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  /* ── Live SSE refresh from /api/events ──────────────────── */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const es = new EventSource('/api/events')
    const handleEvent = () => fetchOrders()

    es.addEventListener('order.created', handleEvent)
    es.addEventListener('order.sent_to_kitchen', handleEvent)
    es.addEventListener('order.modified', handleEvent)
    es.addEventListener('ticket.status.updated', handleEvent)
    es.addEventListener('ticket.completed', handleEvent)
    es.addEventListener('table.status.changed', handleEvent)
    es.addEventListener('payment.processed', handleEvent)

    return () => {
      es.close()
    }
  }, [fetchOrders])

  /* ── Status Dropdown Change ──────────────────────────────── */
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        showToast(`Order status updated to ${newStatus}`)
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        )
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`Update failed: ${err.error || res.statusText}`)
      }
    } catch {
      showToast('Failed to update status')
    }
  }

  /* ── Create Quick Order ──────────────────────────────────── */
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const tablesRes = await fetch('/api/tables')
      let tableId = ''
      if (tablesRes.ok) {
        const tables = await tablesRes.json()
        const matched = tables.find((t: any) => t.name.includes(newTableNum)) || tables[0]
        tableId = matched?.id
      }

      if (!tableId) {
        showToast('Table not found. Please create tables first.')
        setIsSubmitting(false)
        return
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          guestCount: Number(newGuestCount),
          notes: `${newOrderType}${newOrderNotes ? ` - Notes: ${newOrderNotes}` : ''}`,
        }),
      })

      if (res.ok) {
        showToast(`Order created successfully for ${newOrderType}!`)
        setIsAddModalOpen(false)
        fetchOrders()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`Error: ${err.error || res.statusText}`)
      }
    } catch {
      showToast('Error creating order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ── KPI Counts ─────────────────────────────────────────── */
  const confirmedCount = orders.filter((o) => o.status === 'OPEN' || o.status === 'HOLD').length
  const pendingCount = orders.filter((o) => o.status === 'OPEN' || o.status === 'HOLD').length
  const processingCount = orders.filter((o) => o.status === 'SENT_TO_KITCHEN' || o.status === 'PARTIALLY_READY').length
  const outForDeliveryCount = orders.filter((o) => {
    const notes = o.notes?.toLowerCase() || ''
    return (notes.includes('delivery') || o.orderSource?.includes('DELIVERY')) && o.status !== 'PAID' && o.status !== 'VOIDED'
  }).length
  const deliveredCount = orders.filter((o) => o.status === 'READY' || o.status === 'PAID').length
  const cancelledCount = orders.filter((o) => o.status === 'VOIDED').length

  /* ── Filter Tabs Logic ──────────────────────────────────── */
  const filteredOrders = orders.filter((o) => {
    if (filter === 'PENDING' && o.status !== 'OPEN' && o.status !== 'HOLD') return false
    if (filter === 'IN_PROGRESS' && o.status !== 'SENT_TO_KITCHEN' && o.status !== 'PARTIALLY_READY') return false
    if (filter === 'COMPLETED' && o.status !== 'READY' && o.status !== 'PAID') return false
    if (filter === 'CANCELLED' && o.status !== 'VOIDED') return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const orderNum = `#${o.id.slice(-5).toLowerCase()}`
      const tableName = (o.table?.name || '').toLowerCase()
      const customerName = (o.customer?.name || '').toLowerCase()
      const notes = (o.notes || '').toLowerCase()
      const hasItem = o.items.some((i) => (i.menuItem?.name || '').toLowerCase().includes(q))
      if (!orderNum.includes(q) && !tableName.includes(q) && !customerName.includes(q) && !notes.includes(q) && !hasItem) {
        return false
      }
    }
    return true
  })

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
      {/* ── Toast Notification ─────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#1e293b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ── TOP HEADER ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Orders</h1>
          <button
            onClick={fetchOrders}
            title="Refresh orders"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Date Range Selector Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{dateRange}</span>
          </div>

          {/* + Add New Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add New
          </button>
        </div>
      </div>

      {/* ── 6 KPI METRIC CARDS ROW ─────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 1. Confirmed */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Confirmed</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{confirmedCount}</span>
        </div>

        {/* 2. Pending */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Pending</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{pendingCount}</span>
        </div>

        {/* 3. Processing */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Processing</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </div>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{processingCount}</span>
        </div>

        {/* 4. Out For Delivery */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Out For Delivery</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18.5" cy="17.5" r="3.5" />
                <circle cx="5.5" cy="17.5" r="3.5" />
                <path d="M15 5h3M12 17.5V14l-3-3 4-3 2 3h2" />
              </svg>
            </div>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{outForDeliveryCount}</span>
        </div>

        {/* 5. Delivered */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Delivered</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{deliveredCount}</span>
        </div>

        {/* 6. Cancelled */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Cancelled</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="17" y1="8" x2="23" y2="14" />
                <line x1="23" y1="8" x2="17" y2="14" />
              </svg>
            </div>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{cancelledCount}</span>
        </div>
      </div>

      {/* ── FILTER TABS & SEARCH BAR ───────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(
            [
              { key: 'ALL', label: `All Orders (${orders.length})` },
              { key: 'PENDING', label: `Pending (${pendingCount})` },
              { key: 'IN_PROGRESS', label: `In Progress (${processingCount})` },
              { key: 'COMPLETED', label: `Completed (${deliveredCount})` },
              { key: 'CANCELLED', label: `Cancelled (${cancelledCount})` },
            ] as const
          ).map((tab) => {
            const active = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  backgroundColor: active ? '#2563eb' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  border: active ? 'none' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 2px 4px rgba(37,99,235,0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Right side: View Toggle & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Grid View Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 }}>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{
                backgroundColor: viewMode === 'grid' ? '#2563eb' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: 6,
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              style={{
                backgroundColor: viewMode === 'list' ? '#2563eb' : 'transparent',
                color: viewMode === 'list' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: 6,
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '7px 32px 7px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: 13,
                outline: 'none',
                width: 180,
                color: '#1e293b',
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── ORDER CARDS GRID ───────────────────────────────── */}
      {viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {filteredOrders.map((order) => {
            const { type, label } = resolveOrderType(order)
            const orderNum = `#${order.id.slice(-5).toUpperCase()}`
            const timeStr = formatOrderTime(order.createdAt)
            const token = tokenNumber(order.id)
            const isBilled = order.status === 'PAID'
            const isExpanded = expandedIds.has(order.id)
            const displayedItems = isExpanded ? order.items : order.items.slice(0, 4)
            const remainingCount = order.items.length - 4

            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Circle Icon Badge */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {type === 'Take Away' ? <TakeAwayIcon /> : type === 'Delivery' ? <DeliveryIcon /> : <DineInIcon />}
                    </div>

                    {/* Order ID & Type/Table */}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{orderNum}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>{label}</div>
                    </div>
                  </div>

                  {/* Three Dots Menu Button */}
                  <Link
                    href="/pos"
                    title="Open in POS"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: 4,
                      fontSize: 18,
                      lineHeight: 1,
                      textDecoration: 'none',
                    }}
                  >
                    ⋮
                  </Link>
                </div>

                {/* Sub-row: Token No & Time */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: '#334155',
                    paddingBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Token No : {token}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 12 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {timeStr}
                  </span>
                </div>

                {/* Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayedItems.length > 0 ? (
                    displayedItems.map((item, idx) => {
                      const itemName = item.menuItem?.name || 'Dish Item'
                      const isVeg = isItemVeg(itemName, item.menuItem?.isVeg)
                      return (
                        <div key={item.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {isVeg ? <VegBadge /> : <NonVegBadge />}
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{itemName}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>×{item.quantity}</span>
                          </div>
                          {item.specialNote && (
                            <div style={{ fontSize: 11, color: '#64748b', paddingLeft: 22 }}>
                              ⓘ Notes : {item.specialNote}
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                      No dishes added yet
                    </div>
                  )}

                  {/* +X More Items Toggle */}
                  {remainingCount > 0 && !isExpanded && (
                    <button
                      onClick={() => toggleExpand(order.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2563eb',
                        cursor: 'pointer',
                        marginTop: 4,
                      }}
                    >
                      +{remainingCount} More Items
                    </button>
                  )}
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 12,
                    marginTop: 'auto',
                  }}
                >
                  {/* Left: Billed / Unbilled pill */}
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: isBilled ? '#dcfce7' : '#fef3c7',
                      color: isBilled ? '#15803d' : '#b45309',
                    }}
                  >
                    {isBilled ? 'Billed' : 'Unbilled'}
                  </span>

                  {/* Right: Status Dropdown Selector */}
                  <select
                    value={
                      order.status === 'OPEN'
                        ? 'Pending'
                        : order.status === 'SENT_TO_KITCHEN' || order.status === 'PARTIALLY_READY'
                        ? 'In Progress'
                        : order.status === 'READY'
                        ? 'Completed'
                        : order.status === 'PAID'
                        ? 'Completed'
                        : order.status === 'VOIDED'
                        ? 'Cancelled'
                        : 'Pending'
                    }
                    onChange={(e) => {
                      const val = e.target.value
                      let mappedStatus = 'OPEN'
                      if (val === 'Pending') mappedStatus = 'OPEN'
                      else if (val === 'In Progress') mappedStatus = 'SENT_TO_KITCHEN'
                      else if (val === 'Out For Delivery') mappedStatus = 'READY'
                      else if (val === 'Delivered' || val === 'Completed') mappedStatus = 'PAID'
                      else if (val === 'Cancelled') mappedStatus = 'VOIDED'
                      handleStatusChange(order.id, mappedStatus)
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      padding: '4px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1e293b',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="Pending">Pending ▾</option>
                    <option value="In Progress">In Progress ▾</option>
                    <option value="Out For Delivery">Out For Delivery ▾</option>
                    <option value="Delivered">Delivered ▾</option>
                    <option value="Completed">Completed ▾</option>
                    <option value="Cancelled">Cancelled ▾</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── TABLE / LIST VIEW ────────────────────────────── */
        <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Order</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type / Table</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Items</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Time</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Billing</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const { label } = resolveOrderType(order)
                const isBilled = order.status === 'PAID'
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      #{order.id.slice(-5).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{label}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {order.items.length} items
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {formatOrderTime(order.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: isBilled ? '#dcfce7' : '#fef3c7',
                          color: isBilled ? '#15803d' : '#b45309',
                        }}
                      >
                        {isBilled ? 'Billed' : 'Unbilled'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: '3px 6px',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <option value="OPEN">Pending</option>
                        <option value="SENT_TO_KITCHEN">In Progress</option>
                        <option value="READY">Ready</option>
                        <option value="PAID">Completed</option>
                        <option value="VOIDED">Cancelled</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      ${Number(order.total || 0).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── QUICK ADD NEW ORDER MODAL ──────────────────────── */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: 440,
              maxWidth: '90%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>Create New Order</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Order Type
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['Dine In', 'Take Away', 'Delivery'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewOrderType(t)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        border: newOrderType === t ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: newOrderType === t ? '#eff6ff' : '#ffffff',
                        color: newOrderType === t ? '#2563eb' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {newOrderType === 'Dine In' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Table Number
                  </label>
                  <input
                    type="text"
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value)}
                    placeholder="e.g. 1, 2, 3"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Guests Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newGuestCount}
                  onChange={(e) => setNewGuestCount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Special Notes
                </label>
                <input
                  type="text"
                  value={newOrderNotes}
                  onChange={(e) => setNewOrderNotes(e.target.value)}
                  placeholder="e.g. Extra Spicy, Window seat"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#2563eb',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    color: '#ffffff',
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
