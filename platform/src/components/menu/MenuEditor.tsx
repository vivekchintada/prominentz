'use client'

import React, { useState, useEffect } from 'react'
import Item86Badge from './Item86Badge'
import ItemFormModal from './ItemFormModal'
import { useToast, ToastContainer } from '../ui/Toast'

interface Category {
  id:           string
  name:         string
  displayOrder: number
  isActive:     boolean
}

interface MenuItem {
  id:           string
  categoryId:   string
  name:         string
  description:  string | null
  price:        number
  taxRate:      number
  isAvailable:  boolean
  is86d:        boolean
  kdsStation:   'HOT' | 'COLD' | 'BAR' | 'EXPO'
  displayOrder: number
  category:     { id: string; name: string }
  modifiers: unknown[]
}

export default function MenuEditor() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals and Forms
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  
  // Category Inline Editing
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // Toast
  const { toasts, showToast, dismissToast } = useToast()

  // Fetch all categories
  const fetchCategories = async (selectFirst = false) => {
    try {
      setLoadingCategories(true)
      const res = await fetch('/api/menu/categories')
      if (!res.ok) throw new Error('Failed to load categories')
      const data = await res.json()
      // Categories from /api/menu/categories already sorted by displayOrder
      setCategories(data)
      if (data.length > 0) {
        if (selectFirst || !selectedCategoryId) {
          setSelectedCategoryId(data[0].id)
        }
      } else {
        setSelectedCategoryId('')
      }
    } catch (err: unknown) {
      showToast(err.message || 'Error loading categories', 'error')
    } finally {
      setLoadingCategories(false)
    }
  }

  // Fetch items for selected category
  const fetchItems = async (catId: string) => {
    if (!catId) {
      setItems([])
      return
    }
    try {
      setLoadingItems(true)
      const res = await fetch(`/api/menu/items?categoryId=${catId}&includeUnavailable=true`)
      if (!res.ok) throw new Error('Failed to load items')
      const data = await res.json()
      setItems(data)
    } catch (err: unknown) {
      showToast(err.message || 'Error loading menu items', 'error')
    } finally {
      setLoadingItems(false)
    }
  }

  // Initial Load
  useEffect(() => {
    fetchCategories(true)
  }, [])

  // Load items when category selection changes
  useEffect(() => {
    if (selectedCategoryId) {
      fetchItems(selectedCategoryId)
    } else {
      setItems([])
    }
  }, [selectedCategoryId])

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setIsCreatingCategory(true)
    try {
      const displayOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.displayOrder)) + 1 
        : 0

      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, displayOrder }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create category')
      }

      const newCat = await res.json()
      showToast(`Category "${newCat.name}" created`, 'success')
      setNewCategoryName('')
      await fetchCategories()
      setSelectedCategoryId(newCat.id)
    } catch (err: unknown) {
      showToast(err.message || 'Error creating category', 'error')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return

    try {
      const res = await fetch(`/api/menu/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategoryName }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to update category')
      }

      showToast('Category name updated', 'success')
      setEditingCategoryId(null)
      fetchCategories()
    } catch (err: unknown) {
      showToast(err.message || 'Error updating category', 'error')
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"? It must not contain any items.`)) {
      return
    }

    try {
      const res = await fetch(`/api/menu/categories/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete category')
      }

      showToast(`Category "${name}" deleted`, 'success')
      const remains = categories.filter(c => c.id !== id)
      setCategories(remains)
      if (selectedCategoryId === id) {
        setSelectedCategoryId(remains[0]?.id ?? '')
      }
    } catch (err: unknown) {
      showToast(err.message || 'Error deleting category', 'error')
    }
  }

  const handleReorderCategory = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === categories.length - 1) return

    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const currentCat = categories[index]
    const targetCat = categories[targetIdx]

    // Swap displayOrder values
    const currentOrder = currentCat.displayOrder
    const targetOrder = targetCat.displayOrder

    try {
      // Parallel update in DB
      await Promise.all([
        fetch(`/api/menu/categories/${currentCat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: targetOrder }),
        }),
        fetch(`/api/menu/categories/${targetCat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: currentOrder }),
        })
      ])

      // Refresh list
      fetchCategories()
    } catch (err) {
      showToast('Failed to swap categories order', 'error')
    }
  }

  // Item Actions
  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete menu item "${name}"?`)) return

    try {
      const res = await fetch(`/api/menu/items/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete item')

      showToast(`Item "${name}" deleted`, 'success')
      fetchItems(selectedCategoryId)
    } catch (err: unknown) {
      showToast(err.message || 'Error deleting item', 'error')
    }
  }

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setIsItemModalOpen(true)
  }

  const handleOpenAddItem = () => {
    setEditingItem(null)
    setIsItemModalOpen(true)
  }

  const handle86ToggleLocal = (itemId: string, newIs86d: boolean) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, is86d: newIs86d, isAvailable: !newIs86d }
          : item
      )
    )
  }

  // Filtered menu items
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const KDS_STATION_NAMES = {
    HOT: '🔥 Hot Kitchen',
    COLD: '❄️ Cold Kitchen',
    BAR: '🍸 Bar / Drinks',
    EXPO: '🟢 Expo Station',
  }

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 80px)', // adjust for dashboard header
        gap: 'var(--space-6)',
        overflow: 'hidden',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Categories Sidebar */}
      <div
        className="card"
        style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          overflowY: 'auto',
          background: 'var(--color-bg-raised)',
          flexShrink: 0,
        }}
      >
        <h3 className="text-lg font-bold" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
          Categories
        </h3>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="flex gap-2">
          <input
            type="text"
            className="input text-sm"
            placeholder="New Category..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={isCreatingCategory}
            style={{ padding: 'var(--space-2) var(--space-3)' }}
          />
          <button type="submit" disabled={isCreatingCategory} className="btn btn--primary btn--sm" style={{ padding: 'var(--space-2)' }}>
            +
          </button>
        </form>

        {/* Categories List */}
        {loadingCategories ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : (
          <div className="flex flex-col gap-1" style={{ flex: 1, overflowY: 'auto' }}>
            {categories.map((cat, index) => {
              const isSelected = selectedCategoryId === cat.id
              const isEditing = editingCategoryId === cat.id

              return (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'between',
                    padding: '6px var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(249,115,22,0.1)' : 'transparent',
                    border: isSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    gap: 'var(--space-2)',
                  }}
                  onClick={() => !isEditing && setSelectedCategoryId(cat.id)}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        className="input text-xs"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        style={{ padding: '2px 6px', height: '28px' }}
                      />
                      <button onClick={() => handleUpdateCategory(cat.id)} className="btn btn--primary btn--sm" style={{ padding: '4px 6px', fontSize: '10px' }}>
                        ✓
                      </button>
                      <button onClick={() => setEditingCategoryId(null)} className="btn btn--secondary btn--sm" style={{ padding: '4px 6px', fontSize: '10px' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        style={{
                          flex: 1,
                          fontWeight: isSelected ? 'var(--font-semibold)' : 'var(--font-regular)',
                          color: isSelected ? 'var(--color-brand-500)' : 'var(--color-text-primary)',
                          fontSize: 'var(--text-sm)',
                        }}
                      >
                        {cat.name}
                      </span>

                      {/* Reorder and management controls */}
                      <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleReorderCategory(index, 'up')}
                          disabled={index === 0}
                          className="btn btn--ghost btn--sm"
                          style={{ padding: '2px 4px', minWidth: 'auto', opacity: index === 0 ? 0.3 : 1 }}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleReorderCategory(index, 'down')}
                          disabled={index === categories.length - 1}
                          className="btn btn--ghost btn--sm"
                          style={{ padding: '2px 4px', minWidth: 'auto', opacity: index === categories.length - 1 ? 0.3 : 1 }}
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategoryId(cat.id)
                            setEditingCategoryName(cat.name)
                          }}
                          className="btn btn--ghost btn--sm"
                          style={{ padding: '2px 4px', minWidth: 'auto' }}
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="btn btn--ghost btn--sm"
                          style={{ padding: '2px 4px', minWidth: 'auto', color: 'var(--color-error)' }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {categories.length === 0 && (
              <p className="text-secondary text-xs text-center py-8">No categories. Create one above.</p>
            )}
          </div>
        )}
      </div>

      {/* Items Main Panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          overflow: 'hidden',
        }}
      >
        {/* Controls Toolbar */}
        <div className="flex justify-between items-center gap-4">
          <input
            type="text"
            className="input"
            placeholder="Search items by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '380px' }}
          />

          <button
            onClick={handleOpenAddItem}
            disabled={!selectedCategoryId}
            className="btn btn--primary"
            style={{ gap: 'var(--space-2)' }}
          >
            <span>+</span> Add Menu Item
          </button>
        </div>

        {/* Items Grid/List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {loadingItems ? (
            <div className="flex justify-center py-20">
              <div className="spinner" style={{ width: '40px', height: '40px' }} />
            </div>
          ) : !selectedCategoryId ? (
            <div className="card flex justify-center items-center py-20" style={{ background: 'var(--color-bg-raised)' }}>
              <p className="text-secondary text-center">Please select or create a category on the left to edit menu items.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="card flex justify-center items-center py-20" style={{ background: 'var(--color-bg-raised)' }}>
              <p className="text-secondary text-center">No menu items found. Create one using the "+ Add Menu Item" button.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="card card--elevated flex flex-col justify-between"
                  style={{
                    border: '1px solid var(--color-border)',
                    position: 'relative',
                    transition: 'all var(--transition-fast)',
                    opacity: item.is86d ? 0.65 : 1,
                    background: item.is86d ? 'rgba(26,26,29,0.5)' : 'var(--color-bg-card)',
                  }}
                >
                  <div>
                    {/* Item header with Name & Price */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4
                        className="font-bold text-base"
                        style={{
                          color: item.is86d ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                        }}
                      >
                        {item.name}
                      </h4>
                      <span className="font-semibold text-brand" style={{ fontFamily: 'var(--font-mono)' }}>
                        ${Number(item.price).toFixed(2)}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className="text-xs text-secondary mb-3"
                      style={{
                        minHeight: '36px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description || 'No description provided.'}
                    </p>

                    {/* Station & Details */}
                    <div className="flex flex-wrap gap-2 items-center mb-4">
                      <span className="badge badge--neutral text-xs">
                        {KDS_STATION_NAMES[item.kdsStation] || item.kdsStation}
                      </span>
                      {Number(item.taxRate) > 0 && (
                        <span className="badge badge--neutral text-xs" style={{ border: '1px solid var(--color-border)' }}>
                          Tax: {(Number(item.taxRate) * 100).toFixed(1)}%
                        </span>
                      )}
                      {item.modifiers.length > 0 && (
                        <span className="badge badge--brand text-xs">
                          {item.modifiers.length} Mods
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div
                    className="flex justify-between items-center"
                    style={{
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: 'var(--space-3)',
                      marginTop: 'var(--space-2)',
                    }}
                  >
                    <Item86Badge
                      itemId={item.id}
                      itemName={item.name}
                      is86d={item.is86d}
                      onToggled={(new86) => handle86ToggleLocal(item.id, new86)}
                      showToast={showToast}
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '4px 8px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="btn btn--danger btn--sm"
                        style={{ padding: '4px 8px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit/Add Modal */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={() => fetchItems(selectedCategoryId)}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        initialItem={editingItem}
        currentCategoryId={selectedCategoryId}
        showToast={showToast}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
