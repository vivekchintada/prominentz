'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface WasteLogItem {
  id: string
  quantity: number
  unitCost: number
  totalCost: number
  reason: string
  status: string
  notes: string | null
  createdAt: string
  inventoryItem: {
    id: string
    name: string
    unit: string
    category: string | null
  }
}

interface InventoryOption {
  id: string
  name: string
  unit: string
  unitCost: number
  currentStock: number
}

interface WasteTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
  onWasteLogged: () => void
}

export default function WasteTab({ showToast, onWasteLogged }: WasteTabProps) {
  const [logs, setLogs] = useState<WasteLogItem[]>([])
  const [totalWasteCost, setTotalWasteCost] = useState(0)
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [wasteQty, setWasteQty] = useState<number | ''>(1)
  const [wasteReason, setWasteReason] = useState('SPOILED')
  const [wasteNotes, setWasteNotes] = useState('')
  const [submittingWaste, setSubmittingWaste] = useState(false)

  const fetchWasteData = useCallback(async () => {
    try {
      setLoading(true)
      const [wasteRes, invRes] = await Promise.all([
        fetch('/api/inventory/waste'),
        fetch('/api/inventory'),
      ])

      if (wasteRes.ok) {
        const data = await wasteRes.json()
        setLogs(data.logs || [])
        setTotalWasteCost(data.totalWasteCost || 0)
      }
      if (invRes.ok) {
        const invData = await invRes.json()
        const opts = Array.isArray(invData) ? invData : (invData.items || [])
        setInventoryOptions(opts)
        if (opts.length > 0 && !selectedItemId) {
          setSelectedItemId(opts[0].id)
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading waste logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, selectedItemId])

  useEffect(() => {
    fetchWasteData()
  }, [fetchWasteData])

  const selectedItem = inventoryOptions.find((i) => i.id === selectedItemId)
  const estimatedCost = selectedItem && wasteQty ? Number(wasteQty) * Number(selectedItem.unitCost) : 0

  const handleRecordWaste = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemId || !wasteQty) return

    try {
      setSubmittingWaste(true)
      const res = await fetch('/api/inventory/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: selectedItemId,
          quantity:        Number(wasteQty),
          reason:          wasteReason,
          notes:           wasteNotes || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to record waste')
      }

      showToast('Waste & spoilage logged and stock depleted', 'success')
      setIsLogOpen(false)
      setWasteNotes('')
      await fetchWasteData()
      onWasteLogged()
    } catch (err: any) {
      showToast(err.message || 'Error logging waste', 'error')
    } finally {
      setSubmittingWaste(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
            Total Waste Loss
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
            ${totalWasteCost.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
            Recorded spoilage & prep shrinkage
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Logged Incidents
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {logs.length}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
            Tracked with manager audit trail
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Shrinkage Control</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Log kitchen spills, drops & expiration</div>
          </div>
          <button
            onClick={() => setIsLogOpen(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(220,38,38,0.25)',
            }}
          >
            + Log Waste / Spoilage
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date & Time</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Ingredient</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Quantity Discarded</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Unit Cost</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Total Loss</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Reason</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  Loading waste logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  No waste or spoilage incidents recorded.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                    {log.inventoryItem?.name}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#dc2626' }}>
                    -{log.quantity} {log.inventoryItem?.unit}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569' }}>
                    ${Number(log.unitCost).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#dc2626' }}>
                    ${Number(log.totalCost).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: '#fee2e2',
                        color: '#b91c1c',
                      }}
                    >
                      {log.reason}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b', maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {log.notes || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Log Waste Modal */}
      {isLogOpen && (
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
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Record Waste / Spoilage
              </h3>
              <button
                onClick={() => setIsLogOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordWaste} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Discarded Ingredient:
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                  }}
                >
                  {inventoryOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} (Current: {opt.currentStock} {opt.unit}) — ${Number(opt.unitCost).toFixed(2)}/ea
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Quantity ({selectedItem?.unit || 'units'}):
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={wasteQty}
                    onChange={(e) => setWasteQty(parseFloat(e.target.value) || '')}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Reason:
                  </label>
                  <select
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  >
                    <option value="SPOILED">Spoiled / Mold</option>
                    <option value="EXPIRED">Passed Expiry</option>
                    <option value="PREP_MISTAKE">Prep Kitchen Mistake</option>
                    <option value="DROPPED">Dropped / Contaminated</option>
                    <option value="CUSTOMER_COMPLAINT">Customer Returned</option>
                    <option value="OTHER">Other shrinkage</option>
                  </select>
                </div>
              </div>

              {estimatedCost > 0 && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 12,
                    color: '#b91c1c',
                    fontWeight: 600,
                  }}
                >
                  Estimated Loss: ${estimatedCost.toFixed(2)} will be subtracted from current stock.
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Notes / Explanation:
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional incident details..."
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWaste}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {submittingWaste ? 'Logging...' : 'Post Waste Depletion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
