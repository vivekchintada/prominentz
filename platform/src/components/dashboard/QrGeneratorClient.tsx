'use client'

import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface TableItem {
  id: string
  name: string
  capacity: number
  status: string
  locationId: string
}

interface MenuCategoryItem {
  id: string
  name: string
  items: Array<{ id: string; name: string; price: number }>
}

function MasterMenuQrCard({
  locationId,
  onSelectPreview,
  isSelected,
  totalDishes,
}: {
  locationId: string
  onSelectPreview: (url: string, name: string) => void
  isSelected: boolean
  totalDishes: number
}) {
  const [dataUrl, setDataUrl] = useState<string>('')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const qrUrl = `${origin}/menu/${locationId}`

  useEffect(() => {
    QRCode.toDataURL(qrUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('Error generating master QR', err))
  }, [qrUrl])

  return (
    <div
      className="card card--elevated animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(139,92,246,0.12) 100%)',
        padding: '24px',
        borderRadius: '20px',
        border: isSelected ? '2px solid var(--brand)' : '1px solid rgba(37,99,235,0.35)',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
      }}
    >
      <div style={{ flex: '1 1 320px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--brand)', color: '#ffffff', letterSpacing: '0.04em' }}>
            🌟 MASTER DINE-IN &amp; TAKEOUT QR
          </span>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
            ● Universal Single Scan
          </span>
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
          Universal Restaurant Food Menu QR
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Print this master QR code on <strong>entrance stands, bar counters, or takeout flyers</strong>. Any guest can scan this single QR, choose their table, and fire orders directly to the kitchen KDS!
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onSelectPreview(qrUrl, 'Master Menu (Universal)')}
            className="btn btn--primary"
            style={{ fontSize: '12px', fontWeight: 800, padding: '8px 16px' }}
          >
            📱 Test Simulator
          </button>
          <button
            onClick={() => window.open(qrUrl, '_blank')}
            className="btn btn--secondary"
            style={{ fontSize: '12px', padding: '8px 14px' }}
          >
            Open in New Tab ↗
          </button>
          {dataUrl && (
            <a
              href={dataUrl}
              download="Master_Restaurant_Menu_QR.png"
              className="btn btn--secondary"
              style={{ fontSize: '12px', padding: '8px 14px' }}
              title="Download Master PNG"
            >
              💾 Download PNG
            </a>
          )}
        </div>
      </div>

      {/* Styled QR Image */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Master Restaurant Menu QR"
            style={{ width: '160px', height: '160px', display: 'block', borderRadius: '8px' }}
          />
        ) : (
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '64px' }} />
        )}
        <div style={{ fontSize: '10px', color: '#111827', fontWeight: 800, marginTop: '6px' }}>
          SCAN FOR FULL MENU
        </div>
      </div>
    </div>
  )
}

