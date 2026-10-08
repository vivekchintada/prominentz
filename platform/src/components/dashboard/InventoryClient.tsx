'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast, ToastContainer } from '../ui/Toast'
import ReceivePOModal from './inventory/ReceivePOModal'
import StockCountsTab from './inventory/StockCountsTab'
import RecipesTab from './inventory/RecipesTab'
import WasteTab from './inventory/WasteTab'

interface MenuItemRef {
  id: string
  name: string
  is86d: boolean
}

interface RecipeRef {
  id: string
  menuItemId: string
  inventoryItemId: string
  quantityRequired: number
  menuItem: MenuItemRef
}

interface InventoryItem {
  id: string
  locationId: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  category?: string | null
  unitCost?: number
  parStock?: number
  createdAt: string
  updatedAt: string
  recipes: RecipeRef[]
}

interface InventoryAlert {
  id: string
  message: string
  createdAt: string
  inventoryItem?: {
    name: string
  }
}

interface MenuItem {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  leadTimeDays: number
  _count?: { purchaseOrders: number }
}

interface PurchaseOrderItem {
  id: string
  inventoryItemId: string
  quantity: number
  unitCost: number
  totalCost: number
}

interface PurchaseOrder {
  id: string
  poNumber: string
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  totalCost: number
  createdAt: string
  receivedAt: string | null
  supplier: { name: string; leadTimeDays?: number }
  items: PurchaseOrderItem[]
}

type MainTab = 'stock' | 'counts' | 'pos' | 'recipes' | 'waste' | 'suppliers'

