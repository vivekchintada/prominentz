'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import ThemeToggle from '@/components/ui/ThemeToggle'

/* ── Types ──────────────────────────────────────────────── */
interface TableSummary {
  id: string
  name: string
  status: string
  capacity: number
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

/* ── Helpers ─────────────────────────────────────────────── */
const TABLE_STATUS_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  AVAILABLE: { color: '#22c55e', bg: '#22c55e18', label: 'Available',  emoji: '✅' },
  ACTIVE:    { color: '#5b45f5', bg: 'rgba(91,69,245,0.12)', label: 'Active',     emoji: '🍽️' },
  PAYING:    { color: '#f59e0b', bg: '#f59e0b18', label: 'Paying',     emoji: '💳' },
  RESERVED:  { color: '#6366f1', bg: '#6366f118', label: 'Reserved',   emoji: '📋' },
  INACTIVE:  { color: '#6b7280', bg: '#6b728018', label: 'Inactive',   emoji: '🔒' },
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  OPEN:            '🟡 Open',
  PENDING:         '⏳ Pending',
  SENT_TO_KITCHEN: '🍳 In Kitchen',
  PARTIALLY_READY: '🔔 Part Ready',
  READY:           '✅ Ready',
  PAYING:          '💳 Paying',
  PAID:            '💚 Paid',
  VOIDED:          '❌ Voided',
}

function TimerBadge({ mins }: { mins: number }) {
  const color = mins > 30 ? '#ef4444' : mins > 15 ? '#f59e0b' : '#22c55e'
  const bg    = mins > 30 ? '#ef444418' : mins > 15 ? '#f59e0b18' : '#22c55e18'
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      background: bg, padding: '2px 8px',
      borderRadius: 20, fontFamily: 'monospace',
    }}>
      ⏱ {mins}m
    </span>
  )
}