function TableQrCard({
  table,
  onSelectPreview,
  isSelected,
}: {
  table: TableItem
  onSelectPreview: (url: string, name: string) => void
  isSelected: boolean
}) {
  const [dataUrl, setDataUrl] = useState<string>('')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const qrUrl = `${origin}/table/${table.locationId}/${table.id}`

  useEffect(() => {
    QRCode.toDataURL(qrUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('Error generating local QR', err))
  }, [qrUrl])

  return (
    <div
      className="card card--elevated animate-fade-in"
      style={{
        backgroundColor: isSelected ? 'var(--brand-tint)' : 'var(--color-bg-card)',
        padding: '20px',
        borderRadius: '16px',
        border: isSelected ? '2px solid var(--brand)' : '1px solid var(--color-border)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{table.name}</div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: table.status === 'ACTIVE' ? 'rgba(37,99,235,0.15)' : 'rgba(16,185,129,0.2)',
            color: table.status === 'ACTIVE' ? '#2563eb' : '#10b981',
          }}
        >
          {table.status}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
        Capacity: {table.capacity} Guests • All Categories Included
      </div>

      {/* Styled QR Frame */}
      <div
        style={{
          padding: '10px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          marginBottom: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          minWidth: '160px',
          minHeight: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code for ${table.name}`}
            style={{ width: '160px', height: '160px', display: 'block', borderRadius: '4px' }}
          />
        ) : (
          <div className="spinner" style={{ width: '28px', height: '28px' }} />
        )}
      </div>

      <div
        style={{
          fontSize: '10px',
          color: 'var(--color-text-tertiary)',
          wordBreak: 'break-all',
          marginBottom: '12px',
          fontFamily: 'monospace',
          padding: '4px 6px',
          borderRadius: '6px',
          backgroundColor: 'var(--color-bg-card-hover)',
          width: '100%',
        }}
      >
        {qrUrl}
      </div>

      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button
          onClick={() => onSelectPreview(qrUrl, table.name)}
          className="btn btn--primary"
          style={{
            flex: 1,
            fontSize: '11px',
            fontWeight: 700,
            padding: '6px 10px',
          }}
        >
          📱 Test Simulator
        </button>
        <button
          onClick={() => window.open(qrUrl, '_blank')}
          className="btn btn--secondary"
          style={{ fontSize: '11px', padding: '6px 10px' }}
          title="Open in new window"
        >
          ↗
        </button>
        {dataUrl && (
          <a
            href={dataUrl}
            download={`${table.name.replace(/\s+/g, '_')}_QR.png`}
            className="btn btn--secondary"
            style={{ fontSize: '11px', padding: '6px 10px' }}
            title="Download PNG"
          >
            💾
          </a>
        )}
      </div>
    </div>
  )
}

export function QrGeneratorClient() {
  const [tables, setTables] = useState<TableItem[]>([])
  const [categories, setCategories] = useState<MenuCategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const [submitting, setSubmitting] = useState(false)
  const [activeLocationId, setActiveLocationId] = useState<string>('')

  // Live Simulator Frame
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [previewTitle, setPreviewTitle] = useState<string>('')

  const loadData = async () => {
    setLoading(true)
    try {
      const savedLoc = localStorage.getItem('resto_active_location_id')
      const tableUrl = savedLoc ? `/api/tables?locationId=${savedLoc}` : '/api/tables'
      const menuUrl = savedLoc ? `/api/menu/categories?locationId=${savedLoc}` : '/api/menu/categories'

      const [tableRes, menuRes] = await Promise.all([fetch(tableUrl), fetch(menuUrl)])

      const tableData = await tableRes.json()
      const menuData = await menuRes.json()

      if (Array.isArray(tableData)) {
        setTables(tableData)
        if (tableData.length > 0 && tableData[0].locationId) {
          const locId = tableData[0].locationId
          setActiveLocationId(locId)
          localStorage.setItem('resto_active_location_id', locId)
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
          const initialUrl = `${origin}/table/${locId}/${tableData[0].id}`
          setPreviewUrl(initialUrl)
          setPreviewTitle(tableData[0].name)
        }
      }

      if (Array.isArray(menuData)) {
        setCategories(menuData)
      }
    } catch (err) {
      console.error('Failed to load tables and menu for QR studio', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const handleLocationChange = () => {
      loadData()
    }

    window.addEventListener('resto_location_changed', handleLocationChange)
    return () => {
      window.removeEventListener('resto_location_changed', handleLocationChange)
    }
  }, [])

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableName.trim()) return
    setSubmitting(true)
    try {
      const activeLoc = (tables.length > 0 ? tables[0].locationId : null) || localStorage.getItem('resto_active_location_id')
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTableName,
          capacity: Number(newTableCapacity),
          locationId: activeLoc || undefined,
        }),
      })

      if (res.ok) {
        setShowAddModal(false)
        setNewTableName('')
        setNewTableCapacity('4')
        loadData()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to create table')
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating table')
    } finally {
      setSubmitting(false)
    }
  }

  const totalDishes = categories.reduce((sum, c) => sum + (c.items ? c.items.length : 0), 0)

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Top Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Each QR code bundles <strong>all food &amp; beverage categories ({totalDishes} dishes)</strong> and fires directly to Kitchen KDS.
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => window.print()}
            className="btn btn--secondary btn--sm"
            disabled={tables.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🖨️</span> Print Table Stands
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn--primary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>➕</span> Add Dining Table
          </button>
        </div>
      </div>

      {/* Categories Bundled Banner */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✅</span> All Active Menu Categories Included in Every QR Code:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {categories.map((c) => (
              <span
                key={c.id}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(37,99,235,0.12)',
                  color: '#2563eb',
                  border: '1px solid rgba(37,99,235,0.25)',
                }}
              >
                {c.name} ({c.items?.length || 0} dishes)
              </span>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Live Menu Total:</span>{' '}
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
            {totalDishes} Dishes Ready
          </span>
        </div>
      </div>

      {/* Flagship Master Menu QR Code */}
      {activeLocationId && (
        <MasterMenuQrCard
          locationId={activeLocationId}
          onSelectPreview={(url, name) => {
            setPreviewUrl(url)
            setPreviewTitle(name)
          }}
          isSelected={previewUrl.includes('/menu/')}
          totalDishes={totalDishes}
        />
      )}

      {/* Main Studio: Tables Grid on Left + Live Smartphone Simulator on Right */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left: Table QR Cards */}
        <div style={{ flex: '1 1 580px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🪑</span> Table-Specific QR Codes ({tables.length} Tables)
          </div>

          {loading ? (
            <div style={{ padding: '48px', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Generating table QR codes...
            </div>
          ) : tables.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '48px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: '16px',
                border: '1px dashed var(--color-border)',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🪑</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--color-text-primary)', fontWeight: 700 }}>No Dining Tables Added</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                Create dining tables to generate unique QR codes for your dining room.
              </p>
              <button onClick={() => setShowAddModal(true)} className="btn btn--primary">
                ➕ Add First Dining Table
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {tables.map((t) => {
                const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
                const tUrl = `${origin}/table/${t.locationId}/${t.id}`
                const isSelected = previewUrl === tUrl

                return (
                  <TableQrCard
                    key={t.id}
                    table={t}
                    isSelected={isSelected}
                    onSelectPreview={(url, name) => {
                      setPreviewUrl(url)
                      setPreviewTitle(name)
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Realistic Mobile Smartphone Simulator Frame (Sticky on Scroll) */}
        <div style={{ width: '380px', flexShrink: 0, position: 'sticky', top: '24px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '24px',
              padding: '16px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📱</span> Live Diner View ({previewTitle || 'Select a Table'})
              </div>
              {previewUrl && (
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Full Tab ↗
                </button>
              )}
            </div>

            {/* Smartphone Bezel */}
            <div
              style={{
                width: '100%',
                height: '580px',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '3px solid var(--color-border-strong)',
                backgroundColor: '#000000',
                position: 'relative',
              }}
            >
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Guest Mobile Diner Simulator"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Select any table on the left to preview its live mobile menu.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="card card--elevated animate-fade-in"
            style={{
              backgroundColor: '#18181d',
              borderRadius: '16px',
              padding: '24px',
              width: '400px',
              maxWidth: '90vw',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>➕ Add New Dining Table</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>

            <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Table Name / Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 1, Booth 4, Patio Bar"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="input"
                  style={{ width: '100%', marginTop: '6px', backgroundColor: '#101014' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Seating Capacity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="4"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  className="input"
                  style={{ width: '100%', marginTop: '6px', backgroundColor: '#101014' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn--primary"
                >
                  {submitting ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
