'use client'

import React, { useState, useEffect } from 'react'
import ModifierSelector from './ModifierSelector'
import CheckoutModal from '../payments/CheckoutModal'
import SplitCheckModal from './SplitCheckModal'

interface Modifier {
  modifierName: string
  optionName:   string
  priceDelta:   number
}

interface CartItemInput {
  menuItemId:  string
  name:        string
  price:       number
  quantity:    number
  modifiers:   Modifier[]
  specialNote: string
  taxRate:     number
}

interface OrderItem {
  id:           string
  quantity:     number
  priceAtOrder: number
  seatNumber:   number
  modifiers: unknown
  specialNote:  string | null
  status:       'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED'
  menuItem: {
    id:      string
    name:    string
    taxRate: number
  }
}

interface OrderDetails {
  id:         string
  tableId:    string
  guestCount: number
  notes:      string | null
  status:     string
  subtotal:   number
  tax:        number
  total:      number
  table:      {
    name: string
    location?: {
      name: string
      address: string | null
      phone: string | null
      restaurant: {
        name: string
      }
    }
  }
  server?: {
    id: string
    name: string
    email: string
  }
  customer?: {
    id: string
    name: string
    phone: string
    pointsBalance: number
    lifetimeSpend: number
    allergyTags: string[]
  } | null
  items:      OrderItem[]
}

interface Category {
  id:   string
  name: string
}

interface MenuItem {
  id:          string
  categoryId:  string
  name:        string
  description: string | null
  price:       number
  taxRate:     number
  isAvailable: boolean
  modifiers: unknown[]
}

interface OrderEntryProps {
  orderId:       string
  onBackToMap:   () => void
  showToast:     (message: string, variant: 'success' | 'error') => void
  currentUser:   { id: string; name: string; role: string; email: string }
}