/* ── Component ───────────────────────────────────────────── */
export default function ServerDashboard({ currentUser, locationId, kpi, onSignOut }: Props) {
  const [tables,      setTables]      = useState<TableSummary[]>([])
  const [loading,     setLoading]     = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted,     setMounted]     = useState(false)
  const [activeView,  setActiveView]  = useState<'tables' | 'checks'>('tables')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [assistanceMap, setAssistanceMap] = useState<Record<string, { tableId: string; tableName?: string; type: string; notes?: string; requestedAt: string }>>({})

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
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.45)
    } catch {
      // AudioContext may be restricted until user interacts with the page
    }
  }

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/server/tables')
      if (res.ok) setTables(await res.json())
    } catch (err) {
      console.error('Failed to fetch server tables', err)
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
        data.requests?.forEach((r: any) => { map[r.tableId] = r })
        setAssistanceMap(map)
      }
    } catch (err) {
      console.error('Failed to fetch assistance requests', err)
    }
  }, [locationId])

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

  useEffect(() => {
    setMounted(true)
    fetchTables()
    fetchAssistance()

    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    const dataTimer  = setInterval(() => { fetchTables(); fetchAssistance() }, 20000)

    // SSE live updates
    let es: EventSource | null = null
    const connectSSE = () => {
      es = new EventSource('/api/events')
      es.addEventListener('order.created',        () => fetchTables())
      es.addEventListener('order.sent_to_kitchen', () => fetchTables())
      es.addEventListener('payment.processed',    () => fetchTables())
      es.addEventListener('ticket.status.updated', () => fetchTables())
      es.addEventListener('table.status.changed', () => fetchTables())
      es.addEventListener('table.assistance.requested', (e: any) => {
        try {
          const payload = JSON.parse(e.data)
          setAssistanceMap((prev) => ({ ...prev, [payload.tableId]: payload }))
          playChime()
        } catch (err) {
          console.error(err)
        }
      })
      es.addEventListener('table.assistance.acknowledged', (e: any) => {
        try {
          const payload = JSON.parse(e.data)
          setAssistanceMap((prev) => {
            const next = { ...prev }
            delete next[payload.tableId]
            return next
          })
        } catch (err) {
          console.error(err)
        }
      })
      es.onerror = () => { es?.close(); setTimeout(connectSSE, 3000) }
    }
    connectSSE()

    return () => {
      clearInterval(clockTimer)
      clearInterval(dataTimer)
      es?.close()
    }
  }, [fetchTables, fetchAssistance])

  const activeTables = tables.filter((t) => t.order !== null)
  const openChecks   = tables.filter((t) => t.order && !['PAID', 'VOIDED'].includes(t.order.status))
  const emptyTables  = tables.filter((t) => t.order === null)

  const filteredTables = statusFilter === 'ALL'
    ? tables
    : tables.filter((t) => t.status === statusFilter)

  const totalRevenue = openChecks.reduce((s, t) => s + (t.order?.total ?? 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)' }}>

      {/* ── DreamsPOS-style Top Navbar ───────────────────── */}
      <header className="server-header">
        {/* Left: Logo + Nav */}
        <div className="server-header__left">
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
            <span style={{ color: '#5b45f5', fontSize: 18 }}>●</span>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>Prominentz</span>
          </Link>
          {/* Quick Nav Pills */}
          <nav className="server-nav-pills">
            {[
              { href: '/pos',    label: '🛍️ POS' },
              { href: '/server', label: '🍽️ Server', active: true },
              { href: '/kds',    label: '🍳 Kitchen' },
              { href: '/dashboard/reservations', label: '📅 Reservation' },
              { href: '/server/availability', label: '⏱️ Availability' },
            ].map(({ href, label, active }) => (
              <Link
                key={href}
                href={href}
                className={`server-nav-btn ${active ? 'server-nav-btn--active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Time, Controls */}
        <div className="server-header__right">
          <span className="server-header-clock">
            {mounted ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </span>
          <ThemeToggle />
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#5b45f5', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, flexShrink: 0,
          }}>
            {currentUser.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <button
            onClick={onSignOut}
            style={{
              padding: '5px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text-secondary)',
              fontSize: 12, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── KPI Strip ──────────────────────────────────── */}
      <div className="server-kpi-strip">
        {[
          { label: 'Location',        value: kpi.locationName,                      icon: '📍', color: 'var(--color-text-primary)' },
          { label: 'Active Tables',   value: `${activeTables.length}`,              icon: '🍽️', color: '#5b45f5' },
          { label: 'Open Checks',     value: `${openChecks.length}`,                icon: '🧾', color: '#f59e0b' },
          { label: 'Floor Revenue',   value: `$${totalRevenue.toFixed(2)}`,         icon: '💰', color: '#22c55e' },
          { label: 'Free Tables',     value: `${emptyTables.length}`,               icon: '✅', color: '#22c55e' },
        ].map((item) => (
          <div key={item.label} style={{
            background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: item.color, letterSpacing: '-0.02em' }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── View Tabs + Filter Row ───────────────────────── */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--color-bg-card)', borderRadius: 10,
          border: '1px solid var(--color-border)',
        }}>
          {([['tables', '🗺️ Table Floor'], ['checks', '🧾 Open Checks']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              style={{
                padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeView === id ? 700 : 500,
                background: activeView === id ? '#5b45f5' : 'transparent',
                color: activeView === id ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter pills (for Table Floor) */}
        {activeView === 'tables' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', 'AVAILABLE', 'ACTIVE', 'PAYING', 'RESERVED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid var(--color-border)',
                  fontSize: 12, fontWeight: statusFilter === s ? 700 : 500, cursor: 'pointer',
                  background: statusFilter === s ? '#5b45f5' : 'var(--color-bg-card)',
                  color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {s === 'ALL' ? '🗂️ All Tables' : `${TABLE_STATUS_META[s]?.emoji} ${TABLE_STATUS_META[s]?.label}`}
              </button>
            ))}
            <button
              onClick={fetchTables}
              style={{
                padding: '5px 14px', borderRadius: 20, border: '1px solid var(--color-border)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)',
              }}
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </div>

      {/* ── Main Content ────────────────────────────────── */}
      <div style={{ padding: '16px 20px 32px', flex: 1 }}>

        {/* Table Floor View */}
        {activeView === 'tables' && (
          loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 300, flexDirection: 'column', gap: 12, color: 'var(--color-text-tertiary)',
            }}>
              <div style={{ fontSize: 40 }}>🔄</div>
              <span style={{ fontSize: 14 }}>Loading floor plan…</span>
            </div>
          ) : (
            <>
              {/* ── Urgent Assistance Banner ── */}
              {Object.keys(assistanceMap).length > 0 && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(245,158,11,0.15) 100%)',
                    border: '1.5px solid #eab308',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxShadow: '0 4px 20px rgba(234,179,8,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, animation: 'bounce 1s infinite' }}>🔔</span>
                      <strong style={{ fontSize: 14, color: '#fef08a' }}>
                        {Object.keys(assistanceMap).length} Active Table Call{Object.keys(assistanceMap).length > 1 ? 's' : ''} Requiring Assistance
                      </strong>
                    </div>
                    <span style={{ fontSize: 11, color: '#fde047', fontWeight: 600 }}>Dine-In QR Assistance</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.values(assistanceMap).map((req) => (
                      <div
                        key={req.tableId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 12px',
                          borderRadius: 8,
                          backgroundColor: '#181822',
                          border: '1px solid rgba(234,179,8,0.4)',
                          color: '#fff',
                          fontSize: 12,
                        }}
                      >
                        <span>
                          <strong>{req.tableName || `Table ${req.tableId.slice(-4)}`}</strong>: {req.type === 'REQUEST_BILL' ? '🧾 Bill Requested' : (req.type === 'WATER' ? '💧 Water' : (req.type === 'CUTLERY' ? '🍴 Cutlery' : '🙋 Waiter'))}
                          {req.notes ? ` (${req.notes})` : ''}
                        </span>
                        <button
                          onClick={() => handleAcknowledgeAssistance(req.tableId)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#eab308',
                            border: 'none',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          Ack ✓
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="server-table-grid">
                {filteredTables.map((table, index) => {
                  const meta = TABLE_STATUS_META[table.status] ?? TABLE_STATUS_META.INACTIVE
                  const pendingReq = assistanceMap[table.id]
                  return (
                    <motion.div
                      key={table.id}
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.32,
                        delay: Math.min(index * 0.04, 0.35),
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      layout
                      layoutId={table.id}
                      style={{
                        background: 'var(--color-bg-card)',
                        border: pendingReq ? '2px solid #eab308' : `1px solid var(--color-border)`,
                        borderTop: pendingReq ? '4px solid #eab308' : `3px solid ${meta.color}`,
                        borderRadius: 12,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: pendingReq ? '0 0 20px rgba(234,179,8,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Assistance Alert Pill */}
                      {pendingReq && (
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            backgroundColor: 'rgba(234,179,8,0.18)',
                            border: '1px solid rgba(234,179,8,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#fef08a',
                            fontSize: 11,
                          }}
                        >
                          <span>
                            🔔 <strong>{pendingReq.type === 'REQUEST_BILL' ? 'Bill Requested' : (pendingReq.type === 'WATER' ? 'Water Refill' : (pendingReq.type === 'CUTLERY' ? 'Cutlery' : 'Needs Waiter'))}</strong>
                          </span>
                          <button
                            onClick={() => handleAcknowledgeAssistance(table.id)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#eab308',
                              border: 'none',
                              color: '#000',
                              fontWeight: 800,
                              fontSize: 10,
                              cursor: 'pointer',
                            }}
                          >
                            Ack ✓
                          </button>
                        </div>
                      )}

                      {/* Table Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{table.name}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: meta.bg, color: meta.color, textTransform: 'uppercase',
                        }}>
                          {meta.emoji} {meta.label}
                        </span>
                      </div>

                    {/* Capacity row */}
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', gap: 8 }}>
                      <span>👥 {table.capacity} seats</span>
                      {table.order && <TimerBadge mins={table.order.elapsedMins} />}
                    </div>

                    {/* Order Info */}
                    {table.order ? (
                      <div style={{
                        background: 'var(--color-bg-raised)', borderRadius: 8,
                        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {ORDER_STATUS_LABEL[table.order.status] ?? table.order.status}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>
                            ${table.order.total.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {table.order.guestCount} guests · {table.order.itemCount} items
                        </div>
                        <Link
                          href={`/pos?table=${table.id}`}
                          style={{
                            display: 'block', textAlign: 'center', textDecoration: 'none',
                            padding: '7px 0', borderRadius: 8, marginTop: 4,
                            background: '#5b45f5', color: '#fff',
                            fontSize: 12, fontWeight: 700,
                          }}
                        >
                          Open in POS →
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/pos?table=${table.id}`}
                        style={{
                          display: 'block', textAlign: 'center', textDecoration: 'none',
                          padding: '8px 0', borderRadius: 8,
                          border: '1px dashed var(--color-border)',
                          color: 'var(--color-text-tertiary)',
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
                        + Seat Guests
                      </Link>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </>
        )
      )}

        {/* Open Checks View */}
        {activeView === 'checks' && (
          <div>
            {openChecks.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: 300, gap: 12, color: 'var(--color-text-tertiary)',
                background: 'var(--color-bg-card)', borderRadius: 12, border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ fontSize: 14 }}>No open checks right now. All tables are settled.</p>
              </div>
            ) : (
              <div style={{ background: 'var(--color-bg-card)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ minWidth: 680 }}>
                    {/* Table header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '100px 1fr 90px 80px 100px 120px 140px',
                      padding: '10px 20px', background: 'var(--color-bg-raised)',
                      fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--color-border)',
                    }}>
                      <span>Table</span><span>Status</span><span>Guests</span><span>Items</span><span>Total</span><span>Time Open</span><span>Action</span>
                    </div>

                    {openChecks.map((t, idx) => (
                      <div
                        key={t.id}
                        style={{
                          display: 'grid', gridTemplateColumns: '100px 1fr 90px 80px 100px 120px 140px',
                          padding: '14px 20px', borderTop: idx > 0 ? '1px solid var(--color-border)' : undefined,
                          background: idx % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-raised)',
                          alignItems: 'center', fontSize: 13,
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>{t.name}</span>
                        <span style={{
                          display: 'inline-block', fontSize: 11, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(91,69,245,0.12)', color: '#5b45f5',
                        }}>
                          {ORDER_STATUS_LABEL[t.order!.status] ?? t.order!.status}
                        </span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{t.order!.guestCount}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{t.order!.itemCount}</span>
                        <span style={{ fontWeight: 800, color: '#22c55e' }}>${t.order!.total.toFixed(2)}</span>
                        <TimerBadge mins={t.order!.elapsedMins} />
                        <Link
                          href={`/pos?table=${t.id}`}
                          style={{
                            display: 'inline-block', textAlign: 'center', textDecoration: 'none',
                            padding: '6px 14px', borderRadius: 8,
                            background: '#5b45f5', color: '#fff',
                            fontSize: 12, fontWeight: 700,
                          }}
                        >
                          Open POS →
                        </Link>
                      </div>
                    ))}

                    {/* Footer total */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '100px 1fr 90px 80px 100px 120px 140px',
                      padding: '10px 20px', background: 'var(--color-bg-raised)',
                      fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)',
                      borderTop: '2px solid var(--color-border)',
                    }}>
                      <span>{openChecks.length} checks</span>
                      <span />
                      <span />
                      <span />
                      <span style={{ color: '#22c55e' }}>
                        ${totalRevenue.toFixed(2)}
                      </span>
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
