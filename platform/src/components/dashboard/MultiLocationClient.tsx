'use client'

import React, { useState, useEffect } from 'react'

interface StoreBenchmark {
  locationId: string
  locationName: string
  region: string
  isHeadquarters: boolean
  totalRevenue: number
  orderCount: number
  averageCheck: number
  totalLaborCost: number
  laborPercentage: number
  activeStaffCount: number
  lowStockCount: number
}

interface MultiLocationData {
  summary: {
    totalLocations: number
    grandTotalRevenue: number
    grandTotalOrders: number
    grandTotalLaborCost: number
    overallLaborPct: number
  }
  benchmarks: StoreBenchmark[]
}

export function MultiLocationClient() {
  const [data, setData] = useState<MultiLocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // New location form modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLocName, setNewLocName] = useState('')
  const [newLocRegion, setNewLocRegion] = useState('')
  const [newLocAddress, setNewLocAddress] = useState('')
  const [newLocPhone, setNewLocPhone] = useState('')
  const [isHq, setIsHq] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Master menu push modal state
  const [showPushModal, setShowPushModal] = useState(false)
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [pushingMenu, setPushingMenu] = useState(false)
  const [pushResult, setPushResult] = useState('')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports/multi-location')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to load multi-location benchmarking')
      } else {
        setData(json)
      }
    } catch (err: unknown) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLocName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocName,
          region: newLocRegion,
          address: newLocAddress,
          phone: newLocPhone,
          isHeadquarters: isHq,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'Failed to create location')
      } else {
        setShowAddModal(false)
        setNewLocName('')
        setNewLocRegion('')
        setNewLocAddress('')
        setNewLocPhone('')
        setIsHq(false)
        fetchAnalytics()
      }
    } catch (err: unknown) {
      alert(err?.message || 'Failed to create location')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMasterMenuPush = async () => {
    if (selectedLocationIds.length === 0) {
      alert('Please select at least one store location to receive the master menu update.')
      return
    }
    setPushingMenu(true)
    setPushResult('')
    try {
      const res = await fetch('/api/menu/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLocationIds: selectedLocationIds }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPushResult(`Error: ${json.error}`)
      } else {
        setPushResult(json.message)
      }
    } catch (err: unknown) {
      setPushResult(`Error: ${err?.message || 'Failed to push menu'}`)
    } finally {
      setPushingMenu(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#6b7280', fontSize: '14px' }}>
        Loading enterprise multi-location analytics...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            🏢 Enterprise Multi-Location Command Center
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Franchise benchmarking, store performance, and central HQ master menu push engine
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setSelectedLocationIds(data?.benchmarks.map((b) => b.locationId) || [])
              setShowPushModal(true)
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            🚀 Push Master Menu
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ➕ Add Store Location
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {data?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Active Store Outlets</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>{data.summary.totalLocations} Outlets</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Grand Total Revenue</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#4f46e5', marginTop: '4px' }}>
              ${data.summary.grandTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Enterprise Orders</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>{data.summary.grandTotalOrders} Orders</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Overall Labor Cost %</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: data.summary.overallLaborPct > 30 ? '#dc2626' : '#059669', marginTop: '4px' }}>
              {data.summary.overallLaborPct}%
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Store Benchmarking Leaderboard Table */}
      <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card-hover)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>🏆 Store-by-Store Performance Leaderboard</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-card-hover)', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Store Name & Region</th>
                <th style={{ padding: '12px 16px' }}>HQ Tag</th>
                <th style={{ padding: '12px 16px' }}>Total Revenue</th>
                <th style={{ padding: '12px 16px' }}>Orders</th>
                <th style={{ padding: '12px 16px' }}>Avg Check</th>
                <th style={{ padding: '12px 16px' }}>Labor %</th>
                <th style={{ padding: '12px 16px' }}>Active Staff</th>
                <th style={{ padding: '12px 16px' }}>Low Stock</th>
              </tr>
            </thead>
            <tbody>
              {data?.benchmarks.map((store, idx) => (
                <tr key={store.locationId} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-card-hover)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {store.locationName}
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>Region: {store.region}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {store.isHeadquarters ? (
                      <span style={{ padding: '2px 8px', backgroundColor: 'var(--brand-tint)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        🏢 HQ Master
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}>Branch</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    ${store.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{store.orderCount}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>${store.averageCheck.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: store.laborPercentage > 30 ? '#dc2626' : '#059669' }}>
                    {store.laborPercentage}%
                  </td>
                  <td style={{ padding: '12px 16px' }}>{store.activeStaffCount} staff</td>
                  <td style={{ padding: '12px 16px' }}>
                    {store.lowStockCount > 0 ? (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ {store.lowStockCount} items</span>
                    ) : (
                      <span style={{ color: '#059669' }}>OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Store Location Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>➕ Add New Franchise Store Location</h3>
            <form onSubmit={handleCreateLocation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Downtown Outlet"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Region / Tag</label>
                <input
                  type="text"
                  placeholder="e.g. West Coast, Airport Terminal"
                  value={newLocRegion}
                  onChange={(e) => setNewLocRegion(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Address</label>
                <input
                  type="text"
                  placeholder="123 Main St, Suite 4"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2831"
                  value={newLocPhone}
                  onChange={(e) => setNewLocPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isHqCheck"
                  checked={isHq}
                  onChange={(e) => setIsHq(e.target.checked)}
                />
                <label htmlFor="isHqCheck" style={{ fontSize: '13px', color: '#374151' }}>Set as Enterprise Headquarters (HQ Master)</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--color-bg-card-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {submitting ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Menu Push Engine Modal */}
      {showPushModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>🚀 Global Master Menu Synchronization</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Push HQ master menu categories, prices, and items to selected store locations in one click.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '8px' }}>Select Target Outlets:</label>
              {data?.benchmarks.map((store) => (
                <label key={store.locationId} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={selectedLocationIds.includes(store.locationId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLocationIds([...selectedLocationIds, store.locationId])
                      } else {
                        setSelectedLocationIds(selectedLocationIds.filter((id) => id !== store.locationId))
                      }
                    }}
                  />
                  <span>{store.locationName} {store.isHeadquarters ? '(HQ)' : ''}</span>
                </label>
              ))}
            </div>

            {pushResult && (
              <div style={{ padding: '10px', backgroundColor: pushResult.startsWith('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)', color: pushResult.startsWith('Error') ? '#ef4444' : '#22c55e', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
                {pushResult}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPushModal(false)}
                style={{ padding: '8px 16px', backgroundColor: 'var(--color-bg-card-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleMasterMenuPush}
                disabled={pushingMenu}
                style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                {pushingMenu ? 'Synchronizing...' : 'Push Menu Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
