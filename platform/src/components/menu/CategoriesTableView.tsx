'use client'

import React, { useState, useEffect } from 'react'

export interface CategoryItem {
  id: string
  name: string
  imageUrl?: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  _count?: { items: number }
  items?: any[]
}

interface CategoriesTableViewProps {
  onRefresh?: () => void
}

export default function CategoriesTableView({ onRefresh }: CategoriesTableViewProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'items'>('newest')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryImage, setCategoryImage] = useState('')
  const [categoryStatus, setCategoryStatus] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/menu/categories?all=true')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleOpenAdd = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop&q=80')
    setCategoryStatus(true)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat)
    setCategoryName(cat.name)
    setCategoryImage(cat.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop&q=80')
    setCategoryStatus(cat.isActive)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) return

    try {
      setSaving(true)
      if (editingCategory) {
        const res = await fetch(`/api/menu/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryName.trim(),
            imageUrl: categoryImage || null,
            isActive: categoryStatus,
          }),
        })
        if (!res.ok) throw new Error('Failed to update category')
      } else {
        const res = await fetch('/api/menu/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryName.trim(),
            imageUrl: categoryImage || null,
            isActive: categoryStatus,
          }),
        })
        if (!res.ok) throw new Error('Failed to create category')
      }
      setIsModalOpen(false)
      fetchCategories()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error(err)
      alert('Error saving category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return

    try {
      const res = await fetch(`/api/menu/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id))
        if (onRefresh) onRefresh()
      } else {
        alert('Failed to delete category')
      }
    } catch (err) {
      console.error(err)
      alert('Error deleting category')
    }
  }

  // Filter & Sort
  const filtered = categories
    .filter((c) => {
      if (statusFilter === 'ACTIVE') return c.isActive
      if (statusFilter === 'EXPIRED') return !c.isActive
      return true
    })
    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'items') return (b.items?.length || 0) - (a.items?.length || 0)
      return 0
    })

  const exportCSV = () => {
    const headers = ['Category', 'No of Items', 'Created On', 'Status']
    const rows = filtered.map((c) => [
      c.name,
      c.items?.length || 0,
      new Date(c.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      c.isActive ? 'Active' : 'Expired',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `categories_${Date.now()}.csv`
    link.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ROW ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Categories</h1>
          <button
            onClick={fetchCategories}
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
              background: '#5b45f5',
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
            {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map((s) => (
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
                  color: statusFilter === s ? '#5b45f5' : '#64748b',
                  boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Expired'}
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
            <option value="name">Sort by : Name A-Z</option>
            <option value="items">Sort by : Most Items</option>
          </select>
        </div>
      </div>

      {/* ── CATEGORIES TABLE ──────────────────────────────────── */}
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
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>Category</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>No of Items</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>Created On</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>Status</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  Loading categories...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  No categories found matching your filter.
                </td>
              </tr>
            ) : (
              filtered.map((cat) => {
                const count = cat.items?.length || 0
                const formattedDate = new Date(cat.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
                return (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s ease' }}>
                    {/* Category with circular dish photo */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <img
                          src={cat.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop&q=80'}
                          alt={cat.name}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{cat.name}</span>
                      </div>
                    </td>

                    {/* No of Items */}
                    <td style={{ padding: '14px 20px', fontSize: 14, color: '#475569', fontWeight: 500 }}>
                      {count}
                    </td>

                    {/* Created On */}
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569' }}>
                      {formattedDate}
                    </td>

                    {/* Status Pill */}
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          background: cat.isActive ? '#dcfce7' : '#fee2e2',
                          color: cat.isActive ? '#16a34a' : '#dc2626',
                          border: cat.isActive ? '1px solid rgba(22, 163, 74, 0.2)' : '1px solid rgba(220, 38, 38, 0.2)',
                        }}
                      >
                        {cat.isActive ? 'Active' : 'Expired'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Category"
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
                          onClick={() => handleDelete(cat.id, cat.name)}
                          title="Delete Category"
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
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── ADD / EDIT CATEGORY MODAL ─────────────────────────── */}
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
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image Preview & URL */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Category Image
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={categoryImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop&q=80'}
                    alt="Category image preview"
                    style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                  />
                  <input
                    type="url"
                    value={categoryImage}
                    onChange={(e) => setCategoryImage(e.target.value)}
                    placeholder="Image URL (Unsplash or hosted image)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Sea Food, Pizza, Salads"
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
                  value={categoryStatus ? 'active' : 'inactive'}
                  onChange={(e) => setCategoryStatus(e.target.value === 'active')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  <option value="active">Active (Available for ordering)</option>
                  <option value="inactive">Expired / Inactive</option>
                </select>
              </div>

              {/* Buttons */}
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
                    background: '#5b45f5',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