export default function OrderEntry({
  orderId,
  onBackToMap,
  showToast,
  currentUser,
}: OrderEntryProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'nonveg'>('all')
  const [orderTypeTab, setOrderTypeTab] = useState<'dinein' | 'takeaway' | 'delivery' | 'table'>('dinein')

  // Loading states
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [isFiring, setIsFiring] = useState(false)

  // Modals state
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [isModifierOpen, setIsModifierOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSplitOpen, setIsSplitOpen] = useState(false)

  // Seat selector
  const [activeSeat, setActiveSeat] = useState(1)

  // Hold/Resume loading
  const [holdLoading, setHoldLoading] = useState(false)

  // Void item confirm modal
  const [voidConfirm, setVoidConfirm] = useState<{ itemId: string; name: string; status: string } | null>(null)
  const [voidingItemId, setVoidingItemId] = useState<string | null>(null)

  // Inline editing states for guest count & notes
  const [isEditingGuests, setIsEditingGuests] = useState(false)
  const [editGuestCount, setEditGuestCount] = useState(1)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editNotes, setEditNotes] = useState('')

  // Customer CRM attachment state
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)

  const handleSearchCustomers = async (q: string) => {
    setCustomerQuery(q)
    if (!q.trim()) {
      setCustomerResults([])
      return
    }
    try {
      setSearchingCustomer(true)
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setCustomerResults(data.customers || [])
      }
    } catch {} finally {
      setSearchingCustomer(false)
    }
  }

  const handleAttachCustomer = async (customerId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      })
      if (!res.ok) throw new Error('Failed to attach guest to order')
      showToast('Guest profile attached to check', 'success')
      setShowCustomerModal(false)
      fetchOrderDetails()
    } catch (e: unknown) {
      showToast(e.message || 'Error attaching guest', 'error')
    }
  }

  const handleUnlinkCustomer = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: null }),
      })
      if (!res.ok) throw new Error('Failed to unlink guest')
      showToast('Guest unlinked from check', 'success')
      fetchOrderDetails()
    } catch (e: unknown) {
      showToast(e.message || 'Error unlinking guest', 'error')
    }
  }

  // Fetch full order data (supports both online API and offline IndexedDB)
  const fetchOrderDetails = async () => {
    try {
      setLoadingOrder(true)
      
      // Check offline order route
      if (orderId.startsWith('offline_') || !navigator.onLine) {
        const { getOfflineOrder } = await import('@/lib/offline-db')
        const offlineOrder = await getOfflineOrder(orderId)
        if (offlineOrder) {
          const subtotal = offlineOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          const tax = Number((subtotal * 0.08).toFixed(2))
          const total = Number((subtotal + tax).toFixed(2))

          const syntheticOrder: OrderDetails = {
            id: offlineOrder.id,
            tableId: offlineOrder.tableId,
            guestCount: offlineOrder.guestCount || 1,
            notes: offlineOrder.notes ? `[Offline Queue] ${offlineOrder.notes}` : '[Offline Queue]',
            status: 'OPEN',
            subtotal,
            tax,
            total,
            table: {
              name: 'Table',
              location: {
                name: 'Main Location',
                address: null,
                phone: null,
                restaurant: { name: 'Prominentz' },
              },
            },
            server: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
            },
            items: offlineOrder.items.map((item, idx) => ({
              id: `${offlineOrder.id}_item_${idx}`,
              quantity: item.quantity,
              priceAtOrder: item.price,
              seatNumber: 1,
              modifiers: item.modifiers || [],
              specialNote: item.specialNote || null,
              status: 'PENDING',
              menuItem: {
                id: item.menuItemId,
                name: item.name,
                taxRate: 0.08,
              },
            })),
          }

          setOrder(syntheticOrder)
          setEditGuestCount(syntheticOrder.guestCount)
          setEditNotes(syntheticOrder.notes || '')
          return
        }
      }

      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('Failed to load order details')
      const data = await res.json()
      setOrder(data)
      setEditGuestCount(data.guestCount)
      setEditNotes(data.notes || '')
    } catch (err: unknown) {
      // If network fetch failed, attempt offline IndexedDB fallback
      try {
        const { getOfflineOrder } = await import('@/lib/offline-db')
        const offlineOrder = await getOfflineOrder(orderId)
        if (offlineOrder) {
          const subtotal = offlineOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          const tax = Number((subtotal * 0.08).toFixed(2))
          const total = Number((subtotal + tax).toFixed(2))

          setOrder({
            id: offlineOrder.id,
            tableId: offlineOrder.tableId,
            guestCount: offlineOrder.guestCount || 1,
            notes: offlineOrder.notes || '[Offline Queue]',
            status: 'OPEN',
            subtotal,
            tax,
            total,
            table: { name: 'Table' },
            items: offlineOrder.items.map((item, idx) => ({
              id: `${offlineOrder.id}_item_${idx}`,
              quantity: item.quantity,
              priceAtOrder: item.price,
              seatNumber: 1,
              modifiers: item.modifiers || [],
              specialNote: item.specialNote || null,
              status: 'PENDING',
              menuItem: { id: item.menuItemId, name: item.name, taxRate: 0.08 },
            })),
          })
          return
        }
      } catch {}
      showToast(err.message || 'Error loading order details', 'error')
    } finally {
      setLoadingOrder(false)
    }
  }

  const handleSaveGuestCount = async () => {
    setIsEditingGuests(false)
    if (!order || editGuestCount === order.guestCount) return

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestCount: editGuestCount }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update guest count')
      }

      showToast('Guest count updated', 'success')
      fetchOrderDetails()
    } catch (err: unknown) {
      showToast(err.message || 'Error updating guest count', 'error')
    }
  }

  const handleSaveNotes = async () => {
    setIsEditingNotes(false)
    if (!order || editNotes === (order.notes || '')) return

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes || null }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update table notes')
      }

      showToast('Table notes updated', 'success')
      fetchOrderDetails()
    } catch (err: unknown) {
      showToast(err.message || 'Error updating notes', 'error')
    }
  }

  const handlePrintGuestCheck = () => {
    if (!order) return

    const restaurantName = order.table.location?.restaurant?.name || 'Prominentz'
    const locationName = order.table.location?.name || 'Main Location'
    const address = order.table.location?.address || ''
    const phone = order.table.location?.phone || ''
    const serverName = order.server?.name || currentUser.name
    const tableName = order.table.name
    const guestCount = order.guestCount
    const subtotal = Number(order.subtotal).toFixed(2)
    const tax = Number(order.tax).toFixed(2)
    const total = Number(order.total).toFixed(2)
    const dateStr = new Date().toLocaleString()

    const itemsHtml = order.items
      .map((item) => {
        const mods = (item.modifiers as Array<{ modifierName: string; optionName: string; priceDelta: number }>) || []
        const modText = mods.map((m) => `+ ${m.optionName} (+$${Number(m.priceDelta).toFixed(2)})`).join(', ')
        const noteText = item.specialNote ? `<div style="font-size: 11px; color: #555; font-style: italic; padding-left: 20px;">Note: "${item.specialNote}"</div>` : ''
        const itemPrice = Number(item.priceAtOrder)
        const modSum = mods.reduce((sum, m) => sum + Number(m.priceDelta), 0)
        const lineTotal = (itemPrice + modSum) * item.quantity

        return `
          <div style="margin-bottom: 8px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;">
              <span>${item.quantity}x ${item.menuItem.name}</span>
              <span style="font-family: monospace;">$${lineTotal.toFixed(2)}</span>
            </div>
            ${modText ? `<div style="font-size: 11px; color: #555; padding-left: 20px;">${modText}</div>` : ''}
            ${noteText}
          </div>
        `
      })
      .join('')

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Guest Check - Table ${tableName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
          }
          .receipt-card {
            width: 100%;
            max-width: 320px;
            border: 1px solid #ccc;
            padding: 20px;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
            text-align: center;
            letter-spacing: 0.1em;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 0;
          }
          .meta {
            font-size: 12px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .section {
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .total-row {
            font-weight: bold;
            font-size: 15px;
            border-top: 1px solid #000;
            padding-top: 6px;
            margin-top: 6px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #555;
            margin-top: 25px;
          }
          @media print {
            body { padding: 0; }
            .receipt-card { border: none; max-width: 100%; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header">
            <div class="logo">${restaurantName}</div>
            <div style="font-size: 12px;">
              ${locationName}<br>
              ${address ? `${address}<br>` : ''}
              ${phone ? `Phone: ${phone}` : ''}
            </div>
            <div class="title">GUEST CHECK</div>
          </div>

          <div class="meta">
            <div class="row"><span>Date/Time:</span><span>${dateStr}</span></div>
            <div class="row"><span>Order ID:</span><span style="font-family: monospace;">${order.id.substring(0, 8)}</span></div>
            <div class="row"><span>Server:</span><span>${serverName}</span></div>
            <div class="row"><span>Table:</span><span>${tableName}</span></div>
            <div class="row"><span>Guests:</span><span>${guestCount}</span></div>
          </div>

          <div class="section">
            ${itemsHtml}
          </div>

          <div class="section" style="border-bottom: none; margin-bottom: 0;">
            <div class="row" style="font-size: 13px;">
              <span>Subtotal</span>
              <span style="font-family: monospace;">$${subtotal}</span>
            </div>
            <div class="row" style="font-size: 13px;">
              <span>Sales Tax</span>
              <span style="font-family: monospace;">$${tax}</span>
            </div>
            <div class="row total-row">
              <span>Balance Due</span>
              <span style="font-family: monospace;">$${total}</span>
            </div>
          </div>

          <div class="footer">
            Thank you for dining with us!<br>
            Prominentz Platform
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.open()
      printWindow.document.write(printHtml)
      printWindow.document.close()
    } else {
      showToast('Popup blocked! Please allow popups to print receipt.', 'error')
    }
  }

  // Fetch menu categories and items (with offline IndexedDB caching)
  const fetchMenu = async () => {
    try {
      setLoadingMenu(true)
      const [catsRes, itemsRes] = await Promise.all([
        fetch('/api/menu/categories'),
        fetch('/api/menu/items?includeUnavailable=false'),
      ])

      if (!catsRes.ok || !itemsRes.ok) throw new Error('Failed to fetch menu')

      const cats = await catsRes.json()
      const items = await itemsRes.json()

      setCategories(cats)
      setMenuItems(items)

      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id)
      }

      // Cache menu to client-side IndexedDB for offline access
      const { cacheMenu } = await import('@/lib/offline-db')
      await cacheMenu(cats, items)
    } catch (err: unknown) {
      // Fall back to offline cached catalog
      try {
        const { getCachedMenu } = await import('@/lib/offline-db')
        const cached = await getCachedMenu()
        if (cached && cached.categories && cached.items) {
          setCategories(cached.categories)
          setMenuItems(cached.items)
          if (cached.categories.length > 0) {
            setSelectedCategoryId(cached.categories[0].id)
          }
          showToast('⚡ Loaded offline cached menu catalog', 'success')
          return
        }
      } catch {}
      showToast(err.message || 'Error loading menu data', 'error')
    } finally {
      setLoadingMenu(false)
    }
  }

  useEffect(() => {
    fetchOrderDetails()
    fetchMenu()
  }, [orderId])

  // Handle clicking a menu item
  const handleSelectMenuItem = (item: MenuItem) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setSelectedMenuItem(item)
      setIsModifierOpen(true)
    } else {
      // Add directly with empty modifiers
      handleAddOrderItem(item, [])
    }
  }

  // Hold order
  const handleHoldOrder = async () => {
    try {
      setHoldLoading(true)
      const res = await fetch(`/api/orders/${orderId}/hold`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to hold order')
      }
      showToast('Order placed on hold', 'success')
      fetchOrderDetails()
    } catch (err: unknown) {
      showToast(err.message || 'Error holding order', 'error')
    } finally {
      setHoldLoading(false)
    }
  }

  // Resume order
  const handleResumeOrder = async () => {
    try {
      setHoldLoading(true)
      const res = await fetch(`/api/orders/${orderId}/resume`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to resume order')
      }
      showToast('Order resumed', 'success')
      fetchOrderDetails()
    } catch (err: unknown) {
      showToast(err.message || 'Error resuming order', 'error')
    } finally {
      setHoldLoading(false)
    }
  }

  // Add item to backend order database or local offline queue
  const handleAddOrderItem = async (
    item: MenuItem,
    modifierSelections: Modifier[]
  ) => {
    // Offline Path
    if (orderId.startsWith('offline_') || !navigator.onLine) {
      try {
        const { updateOfflineOrder } = await import('@/lib/offline-db')
        await updateOfflineOrder(orderId, (prev) => {
          const existingItemIdx = prev.items.findIndex(
            (i) => i.menuItemId === item.id && JSON.stringify(i.modifiers || []) === JSON.stringify(modifierSelections)
          )
          if (existingItemIdx >= 0) {
            const next = [...prev.items]
            next[existingItemIdx].quantity += 1
            return { ...prev, items: next }
          }
          return {
            ...prev,
            items: [
              ...prev.items,
              {
                menuItemId: item.id,
                name: item.name,
                price: Number(item.price),
                quantity: 1,
                modifiers: modifierSelections,
              },
            ],
          }
        })

        showToast(`🔴 Offline: Added ${item.name} to local queue`, 'success')
        fetchOrderDetails()
        return
      } catch (err) {
        showToast('Failed to queue offline order item', 'error')
        return
      }
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          items: [
            {
              menuItemId: item.id,
              quantity:   1,
              modifiers:  modifierSelections,
              seatNumber: activeSeat,
            },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add item')
      }

      showToast(`Added ${item.name} to Seat ${activeSeat}`, 'success')
      fetchOrderDetails() // reload order
    } catch (err: unknown) {
      showToast(err.message || 'Error adding item', 'error')
    }
  }

  // Update order item quantity
  const handleUpdateQty = async (itemId: string, currentQty: number, change: number) => {
    const nextQty = currentQty + change
    if (nextQty < 1) return

    // Offline update path
    if (orderId.startsWith('offline_') || !navigator.onLine) {
      try {
        const itemIdx = parseInt(itemId.split('_item_')[1] || '0', 10)
        const { updateOfflineOrder } = await import('@/lib/offline-db')
        await updateOfflineOrder(orderId, (prev) => {
          const nextItems = [...prev.items]
          if (nextItems[itemIdx]) {
            nextItems[itemIdx].quantity = nextQty
          }
          return { ...prev, items: nextItems }
        })
        fetchOrderDetails()
        return
      } catch {}
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ quantity: nextQty }),
      })

      if (!res.ok) throw new Error('Failed to update quantity')
      fetchOrderDetails()
    } catch (err: unknown) {
      showToast(err.message || 'Error updating item quantity', 'error')
    }
  }

  // Void / remove item from order
  const handleVoidItem = async (itemId: string, name: string, status: string) => {
    if (status !== 'PENDING') {
      setVoidConfirm({ itemId, name, status })
      return
    }
    await doVoidItem(itemId, name)
  }

  const doVoidItem = async (itemId: string, name: string) => {
    setVoidingItemId(itemId)
    setVoidConfirm(null)

    // Offline void path
    if (orderId.startsWith('offline_') || !navigator.onLine) {
      try {
        const itemIdx = parseInt(itemId.split('_item_')[1] || '0', 10)
        const { updateOfflineOrder } = await import('@/lib/offline-db')
        await updateOfflineOrder(orderId, (prev) => ({
          ...prev,
          items: prev.items.filter((_, idx) => idx !== itemIdx),
        }))
        showToast(`Removed ${name}`, 'success')
        fetchOrderDetails()
        return
      } catch {} finally {
        setVoidingItemId(null)
      }
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE',
      })
      if (res.status === 403) {
        showToast('Manager approval required to void a kitchen item', 'error')
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to void item')
      }
      showToast(`Voided ${name}`, 'success')
      fetchOrderDetails()
    } catch (err: unknown) {
      showToast(err.message || 'Error voiding item', 'error')
    } finally {
      setVoidingItemId(null)
    }
  }

  // Fire pending items to KDS kitchen (with instant online auto-sync for offline orders)
  const handleFireToKitchen = async () => {
    const hasPending = order?.items.some((i) => i.status === 'PENDING')
    if (!hasPending) {
      showToast('No pending items to send to kitchen', 'error')
      return
    }

    setIsFiring(true)
    let targetOrderId = orderId

    // If order was started in offline queue, promote/sync it to the live server first
    if (orderId.startsWith('offline_')) {
      if (!navigator.onLine) {
        showToast('🔴 Offline: Order saved locally. Will sync to kitchen automatically upon reconnection.', 'success')
        setIsFiring(false)
        return
      }

      try {
        const { getOfflineOrder, markOrdersSynced } = await import('@/lib/offline-db')
        const offlineOrder = await getOfflineOrder(orderId)
        if (offlineOrder) {
          const syncRes = await fetch('/api/orders/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: [offlineOrder] }),
          })

          if (syncRes.ok) {
            const syncData = await syncRes.json()
            const match = syncData.syncedOrders?.find((s: unknown) => s.offlineId === orderId)
            if (match?.serverId) {
              targetOrderId = match.serverId
              await markOrdersSynced([orderId])
            }
          }
        }
      } catch (err) {
        console.warn('[OrderEntry] Auto-sync before fire encountered network issue:', err)
      }
    }

    // If still offline, remain in local queue
    if (!navigator.onLine || targetOrderId.startsWith('offline_')) {
      showToast('🔴 Offline Mode: Order saved locally. Will sync to kitchen automatically upon reconnection.', 'success')
      setIsFiring(false)
      return
    }

    try {
      const res = await fetch(`/api/orders/${targetOrderId}/send`, {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fire kitchen tickets')
      }

      showToast('Order tickets fired to KDS kitchen!', 'success')
      fetchOrderDetails()
    } catch (err: unknown) {
      showToast(err.message || 'Error firing kitchen', 'error')
    } finally {
      setIsFiring(false)
    }
  }

  // Filter items in active category
  const filteredItems = menuItems.filter(
    (item) =>
      item.categoryId === selectedCategoryId &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ITEM_STATUS_BADGES = {
    PENDING:     { label: 'Unsent', bg: 'var(--color-bg-input)', color: 'var(--color-text-secondary)' },
    IN_PROGRESS: { label: 'Cooking', bg: 'rgba(249,115,22,0.12)', color: 'var(--color-brand-500)' },
    READY:       { label: 'Ready', bg: 'rgba(34,197,94,0.12)', color: 'var(--color-success)' },
    SERVED:      { label: 'Served', bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--color-table-reserved)' },
  }

  if (loadingOrder && !order) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    )
  }

  return (
    <div
      style={{
        display:    'flex',
        height:     'calc(100vh - 100px)', // viewport adjustment
        gap:        'var(--space-6)',
        overflow:   'hidden',
        boxSizing:  'border-box',
      }}
    >
            {/* ── Void Kitchen Item Confirm Modal ─────────────────────────────── */}
      {voidConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              maxWidth: '380px',
              width: '90%',
              display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-error)' }}>
              Item In Kitchen
            </div>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>{voidConfirm.name}</strong>{' '}
              has been sent to the kitchen ({voidConfirm.status === 'IN_PROGRESS' ? 'currently cooking' : 'ready to serve'}).
              Voiding it may cause food waste and requires a manager.
            </p>
            <div
              style={{
                padding: '8px 10px',
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-brand-500)',
                fontSize: '12px',
              }}
            >
              Manager or Owner role required on this account
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setVoidConfirm(null)}
                className="btn btn--secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => doVoidItem(voidConfirm.itemId, voidConfirm.name)}
                className="btn btn--primary"
                style={{ flex: 1, background: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                Void Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT PANEL: Menu Catalog Selector */}
      <div
        style={{
          flex:          2,
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-4)',
          overflow:      'hidden',
        }}
      >
        {/* DreamsPOS Top Bar: Category Strip & Dietary Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flexShrink: 0 }}>
          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
            }}
          >
            <button
              onClick={() => setSelectedCategoryId('')}
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${selectedCategoryId === '' ? 'var(--brand)' : 'var(--color-border)'}`,
                background: selectedCategoryId === '' ? 'var(--brand)' : 'var(--color-bg-card)',
                color: selectedCategoryId === '' ? '#ffffff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🍽️ All Menus ({menuItems.length})
            </button>
            {categories.map((cat) => {
              const isSel = selectedCategoryId === cat.id
              const count = menuItems.filter((i) => i.categoryId === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${isSel ? 'var(--brand)' : 'var(--color-border)'}`,
                    background: isSel ? 'var(--brand)' : 'var(--color-bg-card)',
                    color: isSel ? '#ffffff' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.name} ({count})
                </button>
              )
            })}
          </div>

          {/* Filter Bar: Dietary Toggles + Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {(['all', 'veg', 'nonveg'] as const).map((mode) => {
                const active = dietaryFilter === mode
                return (
                  <button
                    key={mode}
                    onClick={() => setDietaryFilter(mode)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: active ? '1px solid var(--brand)' : '1px solid var(--color-border)',
                      background: active ? 'var(--brand-tint)' : 'var(--color-bg-card)',
                      color: active ? 'var(--brand)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {mode === 'veg' && <span style={{ color: '#30D158' }}>🟢</span>}
                    {mode === 'nonveg' && <span style={{ color: '#FF453A' }}>🔴</span>}
                    <span>{mode === 'all' ? 'All Dishes' : mode === 'veg' ? 'Veg Only' : 'Non-Veg'}</span>
                  </button>
                )
              })}
            </div>

            <input
              type="text"
              className="input"
              placeholder="🔍 Search dishes, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '220px', height: '36px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Menu Items Browser Grid (DreamsPOS Food Cards) */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {filteredItems.length === 0 ? (
            <div className="card flex justify-center py-20" style={{ background: 'var(--color-bg-raised)' }}>
              <p className="text-secondary text-sm">No items in this category matching search.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {filteredItems.map((item, idx) => {
                const isVeg = item.name.toLowerCase().includes('salad') || item.name.toLowerCase().includes('veggie') || item.name.toLowerCase().includes('pasta') || item.name.toLowerCase().includes('mushroom')
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectMenuItem(item)}
                    className="card"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-xl)',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Badge Overlay */}
                    {idx % 4 === 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '16px',
                          left: '16px',
                          background: '#18181B',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          zIndex: 2,
                        }}
                      >
                        👑 Trending
                      </span>
                    )}

                    {/* Dish Photo Placeholder / Mock */}
                    <div
                      style={{
                        width: '100%',
                        height: '110px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                      }}
                    >
                      {item.name.toLowerCase().includes('burger') ? '🍔' :
                       item.name.toLowerCase().includes('pizza') ? '🍕' :
                       item.name.toLowerCase().includes('pasta') ? '🍝' :
                       item.name.toLowerCase().includes('steak') ? '🥩' :
                       item.name.toLowerCase().includes('taco') ? '🌮' :
                       item.name.toLowerCase().includes('salad') ? '🥗' :
                       item.name.toLowerCase().includes('beer') || item.name.toLowerCase().includes('drink') ? '🍺' :
                       item.name.toLowerCase().includes('coffee') ? '☕' :
                       item.name.toLowerCase().includes('cake') || item.name.toLowerCase().includes('tiramisu') ? '🍰' : '🍽️'}
                    </div>

                    {/* Meta & Title */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                          {categories.find((c) => c.id === item.categoryId)?.name || 'Dish'}
                        </span>
                        <span style={{ fontSize: '10px', color: isVeg ? '#30D158' : '#FF453A', fontWeight: 700 }}>
                          {isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                        </span>
                      </div>
                      <div className="font-bold text-sm" style={{ lineHeight: '1.3', height: '36px', overflow: 'hidden' }}>
                        {item.name}
                      </div>
                    </div>

                    {/* Price & Add Trigger */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '4px', borderTop: '0.5px solid var(--color-border)' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '15px',
                          color: 'var(--brand)',
                        }}
                      >
                        ${Number(item.price).toFixed(2)}
                      </span>
                      <span className="badge badge--brand" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {item.modifiers.length > 0 ? 'Customize ⚙️' : '+ Add'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Live Order Check Cart */}
      <div
        className="card"
        style={{
          width:         '400px',
          background:    'var(--color-bg-raised)',
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-4)',
          overflow:      'hidden',
          flexShrink:    0,
        }}
      >
        {/* Table & Guests Meta */}
        {order && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
            {/* DreamsPOS Service Type Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                padding: '3px',
                gap: '2px',
              }}
            >
              {[
                { id: 'dinein', label: 'Dine In', icon: '🍽️' },
                { id: 'takeaway', label: 'Take Away', icon: '🛍️' },
                { id: 'delivery', label: 'Delivery', icon: '🛵' },
                { id: 'table', label: 'Table', icon: '🛎️' },
              ].map((tab) => {
                const active = orderTypeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOrderTypeTab(tab.id as any)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 2px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: active ? 'var(--brand)' : 'transparent',
                      color: active ? '#fff' : 'var(--color-text-secondary)',
                      fontSize: '11px',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base" style={{ margin: 0 }}>Check: {order.table.name}</h4>
                <div className="text-xs text-secondary mt-1">
                Guests:{' '}
                {isEditingGuests ? (
                  <input
                    type="number"
                    min={1}
                    value={editGuestCount}
                    onChange={(e) => setEditGuestCount(parseInt(e.target.value) || 1)}
                    onBlur={handleSaveGuestCount}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGuestCount()
                      if (e.key === 'Escape') setIsEditingGuests(false)
                    }}
                    autoFocus
                    style={{
                      width: '45px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-brand-500)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0 4px',
                      fontSize: 'var(--text-xs)',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditGuestCount(order.guestCount)
                      setIsEditingGuests(true)
                    }}
                    style={{ cursor: 'pointer', textDecoration: 'underline dotted var(--color-brand-500)' }}
                  >
                    {order.guestCount} ✏️
                  </span>
                )}{' '}
                | Status: <strong className="text-brand">{order.status}</strong>
              </div>
              <div className="text-xs text-secondary mt-1">
                Note:{' '}
                {isEditingNotes ? (
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNotes()
                      if (e.key === 'Escape') setIsEditingNotes(false)
                    }}
                    placeholder="Add notes..."
                    autoFocus
                    style={{
                      width: '180px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-brand-500)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0 4px',
                      fontSize: 'var(--text-xs)',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditNotes(order.notes || '')
                      setIsEditingNotes(true)
                    }}
                    style={{ cursor: 'pointer', textDecoration: 'underline dotted var(--color-brand-500)', fontStyle: order.notes ? 'normal' : 'italic' }}
                  >
                    {order.notes ? `"${order.notes}"` : '(add note)'} ✏️
                  </span>
                )}
              </div>
            </div>
            <button onClick={onBackToMap} className="btn btn--secondary btn--sm" style={{ padding: '4px 8px' }}>
              Table Map
            </button>
          </div>
        </div>
      )}

        {/* Guest CRM & Loyalty / VIP Profile */}
        {order && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: order.customer ? 'var(--brand-tint)' : 'rgba(255, 255, 255, 0.03)',
              border: order.customer ? '1px solid var(--brand-tint)' : '1px dashed rgba(255, 255, 255, 0.12)',
              flexShrink: 0,
            }}
          >
            {order.customer ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>👤 {order.customer.name}</span>
                    {Number(order.customer.lifetimeSpend || 0) > 300 && (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#f59e0b', color: '#000000' }}>👑 VIP</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={handleUnlinkCustomer} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '12px' }} title="Unlink guest">✕</button>
                  </div>
                </div>
                {order.customer.allergyTags && order.customer.allergyTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {order.customer.allergyTags.map((tag: string, idx: number) => (
                      <span key={idx} style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '0.5px solid rgba(239, 68, 68, 0.4)' }}>
                        ⚠️ {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Guest Profile: Unlinked</span>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="btn btn--secondary btn--sm"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                >
                  + Attach Guest
                </button>
              </div>
            )}
          </div>
        )}

        {/* Customer Lookup & Attach Modal */}
        {showCustomerModal && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1050,
              backgroundColor: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              className="card card--elevated animate-fade-in"
              style={{
                width: '90%', maxWidth: '420px',
                backgroundColor: '#18181d', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>👤 Attach Guest to Order</h3>
                <button onClick={() => setShowCustomerModal(false)} className="btn btn--ghost btn--sm">✕</button>
              </div>

              <input
                type="text"
                value={customerQuery}
                onChange={(e) => handleSearchCustomers(e.target.value)}
                placeholder="Search by phone or name..."
                autoFocus
                className="input"
                style={{ fontSize: '13px', backgroundColor: '#101014' }}
              />

              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchingCustomer && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>Searching CRM...</div>}
                
                {!searchingCustomer && customerResults.length === 0 && customerQuery && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px' }}>
                    No customer found. <a href="/dashboard/crm" target="_blank" style={{ color: 'var(--color-brand-500)' }}>Add in CRM ↗</a>
                  </div>
                )}

                {customerResults.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleAttachCustomer(c.id)}
                    style={{
                      padding: '10px 12px', borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-tint)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{c.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>⭐ {c.pointsBalance || 0} pts</div>
                      {Number(c.lifetimeSpend || 0) > 300 && <span style={{ fontSize: '9px', fontWeight: 800, color: '#f59e0b' }}>👑 VIP</span>}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowCustomerModal(false)} className="btn btn--secondary btn--full">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Seat Selector Pills */}
        {order && order.guestCount > 1 && (
          <div
            style={{
              display:     'flex',
              gap:         'var(--space-2)',
              paddingBottom: 'var(--space-2)',
              borderBottom: '1px solid var(--color-border)',
              flexShrink:   0,
              flexWrap:    'wrap',
            }}
          >
            <span className="text-xs text-secondary font-semibold" style={{ alignSelf: 'center', marginRight: 'var(--space-1)' }}>
              Adding to:
            </span>
            {Array.from({ length: order.guestCount }, (_, i) => i + 1).map((seat) => (
              <button
                key={seat}
                onClick={() => setActiveSeat(seat)}
                className="btn btn--sm"
                style={{
                  padding:      '2px 10px',
                  fontSize:     'var(--text-xs)',
                  borderRadius: '999px',
                  fontWeight:   activeSeat === seat ? 'bold' : 'normal',
                  background:   activeSeat === seat ? 'var(--color-brand-500)' : 'var(--color-bg-input)',
                  color:        activeSeat === seat ? '#fff' : 'var(--color-text-secondary)',
                  border:       activeSeat === seat ? '1px solid var(--color-brand-500)' : '1px solid var(--color-border)',
                  minWidth:     'auto',
                }}
              >
                🪑 Seat {seat}
              </button>
            ))}
          </div>
        )}

        {/* Cart List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingRight: '2px' }}>
          {order?.items.map((item) => {
            const isPending = item.status === 'PENDING'
            const badge = ITEM_STATUS_BADGES[item.status]
            const itemPrice = Number(item.priceAtOrder)
            const mods = (item.modifiers as Array<{ modifierName: string; optionName: string; priceDelta: number }>) ?? []
            const modSum = mods.reduce((sum, m) => sum + Number(m.priceDelta), 0)
            const totalLineCost = (itemPrice + modSum) * item.quantity

            return (
              <div
                key={item.id}
                style={{
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding:      'var(--space-3)',
                  background:   'var(--color-bg-card)',
                  display:      'flex',
                  flexDirection: 'column',
                  gap:        'var(--space-1)',
                }}
              >
                {/* Main line info */}
                <div className="flex justify-between items-start gap-2">
                  <div style={{ flex: 1 }}>
                    <span className="font-bold text-sm">
                      {item.quantity}x {item.menuItem.name}
                    </span>
                    
                    {/* Status badge */}
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize:   '8px',
                        padding:    '1px 4px',
                        borderRadius: '3px',
                        background: badge.bg,
                        color:      badge.color,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                    ${totalLineCost.toFixed(2)}
                  </span>
                </div>

                {/* Modifiers List */}
                {mods.length > 0 && (
                  <div className="text-xs text-secondary" style={{ paddingLeft: '14px' }}>
                    {mods.map((m, idx) => (
                      <div key={idx}>+ {m.optionName} {m.priceDelta > 0 ? `(+$${Number(m.priceDelta).toFixed(2)})` : ''}</div>
                    ))}
                  </div>
                )}

                {/* Special notes */}
                {item.specialNote && (
                  <div className="text-xs text-secondary italic" style={{ paddingLeft: '14px' }}>
                    Note: "{item.specialNote}"
                  </div>
                )}

                {/* Cart edit controls */}
                <div className="flex justify-between items-center mt-2" style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '6px' }}>
                  {/* Qty +/- only for PENDING */}
                  {isPending ? (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity, -1)}
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '2px 8px', minWidth: 'auto' }}
                      >
                        &minus;
                      </button>
                      <span className="text-xs font-semibold px-2 font-mono">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity, 1)}
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '2px 8px', minWidth: 'auto' }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-secondary italic">
                      {item.status === 'IN_PROGRESS' ? '🔥 In kitchen' : item.status === 'READY' ? '✅ Ready' : '🍽️ Served'}
                    </span>
                  )}

                  {/* Void button — disabled for SERVED */}
                  {item.status !== 'SERVED' ? (
                    <button
                      onClick={() => handleVoidItem(item.id, item.menuItem.name, item.status)}
                      disabled={voidingItemId === item.id}
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--color-error)', minWidth: 'auto', padding: '2px 8px', fontSize: '11px' }}
                      title={item.status === 'PENDING' ? 'Remove item' : 'Void kitchen item (manager required)'}
                    >
                      {voidingItemId === item.id ? '…' : item.status === 'PENDING' ? 'Remove' : '⚠️ Void'}
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>served</span>
                  )}
                </div>
              </div>
            )
          })}

          {order?.items.length === 0 && (
            <p className="text-secondary text-xs italic text-center py-10">Cart is empty. Tap items on the left to add.</p>
          )}
        </div>

        {/* Bill aggregate totals */}
        {order && (
          <div
            style={{
              borderTop:   '1px solid var(--color-border)',
              paddingTop:  'var(--space-3)',
              display:     'flex',
              flexDirection: 'column',
              gap:        '4px',
              fontSize:    'var(--text-sm)',
            }}
          >
            <div className="flex justify-between text-secondary">
              <span>Subtotal</span>
              <span className="font-mono">${Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-secondary">
              <span>Sales Tax</span>
              <span className="font-mono">${Number(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-brand mt-1">
              <span>Check Total</span>
              <span className="font-mono">${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* DreamsPOS Cart controls footer */}
        {order && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flexShrink: 0 }}>
            {order.items.some((i) => i.status === 'PENDING') && (
              <button
                onClick={handleFireToKitchen}
                disabled={isFiring}
                className="btn btn--primary btn--full"
                style={{
                  background: '#166534',
                  borderColor: '#166534',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
              >
                {isFiring ? 'Sending to Kitchen...' : '🔥 Send to Kitchen'}
              </button>
            )}

            {/* 4-Button DreamsPOS Utility Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/print/kot', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: order.id, station: 'ALL' }),
                    })
                    if (!res.ok) throw new Error('KOT print request failed')
                    showToast('🖨️ KOT Thermal Ticket Generated', 'success')
                  } catch (e: unknown) {
                    showToast(e.message || 'KOT Print Error', 'error')
                  }
                }}
                disabled={order.items.length === 0}
                className="btn btn--secondary btn--sm"
                style={{ fontSize: '11px', fontWeight: 700 }}
              >
                🎟️ Print KOT
              </button>

              <button
                onClick={handlePrintGuestCheck}
                disabled={order.items.length === 0}
                className="btn btn--secondary btn--sm"
                style={{ fontSize: '11px', fontWeight: 700 }}
              >
                🖨️ Print Receipt
              </button>

              {order.status === 'HOLD' ? (
                <button
                  onClick={handleResumeOrder}
                  disabled={holdLoading}
                  className="btn btn--secondary btn--sm"
                  style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                >
                  {holdLoading ? '...' : '▶️ Resume Order'}
                </button>
              ) : (
                <button
                  onClick={handleHoldOrder}
                  disabled={holdLoading || ['PAID', 'VOIDED'].includes(order.status)}
                  className="btn btn--secondary btn--sm"
                  style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand)', borderColor: 'var(--brand)' }}
                >
                  {holdLoading ? '...' : '⏸️ Hold Order'}
                </button>
              )}

              <button
                onClick={() => setIsSplitOpen(true)}
                disabled={order.items.length === 0}
                className="btn btn--secondary btn--sm"
                style={{ fontSize: '11px', fontWeight: 700 }}
              >
                🪑 Split Check
              </button>
            </div>

            {/* Settle Check Full Width CTA */}
            <button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={order.items.length === 0}
              className="btn btn--primary btn--full"
              style={{
                height: '42px',
                fontSize: '13px',
                fontWeight: 700,
                background: '#18181B',
                borderColor: '#18181B',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              }}
            >
              💵 Settle Check (${Number(order.total).toFixed(2)})
            </button>
          </div>
        )}
      </div>

      {/* Modifier Configurator Dialog */}
      <ModifierSelector
        isOpen={isModifierOpen}
        onClose={() => {
          setIsModifierOpen(false)
          setSelectedMenuItem(null)
        }}
        menuItem={selectedMenuItem}
        onConfirm={(selections) => {
          if (selectedMenuItem) {
            handleAddOrderItem(selectedMenuItem, selections)
          }
        }}
      />

      {/* Settle Checkout Modal */}
      {order && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onComplete={() => {
            fetchOrderDetails()
            // Callback to refresh table map when closing
            onBackToMap()
          }}
          order={order}
          showToast={showToast}
        />
      )}

      {/* Split Check Modal */}
      {order && (
        <SplitCheckModal
          isOpen={isSplitOpen}
          onClose={() => setIsSplitOpen(false)}
          orderId={orderId}
          guestCount={order.guestCount}
          items={order.items as any}
          showToast={showToast}
          onSeatChanged={() => fetchOrderDetails()}
        />
      )}
    </div>
  )
}
