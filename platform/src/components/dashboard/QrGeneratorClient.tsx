'use client'

import React, { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'

// ── Types ────────────────────────────────────────────────────────────────────

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

interface QrMenuConfig {
  welcomeMessage?: string
  promoText?: string
  accentColor?: string
  mode?: 'dine-in' | 'takeout' | 'both'
  hiddenCategoryIds?: string[]
  updatedAt?: string
}

// ── Accent color presets ─────────────────────────────────────────────────────

const ACCENT_COLORS = [
  { label: 'Electric Blue', value: '#5b45f5' },
  { label: 'Royal Purple', value: '#7c3aed' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Crimson', value: '#dc2626' },
  { label: 'Amber', value: '#d97706' },
]

// ── MasterMenuQrCard ─────────────────────────────────────────────────────────

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
    QRCode.toDataURL(qrUrl, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(setDataUrl)
      .catch((err) => console.error('Error generating master QR', err))
  }, [qrUrl])

  return (
    <div
      className="card card--elevated animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(91,69,245,0.12) 0%, rgba(139,92,246,0.12) 100%)',
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
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>● Universal Single Scan</span>
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
          Universal Restaurant Food Menu QR
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Print this master QR on <strong>entrance stands, bar counters, or takeout flyers</strong>. Any guest can scan, choose their table, and fire orders directly to the kitchen KDS!
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => onSelectPreview(qrUrl, 'Master Menu (Universal)')} className="btn btn--primary" style={{ fontSize: '12px', fontWeight: 800, padding: '8px 16px' }}>
            📱 Preview on Phone
          </button>
          <button onClick={() => window.open(qrUrl, '_blank')} className="btn btn--secondary" style={{ fontSize: '12px', padding: '8px 14px' }}>
            Open in New Tab ↗
          </button>
          {dataUrl && (
            <a href={dataUrl} download="Master_Restaurant_Menu_QR.png" className="btn btn--secondary" style={{ fontSize: '12px', padding: '8px 14px' }}>
              💾 Download PNG
            </a>
          )}
        </div>
      </div>

      <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
        {dataUrl ? (
          <img src={dataUrl} alt="Master QR" style={{ width: '160px', height: '160px', display: 'block', borderRadius: '8px' }} />
        ) : (
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '64px' }} />
        )}
        <div style={{ fontSize: '10px', color: '#111827', fontWeight: 800, marginTop: '6px' }}>SCAN FOR FULL MENU</div>
      </div>
    </div>
  )
}

// ── TableQrCard ──────────────────────────────────────────────────────────────

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
    QRCode.toDataURL(qrUrl, { width: 260, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(setDataUrl)
      .catch((err) => console.error('Error generating table QR', err))
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
        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: table.status === 'ACTIVE' ? 'rgba(91,69,245,0.15)' : 'rgba(16,185,129,0.2)', color: table.status === 'ACTIVE' ? '#5b45f5' : '#10b981' }}>
          {table.status}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
        Capacity: {table.capacity} Guests • All Active Categories
      </div>

      <div style={{ padding: '10px', backgroundColor: '#ffffff', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', minWidth: '160px', minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {dataUrl ? (
          <img src={dataUrl} alt={`QR for ${table.name}`} style={{ width: '160px', height: '160px', display: 'block', borderRadius: '4px' }} />
        ) : (
          <div className="spinner" style={{ width: '28px', height: '28px' }} />
        )}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', wordBreak: 'break-all', marginBottom: '12px', fontFamily: 'monospace', padding: '4px 6px', borderRadius: '6px', backgroundColor: 'var(--color-bg-card-hover)', width: '100%' }}>
        {qrUrl}
      </div>

      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button onClick={() => onSelectPreview(qrUrl, table.name)} className="btn btn--primary" style={{ flex: 1, fontSize: '11px', fontWeight: 700, padding: '6px 10px' }}>
          📱 Preview
        </button>
        <button onClick={() => window.open(qrUrl, '_blank')} className="btn btn--secondary" style={{ fontSize: '11px', padding: '6px 10px' }} title="Open in new window">
          ↗
        </button>
        {dataUrl && (
          <a href={dataUrl} download={`${table.name.replace(/\s+/g, '_')}_QR.png`} className="btn btn--secondary" style={{ fontSize: '11px', padding: '6px 10px' }} title="Download PNG">
            💾
          </a>
        )}
      </div>
    </div>
  )
}