export default function InventoryClient({ initialTab = 'stock' }: { initialTab?: MainTab } = {}) {
  const [activeTab, setActiveTab] = useState<MainTab>(initialTab)
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'SHORTAGE'>('ALL')
  const [sortBy, setSortBy] = useState<'deficit' | 'newest' | 'name' | 'lowest' | 'highest'>('deficit')

  // Quick Restock Modal State
  const [isRestockOpen, setIsRestockOpen] = useState(false)
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null)
  const [restockType, setRestockType] = useState<'STOCK_IN' | 'ADJUSTMENT' | 'WASTE'>('STOCK_IN')
  const [restockQty, setRestockQty] = useState<number | ''>('')
  const [restockNotes, setRestockNotes] = useState('')
  const [submittingRestock, setSubmittingRestock] = useState(false)

  // Add Item Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('kg')
  const [newStock, setNewStock] = useState<number | ''>(10)
  const [newMin, setNewMin] = useState<number | ''>(5)
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Edit Item Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('kg')
  const [editMin, setEditMin] = useState<number | ''>('')
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Recipe Manager Drawer State
  const [isRecipeOpen, setIsRecipeOpen] = useState(false)
  const [recipeItem, setRecipeItem] = useState<InventoryItem | null>(null)
  const [recipeMenuItemId, setRecipeMenuItemId] = useState('')
  const [recipeQty, setRecipeQty] = useState<number | ''>('')
  const [submittingRecipe, setSubmittingRecipe] = useState(false)

  // Transaction Logs Drawer State
  const [isTxOpen, setIsTxOpen] = useState(false)
  const [txItem, setTxItem] = useState<InventoryItem | null>(null)
  const [txLogs, setTxLogs] = useState<any[]>([])
  const [loadingTx, setLoadingTx] = useState(false)

  // Supplier Modal State
  const [isSupplierOpen, setIsSupplierOpen] = useState(false)
  const [supName, setSupName] = useState('')
  const [supContact, setSupContact] = useState('')
  const [supPhone, setSupPhone] = useState('')
  const [supEmail, setSupEmail] = useState('')
  const [supLeadTime, setSupLeadTime] = useState<number | ''>(3)
  const [submittingSup, setSubmittingSup] = useState(false)

  // PO Modal State
  const [isPOOpen, setIsPOOpen] = useState(false)
  const [poSupplierId, setPoSupplierId] = useState('')
  const [poItemId, setPoItemId] = useState('')
  const [poQty, setPoQty] = useState<number | ''>('')
  const [poUnitCost, setPoUnitCost] = useState<number | ''>('')
  const [submittingPO, setSubmittingPO] = useState(false)

  const { toasts, showToast, dismissToast } = useToast()

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/inventory')
      if (!res.ok) throw new Error('Failed to load inventory')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : (data.items || []))
    } catch (err: unknown) {
      showToast(err.message || 'Error loading inventory', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchSuppliersAndPOs = useCallback(async () => {
    try {
      const [supRes, poRes, alertRes, menuRes] = await Promise.all([
        fetch('/api/inventory/suppliers'),
        fetch('/api/inventory/purchase-orders'),
        fetch('/api/inventory/alerts'),
        fetch('/api/menu/items?includeUnavailable=true'),
      ])
      if (supRes.ok) setSuppliers(await supRes.json())
      if (poRes.ok) setPos(await poRes.json())
      if (alertRes.ok) setAlerts(await alertRes.json())
      if (menuRes.ok) setMenuItems(await menuRes.json())
    } catch (err) {
      console.error('Error loading metadata:', err)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
    fetchSuppliersAndPOs()
  }, [fetchInventory, fetchSuppliersAndPOs])

  // KPIs
  const totalItems = items.length
  const shortageItems = useMemo(
    () => items.filter((i) => Number(i.currentStock) < Number(i.minStock)),
    [items]
  )
  const lowStockCount = useMemo(
    () => items.filter((i) => Number(i.currentStock) > 0 && Number(i.currentStock) < Number(i.minStock)).length,
    [items]
  )
  const outOfStockCount = useMemo(
    () => items.filter((i) => Number(i.currentStock) <= 0).length,
    [items]
  )
  const inStockCount = useMemo(
    () => items.filter((i) => Number(i.currentStock) >= Number(i.minStock)).length,
    [items]
  )

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return true
        return (
          item.name.toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q) ||
          item.recipes?.some((r) => r.menuItem?.name.toLowerCase().includes(q))
        )
      })
      .filter((item) => {
        const current = Number(item.currentStock)
        const min = Number(item.minStock)
        if (statusFilter === 'SHORTAGE') return current < min
        if (statusFilter === 'LOW_STOCK') return current > 0 && current < min
        if (statusFilter === 'OUT_OF_STOCK') return current <= 0
        if (statusFilter === 'IN_STOCK') return current >= min
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'deficit') {
          const defA = Math.max(0, Number(a.minStock) - Number(a.currentStock))
          const defB = Math.max(0, Number(b.minStock) - Number(b.currentStock))
          if (defB !== defA) return defB - defA
          return Number(a.currentStock) - Number(b.currentStock)
        }
        if (sortBy === 'lowest') return Number(a.currentStock) - Number(b.currentStock)
        if (sortBy === 'highest') return Number(b.currentStock) - Number(a.currentStock)
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        return 0
      })
  }, [items, searchQuery, statusFilter, sortBy])

  // Quick Restock Opener
  const handleOpenRestock = (item: InventoryItem) => {
    setRestockItem(item)
    const deficit = Math.max(0, Number(item.minStock) - Number(item.currentStock))
    setRestockQty(deficit > 0 ? Number(deficit.toFixed(2)) : 10)
    setRestockType('STOCK_IN')
    setRestockNotes(deficit > 0 ? `Restock shortage deficit of ${deficit} ${item.unit}` : 'Regular restock')
    setIsRestockOpen(true)
  }

  // Quick Restock Submitter
  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockItem) return
    const qtyNum = Number(restockQty)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast('Please enter a valid positive quantity', 'error')
      return
    }

    try {
      setSubmittingRestock(true)
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: restockItem.id,
          quantity: qtyNum,
          type: restockType,
          notes: restockNotes || `Restocked ${qtyNum} ${restockItem.unit}`,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update stock')
      }

      const updated = await res.json()
      showToast(
        `⚡ Successfully added ${qtyNum} ${restockItem.unit} to ${restockItem.name}!`,
        'success'
      )
      setIsRestockOpen(false)
      fetchInventory()
    } catch (err: unknown) {
      showToast(err.message || 'Error updating stock', 'error')
    } finally {
      setSubmittingRestock(false)
    }
  }

  // Add Item Submitter
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    try {
      setSubmittingAdd(true)
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          unit: newUnit.trim(),
          currentStock: Number(newStock) || 0,
          minStock: Number(newMin) || 0,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create item')
      }

      showToast(`Added ingredient "${newName.trim()}"`, 'success')
      setIsAddOpen(false)
      setNewName('')
      setNewStock(10)
      setNewMin(5)
      fetchInventory()
    } catch (err: unknown) {
      showToast(err.message || 'Error adding ingredient', 'error')
    } finally {
      setSubmittingAdd(false)
    }
  }

  // Edit Item Submitter
  const handleOpenEdit = (item: InventoryItem) => {
    setEditItem(item)
    setEditName(item.name)
    setEditUnit(item.unit)
    setEditMin(item.minStock)
    setIsEditOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem || !editName.trim()) return

    try {
      setSubmittingEdit(true)
      const res = await fetch(`/api/inventory/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          unit: editUnit.trim(),
          minStock: Number(editMin) || 0,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update ingredient')
      }

      showToast(`Updated "${editName.trim()}"`, 'success')
      setIsEditOpen(false)
      fetchInventory()
    } catch (err: unknown) {
      showToast(err.message || 'Error updating ingredient', 'error')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Delete Item
  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return

    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete item')
      }
      showToast(`Deleted "${item.name}"`, 'success')
      fetchInventory()
    } catch (err: unknown) {
      showToast(err.message || 'Error deleting item', 'error')
    }
  }

  // Recipe Manager Drawer
  const handleOpenRecipe = (item: InventoryItem) => {
    setRecipeItem(item)
    setRecipeMenuItemId(menuItems[0]?.id || '')
    setRecipeQty(1)
    setIsRecipeOpen(true)
  }

  const handleLinkRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeItem || !recipeMenuItemId) return

    try {
      setSubmittingRecipe(true)
      const res = await fetch('/api/inventory/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: recipeItem.id,
          menuItemId: recipeMenuItemId,
          quantityRequired: Number(recipeQty) || 1,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to link recipe')
      }

      showToast(`Linked ingredient to recipe`, 'success')
      fetchInventory()
      setIsRecipeOpen(false)
    } catch (err: unknown) {
      showToast(err.message || 'Error linking recipe', 'error')
    } finally {
      setSubmittingRecipe(false)
    }
  }

  // Transaction Logs Drawer
  const handleOpenTx = async (item: InventoryItem) => {
    setTxItem(item)
    setIsTxOpen(true)
    try {
      setLoadingTx(true)
      const res = await fetch(`/api/inventory/${item.id}/transactions`)
      if (res.ok) setTxLogs(await res.json())
      else setTxLogs([])
    } catch {
      setTxLogs([])
    } finally {
      setLoadingTx(false)
    }
  }

  // Add Supplier Submitter
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supName.trim()) return

    try {
      setSubmittingSup(true)
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supName.trim(),
          contactName: supContact.trim() || null,
          phone: supPhone.trim() || null,
          email: supEmail.trim() || null,
          leadTimeDays: Number(supLeadTime) || 3,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create supplier')
      }

      showToast(`Added supplier "${supName.trim()}"`, 'success')
      setIsSupplierOpen(false)
      setSupName('')
      setSupContact('')
      setSupPhone('')
      setSupEmail('')
      fetchSuppliersAndPOs()
    } catch (err: unknown) {
      showToast(err.message || 'Error adding supplier', 'error')
    } finally {
      setSubmittingSup(false)
    }
  }

  // Export CSV
  const exportCSV = () => {
    const headers = ['Ingredient', 'Unit', 'Current Stock', 'Min Safety Limit', 'Shortage Deficit', 'Status']
    const rows = filteredItems.map((item) => {
      const current = Number(item.currentStock)
      const min = Number(item.minStock)
      const deficit = Math.max(0, min - current)
      const status = current <= 0 ? 'Out of Stock' : current < min ? 'Low Stock' : 'In Stock'
      return [
        item.name,
        item.unit,
        current,
        min,
        deficit > 0 ? `Short by ${deficit} ${item.unit}` : 'Sufficient',
        status,
      ]
    })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventory_${Date.now()}.csv`
    link.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '100%' }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── HEADER ROW (DREAMSPOS STYLE) ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Inventory Management
          </h1>
          <button
            onClick={() => {
              fetchInventory()
              fetchSuppliersAndPOs()
            }}
            title="Refresh Inventory"
            style={{
              background: 'var(--color-bg-card-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setExportMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export CSV ▾
            </button>

            {exportMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                  zIndex: 200,
                  minWidth: 190,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {[
                  { label: 'Stock Items CSV', type: 'stock' },
                  { label: 'Purchase Orders CSV', type: 'pos' },
                  { label: 'Menu Recipes CSV', type: 'recipes' },
                  { label: 'Waste Logs CSV', type: 'waste' },
                  { label: 'Suppliers CSV', type: 'suppliers' },
                ].map((opt) => (
                  <a
                    key={opt.type}
                    href={`/api/inventory/export?type=${opt.type}`}
                    download
                    onClick={() => setExportMenuOpen(false)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      borderRadius: 6,
                      display: 'block',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    📥 {opt.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Restock Shortage Button */}
          {shortageItems.length > 0 && (
            <button
              onClick={() => handleOpenRestock(shortageItems[0])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: '#ea580c',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(234,88,12,0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Restock Short Items ({shortageItems.length})
            </button>
          )}

          {/* Add New Item Button */}
          <button
            onClick={() => setIsAddOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--brand)',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add New Item
          </button>
        </div>
      </div>

      {/* ── DREAMSPOS KPI STAT CARDS ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {/* Total Ingredients */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Stock Items
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)' }}>{totalItems}</div>
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
            ✓ Active Catalog Tracked
          </div>
        </div>

        {/* In Stock */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sufficient Stock
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>{inStockCount}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Above safety thresholds
          </div>
        </div>

        {/* Low Stock / Shortage */}
        <div
          onClick={() => {
            setActiveTab('stock')
            setStatusFilter('SHORTAGE')
          }}
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 12,
            border: shortageItems.length > 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Shortage / Low Stock
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: shortageItems.length > 0 ? '#ea580c' : '#0f172a' }}>
            {shortageItems.length}
          </div>
          <div style={{ fontSize: 12, color: shortageItems.length > 0 ? '#ea580c' : '#64748b', fontWeight: 600, marginTop: 4 }}>
            {shortageItems.length > 0 ? '⚡ Needs Immediate Restock' : 'All levels healthy'}
          </div>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => {
            setActiveTab('stock')
            setStatusFilter('OUT_OF_STOCK')
          }}
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 12,
            border: outOfStockCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Out of Stock (86'd)
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: outOfStockCount > 0 ? '#dc2626' : '#0f172a' }}>
            {outOfStockCount}
          </div>
          <div style={{ fontSize: 12, color: outOfStockCount > 0 ? '#dc2626' : '#64748b', fontWeight: 600, marginTop: 4 }}>
            {outOfStockCount > 0 ? 'Dishes disabled on POS' : 'Zero items at 0 stock'}
          </div>
        </div>
      </div>

      {/* ── DREAMSPOS MODULE TABS (STOCK / SUPPLIERS / POS) ─────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 4,
        }}
      >
        <button
          onClick={() => {
            setActiveTab('stock')
            setStatusFilter('ALL')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'stock' ? '2.5px solid var(--brand)' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'stock' ? 'var(--brand)' : '#64748b',
            fontSize: 14,
            fontWeight: activeTab === 'stock' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          Stock Items ({items.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('stock')
            setStatusFilter('SHORTAGE')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'stock' && statusFilter === 'SHORTAGE' ? '2.5px solid #ea580c' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'stock' && statusFilter === 'SHORTAGE' ? '#ea580c' : '#64748b',
            fontSize: 14,
            fontWeight: activeTab === 'stock' && statusFilter === 'SHORTAGE' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Shortage Items
          {shortageItems.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 9999,
                background: '#ffedd5',
                color: '#c2410c',
                border: '1px solid #fed7aa',
              }}
            >
              {shortageItems.length} short
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'suppliers' ? '2.5px solid var(--brand)' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'suppliers' ? 'var(--brand)' : '#64748b',
            fontSize: 14,
            fontWeight: activeTab === 'suppliers' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          Suppliers ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('counts')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'counts' ? '2.5px solid var(--brand)' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'counts' ? 'var(--brand)' : '#64748b',
            fontSize: 14,
            fontWeight: activeTab === 'counts' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Stock Counts & Audit
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'pos' ? '2.5px solid var(--brand)' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'pos' ? 'var(--brand)' : '#64748b',
            fontSize: 14,
            fontWeight: activeTab === 'pos' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          Purchase Orders ({pos.length})
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'recipes' ? '2.5px solid var(--brand)' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'recipes' ? 'var(--brand)' : '#64748b',
            fontSize: 14,
            fontWeight: activeTab === 'recipes' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Recipes & Food Cost
        </button>

        <button
          onClick={() => setActiveTab('waste')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'waste' ? '2.5px solid #dc2626' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'waste' ? '#dc2626' : '#64748b',
            fontSize: 14,
            fontWeight: activeTab === 'waste' ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Waste & Spoilage
        </button>
      </div>

      {/* ── ACTIVE SHORTAGE ALERT BANNER ─────────────────────────── */}
      {shortageItems.length > 0 && activeTab === 'stock' && (
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
                {shortageItems.length} ingredients are running short of minimum safety limits
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Restock short ingredients below to automatically un-86 linked dishes and maintain kitchen operations.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleOpenRestock(shortageItems[0])}
            className="btn btn--primary"
            style={{
              whiteSpace: 'nowrap',
              height: 36,
              fontSize: 13,
              gap: 6,
            }}
          >
            ⚡ Restock Short Items ➔
          </button>
        </div>
      )}

      {/* ── TAB 1: STOCK INVENTORY VIEW ──────────────────────────── */}
      {activeTab === 'stock' && (
        <>
          {/* TOOLBAR / SEARCH / STATUS FILTERS */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: 320 }}>
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
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search ingredient, unit, or dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Filter Pills & Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Status Filter Toggle */}
              <div style={{ display: 'flex', background: 'var(--color-bg-input)', borderRadius: 8, padding: 3, gap: 2 }}>
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'SHORTAGE', label: `Shortage (${shortageItems.length})` },
                  { key: 'IN_STOCK', label: 'In Stock' },
                  { key: 'LOW_STOCK', label: 'Low' },
                  { key: 'OUT_OF_STOCK', label: 'Out (86)' },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStatusFilter(s.key as any)}
                    style={{
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: statusFilter === s.key ? '#ffffff' : 'transparent',
                      color:
                        statusFilter === s.key
                          ? s.key === 'SHORTAGE'
                            ? '#ea580c'
                            : 'var(--brand)'
                          : '#64748b',
                      boxShadow: statusFilter === s.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="deficit">Sort: Largest Deficit</option>
                <option value="lowest">Sort: Lowest Stock</option>
                <option value="highest">Sort: Highest Stock</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="newest">Sort: Newest Added</option>
              </select>
            </div>
          </div>

          {/* DREAMSPOS DATA TABLE */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-card-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ width: 44, padding: '14px 16px' }}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ingredient Item
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Current Stock
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Min Limit
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Shortage Deficit
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Linked Dishes
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                      Loading inventory data...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                      No inventory items found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const current = Number(item.currentStock)
                    const min = Number(item.minStock)
                    const deficit = Math.max(0, min - current)
                    const isShort = current < min
                    const isZero = current <= 0
                    const pct = min > 0 ? Math.min(100, Math.round((current / min) * 100)) : 100

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isZero
                            ? 'rgba(254, 242, 242, 0.35)'
                            : isShort
                            ? 'rgba(255, 247, 237, 0.35)'
                            : '#ffffff',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '14px 16px' }}>
                          <input type="checkbox" style={{ cursor: 'pointer' }} />
                        </td>

                        {/* Ingredient with Icon Avatar */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                background: isZero ? '#fee2e2' : isShort ? '#ffedd5' : '#eff6ff',
                                color: isZero ? '#dc2626' : isShort ? '#ea580c' : 'var(--brand)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Unit: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.unit}</strong>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Stock with Progress Bar */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: isZero ? '#dc2626' : isShort ? '#ea580c' : '#0f172a',
                              }}
                            >
                              {current} {item.unit}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                              ({pct}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: 100,
                              height: 5,
                              borderRadius: 9999,
                              background: '#e2e8f0',
                              marginTop: 6,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: isZero ? '#ef4444' : isShort ? '#f97316' : '#22c55e',
                                borderRadius: 9999,
                              }}
                            />
                          </div>
                        </td>

                        {/* Min Limit */}
                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                          {min} {item.unit}
                        </td>

                        {/* Shortage Deficit */}
                        <td style={{ padding: '14px 16px' }}>
                          {isShort ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid rgba(220, 38, 38, 0.2)',
                              }}
                            >
                              ⚠️ Short by {deficit} {item.unit}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                background: '#f0fdf4',
                                color: '#16a34a',
                              }}
                            >
                              ✓ Sufficient
                            </span>
                          )}
                        </td>

                        {/* Status (DreamsPOS Pill Badge) */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 700,
                              background: isZero ? '#fee2e2' : isShort ? '#fef3c7' : '#dcfce7',
                              color: isZero ? '#dc2626' : isShort ? '#b45309' : '#16a34a',
                              border: isZero
                                ? '1px solid rgba(220, 38, 38, 0.2)'
                                : isShort
                                ? '1px solid rgba(180, 83, 9, 0.2)'
                                : '1px solid rgba(22, 163, 74, 0.2)',
                            }}
                          >
                            {isZero ? 'Out of Stock' : isShort ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>

                        {/* Linked Dishes */}
                        <td style={{ padding: '14px 16px' }}>
                          {item.recipes && item.recipes.length > 0 ? (
                            <button
                              onClick={() => handleOpenRecipe(item)}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: 'var(--brand)',
                                borderRadius: 6,
                                padding: '4px 8px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {item.recipes.length} dishes linked
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenRecipe(item)}
                              style={{
                                background: 'var(--color-bg-card-hover)',
                                border: '1px dashed #cbd5e1',
                                color: '#64748b',
                                borderRadius: 6,
                                padding: '3px 8px',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              + Link recipe
                            </button>
                          )}
                        </td>

                        {/* Actions (DreamsPOS Circular Action Buttons) */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            {/* ⚡ Restock Action Button */}
                            <button
                              onClick={() => handleOpenRestock(item)}
                              title="Restock / Add Quantity"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                border: isShort ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                                background: isShort ? '#fff7ed' : '#ffffff',
                                color: isShort ? '#ea580c' : 'var(--brand)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                            </button>

                            {/* View Transactions */}
                            <button
                              onClick={() => handleOpenTx(item)}
                              title="Transaction History"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-card)',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Ingredient"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-card)',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteItem(item)}
                              title="Delete Ingredient"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                border: '1px solid #fee2e2',
                                background: 'var(--color-bg-card)',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
        </>
      )}

      {/* ── TAB 2: SUPPLIERS VIEW (DREAMSPOS STYLE) ─────────────── */}
      {activeTab === 'suppliers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Vendor & Supplier Directory
            </h2>
            <button
              onClick={() => setIsSupplierOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--brand)',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add Supplier
            </button>
          </div>

          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-card-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Supplier Name</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Contact Person</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Lead Time</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Orders</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      No suppliers registered yet.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((sup) => (
                    <tr key={sup.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{sup.name}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-secondary)' }}>{sup.contactName || '—'}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-secondary)' }}>{sup.email || '—'}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-secondary)' }}>{sup.phone || '—'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: '#eff6ff', color: 'var(--brand)', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                          {sup.leadTimeDays} days
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: '#64748b' }}>
                        {sup._count?.purchaseOrders || 0} POs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: PURCHASE ORDERS VIEW (DREAMSPOS STYLE) ───────── */}
      {activeTab === 'pos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Purchase Order Records
            </h2>
          </div>

          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-card-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>PO Number</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Supplier</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Items</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Cost</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Created On</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      No purchase orders recorded.
                    </td>
                  </tr>
                ) : (
                  pos.map((po) => (
                    <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{po.poNumber}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-secondary)' }}>{po.supplier?.name}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            background: po.status === 'RECEIVED' ? '#dcfce7' : po.status === 'PARTIALLY_RECEIVED' ? '#e0e7ff' : '#fef3c7',
                            color: po.status === 'RECEIVED' ? '#16a34a' : po.status === 'PARTIALLY_RECEIVED' ? '#4338ca' : '#b45309',
                          }}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-secondary)' }}>{po.items?.length || 0} line items</td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        ${Number(po.totalCost).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') ? (
                          <button
                            onClick={() => setReceivingPO(po)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              border: 'none',
                              background: 'var(--brand)',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(37,99,235,0.25)',
                            }}
                          >
                            Receive PO
                          </button>
                        ) : po.status === 'RECEIVED' ? (
                          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                            ✓ Received
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STOCK COUNTS TAB ────────────────────────────────────────── */}
      {activeTab === 'counts' && (
        <StockCountsTab showToast={showToast} onStockUpdated={fetchInventory} />
      )}

      {/* ── RECIPES & FOOD COST TAB ──────────────────────────────────── */}
      {activeTab === 'recipes' && (
        <RecipesTab showToast={showToast} onRecipeChanged={fetchInventory} />
      )}

      {/* ── WASTE & SPOILAGE TAB ─────────────────────────────────────── */}
      {activeTab === 'waste' && (
        <WasteTab showToast={showToast} onWasteLogged={fetchInventory} />
      )}

      {/* ── MODAL 1: QUICK RESTOCK SHORTAGE (DREAMSPOS STYLE) ─────── */}
      {isRestockOpen && restockItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
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
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  ⚡ Restock Ingredient
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Adding stock replenishes recipes and automatically un-86s menu items
                </p>
              </div>
              <button
                onClick={() => setIsRestockOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmRestock} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Shortage Deficit Highlight Card */}
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#9a3412' }}>
                    {restockItem.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>
                    Unit: {restockItem.unit}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center', marginTop: 10 }}>
                  <div style={{ background: 'var(--color-bg-card)', borderRadius: 8, padding: '8px 4px', border: '1px solid #ffedd5' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Current Level</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {restockItem.currentStock} {restockItem.unit}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-bg-card)', borderRadius: 8, padding: '8px 4px', border: '1px solid #ffedd5' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Min Limit</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      {restockItem.minStock} {restockItem.unit}
                    </div>
                  </div>
                  <div style={{ background: '#fee2e2', borderRadius: 8, padding: '8px 4px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>Shortage Deficit</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
                      {Math.max(0, Number(restockItem.minStock) - Number(restockItem.currentStock))} {restockItem.unit}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Action Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { key: 'STOCK_IN', label: '⚡ Stock In', desc: 'Restock / Purchase' },
                    { key: 'ADJUSTMENT', label: '⚙️ Count Adjustment', desc: 'Audit Correction' },
                    { key: 'WASTE', label: '🗑️ Waste / Spoilage', desc: 'Log Loss' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setRestockType(t.key as any)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: restockType === t.key ? '2px solid var(--brand)' : '1px solid #e2e8f0',
                        background: restockType === t.key ? '#eff6ff' : '#ffffff',
                        color: restockType === t.key ? 'var(--brand)' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity to Add */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Quantity to Add ({restockItem.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 10"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1.5px solid var(--brand)',
                    fontSize: 16,
                    fontWeight: 700,
                    outline: 'none',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-card-hover)',
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  💡 Defaults to the calculated deficit ({Math.max(0, Number(restockItem.minStock) - Number(restockItem.currentStock))} {restockItem.unit}) to reach safe levels.
                </span>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Reason / Memo (Optional)
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Weekly vendor shipment from Metro Food"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                    outline: 'none',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: 'var(--color-bg-card)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRestock}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--brand)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: submittingRestock ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px var(--brand-tint)',
                  }}
                >
                  {submittingRestock ? 'Stocking In...' : 'Confirm Restock & Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD NEW INGREDIENT (DREAMSPOS STYLE) ─────────── */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Add New Inventory Item
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. San Marzano Tomatoes"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                    outline: 'none',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Unit of Measurement *
                </label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                    outline: 'none',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="liters">Liters (L)</option>
                  <option value="bunches">Bunches</option>
                  <option value="pieces">Pieces / Units</option>
                  <option value="grams">Grams (g)</option>
                  <option value="cans">Cans</option>
                  <option value="bottles">Bottles</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Initial Stock Level
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Minimum Safety Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newMin}
                    onChange={(e) => setNewMin(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: 'var(--color-bg-card)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--brand)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: submittingAdd ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingAdd ? 'Adding...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EDIT INGREDIENT ──────────────────────────────── */}
      {isEditOpen && editItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Edit Ingredient Details
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Unit of Measurement *
                </label>
                <input
                  type="text"
                  required
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Minimum Safety Limit ({editUnit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editMin}
                  onChange={(e) => setEditMin(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: 'var(--color-bg-card)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--brand)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: submittingEdit ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: RECIPE LINKING DRAWER ───────────────────────── */}
      {isRecipeOpen && recipeItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Link Recipe — {recipeItem.name}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Dishes will automatically 86 if this ingredient runs out, and un-86 when restocked.
                </p>
              </div>
              <button
                onClick={() => setIsRecipeOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Existing links */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  Currently Linked Dishes:
                </div>
                {recipeItem.recipes && recipeItem.recipes.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {recipeItem.recipes.map((r) => (
                      <span
                        key={r.id}
                        style={{
                          background: '#eff6ff',
                          color: 'var(--brand)',
                          border: '1px solid #bfdbfe',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {r.menuItem?.name} ({r.quantityRequired} {recipeItem.unit})
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    No menu dishes currently linked to this ingredient.
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

              {/* Add New Link */}
              <form onSubmit={handleLinkRecipe} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Select Menu Dish
                  </label>
                  <select
                    value={recipeMenuItemId}
                    onChange={(e) => setRecipeMenuItemId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      fontSize: 13,
                      outline: 'none',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Portion Quantity Required ({recipeItem.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={recipeQty}
                    onChange={(e) => setRecipeQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 0.2"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsRecipeOpen(false)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: 'var(--color-bg-card)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRecipe}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'var(--brand)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: submittingRecipe ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingRecipe ? 'Linking...' : 'Link to Recipe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: TRANSACTION LOGS VIEW ───────────────────────── */}
      {isTxOpen && txItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 580,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Stock Log History — {txItem.name}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Audit trail of restocks, usage deductions, and adjustments
                </p>
              </div>
              <button
                onClick={() => setIsTxOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {loadingTx ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading log records...</div>
              ) : txLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                  No transaction logs recorded yet for this item.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {txLogs.map((tx: unknown) => (
                    <div
                      key={tx.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        background: 'var(--color-bg-card-hover)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {tx.type === 'STOCK_IN'
                            ? '⚡ Stock In (Restocked)'
                            : tx.type === 'WASTE'
                            ? '🗑️ Spoilage / Waste'
                            : tx.type === 'RECIPE_USAGE'
                            ? '🍽️ Order Recipe Deduction'
                            : '⚙️ Count Adjustment'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {tx.notes || 'Routine inventory update'} • {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: tx.quantityChange >= 0 ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {tx.quantityChange >= 0 ? `+${tx.quantityChange}` : tx.quantityChange} {txItem.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
              <button
                onClick={() => setIsTxOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: 'var(--color-bg-card)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: ADD SUPPLIER ────────────────────────────────── */}
      {isSupplierOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Add Supplier Vendor
              </h3>
              <button
                onClick={() => setIsSupplierOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Company / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Sysco Gourmet Supplies"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Contact Representative
                </label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="e.g. Marco Rossi"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="orders@vendor.com"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Delivery Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={supLeadTime}
                  onChange={(e) => setSupLeadTime(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsSupplierOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: 'var(--color-bg-card)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSup}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--brand)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: submittingSup ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingSup ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECEIVE PO MODAL ───────────────────────────────────────── */}
      {receivingPO && (
        <ReceivePOModal
          po={receivingPO}
          onClose={() => setReceivingPO(null)}
          onSuccess={() => {
            fetchSuppliersAndPOs()
            fetchInventory()
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}
