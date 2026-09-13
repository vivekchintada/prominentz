'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast, ToastContainer } from '../ui/Toast'

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

/* ── SVG Badges ──────────────────────────────────────────── */
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

export default function KdsMonitor({ currentUser, locationId, onSignOut }: KdsMonitorProps) {
  const [tickets, setTickets] = useState<KdsTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEW' | 'IN_KITCHEN' | 'DELAYED' | 'COMPLETED'>('ALL')
  const [activeCookingTimers, setActiveCookingTimers] = useState<Record<string, { startTime: number; running: boolean }>>({})
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const { toasts, showToast, dismissToast } = useToast()

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

  useEffect(() => {
    fetchTickets()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    // SSE Sync
    const es = new EventSource('/api/events')
    es.addEventListener('order.sent_to_kitchen', () => {
      fetchTickets()
      playAlertBeep()
      showToast('New order received in kitchen!', 'info')
    })
    es.addEventListener('ticket.status.updated', () => fetchTickets())
    es.addEventListener('ticket.completed', () => fetchTickets())
    es.addEventListener('order.modified', () => fetchTickets())

    return () => {
      clearInterval(timer)
      es.close()
    }
  }, [fetchTickets])

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

    // If ticket is NEW, also advance status to IN_PROGRESS in backend
    const target = tickets.find((t) => t.id === ticketId)
    if (target && target.status === 'NEW') {
      handleUpdateStatus(ticketId, 'IN_PROGRESS')
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
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error')
    }
  }

  // Counts for Top Pills
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
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── HEADER ROW ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Title with refresh button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Kitchen</h1>
            <button
              onClick={fetchTickets}
              title="Refresh tickets"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>

          {/* 4 Status Metric Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 1. New Order (Dark Slate/Navy) */}
            <button
              onClick={() => setActiveFilter(activeFilter === 'NEW' ? 'ALL' : 'NEW')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#1e293b',
                color: '#ffffff',
                border: activeFilter === 'NEW' ? '2px solid #3b82f6' : 'none',
                borderRadius: 24,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>New Order</span>
              <span style={{ fontWeight: 800, marginLeft: 2 }}>{String(newOrderCount).padStart(2, '0')}</span>
            </button>

            {/* 2. In Kitchen (Amber/Orange) */}
            <button
              onClick={() => setActiveFilter(activeFilter === 'IN_KITCHEN' ? 'ALL' : 'IN_KITCHEN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                border: activeFilter === 'IN_KITCHEN' ? '2px solid #d97706' : 'none',
                borderRadius: 24,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
              </svg>
              <span>In Kitchen</span>
              <span style={{ fontWeight: 800, marginLeft: 2 }}>{String(inKitchenCount).padStart(2, '0')}</span>
            </button>

            {/* 3. Delayed (Red) */}
            <button
              onClick={() => setActiveFilter(activeFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: activeFilter === 'DELAYED' ? '2px solid #b91c1c' : 'none',
                borderRadius: 24,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Delayed</span>
              <span style={{ fontWeight: 800, marginLeft: 2 }}>{String(delayedCount).padStart(2, '0')}</span>
            </button>

            {/* 4. Completed (Green) */}
            <button
              onClick={() => setActiveFilter(activeFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: activeFilter === 'COMPLETED' ? '2px solid #15803d' : 'none',
                borderRadius: 24,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Completed</span>
              <span style={{ fontWeight: 800, marginLeft: 2 }}>{String(completedCount).padStart(2, '0')}</span>
            </button>
          </div>
        </div>

        {/* Right: Search Box */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 34px 8px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              fontSize: 13,
              outline: 'none',
              width: 220,
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
            style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* ── TICKETS GRID (3 COLUMNS) ──────────────────────── */}
      {filteredTickets.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic' }}>No tickets matching the current kitchen filter.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {filteredTickets.map((ticket, index) => {
            const diningType = resolveDiningType(ticket)
            const ticketNum = `#${ticket.id.slice(-5).toUpperCase()}`
            const token = tokenNumber(ticket.id)
            const dateFormatted = formatTicketDate(ticket.createdAt)
            const customerName =
              ticket.order?.customer?.name ||
              (ticket.order?.table?.name ? `Walk in Customer (${ticket.order.table.name})` : 'Walk in Customer')

            // Color coding corresponding to Screenshot 2
            const elapsedMins = (currentTime.getTime() - new Date(ticket.createdAt).getTime()) / 60000
            const isDelayed = ticket.status !== 'READY' && ticket.status !== 'SERVED' && elapsedMins > 15

            let headerBg = '#1e293b' // New Order default: Slate/Navy
            if (isDelayed) {
              headerBg = '#ef4444' // Red Delayed
            } else if (ticket.status === 'READY' || ticket.status === 'SERVED') {
              headerBg = '#16a34a' // Green Completed
            } else if (ticket.status === 'IN_PROGRESS') {
              // Alternates between Orange and Amber as in screenshot 2
              headerBg = index % 2 === 0 ? '#f59e0b' : '#f97316'
            }

            const timerState = activeCookingTimers[ticket.id]
            const isPlaying = timerState?.running

            return (
              <div
                key={ticket.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* ── CARD HEADER BANNER ───────────────────── */}
                <div
                  style={{
                    backgroundColor: headerBg,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Chef/Diner circular icon */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: headerBg,
                        flexShrink: 0,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                        <line x1="6" y1="17" x2="18" y2="17" />
                      </svg>
                    </div>

                    {/* Customer Name & Order Type */}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{customerName}</div>
                      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>{diningType}</div>
                    </div>
                  </div>

                  {/* Order Ticket Badge */}
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    {ticketNum}
                  </div>
                </div>

                {/* ── CARD BODY ────────────────────────────── */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  {/* Sub-row: Token No & Formatted Date/Time */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: '#475569',
                      paddingBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>Token No : {token}</span>
                    <span>{dateFormatted}</span>
                  </div>

                  {/* Dish Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {ticket.items.map((item, iIdx) => {
                      const dishName = item.menuItem?.name || 'Kitchen Dish'
                      const isVeg = isVegDish(dishName, item.menuItem?.isVeg)
                      return (
                        <div key={item.id || iIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {isVeg ? <VegBadge /> : <NonVegBadge />}
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{dishName}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>×{item.quantity}</span>
                          </div>
                          {item.specialNote && (
                            <div style={{ fontSize: 11, color: '#475569', paddingLeft: 22 }}>
                              ⓘ Notes : {item.specialNote}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Cook Progress Bar & Countdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(15, (elapsedMins / 20) * 100))}%`,
                          backgroundColor: isDelayed ? '#ef4444' : '#16a34a',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {isDelayed ? 'Delayed' : '20:00'}
                    </span>
                  </div>

                  {/* Action Buttons Footer */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    {/* Play 00:00 Button */}
                    <button
                      onClick={() => togglePlayTimer(ticket.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        backgroundColor: isPlaying ? '#eff6ff' : '#f8fafc',
                        color: isPlaying ? '#2563eb' : '#334155',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isPlaying ? (
                        <>
                          <span style={{ color: '#2563eb' }}>⏸</span> Pause
                        </>
                      ) : (
                        <>
                          <span>▷</span> Play 00:00
                        </>
                      )}
                    </button>

                    {/* Mark Done Button */}
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
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        backgroundColor: ticket.status === 'READY' || ticket.status === 'SERVED' ? '#f0fdf4' : '#ffffff',
                        color: ticket.status === 'READY' || ticket.status === 'SERVED' ? '#16a34a' : '#1e293b',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>✓</span> Mark Done
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
