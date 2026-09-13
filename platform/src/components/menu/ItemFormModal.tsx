'use client'

import React, { useState, useEffect } from 'react'

export interface ModifierOptionInput {
  id?: string
  name: string
  priceAdjustment: number
}

export interface ModifierInput {
  id?: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: ModifierOptionInput[]
  isDeleted?: boolean
}

export interface MenuItemData {
  id?: string
  categoryId: string
  name: string
  description?: string | null
  price: number
  netPrice?: number | null
  taxRate: number
  imageUrl?: string | null
  isVeg?: boolean
  kdsStation?: 'HOT' | 'COLD' | 'BAR' | 'EXPO'
  isAvailable?: boolean
  modifiers?: any[]
}

interface ItemFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  categories: { id: string; name: string }[]
  initialItem?: MenuItemData | null
  currentCategoryId?: string
  showToast?: (message: string, variant: 'success' | 'error') => void
}

export default function ItemFormModal({
  isOpen,
  onClose,
  onSave,
  categories,
  initialItem,
  currentCategoryId,
  showToast,
}: ItemFormModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number | string>('')
  const [netPrice, setNetPrice] = useState<number | string>('')
  const [taxRate, setTaxRate] = useState<number>(0.1) // 10%
  const [imageUrl, setImageUrl] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isVeg, setIsVeg] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)

  // Accordions
  const [isVariationsOpen, setIsVariationsOpen] = useState(true)
  const [isAddonsOpen, setIsAddonsOpen] = useState(false)

  // Variations (Sizes / Portions)
  const [variations, setVariations] = useState<{ id?: string; name: string; priceAdjustment: number }[]>([])

  // Available Addons from DB
  const [availableAddons, setAvailableAddons] = useState<{ id: string; name: string; price: number; parentItem: string }[]>([])
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])

  const [isSaving, setIsSaving] = useState(false)

  // Load available addons
  useEffect(() => {
    if (isOpen) {
      fetch('/api/menu/addons')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setAvailableAddons(data)
        })
        .catch(() => {})
    }
  }, [isOpen])

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '')
      setDescription(initialItem.description || '')
      setPrice(initialItem.price !== undefined ? Number(initialItem.price) : '')
      setNetPrice(initialItem.netPrice !== undefined && initialItem.netPrice !== null ? Number(initialItem.netPrice) : '')
      setTaxRate(initialItem.taxRate !== undefined ? Number(initialItem.taxRate) : 0.1)
      setImageUrl(initialItem.imageUrl || '')
      setCategoryId(initialItem.categoryId || '')
      setIsVeg(!!initialItem.isVeg)
      setIsAvailable(initialItem.isAvailable !== false)

      // Map modifiers to variations if any
      const existingVars: { id?: string; name: string; priceAdjustment: number }[] = []
      if (initialItem.modifiers && initialItem.modifiers.length > 0) {
        initialItem.modifiers.forEach((m: any) => {
          if (m.options) {
            m.options.forEach((opt: any) => {
              existingVars.push({
                id: opt.id,
                name: opt.name,
                priceAdjustment: Number(opt.priceAdjustment || 0),
              })
            })
          }
        })
      }
      setVariations(existingVars)
    } else {
      setName('')
      setDescription('')
      setPrice('')
      setNetPrice('')
      setTaxRate(0.1)
      setImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80')
      setCategoryId(currentCategoryId || (categories[0]?.id ?? ''))
      setIsVeg(false)
      setIsAvailable(true)
      setVariations([
        { name: 'Regular', priceAdjustment: 0 },
        { name: 'Large', priceAdjustment: 5 },
      ])
      setSelectedAddonIds([])
    }
  }, [initialItem, isOpen, currentCategoryId, categories])

  if (!isOpen) return null

  const handleAddVariation = () => {
    setVariations((prev) => [...prev, { name: '', priceAdjustment: 0 }])
  }

  const handleRemoveVariation = (idx: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleVariationChange = (idx: number, field: 'name' | 'priceAdjustment', val: any) => {
    setVariations((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Item Name is required')
      return
    }
    if (price === '' || isNaN(Number(price))) {
      alert('Valid Price is required')
      return
    }
    if (!categoryId) {
      alert('Category is required')
      return
    }

    try {
      setIsSaving(true)

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        netPrice: netPrice !== '' ? Number(netPrice) : null,
        taxRate: Number(taxRate),
        imageUrl: imageUrl.trim() || null,
        categoryId,
        isVeg,
        isAvailable,
        kdsStation: 'HOT',
        displayOrder: 0,
      }

      if (initialItem?.id) {
        const res = await fetch(`/api/menu/items/${initialItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update menu item')
      } else {
        const res = await fetch('/api/menu/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create menu item')
      }

      if (showToast) showToast('Item saved successfully!', 'success')
      onSave()
      onClose()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error saving item')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 700,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── MODAL HEADER ────────────────────────────────────────── */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            {initialItem ? 'Edit Item' : 'New Item'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── SCROLLABLE FORM BODY ───────────────────────────────── */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. Item Image Section */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Item Image <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Image Box */}
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Item preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  )}
                </div>

                {/* Upload & Delete Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Image should be within 5 MB</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Upload icon button */}
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt('Enter image URL (Unsplash or hosted image):', imageUrl)
                        if (url !== null) setImageUrl(url)
                      }}
                      title="Upload image"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                    </button>

                    {/* Delete icon button */}
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      title="Remove image"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: '1px solid #fee2e2',
                        background: '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#ef4444',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Item Name */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                Item Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grilled Salmon Steak"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  color: '#0f172a',
                }}
              />
            </div>

            {/* 3. Description */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add appetizing details about this dish..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  outline: 'none',
                  color: '#0f172a',
                  resize: 'vertical',
                }}
              />
              <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                Add Minimum 200 Characters
              </span>
            </div>

            {/* 4. Price and Net Price (2 columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Price <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14, fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 28px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 14,
                      outline: 'none',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Net Price <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14, fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={netPrice}
                    onChange={(e) => setNetPrice(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 28px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 14,
                      outline: 'none',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 5. Category & Tax (2 columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    outline: 'none',
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Tax <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    outline: 'none',
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value={0.1}>Standard Tax (10%)</option>
                  <option value={0.05}>Reduced Tax (5%)</option>
                  <option value={0.0}>Zero Tax (0%)</option>
                  <option value={0.18}>Luxury / Liquor (18%)</option>
                </select>
              </div>
            </div>

            {/* Dietary Preference: Veg / Non-Veg */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Dietary Type:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="dietaryType"
                  checked={isVeg}
                  onChange={() => setIsVeg(true)}
                />
                🟢 Veg
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="dietaryType"
                  checked={!isVeg}
                  onChange={() => setIsVeg(false)}
                />
                🔴 Non Veg
              </label>
            </div>

            {/* 6. Accordion 1: Variations */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div
                onClick={() => setIsVariationsOpen(!isVariationsOpen)}
                style={{
                  padding: '14px 18px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Variations</span>
                <span style={{ fontSize: 14, color: '#64748b' }}>{isVariationsOpen ? '▲' : '▼'}</span>
              </div>

              {isVariationsOpen && (
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, background: '#ffffff' }}>
                  {variations.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>No variations added yet.</p>
                  ) : (
                    variations.map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="text"
                          placeholder="Variation (e.g. Small, Large)"
                          value={v.name}
                          onChange={(e) => handleVariationChange(i, 'name', e.target.value)}
                          style={{
                            flex: 2,
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                        />
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>+$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price adjustment"
                            value={v.priceAdjustment}
                            onChange={(e) => handleVariationChange(i, 'priceAdjustment', Number(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '8px 10px 8px 26px',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                              fontSize: 13,
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariation(i)}
                          style={{
                            border: 'none',
                            background: '#fee2e2',
                            color: '#ef4444',
                            borderRadius: 6,
                            padding: '7px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={handleAddVariation}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#2563eb',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  >
                    + Add
                  </button>
                </div>
              )}
            </div>

            {/* 7. Accordion 2: Add Ons */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div
                onClick={() => setIsAddonsOpen(!isAddonsOpen)}
                style={{
                  padding: '14px 18px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Add Ons</span>
                <span style={{ fontSize: 14, color: '#64748b' }}>{isAddonsOpen ? '▲' : '▼'}</span>
              </div>

              {isAddonsOpen && (
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: '#ffffff' }}>
                  {availableAddons.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>No add-ons created yet. Add them in the Addons tab.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {availableAddons.map((addon) => {
                        const checked = selectedAddonIds.includes(addon.id)
                        return (
                          <label
                            key={addon.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: checked ? '1px solid #2563eb' : '1px solid #e2e8f0',
                              background: checked ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAddon(addon.id)}
                              />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{addon.name}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>+${Number(addon.price).toFixed(2)}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER ACTIONS ────────────────────────────────────── */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              background: '#f8fafc',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '9px 24px',
                background: '#2563eb',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
              }}
            >
              {isSaving ? 'Saving...' : initialItem ? 'Save Changes' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
