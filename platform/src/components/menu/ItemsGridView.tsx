'use client'

import React, { useState, useEffect } from 'react'
import ItemFormModal, { MenuItemData } from './ItemFormModal'

interface ItemsGridViewProps {
  categories: { id: string; name: string }[]
  onRefreshCategories?: () => void
}

export default function ItemsGridView({ categories, onRefreshCategories }: ItemsGridViewProps) {
  const [items, setItems] = useState<MenuItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null)

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/menu/items?includeUnavailable=true')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (err) {
      console.error('Failed to load items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleOpenAdd = () => {
    setSelectedItem(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: MenuItemData) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const res = await fetch(`/api/menu/items/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id))
        if (onRefreshCategories) onRefreshCategories()
      } else {
        alert('Failed to delete item')
      }
    } catch (err) {
      console.error(err)
      alert('Error deleting item')
    }
  }

  const filtered = items
    .filter((item) => {
      if (dietaryFilter === 'VEG') return item.isVeg === true
      if (dietaryFilter === 'NON_VEG') return item.isVeg === false
      return true
    })
    .filter((item) => {
      const q = searchQuery.toLowerCase()
      return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ROW ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Items</h1>
          <button
            onClick={fetchItems}
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
          {/* Search Input */}
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
                padding: '9px 12px 9px 36px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                color: '#0f172a',
              }}
            />
          </div>

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

      {/* ── 4-COLUMN RESPONSIVE ITEMS GRID ────────────────────── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          Loading menu dishes...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          No items found matching "{searchQuery}".
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
          }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenEdit(item)}
              style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.07)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Dish Photo */}
              <div style={{ width: '100%', height: 160, overflow: 'hidden', background: '#f1f5f9', position: 'relative' }}>
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80'}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Delete button on hover */}
                <button
                  onClick={(e) => handleDelete(e, item.id!, item.name)}
                  title="Delete item"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid #fee2e2',
                    borderRadius: 6,
                    padding: '4px 6px',
                    cursor: 'pointer',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>

              {/* Card Details */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={item.name}
                >
                  {item.name}
                </h3>

                {/* Price and Dietary Badge Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#334155' }}>
                    ${Number(item.price).toFixed(0)}
                  </span>

                  {/* Veg / Non-Veg Indicator */}
                  {item.isVeg ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#16a34a',
                      }}
                    >
                      <div
                        style={{
                          width: 13,
                          height: 13,
                          border: '1.5px solid #16a34a',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a' }} />
                      </div>
                      Veg
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#dc2626',
                      }}
                    >
                      <div
                        style={{
                          width: 13,
                          height: 13,
                          border: '1.5px solid #dc2626',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#dc2626' }} />
                      </div>
                      Non Veg
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ITEM FORM MODAL ───────────────────────────────────── */}
      <ItemFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          fetchItems()
          if (onRefreshCategories) onRefreshCategories()
        }}
        categories={categories}
        initialItem={selectedItem}
      />
    </div>
  )
}