// ── Master QR Menu Changer Panel ─────────────────────────────────────────────

function MasterQrMenuChanger({
  locationId,
  categories,
  onSaved,
}: {
  locationId: string
  categories: MenuCategoryItem[]
  onSaved: () => void
}) {
  const [config, setConfig] = useState<QrMenuConfig>({
    welcomeMessage: '',
    promoText: '',
    accentColor: '#5b45f5',
    mode: 'both',
    hiddenCategoryIds: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // Load existing config
  useEffect(() => {
    if (!locationId) return
    fetch(`/api/qr-config?locationId=${locationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setConfig({
            welcomeMessage: data.welcomeMessage || '',
            promoText: data.promoText || '',
            accentColor: data.accentColor || '#5b45f5',
            mode: data.mode || 'both',
            hiddenCategoryIds: data.hiddenCategoryIds || [],
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [locationId])

  const toggleCategory = (categoryId: string) => {
    setConfig((prev) => {
      const hidden = prev.hiddenCategoryIds || []
      return {
        ...prev,
        hiddenCategoryIds: hidden.includes(categoryId)
          ? hidden.filter((id) => id !== categoryId)
          : [...hidden, categoryId],
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/qr-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, config }),
      })
      if (res.ok) {
        setSaved(true)
        onSaved()
        setTimeout(() => setSaved(false), 3000)
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to save')
      }
    } catch (err: any) {
      alert(err.message || 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  const hiddenCount = (config.hiddenCategoryIds || []).length
  const visibleCount = categories.length - hiddenCount

  return (
    <div
      className="card"
      style={{
        borderRadius: '20px',
        border: '1px solid rgba(139,92,246,0.35)',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(37,99,235,0.08) 100%)',
        marginBottom: '24px',
        overflow: 'hidden',
      }}
    >
      {/* Header — clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🎨</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Master QR Menu Changer
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Customize what customers see when they scan your QR code
              {!isExpanded && (
                <span style={{ marginLeft: '8px', color: '#7c3aed', fontWeight: 700 }}>
                  • {visibleCount}/{categories.length} categories visible
                  {config.promoText ? ' • Promo active' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '18px', color: 'var(--color-text-tertiary)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-tertiary)' }}>
              <div className="spinner" style={{ margin: '0 auto 8px' }} />
              Loading config...
            </div>
          ) : (
            <>
              {/* ── Promo Banner ──────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    🎉 Promo / Announcement Banner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Happy Hour — 25% off cocktails till 7PM!"
                    value={config.promoText || ''}
                    onChange={(e) => setConfig((p) => ({ ...p, promoText: e.target.value }))}
                    className="input"
                    style={{ width: '100%', fontSize: '13px' }}
                    maxLength={120}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Shown as a dismissible top banner on the phone menu. Leave empty to hide.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    👋 Welcome Message
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Welcome to Bella Cucina! Enjoy your meal."
                    value={config.welcomeMessage || ''}
                    onChange={(e) => setConfig((p) => ({ ...p, welcomeMessage: e.target.value }))}
                    className="input"
                    style={{ width: '100%', fontSize: '13px' }}
                    maxLength={100}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Shown at the top of the menu when the guest first opens it.
                  </div>
                </div>
              </div>

              {/* ── Mode + Color ──────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                    🍽️ Order Mode
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['dine-in', 'takeout', 'both'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setConfig((p) => ({ ...p, mode: m }))}
                        style={{
                          flex: 1,
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: config.mode === m ? '2px solid var(--brand)' : '1px solid var(--color-border)',
                          backgroundColor: config.mode === m ? 'rgba(91,69,245,0.15)' : 'var(--color-bg-card)',
                          color: config.mode === m ? '#5b45f5' : 'var(--color-text-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m === 'dine-in' ? '🍽️' : m === 'takeout' ? '🥡' : '🔀'} {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                    🎨 Accent Color (Customer Menu Theme)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setConfig((p) => ({ ...p, accentColor: c.value }))}
                        title={c.label}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: c.value,
                          border: config.accentColor === c.value ? '3px solid var(--color-text-primary)' : '3px solid transparent',
                          cursor: 'pointer',
                          boxShadow: config.accentColor === c.value ? `0 0 0 2px ${c.value}40` : 'none',
                          transition: 'all 0.15s',
                        }}
                      />
                    ))}
                    {/* Custom hex input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={config.accentColor || '#5b45f5'}
                        onChange={(e) => setConfig((p) => ({ ...p, accentColor: e.target.value }))}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
                        title="Custom color"
                      />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                        {config.accentColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Category Visibility Toggles ───────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    📋 Menu Categories — QR Visibility
                  </label>
                  <span style={{ fontSize: '11px', color: visibleCount === categories.length ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {visibleCount}/{categories.length} visible on QR menu
                  </span>
                </div>

                {categories.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', padding: '12px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '10px' }}>
                    No menu categories found. Add categories first.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                    {categories.map((cat) => {
                      const isHidden = (config.hiddenCategoryIds || []).includes(cat.id)
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isHidden
                              ? '1px solid rgba(239,68,68,0.4)'
                              : '1px solid rgba(16,185,129,0.4)',
                            backgroundColor: isHidden
                              ? 'rgba(239,68,68,0.08)'
                              : 'rgba(16,185,129,0.08)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {cat.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                              {cat.items?.length || 0} items
                            </div>
                          </div>
                          {/* Toggle pill */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: isHidden ? '#ef4444' : '#10b981',
                          }}>
                            <span style={{
                              width: '32px',
                              height: '18px',
                              borderRadius: '9px',
                              backgroundColor: isHidden ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
                              position: 'relative',
                              display: 'inline-block',
                              transition: 'all 0.2s',
                            }}>
                              <span style={{
                                position: 'absolute',
                                top: '2px',
                                left: isHidden ? '2px' : '16px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: isHidden ? '#ef4444' : '#10b981',
                                transition: 'left 0.2s',
                              }} />
                            </span>
                            {isHidden ? 'Hidden' : 'Shown'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Live Preview Note ─────────────────────────────────── */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(37,99,235,0.08)',
                border: '1px solid rgba(37,99,235,0.2)',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <div>
                  After saving, click <strong>📱 Preview on Phone</strong> to see exactly what your customers will see. Changes apply <strong>instantly</strong> when guests scan — no reprint needed.
                </div>
              </div>

              {/* ── Save Button ───────────────────────────────────────── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                {saved && (
                  <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✅ Saved! Customers see changes instantly.
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn--primary"
                  style={{ fontWeight: 800, padding: '10px 24px', fontSize: '13px', minWidth: '140px' }}
                >
                  {saving ? '⏳ Saving...' : '💾 Save QR Menu Config'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main QrGeneratorClient ────────────────────────────────────────────────────

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
  const [previewKey, setPreviewKey] = useState(0) // bump to force iframe reload after save

  const loadData = useCallback(async () => {
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
          if (!previewUrl) {
            setPreviewUrl(`${origin}/table/${locId}/${tableData[0].id}`)
            setPreviewTitle(tableData[0].name)
          }
        }
      }

      if (Array.isArray(menuData)) setCategories(menuData)
    } catch (err) {
      console.error('Failed to load tables and menu for QR studio', err)
    } finally {
      setLoading(false)
    }
  }, [previewUrl])

  useEffect(() => {
    loadData()
    const handleLocationChange = () => loadData()
    window.addEventListener('resto_location_changed', handleLocationChange)
    return () => window.removeEventListener('resto_location_changed', handleLocationChange)
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
        body: JSON.stringify({ name: newTableName, capacity: Number(newTableCapacity), locationId: activeLoc || undefined }),
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

  const handleConfigSaved = () => {
    // Bump iframe key so it reloads and reflects the new config
    setPreviewKey((k) => k + 1)
  }

  const totalDishes = categories.reduce((sum, c) => sum + (c.items ? c.items.length : 0), 0)

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Top Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Each QR code bundles <strong>all visible food &amp; beverage categories ({totalDishes} dishes)</strong> and fires directly to Kitchen KDS.
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.print()} className="btn btn--secondary btn--sm" disabled={tables.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🖨️</span> Print Table Stands
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn--primary btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>➕</span> Add Dining Table
          </button>
        </div>
      </div>

      {/* Categories Bundled Banner */}
      <div className="card" style={{ padding: '14px 18px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✅</span> Active Menu Categories Included in Every QR Code:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {categories.map((c) => (
              <span key={c.id} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(91,69,245,0.12)', color: '#5b45f5', border: '1px solid rgba(37,99,235,0.25)' }}>
                {c.name} ({c.items?.length || 0} dishes)
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Live Menu Total: </span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>{totalDishes} Dishes Ready</span>
        </div>
      </div>

      {/* ── Master QR Card ─────────────────────────────────────────────────── */}
      {activeLocationId && (
        <MasterMenuQrCard
          locationId={activeLocationId}
          onSelectPreview={(url, name) => { setPreviewUrl(url); setPreviewTitle(name) }}
          isSelected={previewUrl.includes('/menu/')}
          totalDishes={totalDishes}
        />
      )}

      {/* ── 🎨 Master QR Menu Changer ─────────────────────────────────────── */}
      {activeLocationId && (
        <MasterQrMenuChanger
          locationId={activeLocationId}
          categories={categories}
          onSaved={handleConfigSaved}
        />
      )}

      {/* ── Main Studio: Tables Grid + Live Phone Simulator ───────────────── */}
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
            <div className="card" style={{ padding: '48px', backgroundColor: 'var(--color-bg-card)', borderRadius: '16px', border: '1px dashed var(--color-border)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
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
                    onSelectPreview={(url, name) => { setPreviewUrl(url); setPreviewTitle(name) }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Smartphone Simulator (sticky) */}
        <div style={{ width: '360px', flexShrink: 0, position: 'sticky', top: '24px' }}>
          <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: '24px', padding: '16px', boxShadow: 'var(--shadow-lg)', backgroundColor: 'var(--color-bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📱</span> Live Customer View
                <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
                  ({previewTitle || 'Select a Table'})
                </span>
              </div>
              {previewUrl && (
                <button onClick={() => window.open(previewUrl, '_blank')} style={{ fontSize: '11px', color: '#5b45f5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  Full Tab ↗
                </button>
              )}
            </div>

            {/* Phone Notch */}
            <div style={{ backgroundColor: '#0a0a0c', borderRadius: '28px', padding: '12px 8px 8px', border: '3px solid #2a2a2e', boxShadow: '0 24px 48px rgba(0,0,0,0.6)', position: 'relative' }}>
              {/* Notch */}
              <div style={{ width: '80px', height: '20px', backgroundColor: '#0a0a0c', borderRadius: '0 0 12px 12px', margin: '0 auto 8px', border: '1px solid #2a2a2e', borderTop: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1a1a1e' }} />
                <div style={{ width: '40px', height: '5px', borderRadius: '3px', backgroundColor: '#1a1a1e' }} />
              </div>

              {/* Screen */}
              <div style={{ width: '100%', height: '580px', borderRadius: '18px', overflow: 'hidden', backgroundColor: '#000' }}>
                {previewUrl ? (
                  <iframe
                    key={`${previewUrl}-${previewKey}`}
                    src={previewUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Guest Mobile Diner Simulator"
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', padding: '20px', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '36px' }}>📱</span>
                    Select any table on the left to preview its live mobile menu.
                  </div>
                )}
              </div>

              {/* Home bar */}
              <div style={{ width: '40px', height: '4px', backgroundColor: '#2a2a2e', borderRadius: '2px', margin: '8px auto 4px' }} />
            </div>

            {/* Quick info below phone */}
            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span>
              <span>After saving the QR config, the simulator auto-reloads to show your changes.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Table Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card card--elevated animate-fade-in" style={{ backgroundColor: '#18181d', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>➕ Add New Dining Table</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>

            <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Table Name / Number *</label>
                <input type="text" required placeholder="e.g. Table 1, Booth 4, Patio Bar" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} className="input" style={{ width: '100%', marginTop: '6px', backgroundColor: '#101014' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Seating Capacity *</label>
                <input type="number" required min="1" placeholder="4" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} className="input" style={{ width: '100%', marginTop: '6px', backgroundColor: '#101014' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn--secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn--primary">
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
