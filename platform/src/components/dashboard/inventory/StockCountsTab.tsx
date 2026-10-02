'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface StockCountSessionSummary {
  id: string
  sessionNumber: string
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED'
  startedAt: string
  completedAt: string | null
  notes: string | null
  totalItemsCounted: number
  discrepancyCount: number
  totalVarianceValue: number
}

interface StockCountDetailItem {
  id: string
  inventoryItemId: string
  expectedQuantity: number
  countedQuantity: number
  variance: number
  unitCost: number
  varianceCost: number
  notes: string | null
  inventoryItem: {
    name: string
    unit: string
    category: string | null
  }
}

interface StockCountDetail {
  id: string
  sessionNumber: string
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  startedAt: string
  completedAt: string | null
  items: StockCountDetailItem[]
}

interface StockCountsTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
  onStockUpdated: () => void
}

export default function StockCountsTab({ showToast, onStockUpdated }: StockCountsTabProps) {
  const [sessions, setSessions] = useState<StockCountSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [startingCount, setStartingCount] = useState(false)

  // Active Count Sheet Modal
  const [activeSession, setActiveSession] = useState<StockCountDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submittingCount, setSubmittingCount] = useState(false)
  const [sheetFilter, setSheetFilter] = useState<'ALL' | 'DISCREPANCY'>('ALL')
  const [sheetSearch, setSheetSearch] = useState('')

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/inventory/counts')
      if (!res.ok) throw new Error('Failed to load count sessions')
      const data = await res.json()
      setSessions(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Error loading stock count sessions', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleStartCount = async () => {
    try {
      setStartingCount(true)
      const res = await fetch('/api/inventory/counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Physical inventory cycle count' }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start count session')
      }

      const newSession = await res.json()
      showToast(`Stock count session ${newSession.sessionNumber} started`, 'success')
      fetchSessions()
      handleOpenSheet(newSession.id)
    } catch (err: any) {
      showToast(err.message || 'Error starting count', 'error')
    } finally {
      setStartingCount(false)
    }
  }

  const handleOpenSheet = async (id: string) => {
    try {
      setLoadingDetail(true)
      const res = await fetch(`/api/inventory/counts/${id}`)
      if (!res.ok) throw new Error('Failed to load session details')
      const data = await res.json()
      setActiveSession(data)
    } catch (err: any) {
      showToast(err.message || 'Error opening count sheet', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCountChange = (itemId: string, val: number) => {
    if (!activeSession) return
    setActiveSession({
      ...activeSession,
      items: activeSession.items.map((it) => {
        if (it.id !== itemId) return it
        const variance = val - it.expectedQuantity
        const varianceCost = variance * Number(it.unitCost)
        return {
          ...it,
          countedQuantity: Math.max(0, val),
          variance,
          varianceCost,
        }
      }),
    })
  }

  const handleSaveDraft = async () => {
    if (!activeSession) return
    try {
      setSubmittingCount(true)
      const res = await fetch(`/api/inventory/counts/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DRAFT',
          items: activeSession.items.map((i) => ({
            id: i.id,
            countedQuantity: i.countedQuantity,
            notes: i.notes,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to save draft counts')
      showToast('Draft counts saved', 'success')
      fetchSessions()
    } catch (err: any) {
      showToast(err.message || 'Error saving draft', 'error')
    } finally {
      setSubmittingCount(false)
    }
  }

  const handleFinalizeCount = async () => {
    if (!activeSession) return
    if (!confirm('Finalizing this session will post auditable inventory adjustments and update live stock. Continue?')) {
      return
    }

    try {
      setSubmittingCount(true)
      const res = await fetch(`/api/inventory/counts/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          items: activeSession.items.map((i) => ({
            id: i.id,
            countedQuantity: i.countedQuantity,
            notes: i.notes,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to finalize count')
      }

      showToast('Physical count finalized and stock adjustments posted successfully', 'success')
      setActiveSession(null)
      fetchSessions()
      onStockUpdated()
    } catch (err: any) {
      showToast(err.message || 'Error finalizing count', 'error')
    } finally {
      setSubmittingCount(false)
    }
  }

  const filteredItems = (activeSession?.items || []).filter((item) => {
    const matchesSearch =
      item.inventoryItem.name.toLowerCase().includes(sheetSearch.toLowerCase()) ||
      (item.inventoryItem.category && item.inventoryItem.category.toLowerCase().includes(sheetSearch.toLowerCase()))

    if (sheetFilter === 'DISCREPANCY') {
      return matchesSearch && Math.abs(item.variance) > 0.001
    }
    return matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner & Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          borderRadius: 12,
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Physical Stock Count Sessions
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Reconcile physical inventory on hand against POS depletion records. Completing a session posts auditable adjustments.
          </p>
        </div>
        <button
          onClick={handleStartCount}
          disabled={startingCount}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#5b45f5',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          {startingCount ? 'Initiating Count...' : 'Start New Physical Count'}
        </button>
      </div>

      {/* Sessions Table */}
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
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Session #</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Items Counted</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Discrepancies</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Net Variance Value</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Started Date</th>
              <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  Loading stock count sessions...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                  No stock count sessions recorded. Click &quot;Start New Physical Count&quot; to perform an audit.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>{s.sessionNumber}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: s.status === 'COMPLETED' ? '#dcfce7' : s.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                        color: s.status === 'COMPLETED' ? '#16a34a' : s.status === 'CANCELLED' ? '#b91c1c' : '#b45309',
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155' }}>{s.totalItemsCounted} items</td>
                  <td style={{ padding: '14px 18px' }}>
                    {s.discrepancyCount > 0 ? (
                      <span style={{ color: '#ea580c', fontWeight: 700 }}>
                        {s.discrepancyCount} discrepancies
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Zero variance</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: s.totalVarianceValue < 0 ? '#dc2626' : s.totalVarianceValue > 0 ? '#16a34a' : '#475569' }}>
                    {s.totalVarianceValue < 0 ? '-' : s.totalVarianceValue > 0 ? '+' : ''}${Math.abs(s.totalVarianceValue).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>
                    {new Date(s.startedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenSheet(s.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: s.status === 'DRAFT' ? '#eff6ff' : '#ffffff',
                        color: s.status === 'DRAFT' ? '#5b45f5' : '#475569',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {s.status === 'DRAFT' ? 'Open Count Sheet' : 'View Audit Details'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── COUNT SHEET / AUDIT MODAL ── */}
      {activeSession && (
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
              maxWidth: 960,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    Physical Count Sheet — {activeSession.sessionNumber}
                  </h2>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: activeSession.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7',
                      color: activeSession.status === 'COMPLETED' ? '#16a34a' : '#b45309',
                    }}
                  >
                    {activeSession.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Started: {new Date(activeSession.startedAt).toLocaleString()}
                  {activeSession.completedAt && ` • Completed: ${new Date(activeSession.completedAt).toLocaleString()}`}
                </div>
              </div>
              <button
                onClick={() => setActiveSession(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Filter Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: '#ffffff',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setSheetFilter('ALL')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: sheetFilter === 'ALL' ? '#5b45f5' : '#f1f5f9',
                    color: sheetFilter === 'ALL' ? '#ffffff' : '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  All Items ({activeSession.items.length})
                </button>
                <button
                  onClick={() => setSheetFilter('DISCREPANCY')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: sheetFilter === 'DISCREPANCY' ? '#ea580c' : '#f1f5f9',
                    color: sheetFilter === 'DISCREPANCY' ? '#ffffff' : '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Variance Only ({activeSession.items.filter((i) => Math.abs(i.variance) > 0.001).length})
                </button>
              </div>

              <input
                type="text"
                placeholder="Search items by name..."
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                style={{
                  width: 240,
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                }}
              />
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '12px 10px', fontWeight: 700 }}>Ingredient</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Expected (System)</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, width: 140 }}>Physical Count</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Variance Qty</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'right' }}>Variance Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: '#0f172a' }}>
                        {item.inventoryItem.name}
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                          Unit: {item.inventoryItem.unit} • {item.inventoryItem.category || 'General'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                        {item.expectedQuantity} {item.inventoryItem.unit}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        {activeSession.status === 'DRAFT' ? (
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.countedQuantity}
                            onChange={(e) => handleCountChange(item.id, parseFloat(e.target.value) || 0)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          />
                        ) : (
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {item.countedQuantity} {item.inventoryItem.unit}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background:
                              item.variance === 0 ? '#f0fdf4' : item.variance < 0 ? '#fef2f2' : '#fffbeb',
                            color:
                              item.variance === 0 ? '#16a34a' : item.variance < 0 ? '#dc2626' : '#d97706',
                          }}
                        >
                          {item.variance > 0 ? `+${item.variance}` : item.variance} {item.inventoryItem.unit}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '12px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.varianceCost < 0 ? '#dc2626' : item.varianceCost > 0 ? '#16a34a' : '#64748b',
                        }}
                      >
                        {item.varianceCost < 0 ? '-' : item.varianceCost > 0 ? '+' : ''}$
                        {Math.abs(Number(item.varianceCost)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Total Discrepancies:{' '}
                <strong style={{ color: '#0f172a' }}>
                  {activeSession.items.filter((i) => Math.abs(i.variance) > 0.001).length}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveSession(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>

                {activeSession.status === 'DRAFT' && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={submittingCount}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#5b45f5',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalizeCount}
                      disabled={submittingCount}
                      style={{
                        padding: '9px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#16a34a',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(22,163,74,0.3)',
                      }}
                    >
                      {submittingCount ? 'Posting Adjustments...' : 'Finalize & Post Adjustments'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
