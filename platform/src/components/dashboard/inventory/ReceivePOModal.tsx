'use client'

import React, { useState } from 'react'

interface PurchaseOrderItem {
  id: string
  inventoryItemId: string
  quantity: number
  receivedQuantity?: number
  unitCost: number
  totalCost: number
  inventoryItem?: {
    name: string
    unit: string
    currentStock: number
    unitCost: number
  }
}

interface PurchaseOrder {
  id: string
  poNumber: string
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  totalCost: number
  createdAt: string
  orderedAt?: string | null
  receivedAt?: string | null
  supplier: { name: string; leadTimeDays?: number }
  items: PurchaseOrderItem[]
}

interface ReceivePOModalProps {
  po: PurchaseOrder
  onClose: () => void
  onSuccess: () => void
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}

export default function ReceivePOModal({ po, onClose, onSuccess, showToast }: ReceivePOModalProps) {
  // Initialize line items receive state
  const [lineItems, setLineItems] = useState(() =>
    po.items.map((it) => {
      const alreadyReceived = it.receivedQuantity || 0
      const remaining = Math.max(0, it.quantity - alreadyReceived)
      return {
        id: it.id,
        name: it.inventoryItem?.name || 'Item',
        unit: it.inventoryItem?.unit || 'units',
        orderedQty: it.quantity,
        alreadyReceived,
        receiveNow: remaining, // default to remaining
        unitCost: Number(it.unitCost),
      }
    })
  )
  const [submitting, setSubmitting] = useState(false)

  const handleQtyChange = (id: string, val: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, receiveNow: Math.max(0, val) } : item))
    )
  }

  const handleCostChange = (id: string, val: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unitCost: Math.max(0, val) } : item))
    )
  }

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const receivedItemsPayload = lineItems.map((item) => ({
        id: item.id,
        receivedQuantity: item.alreadyReceived + item.receiveNow,
        unitCost: item.unitCost,
      }))

      const res = await fetch(`/api/inventory/purchase-orders?id=${po.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedItems: receivedItemsPayload }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to receive purchase order')
      }

      showToast(`Purchase order ${po.poNumber} stock received and updated`, 'success')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      showToast(err.message || 'Error receiving PO', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFullReceiveQuick = async () => {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/inventory/purchase-orders?id=${po.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RECEIVED' }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to receive purchase order')
      }

      showToast(`All items in ${po.poNumber} received in full`, 'success')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      showToast(err.message || 'Error receiving PO', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-card-hover)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Receive Purchase Order
              </h2>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#eff6ff',
                  color: 'var(--brand)',
                  border: '1px solid #bfdbfe',
                }}
              >
                {po.poNumber}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Supplier: <strong style={{ color: 'var(--color-text-secondary)' }}>{po.supplier?.name}</strong> • Ordered on{' '}
              {new Date(po.createdAt).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleReceiveSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 13,
                color: '#15803d',
                lineHeight: 1.5,
              }}
            >
              <strong>Inventory Depletion & Cost Note:</strong> Entering received quantities will increment live stock
              and update ingredient unit cost. Unreceived quantities remain open for future partial delivery.
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-card-hover)', borderBottom: '1px solid var(--color-border)', color: '#64748b' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Ingredient</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Ordered</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Prior Received</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, width: 140 }}>Receive Now</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, width: 130 }}>Unit Cost ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {item.name}
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Unit: {item.unit}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {item.orderedQty}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: item.alreadyReceived > 0 ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                        {item.alreadyReceived}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.receiveNow}
                            onChange={(e) => handleQtyChange(item.id, parseFloat(e.target.value) || 0)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 13,
                              fontWeight: 700,
                              color: 'var(--color-text-primary)',
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => handleCostChange(item.id, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-bg-card-hover)',
            }}
          >
            <button
              type="button"
              onClick={handleFullReceiveQuick}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid #bbf7d0',
                background: '#f0fdf4',
                color: '#15803d',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Receive All in Full
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: 'var(--color-bg-card)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--brand)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px var(--brand-tint)',
                }}
              >
                {submitting ? 'Updating Inventory...' : 'Confirm Items Received'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
