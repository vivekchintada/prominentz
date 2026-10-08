'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '../ui/ThemeToggle'
import TableGrid, { TableData } from './TableGrid'
import OrderEntry from './OrderEntry'
import NewOrderModal from './NewOrderModal'
import TableActionsModal from './TableActionsModal'
import ServerKPIBar from './ServerKPIBar'
import QuickNoteModal from './QuickNoteModal'
import PurrCoffeePos from './PurrCoffeePos'
import { useToast, ToastContainer } from '../ui/Toast'
import { Button } from '@/components/ui/Button'
interface PosTerminalProps {
  initialTables: TableData[]
  currentUser:   { id: string; name: string; role: string; email: string }
  locationId:    string
}

export default function PosTerminal({
  initialTables,
  currentUser,
  locationId,
}: PosTerminalProps) {
  const router = useRouter()
  const [tables, setTables] = useState<TableData[]>(initialTables)
  const [view, setView] = useState<'map' | 'cart'>('map')
  
  // Toasts
  const { toasts, showToast, dismissToast } = useToast()

  // Selection states
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  
  // Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [isTableActionsOpen, setIsTableActionsOpen] = useState(false)
  const [isClockModalOpen, setIsClockModalOpen] = useState(false)
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false)
  const [selectedNoteTable, setSelectedNoteTable] = useState<TableData | null>(null)

  // Clock status
  const [employeeRecord, setEmployeeRecord] = useState<any | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [breakMinutes, setBreakMinutes] = useState<number>(0)
  const [loadingClock, setLoadingClock] = useState(true)

  // Network & Service Worker Offline Mode State
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [syncingOffline, setSyncingOffline] = useState<boolean>(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = async () => {
      setIsOnline(true)
      showToast('🟢 Network restored! Syncing offline orders...', 'success')
      try {
        setSyncingOffline(true)
        const { getUnsyncedOrders, markOrdersSynced } = await import('@/lib/offline-db')
        const pending = await getUnsyncedOrders()
        if (pending.length > 0) {
          const res = await fetch('/api/orders/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: pending }),
          })
          if (res.ok) {
            const data = await res.json()
            await markOrdersSynced(data.syncedOrderIds || [])
            showToast(`Synced ${data.syncedCount || pending.length} offline order(s)`, 'success')
            router.refresh()
          }
        }
      } catch (err) {
        console.error('Failed to sync offline queue', err)
      } finally {
        setSyncingOffline(false)
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      showToast('🔴 Offline Mode Enabled (Local Cache Active)', 'warning')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router, showToast])


  // Fetch current user clock-in status
  const fetchClockStatus = async () => {
    try {
      setLoadingClock(true)
      const res = await fetch('/api/employees')
      if (res.ok) {
        const list = await res.json()
        const match = list.find((emp: unknown) => emp.userId === currentUser.id)
        if (match) {
          setEmployeeRecord(match)
          setIsClockedIn(!!match.activeShift)
        }
      }
    } catch (err) {
      console.error('Failed to load employee shift status', err)
    } finally {
      setLoadingClock(false)
    }
  }

  useEffect(() => {
    fetchClockStatus()
  }, [currentUser.id])

  const handleClockAction = async () => {
    if (!employeeRecord) {
      showToast('No employee record found for your user account.', 'error')
      return
    }

    try {
      if (isClockedIn) {
        // Clock out
        const res = await fetch(`/api/employees/${employeeRecord.id}/clock-out`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ breakMinutes }),
        })
        if (!res.ok) throw new Error('Failed to clock out')
        showToast('Successfully clocked out of shift', 'success')
        setIsClockModalOpen(false)
        setBreakMinutes(0)
      } else {
        // Clock in
        const res = await fetch(`/api/employees/${employeeRecord.id}/clock-in`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('Failed to clock in')
        showToast('Successfully clocked in. Have a great shift!', 'success')
      }
      fetchClockStatus()
    } catch (err: unknown) {
      showToast(err.message || 'Error updating shift', 'error')
    }
  }


  // Sync initial tables from server prop
  useEffect(() => {
    setTables(initialTables)
  }, [initialTables])

  // Establish Server-Sent Events (SSE) stream for real-time PubSub updates
  useEffect(() => {
    const eventSource = new EventSource('/api/events')

    // Helper: returns true if the event belongs to this location or has no location tag
    const isMyLocation = (data: unknown) =>
      !data._locationId || data._locationId === locationId

    eventSource.addEventListener('connected', () => {
      console.log('[SSE] Live connection established')
    })

    eventSource.addEventListener('table.status.changed', (e: unknown) => {
      try {
        const data = JSON.parse(e.data)
        if (!isMyLocation(data)) return
        router.refresh()
        // Notify other terminals if updated by someone else
        if (data.actorId !== currentUser.id) {
          const matchedTable = tables.find((t) => t.id === data.tableId)
          if (matchedTable) {
            showToast(`Table ${matchedTable.name} status updated to ${data.status}`, 'info')
          }
        }
      } catch (err) {
        console.error('[SSE] table.status.changed error:', err)
      }
    })

    eventSource.addEventListener('table.note.changed', (e: unknown) => {
      try {
        const data = JSON.parse(e.data)
        if (!isMyLocation(data)) return
        router.refresh()
        if (data.actorId !== currentUser.id) {
          showToast(`Note updated on table ${data.tableName || ''}`, 'info')
        }
      } catch (err) {
        console.error('[SSE] table.note.changed error:', err)
      }
    })

    eventSource.addEventListener('menu.item.86d', (e: unknown) => {
      try {
        const data = JSON.parse(e.data)
        if (!isMyLocation(data)) return
        showToast(`Item 86'd: ${data.name || 'A menu item'} is now unavailable!`, 'warning')
        router.refresh()
      } catch (err) {
        console.error('[SSE] menu.item.86d error:', err)
      }
    })

    eventSource.addEventListener('ticket.status.updated', (e: unknown) => {
      try {
        const data = JSON.parse(e.data)
        if (!isMyLocation(data)) return
        router.refresh()
        if (data.orderId === activeOrderId) {
          showToast(`Kitchen ticket status updated to ${data.status}`, 'info')
        }
      } catch (err) {
        console.error('[SSE] ticket.status.updated error:', err)
      }
    })

    eventSource.addEventListener('order.modified', (e: unknown) => {
      try {
        const data = JSON.parse(e.data)
        if (!isMyLocation(data)) return
        router.refresh()
      } catch {
        router.refresh()
      }
    })

    eventSource.addEventListener('payment.processed', (e: unknown) => {
      try {
        const data = JSON.parse(e.data)
        if (!isMyLocation(data)) return
        router.refresh()
        if (data.actorId !== currentUser.id) {
          showToast('Payment processed for an active check!', 'success')
        }
      } catch (err) {
        console.error('[SSE] payment.processed error:', err)
      }
    })

    return () => {
      eventSource.close()
    }
  }, [router, tables, activeOrderId, currentUser.id, locationId, showToast])

  // Select a table card
  const handleSelectTable = (table: TableData) => {
    setSelectedTable(table)
    const activeOrder = table.orders.find((o) => o.id)

    if (activeOrder) {
      // Go straight to cart order entry
      setActiveOrderId(activeOrder.id)
      setView('cart')
    } else {
      // Open quick actions modal first
      setIsTableActionsOpen(true)
    }
  }

  // Create a new order when table is opened (with offline IndexedDB fallback)
  const handleCreateOrder = async (guestCount: number, notes: string) => {
    if (!selectedTable) return

    // Fast path for offline mode
    if (!navigator.onLine) {
      try {
        const localOrderId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const { saveOfflineOrder } = await import('@/lib/offline-db')
        await saveOfflineOrder({
          id: localOrderId,
          locationId,
          tableId: selectedTable.id,
          items: [],
          guestCount,
          notes: notes || undefined,
          createdAt: new Date().toISOString(),
          synced: false,
        })
        setTables((prev) => prev.map((t) => (t.id === selectedTable.id ? { ...t, status: 'ACTIVE' } : t)))
        showToast(`🔴 Offline Mode: Table ${selectedTable.name} opened locally`, 'warning')
        setIsNewOrderOpen(false)
        setActiveOrderId(localOrderId)
        setView('cart')
        return
      } catch (err) {
        showToast('Failed to create local offline order', 'error')
        return
      }
    }

    try {
      const res = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tableId:    selectedTable.id,
          guestCount,
          notes:      notes || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to initialize table order')
      }

      const newOrder = await res.json()
      
      showToast(`Table ${selectedTable.name} opened`, 'success')
      setIsNewOrderOpen(false)
      
      // Refresh database records via Next.js router
      router.refresh()

      // Redirect viewport to cart entry
      setActiveOrderId(newOrder.id)
      setView('cart')
    } catch (err: unknown) {
      // If network fails unexpectedly mid-flight, seamlessly queue offline
      try {
        const localOrderId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const { saveOfflineOrder } = await import('@/lib/offline-db')
        await saveOfflineOrder({
          id: localOrderId,
          locationId,
          tableId: selectedTable.id,
          items: [],
          guestCount,
          notes: notes || undefined,
          createdAt: new Date().toISOString(),
          synced: false,
        })
        setTables((prev) => prev.map((t) => (t.id === selectedTable.id ? { ...t, status: 'ACTIVE' } : t)))
        showToast(`⚡ Network issue: Table ${selectedTable.name} opened in offline queue`, 'warning')
        setIsNewOrderOpen(false)
        setActiveOrderId(localOrderId)
        setView('cart')
      } catch {
        showToast(err.message || 'Error opening table', 'error')
        setIsNewOrderOpen(false)
      }
    }
  }

  // Return to table grid and refresh
  const handleBackToMap = () => {
    setView('map')
    setActiveOrderId(null)
    setSelectedTable(null)
    router.refresh()
  }

  // 1. SERVER SHIFT STATS & 86'D ITEM WARNINGS
  const openChecks = tables.flatMap((t) => t.orders).filter((o) => o.id)
  const openChecksCount = openChecks.length
  const totalSalesToday = openChecks.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const estTipsAccrued = totalSalesToday * 0.18

  // 2. FETCH 86'D ITEMS FOR WARNING BANNER
  const [unavailableItems, setUnavailableItems] = useState<string[]>([])
  useEffect(() => {
    async function load86Items() {
      try {
        const res = await fetch('/api/menu/categories')
        if (res.ok) {
          const cats = await res.json()
          const unavail: string[] = []
          cats.forEach((c: unknown) => {
            if (c.items) {
              c.items.forEach((item: unknown) => {
                if (!item.isAvailable) unavail.push(item.name)
              })
            }
          })
          setUnavailableItems(unavail)
        }
      } catch {}
    }
    load86Items()
  }, [tables])

  return (
    <div className="main-content" style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* DreamsPOS Style Header Navbar */}
      <header
        style={{
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 var(--space-6)',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Brand & Module Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '18px', color: 'var(--brand)' }}>
            <span style={{ fontSize: '22px' }}>🍽️</span>
            <span>Prominentz</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button
              onClick={() => { if (view !== 'cart') setView('cart') }}
              variant="primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                background: view === 'cart' ? 'var(--brand)' : 'transparent',
                color: view === 'cart' ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🧾</span> POS
            </Button>

            <Button
              onClick={handleBackToMap}
              variant="secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                background: view === 'map' ? 'var(--brand)' : 'transparent',
                color: view === 'map' ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🗺️</span> Tables
            </Button>

            <Link
              href="/kds"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>🍳</span> Kitchen KDS
            </Link>

            <Link
              href="/dashboard/reservations"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>📅</span> Reservations
            </Link>

            <Link
              href="/dashboard/reports"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>📊</span> Reports
            </Link>
          </nav>
        </div>

        {/* Right Tools & User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            className="badge"
            style={{
              background: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: isOnline ? '#22c55e' : '#ef4444',
              borderColor: isOnline ? '#22c55e' : '#ef4444',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {isOnline ? '🟢 Online' : syncingOffline ? '⚡ Syncing...' : '🔴 Offline Mode'}
          </span>

          <Button
            onClick={() => setIsClockModalOpen(true)}
            variant="primary"
            loading={loadingClock}
          >
            {isClockedIn ? '⏰ Clock Out' : '⏰ Clock In'}
          </Button>

          <ThemeToggle />

          <Link href="/dashboard" className="btn btn--secondary btn--sm" style={{ fontSize: '12px', fontWeight: 600 }}>
            Dashboard ↗
          </Link>
        </div>
      </header>

      {/* SERVER SHIFT PERFORMANCE & TIP TRACKER BAR */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-3) var(--space-8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-semibold">Active Checks:</span>
            <span className="badge badge--brand font-bold">{openChecksCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-semibold">Shift Net Sales:</span>
            <span className="font-bold text-primary">${totalSalesToday.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-semibold">Est. Shift Tips (18%):</span>
            <span className="font-bold text-success">${estTipsAccrued.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-semibold">Shift Status:</span>
            <span className={`badge ${isClockedIn ? 'badge--success' : 'badge--warning'}`}>
              {isClockedIn ? '🟢 Clocked In' : '🟡 Clocked Out'}
            </span>
          </div>
        </div>

        {/* 86'd Item Alert Banner */}
        {unavailableItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-error uppercase tracking-wider">🚫 Kitchen 86ed:</span>
            <span className="badge badge--error" style={{ fontSize: '11px' }}>
              {unavailableItems.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* MAIN VIEWPORT */}
      <div className="page-body" style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'map' ? (
          <TableGrid
            tables={tables}
            onSelectTable={handleSelectTable}
            onOpenNoteModal={(table) => {
              setSelectedNoteTable(table)
              setIsQuickNoteOpen(true)
            }}
          />
        ) : (
          activeOrderId && (
            <OrderEntry
              orderId={activeOrderId}
              onBackToMap={handleBackToMap}
              showToast={showToast}
              currentUser={currentUser}
            />
          )
        )}
      </div>

      {/* Floating Server KPI Bar Overlay Widget */}
      <ServerKPIBar currentUser={currentUser} />

      {/* Quick Table Note Modal (Centered Dialog) */}
      <QuickNoteModal
        isOpen={isQuickNoteOpen}
        table={selectedNoteTable}
        onClose={() => {
          setIsQuickNoteOpen(false)
          setSelectedNoteTable(null)
        }}
        onSaved={() => {
          router.refresh()
        }}
        showToast={showToast}
      />

      {/* Modal Dialog for starting orders */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        tableName={selectedTable?.name ?? ''}
        onClose={() => {
          setIsNewOrderOpen(false)
          setSelectedTable(null)
        }}
        onSubmit={handleCreateOrder}
      />

      {/* Table Actions Modal for quick actions */}
      <TableActionsModal
        isOpen={isTableActionsOpen}
        table={selectedTable}
        onClose={() => {
          setIsTableActionsOpen(false)
          setSelectedTable(null)
        }}
        onStartOrder={() => {
          setIsTableActionsOpen(false)
          setIsNewOrderOpen(true)
        }}
        onStatusUpdated={() => {
          router.refresh()
        }}
        showToast={showToast}
      />

      {/* Clock In / Out Confirmation Modal */}
      {isClockModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 'var(--z-modal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="card card--elevated" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 className="text-lg font-bold">⏰ Shift Clock Control</h3>
            <p className="text-sm text-secondary">
              User: <strong>{currentUser.name}</strong> | Status: <strong>{isClockedIn ? 'Clocked In' : 'Clocked Out'}</strong>
            </p>

            {isClockedIn ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-secondary">Break Duration (minutes):</label>
                <input
                  type="number"
                  min="0"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  placeholder="e.g. 30"
                  className="input"
                />
              </div>
            ) : (
              <p className="text-xs text-secondary italic">
                Ready to clock-in for your shift as a <strong>{currentUser.role}</strong>?
              </p>
            )}

            <div className="flex gap-2 justify-end mt-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                             <Button type="button" onClick={() => setIsClockModalOpen(false)} variant="secondary">
                Cancel
              </Button>
              <Button type="button" onClick={handleClockAction} variant="primary">
                {isClockedIn ? 'Confirm Clock Out' : 'Clock In Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast systems */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
