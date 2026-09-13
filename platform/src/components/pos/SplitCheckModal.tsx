'use client'

import React, { useState, useMemo } from 'react'

interface OrderItemData {
  id:           string
  quantity:     number
  priceAtOrder: number
  seatNumber:   number
  modifiers:    any
  specialNote:  string | null
  status:       string
  menuItem: {
    id:      string
    name:    string
    taxRate: number
  }
}

interface SplitCheckModalProps {
  isOpen:     boolean
  onClose:    () => void
  orderId:    string
  guestCount: number
  items:      OrderItemData[]
  showToast:  (message: string, variant: 'success' | 'error') => void
  onSeatChanged: () => void  // callback to refresh order after seat reassignment
}

export default function SplitCheckModal({
  isOpen,
  onClose,
  orderId,
  guestCount: initialGuestCount,
  items,
  showToast,
  onSeatChanged,
}: SplitCheckModalProps) {
  const [saving, setSaving] = useState(false)
  const [printingSeat, setPrintingSeat] = useState<number | null>(null)
  const [customSeatCount, setCustomSeatCount] = useState(Math.max(initialGuestCount, 1))

  // Dynamic seats (1-based)
  const seats = Array.from({ length: customSeatCount }, (_, i) => i + 1)

  // Group items by seat
  const seatGroups = useMemo(() => {
    const groups: Record<number, OrderItemData[]> = {}
    seats.forEach((s) => { groups[s] = [] })
    items.forEach((item) => {
      const seat = item.seatNumber && item.seatNumber <= customSeatCount ? item.seatNumber : 1
      if (!groups[seat]) groups[seat] = []
      groups[seat].push(item)
    })
    return groups
  }, [items, customSeatCount, seats])

  // Calculate per-seat totals
  const seatTotals = useMemo(() => {
    return seats.map((seat) => {
      const seatItems = seatGroups[seat] || []
      let subtotal = 0
      let tax = 0

      seatItems.forEach((item) => {
        const mods = (item.modifiers as Array<{ priceDelta: number }>) || []
        const modSum = mods.reduce((sum, m) => sum + Number(m.priceDelta || 0), 0)
        const lineTotal = (Number(item.priceAtOrder) + modSum) * item.quantity
        subtotal += lineTotal
        tax += lineTotal * Number(item.menuItem?.taxRate || 0)
      })

      return { seat, subtotal, tax, total: subtotal + tax, itemCount: seatItems.length }
    })
  }, [seatGroups, seats])

  // Reassign an item to a different seat
  const handleReassignSeat = async (itemId: string, newSeat: number) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNumber: newSeat }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to reassign seat')
      }

      onSeatChanged()
    } catch (err: any) {
      showToast(err.message || 'Error reassigning item seat', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Print individual seat check
  const handlePrintSeatSlip = async (seat: number) => {
    try {
      setPrintingSeat(seat)
      const res = await fetch('/api/print/escpos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'RECEIPT', orderId, station: `SEAT ${seat}` }),
      })
      if (!res.ok) throw new Error('Print slip failed')
      showToast(`Printed Check for Seat ${seat}`, 'success')
    } catch (e: any) {
      showToast(e.message || 'Printer error', 'error')
    } finally {
      setPrintingSeat(null)
    }
  }

  if (!isOpen) return null

  const grandTotal = seatTotals.reduce((sum, s) => sum + s.total, 0)

  return (
    <div
      style={{
        position:        'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex:          'var(--z-modal)' as any,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         'var(--space-4)',
        backdropFilter:  'blur(6px)',
      }}
    >
      <div
        className="card card--elevated animate-fade-in"
        style={{
          width:     '100%',
          maxWidth:  '760px',
          maxHeight: '85vh',
          display:   'flex',
          flexDirection: 'column',
          gap:       'var(--space-4)',
          overflow:  'hidden',
          backgroundColor: '#121215',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Header with Seat Adder */}
        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'var(--space-3)' }}>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🪑</span> Item &amp; Seat Bill Splitter
            </h3>
            <p className="text-xs text-secondary mt-1">Assign items to distinct guest seats for separate payments or individual check printing.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomSeatCount((c) => Math.max(1, c - 1))}
              className="btn btn--secondary btn--sm"
              disabled={customSeatCount <= 1}
            >
              - Seat
            </button>
            <span className="font-bold text-sm text-brand px-2">{customSeatCount} Seats</span>
            <button
              onClick={() => setCustomSeatCount((c) => c + 1)}
              className="btn btn--secondary btn--sm"
            >
              + Seat
            </button>
            <button onClick={onClose} className="btn btn--ghost btn--sm ml-2">✕</button>
          </div>
        </div>

        {/* Seat Panels */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingRight: '4px' }}>
          {seats.map((seat) => {
            const seatItems = seatGroups[seat] || []
            const totals = seatTotals.find((s) => s.seat === seat)!

            return (
              <div
                key={seat}
                style={{
                  border:       '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding:      '14px 16px',
                  background:   '#18181d',
                }}
              >
                {/* Seat Header */}
                <div className="flex justify-between items-center" style={{ marginBottom: '10px' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-brand">🪑 Seat {seat}</span>
                    <span className="text-xs text-secondary">({seatItems.length} items)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-success">
                      ${totals.total.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handlePrintSeatSlip(seat)}
                      disabled={printingSeat === seat || seatItems.length === 0}
                      className="btn btn--secondary btn--sm"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      {printingSeat === seat ? 'Printing...' : '🖨️ Slip'}
                    </button>
                  </div>
                </div>

                {/* Items */}
                {seatItems.length === 0 ? (
                  <p className="text-xs text-secondary italic" style={{ padding: '6px 0' }}>
                    No items assigned to this seat yet. Select &quot;Seat {seat}&quot; in the dropdown below any item to move it here.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {seatItems.map((item) => {
                      const mods = (item.modifiers as Array<{ name?: string; optionName?: string; priceDelta: number }>) || []
                      const modSum = mods.reduce((sum, m) => sum + Number(m.priceDelta || 0), 0)
                      const lineTotal = (Number(item.priceAtOrder) + modSum) * item.quantity

                      return (
                        <div key={item.id} className="flex justify-between items-center gap-2 p-2 rounded bg-black/20 text-xs">
                          <div style={{ flex: 1 }}>
                            <span className="font-semibold text-white">{item.quantity}x {item.menuItem?.name}</span>
                            {mods.length > 0 && (
                              <span className="text-secondary"> (+{mods.map(m => m.name || m.optionName).join(', ')})</span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-white mr-2">
                            ${lineTotal.toFixed(2)}
                          </span>
                          {/* Seat Reassign Dropdown */}
                          <select
                            value={item.seatNumber || 1}
                            onChange={(e) => handleReassignSeat(item.id, parseInt(e.target.value))}
                            disabled={saving}
                            style={{
                              background: '#27272a',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: '#ffffff',
                              borderRadius: '6px',
                              padding: '3px 6px',
                              fontSize: '11px',
                            }}
                          >
                            {seats.map((s) => (
                              <option key={s} value={s}>Move to Seat {s}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Seat Subtotals */}
                {seatItems.length > 0 && (
                  <div
                    style={{
                      borderTop:  '1px dashed rgba(255,255,255,0.08)',
                      marginTop:  '10px',
                      paddingTop: '6px',
                      display:    'flex',
                      justifyContent: 'space-between',
                      fontSize:   '11px',
                    }}
                    className="text-secondary"
                  >
                    <span>Subtotal: ${totals.subtotal.toFixed(2)}</span>
                    <span>Tax: ${totals.tax.toFixed(2)}</span>
                    <span className="font-bold text-white">
                      Seat Total: ${totals.total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop:   '1px solid rgba(255,255,255,0.08)',
            paddingTop:  'var(--space-3)',
            display:     'flex',
            justifyContent: 'space-between',
            alignItems:  'center',
          }}
        >
          <div className="font-bold text-base text-white">
            Grand Table Total: <span className="text-brand font-mono">${grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn--primary">Done</button>
          </div>
        </div>
      </div>
    </div>
  )
}
