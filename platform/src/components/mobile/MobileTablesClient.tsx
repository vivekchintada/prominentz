'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TableOrder {
  id: string
  guestCount: number
  total: number
  subtotal?: number
  tax?: number
  notes?: string | null
  createdAt: string
  items?: Array<{
    id: string
    quantity: number
    priceAtOrder: number
    status: string
    menuItem: { name: string }
  }>
}

export interface MobileTable {
  id: string
  name: string
  capacity: number
  status: 'EMPTY' | 'ACTIVE' | 'PAYING' | 'RESERVED'
  orders: TableOrder[]
}

interface MobileTablesClientProps {
  initialTables: MobileTable[]
  locationId: string
  userName: string
}

const STATUS_COLOR: Record<string, string> = {
  EMPTY:    '#8E8E93',
  ACTIVE:   '#30D158',
  PAYING:   '#BF5AF2',
  RESERVED: '#007AFF',
}

const STATUS_BG: Record<string, string> = {
  EMPTY:    'rgba(142,142,147,0.12)',
  ACTIVE:   'rgba(48,209,88,0.12)',
  PAYING:   'rgba(191,90,242,0.12)',
  RESERVED: 'rgba(0,122,255,0.12)',
}

export function MobileTablesClient({ initialTables, locationId }: MobileTablesClientProps) {
  const router = useRouter()
  const [tables, setTables] = useState<MobileTable[]>(initialTables)
  const [selectedTable, setSelectedTable] = useState<MobileTable | null>(null)
  const [openOrderModal, setOpenOrderModal] = useState<MobileTable | null>(null)
  const [guestCount, setGuestCount] = useState<number>(2)
  const [submitting, setSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const showFeedback = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(null), 3000)
  }

  const handleOpenTable = async (table: MobileTable) => {
    try {
      setSubmitting(true)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id,
          guestCount,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to open table')
      }

      showFeedback(`Table ${table.name} opened with ${guestCount} guests!`)
      setOpenOrderModal(null)
      router.refresh()
    } catch (err: unknown) {
      showFeedback(err.message || 'Error opening table')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCardClick = (table: MobileTable) => {
    if (table.status === 'EMPTY') {
      setGuestCount(table.capacity || 2)
      setOpenOrderModal(table)
    } else {
      setSelectedTable(table)
    }
  }

  return (
    <div style={{ padding: '20px 16px', paddingBottom: '90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#E5E5EA' }}>Table Floorplan</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8E8E93' }}>Tap any table to manage orders</p>
        </div>
        <button
          onClick={() => router.refresh()}
          style={{
            background: '#2C2C2E',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#E5E5EA',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {actionMessage && (
        <div style={{
          background: 'rgba(48,209,88,0.15)',
          border: '1px solid #30D158',
          color: '#30D158',
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          {actionMessage}
        </div>
      )}

      {/* Grid of Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {tables.map((table) => {
          const order = table.orders[0]
          const color = STATUS_COLOR[table.status] ?? '#8E8E93'
          const bg    = STATUS_BG[table.status]   ?? 'rgba(255,255,255,0.05)'
          const minsActive = order
            ? Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
            : null

          return (
            <div
              key={table.id}
              onClick={() => handleCardClick(table)}
              style={{
                background: bg,
                border: `1.5px solid ${color}44`,
                borderRadius: 16,
                padding: '16px 14px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#E5E5EA' }}>{table.name}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color,
                  background: `${color}25`,
                  padding: '2px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}>
                  {table.status}
                </span>
              </div>

              <div style={{ fontSize: 12, color: '#8E8E93' }}>
                🪑 {table.capacity} seats
                {order && <> · 👤 {order.guestCount}</>}
              </div>

              {order ? (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#30D158', fontWeight: 800, fontSize: 15 }}>
                    ${Number(order.total || 0).toFixed(2)}
                  </div>
                  <div style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>
                    ⏱️ {minsActive}m active
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 11, color: '#8E8E93', fontStyle: 'italic' }}>
                  + Tap to open table
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tables.length === 0 && (
        <p style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          No tables found. Set up tables in the{' '}
          <Link href="/dashboard/tables/qr" style={{ color: '#5b45f5' }}>Dashboard</Link>.
        </p>
      )}

      {/* ── Open Table Modal ── */}
      {openOrderModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 100,
        }}>
          <div style={{
            background: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Open {openOrderModal.name}</h3>
            <p style={{ fontSize: 13, color: '#8E8E93', margin: '6px 0 20px' }}>Select party size</p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, margin: '16px 0' }}>
              <button
                type="button"
                onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#2C2C2E', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 20, cursor: 'pointer',
                }}
              >
                -
              </button>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#5b45f5', minWidth: 40 }}>{guestCount}</span>
              <button
                type="button"
                onClick={() => setGuestCount((c) => c + 1)}
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#2C2C2E', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 20, cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setOpenOrderModal(null)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  background: '#2C2C2E', border: 'none', color: '#8E8E93', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleOpenTable(openOrderModal)}
                disabled={submitting}
                style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  background: '#5b45f5', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {submitting ? 'Opening...' : 'Open Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Table Detail Drawer ── */}
      {selectedTable && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 100,
        }}>
          <div style={{
            background: '#1C1C1E',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>{selectedTable.name} Details</h3>
                <span style={{ fontSize: 12, color: STATUS_COLOR[selectedTable.status], fontWeight: 700 }}>
                  ● {selectedTable.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                style={{ background: 'none', border: 'none', color: '#8E8E93', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {selectedTable.orders[0] ? (
              <div>
                <div style={{ background: '#2C2C2E', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>
                    <span>Guests: {selectedTable.orders[0].guestCount}</span>
                    <span>Order #{selectedTable.orders[0].id.substring(0, 8)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 8 }}>
                    <span>Total Balance</span>
                    <span style={{ color: '#30D158' }}>${Number(selectedTable.orders[0].total || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Link
                    href={`/table/${locationId}/${selectedTable.id}`}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 12,
                      background: '#5b45f5',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 700,
                      textAlign: 'center',
                      fontSize: 14,
                    }}
                  >
                    📝 Take / Add Items
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedTable(null)
                      showFeedback(`Sent kitchen reminder for ${selectedTable.name}`)
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: '#2C2C2E',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    🔔 Ping Kitchen
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: '#8E8E93', fontSize: 13 }}>No active order found on this table.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
