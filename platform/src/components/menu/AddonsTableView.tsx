'use client'

import React, { useState, useEffect } from 'react'

export interface AddonItem {
  id: string
  parentItem: string
  name: string
  price: number
  status: string
  createdAt: string
}

export default function AddonsTableView() {
  const [addons, setAddons] = useState<AddonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'item' | 'addon' | 'price'>('newest')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddon, setEditingAddon] = useState<AddonItem | null>(null)
  const [parentItem, setParentItem] = useState('')
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState<number | string>('')
  const [addonStatus, setAddonStatus] = useState<string>('ACTIVE')
  const [saving, setSaving] = useState(false)

  const fetchAddons = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/menu/addons')
      if (res.ok) {
        const data = await res.json()
        setAddons(data)
      }
    } catch (err) {
      console.error('Failed to load addons:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddons()
  }, [])

  const handleOpenAdd = () => {
    setEditingAddon(null)
    setParentItem('Pizza')
    setAddonName('')
    setAddonPrice('')
    setAddonStatus('ACTIVE')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (addon: AddonItem) => {
    setEditingAddon(addon)
    setParentItem(addon.parentItem)
    setAddonName(addon.name)
    setAddonPrice(Number(addon.price))
    setAddonStatus(addon.status)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentItem.trim() || !addonName.trim() || addonPrice === '') return

    try {
      setSaving(true)
      const payload = {
        parentItem: parentItem.trim(),
        name: addonName.trim(),
        price: Number(addonPrice),
        status: addonStatus,
      }

      if (editingAddon) {
        const res = await fetch(`/api/menu/addons/${editingAddon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update addon')
      } else {
        const res = await fetch('/api/menu/addons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create addon')
      }

      setIsModalOpen(false)
      fetchAddons()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error saving addon')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete addon "${name}"?`)) return

    try {
      const res = await fetch(`/api/menu/addons/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAddons((prev) => prev.filter((a) => a.id !== id))
      } else {
        alert('Failed to delete addon')
      }
    } catch (err) {
      console.error(err)
      alert('Error deleting addon')
    }
  }

  const filtered = addons
    .filter((a) => {
      if (statusFilter === 'ACTIVE') return a.status === 'ACTIVE'
      if (statusFilter === 'INACTIVE') return a.status !== 'ACTIVE'
      return true
    })
    .filter((a) => {
      const q = searchQuery.toLowerCase()
      return a.parentItem.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'item') return a.parentItem.localeCompare(b.parentItem)
      if (sortBy === 'addon') return a.name.localeCompare(b.name)
      if (sortBy === 'price') return Number(b.price) - Number(a.price)
      return 0
    })

  const exportCSV = () => {
    const headers = ['Item', 'Addon', 'Price', 'Status']
    const rows = filtered.map((a) => [a.parentItem, a.name, `$${Number(a.price).toFixed(2)}`, a.status])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `addons_${Date.now()}.csv`
    link.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ROW ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Addons</h1>
          <button
            onClick={fetchAddons}
            title="Refresh"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Export Button */}
          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export ▾
          </button>

          {/* Add New Button */}
          <button
            onClick={handleOpenAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Add New
          </button>
        </div>
      </div>

      {/* ── TOOLBAR / SEARCH / FILTERS ────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', width: 280 }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none',
              color: '#0f172a',
            }}
          />
        </div>

        {/* Filter Pills & Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status Filter Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: statusFilter === s ? '#ffffff' : 'transparent',
                  color: statusFilter === s ? '#2563eb' : '#64748b',
                  boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Sort by : Newest</option>
            <option value="oldest">Sort by : Oldest</option>
            <option value="item">Sort by : Item</option>
            <option value="addon">Sort by : Addon Name</option>
            <option value="price">Sort by : Price</option>
          </select>
        </div>
      </div>

      {/* ── ADDONS TABLE ──────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>Item</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>Addon</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>Price</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>Status</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  Loading addons...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  No addons found.
                </td>
              </tr>
            ) : (
              filtered.map((addon) => (
                <tr key={addon.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Parent Item */}
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
                    {addon.parentItem}
                  </td>

                  {/* Addon Name */}
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                    {addon.name}
                  </td>

                  {/* Price */}
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#334155' }}>
                    ${Number(addon.price).toFixed(0)}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: addon.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: addon.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                        border: addon.status === 'ACTIVE' ? '1px solid rgba(22, 163, 74, 0.2)' : '1px solid rgba(220, 38, 38, 0.2)',
                      }}
                    >
                      {addon.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(addon)}
                        title="Edit Addon"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(addon.id, addon.name)}
                        title="Delete Addon"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── ADD / EDIT ADDON MODAL ────────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 460,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {editingAddon ? 'Edit Addon' : 'Add New Addon'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Parent Item / Category */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Item / Category *
                </label>
                <input
                  type="text"
                  required
                  value={parentItem}
                  onChange={(e) => setParentItem(e.target.value)}
                  placeholder="e.g. Pizza, Sauce, Salad, Topping"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Addon Name */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Addon Name *
                </label>
                <input
                  type="text"
                  required
                  value={addonName}
                  onChange={(e) => setAddonName(e.target.value)}
                  placeholder="e.g. Extra Cheese, Garlic Butter Sauce"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Price */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Status
                </label>
                <select
                  value={addonStatus}
                  onChange={(e) => setAddonStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Addon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
