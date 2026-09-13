'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import ThemeToggle from '../ui/ThemeToggle'
import ModifierSelector from './ModifierSelector'
import CheckoutModal from '../payments/CheckoutModal'
import SplitCheckModal from './SplitCheckModal'
import QuickNoteModal from './QuickNoteModal'
import ItemFormModal from '../menu/ItemFormModal'
import OrderStatementModal from './OrderStatementModal'
import { useToast } from '../ui/Toast'

export interface MenuItemData {
  id: string
  categoryId: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  isAvailable: boolean
  category?: { id: string; name: string }
  modifiers?: any[]
  isTrending?: boolean
  isMustTry?: boolean
  isVeg?: boolean
}

export interface CategoryData {
  id: string
  name: string
  imageUrl?: string
  itemCount?: number
}

export interface CartItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  portion?: string
  modifiers: any[]
  specialNote?: string | null
  imageUrl: string
  isVeg?: boolean
  status?: string // 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED'
}

export interface RecentOrderCardData {
  id: string
  orderNumber: string
  type: 'Dine In' | 'Take Away' | 'Delivery'
  customerName: string
  time: string
  tableName?: string
  timerLabel: string
  timerColor: 'green' | 'red'
  targetTime: string
  progress: number
  total: number
  status?: string
  itemCount?: number
}

export interface TableData {
  id: string
  name: string
  capacity: number
  status: 'EMPTY' | 'ACTIVE' | 'PAYING' | 'RESERVED'
  orders?: any[]
}

interface DreamsPosTerminalProps {
  initialCategories: CategoryData[]
  initialMenuItems: MenuItemData[]
  initialTables: TableData[]
  initialRecentOrders: RecentOrderCardData[]
  currentUser: { id: string; name: string; role: string; email: string }
  locationId: string
}

function getImageForDish(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('old fashioned')) return 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=280&fit=crop&q=80'
  if (n.includes('aperol') || n.includes('spritz')) return 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&h=280&fit=crop&q=80'
  if (n.includes('burrata') || n.includes('prosciutto')) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=280&fit=crop&q=80'
  if (n.includes('french onion') || n.includes('soup')) return 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=280&fit=crop&q=80'
  if (n.includes('chocolate') || n.includes('fondant')) return 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=280&fit=crop&q=80'
  if (n.includes('crème') || n.includes('brulee') || n.includes('brûlée')) return 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&h=280&fit=crop&q=80'
  if (n.includes('negroni')) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=280&fit=crop&q=80'
  if (n.includes('bruschetta')) return 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=280&fit=crop&q=80'
  if (n.includes('calamari')) return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=280&fit=crop&q=80'
  if (n.includes('tiramisu')) return 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=280&fit=crop&q=80'
  if (n.includes('beef') || n.includes('tenderloin') || n.includes('steak')) return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=280&fit=crop&q=80'
  if (n.includes('salmon')) return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=280&fit=crop&q=80'
  if (n.includes('duck')) return 'https://images.unsplash.com/photo-1514944298352-78d120a169b1?w=400&h=280&fit=crop&q=80'
  if (n.includes('lobster') || n.includes('linguine') || n.includes('pasta')) return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=280&fit=crop&q=80'
  if (n.includes('water') || n.includes('sparkling')) return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&h=280&fit=crop&q=80'
  if (n.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=280&fit=crop&q=80'
  if (n.includes('taco')) return 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop&q=80'
  if (n.includes('chicken')) return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=280&fit=crop&q=80'
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=280&fit=crop&q=80'
}

export function DreamsPosTerminal({
  initialCategories,
  initialMenuItems,
  initialTables,
  initialRecentOrders,
  currentUser,
  locationId,
}: DreamsPosTerminalProps) {
  const router = useRouter()
  const { showToast } = useToast()

  // State
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories)
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(initialMenuItems)
  const [tables, setTables] = useState<TableData[]>(initialTables)
  const [recentOrders, setRecentOrders] = useState<RecentOrderCardData[]>(initialRecentOrders)
  const [openOrders, setOpenOrders] = useState<RecentOrderCardData[]>([])

  // Tabs: 'open' = active/in-kitchen, 'completed' = paid
  const [ordersTab, setOrdersTab] = useState<'open' | 'completed'>('open')

  // Filters
  const [recentOrderFilter, setRecentOrderFilter] = useState<'All Orders' | 'Dine In' | 'Take Away' | 'Delivery'>('All Orders')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [vegFilter, setVegFilter] = useState<boolean>(false)
  const [nonVegFilter, setNonVegFilter] = useState<boolean>(false)
  const [eggFilter, setEggFilter] = useState<boolean>(false)

  // Active Order & Cart State
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [activeOrderStatus, setActiveOrderStatus] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string>('#NEW')
  const [orderType, setOrderType] = useState<'Dine In' | 'Take Away' | 'Delivery' | 'Table'>('Dine In')
  const [selectedTable, setSelectedTable] = useState<TableData | null>(initialTables[0] || null)
  const [selectedWaiter, setSelectedWaiter] = useState<string>(currentUser.name || 'Sarah Manager')
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>({ name: 'Liam O\'Connor', phone: '+1 234-567-8901' })

  // Coupon & Loyalty Points State
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discountType: 'PERCENTAGE' | 'FIXED'
    discountAmount: number
    discountVal: number
    pointsCost?: number | null
    pointsReward?: number | null
  } | null>(null)

  // Cart Items (starts empty — user adds from the dish grid)
  const [cart, setCart] = useState<CartItem[]>([])

  // Items already fired to Kitchen — kept visible in check for billing
  const [sentItems, setSentItems] = useState<CartItem[]>([])

  // Shared helper: map raw API order → RecentOrderCardData
  const mapOrderToCard = (o: any): RecentOrderCardData => {
    const date = new Date(o.createdAt)
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const n = (o.notes || '').toLowerCase()
    let type: 'Dine In' | 'Take Away' | 'Delivery' = 'Dine In'
    if (n.includes('take away') || n.includes('takeaway') || n.includes('to-go') || n.includes('pickup')) {
      type = 'Take Away'
    } else if (n.includes('delivery') || n.includes('doordash') || n.includes('ubereats') || n.includes('courier') || o.orderSource?.includes('DELIVERY')) {
      type = 'Delivery'
    }

    let timerLabel = '📋 Open'
    let progress = 20
    if (o.status === 'PAID')                    { timerLabel = '✓ Paid';       progress = 100 }
    else if (o.status === 'READY')              { timerLabel = '🔔 Ready';      progress = 100 }
    else if (o.status === 'PARTIALLY_READY')    { timerLabel = '⚡ Part Ready'; progress = 75  }
    else if (o.status === 'SENT_TO_KITCHEN')    { timerLabel = '🍳 In Kitchen'; progress = 55  }

    const itemCount = o.items?.length ?? o._count?.items ?? 0
    const orderTotal = Number(o.total || 0)

    return {
      id: o.id,
      orderNumber: `#${o.id.slice(-5).toUpperCase()}`,
      type,
      customerName: o.customer?.name || (o.table ? `${o.table.name}` : 'Walk-in'),
      time: timeStr,
      tableName: o.table?.name,
      timerLabel,
      timerColor: o.status === 'PAID' ? 'green' : (progress >= 100 ? 'green' : 'green'),
      targetTime: '20:00',
      progress,
      total: orderTotal,
      status: o.status,
      itemCount,
    }
  }

  // Helper to refresh recent orders from the server (only paid & completed orders)
  const fetchRecentOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=PAID')
      if (res.ok) {
        const orders = await res.json()
        setRecentOrders(orders.map(mapOrderToCard))
      }
    } catch (err) {
      console.error('Failed to fetch recent orders:', err)
    }
  }

  // Helper to refresh open/active orders (all non-paid, in-kitchen orders)
  const fetchOpenOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=OPEN,SENT_TO_KITCHEN,PARTIALLY_READY,READY')
      if (res.ok) {
        const orders = await res.json()
        setOpenOrders(orders.map(mapOrderToCard))
      }
    } catch (err) {
      console.error('Failed to fetch open orders:', err)
    }
  }

  // Helper to open order statement modal for settled / paid orders
  const openOrderStatement = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('Order statement not found')
      const order = await res.json()
      setStatementOrder(order)
      setIsStatementModalOpen(true)
    } catch (err: any) {
      showToast(err.message || 'Error opening statement', 'error')
    }
  }

  // Helper to start a fresh empty check
  const handleStartNewCheck = () => {
    setActiveOrderId(null)
    setActiveOrderStatus(null)
    setOrderNumber(`#${Math.random().toString(36).substr(2, 5).toUpperCase()}`)
    setCart([])
    setSentItems([])
    setSelectedTable(tables[0] || null)
    setAppliedCoupon(null)
    setCouponInput('')
    showToast('Started fresh empty check', 'info')
  }

  // Helper to load open order into the POS check drawer
  const loadOrderIntoCheck = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('Order not found')
      const order = await res.json()

      // If already paid, do NOT put into billing check drawer! Show statement modal instead.
      if (order.status === 'PAID') {
        setStatementOrder(order)
        setIsStatementModalOpen(true)
        showToast(`Order #${order.id.slice(-5).toUpperCase()} is already paid. Statement opened.`, 'info')
        return
      }

      setActiveOrderId(order.id)
      setActiveOrderStatus(order.status)
      setOrderNumber(`#${order.id.slice(-5).toUpperCase()}`)

      // Check if order notes contain an applied coupon code
      const couponMatch = order.notes?.match(/Coupon:\s*([A-Za-z0-9_-]+)/i)
      if (couponMatch && couponMatch[1]) {
        const cCode = couponMatch[1].trim().toUpperCase()
        fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cCode,
            orderSubtotal: Number(order.subtotal || 0),
            subtotal: Number(order.subtotal || 0),
            allowCashierOverride: true,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.valid && d.coupon) {
              setAppliedCoupon({
                code: d.coupon.code,
                discountType: d.coupon.discountType,
                discountAmount: Number(d.coupon.discountAmount),
                discountVal: Number(d.discount ?? d.coupon.calculatedDiscount ?? 0),
                pointsCost: d.coupon.pointsCost,
                pointsReward: d.coupon.pointsReward,
              })
            }
          })
          .catch(() => {})
      } else {
        setAppliedCoupon(null)
      }
      setCouponInput('')

      if (order.notes?.includes('Take Away')) setOrderType('Take Away')
      else if (order.notes?.includes('Delivery')) setOrderType('Delivery')
      else setOrderType('Dine In')

      if (order.table) {
        const matched = tables.find((t) => t.id === order.table.id) || order.table
        setSelectedTable(matched)
      }
      if (order.customer) {
        setSelectedCustomer(order.customer)
      } else {
        setSelectedCustomer({ name: order.table ? `Guest (${order.table.name})` : 'Walk-in Guest' })
      }
      if (order.server?.name) {
        setSelectedWaiter(order.server.name)
      }

      const pending: CartItem[] = []
      const sent: CartItem[] = []

      order.items?.forEach((item: any) => {
        const ci: CartItem = {
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.menuItem?.name || item.name || 'Dish',
          price: Number(item.unitPrice || item.menuItem?.price || 0),
          quantity: item.quantity,
          portion: 'Standard',
          modifiers: item.modifiers || [],
          specialNote: item.specialNote || null,
          imageUrl: item.menuItem?.imageUrl || getImageForDish(item.menuItem?.name || ''),
          isVeg: item.menuItem?.isVeg,
          status: item.status,
        }
        if (item.status === 'PENDING') {
          pending.push(ci)
        } else {
          sent.push(ci)
        }
      })

      setCart(pending)
      setSentItems(sent)

      const isAllServed = sent.length > 0 && sent.every((i) => i.status === 'SERVED')
      const isAllReady = sent.length > 0 && sent.every((i) => i.status === 'READY' || i.status === 'SERVED')

      if (isAllServed) {
        showToast(`🍽️ Order #${order.id.slice(-5).toUpperCase()}: All dishes SERVED! Ready for Bill.`, 'success')
      } else if (isAllReady) {
        showToast(`🔔 Order #${order.id.slice(-5).toUpperCase()}: Dishes READY at kitchen pass!`, 'success')
      } else if (sent.length > 0) {
        showToast(`🍳 Order #${order.id.slice(-5).toUpperCase()}: Dishes cooking in kitchen.`, 'info')
      } else {
        showToast(`Check loaded for Order #${order.id.slice(-5).toUpperCase()}`, 'info')
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading order', 'error')
    }
  }

  // Handle Table Selection from Table Floor Map
  const handleSelectTable = async (t: TableData) => {
    setSelectedTable(t)
    setOrderType('Table')
    setIsTableFloorOpen(false)

    try {
      const res = await fetch(`/api/orders?tableId=${t.id}`)
      if (res.ok) {
        const orders = await res.json()
        const active = orders.find((o: any) => o.status !== 'PAID' && o.status !== 'VOIDED')
        if (active) {
          await loadOrderIntoCheck(active.id)
          showToast(`Loaded active order for ${t.name}`, 'success')
          return
        }
      }
    } catch (err) {
      console.error('Error finding table orders:', err)
    }

    setActiveOrderId(null)
    setActiveOrderStatus(null)
    setOrderNumber(`#${Math.random().toString(36).substr(2, 5).toUpperCase()}`)
    setCart([])
    setSentItems([])
    showToast(`Started new check for ${t.name}`, 'info')
  }

  // Modals
  const [isModifierOpen, setIsModifierOpen] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemData | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSplitOpen, setIsSplitOpen] = useState(false)
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [activeCartIndexForNote, setActiveCartIndexForNote] = useState<number | null>(null)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isTableFloorOpen, setIsTableFloorOpen] = useState(false)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false)
  const [statementOrder, setStatementOrder] = useState<any | null>(null)

  // Current Live Time
  const [currentTime, setCurrentTime] = useState<string>('08 Oct, 2026, 12:44 PM')

  useEffect(() => {
    setOrderNumber(`#${Math.random().toString(36).substr(2, 5).toUpperCase()}`)
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 60000)
    return () => clearInterval(timer)
  }, [])

  // Real-time SSE PubSub event listener for KDS tickets, payments, and order modifications
  useEffect(() => {
    fetchRecentOrders()
    fetchOpenOrders()
    const eventSource = new EventSource('/api/events')

    eventSource.addEventListener('ticket.status.updated', async (e: any) => {
      try {
        const data = JSON.parse(e.data)
        if (data.status === 'READY') {
          showToast(`🔔 Kitchen Alert: Dishes for ${data.tableName || 'Order'} are READY at Expo pass!`, 'success')
        } else if (data.status === 'SERVED') {
          showToast(`🍽️ Dishes for ${data.tableName || 'Order'} have been SERVED! Ready for bill.`, 'success')
        } else if (data.status === 'IN_PROGRESS') {
          showToast(`🍳 Chef started cooking ticket for ${data.tableName || 'Order'}`, 'info')
        }
        fetchRecentOrders()
        if (activeOrderId && data.orderId === activeOrderId) {
          loadOrderIntoCheck(activeOrderId)
        }
      } catch (err) {
        console.error('[SSE] ticket status update error:', err)
      }
    })

    eventSource.addEventListener('order.modified', async (e: any) => {
      try {
        const data = JSON.parse(e.data)
        fetchRecentOrders()
        if (activeOrderId && data.orderId === activeOrderId) {
          if (data.status === 'PAID') {
            setActiveOrderStatus('PAID')
          } else {
            loadOrderIntoCheck(activeOrderId)
          }
        }
      } catch {}
    })

    eventSource.addEventListener('payment.processed', async (e: any) => {
      try {
        const data = JSON.parse(e.data)
        fetchRecentOrders()
        fetchOpenOrders()
        if (activeOrderId && data.orderId === activeOrderId) {
          setActiveOrderStatus('PAID')
        }
      } catch {}
    })

    eventSource.addEventListener('order.created', async () => {
      try {
        fetchRecentOrders()
        fetchOpenOrders()
      } catch {}
    })

    eventSource.addEventListener('ticket.completed', async (e: any) => {
      try {
        const data = JSON.parse(e.data)
        fetchRecentOrders()
        fetchOpenOrders()
        if (activeOrderId && data.orderId === activeOrderId) {
          loadOrderIntoCheck(activeOrderId)
        }
      } catch {}
    })

    eventSource.addEventListener('order.sent_to_kitchen', async () => {
      try {
        fetchRecentOrders()
        fetchOpenOrders()
      } catch {}
    })

    eventSource.addEventListener('table.status.changed', () => {
      try {
        fetchRecentOrders()
        fetchOpenOrders()
        router.refresh()
      } catch {}
    })

    return () => {
      eventSource.close()
    }
  }, [router, showToast, activeOrderId])

  // Cart Calculations — includes both new items in cart and already-sent items
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const sentSubtotal = sentItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = cartSubtotal + sentSubtotal

  // Coupon Discount Calculation
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'PERCENTAGE'
      ? Number(((subtotal * appliedCoupon.discountAmount) / 100).toFixed(2))
      : Math.min(appliedCoupon.discountAmount, subtotal)
    : 0

  const discountedSubtotal = Math.max(0, subtotal - couponDiscount)
  const taxRate = 0.10 // 10% tax
  const tax = Number((discountedSubtotal * taxRate).toFixed(2))
  const total = Number((discountedSubtotal + tax).toFixed(2))
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0) + sentItems.reduce((sum, item) => sum + item.quantity, 0)

  // Add Item to Cart
  const handleAddToCart = (dish: MenuItemData) => {
    if (dish.modifiers && dish.modifiers.length > 0) {
      setSelectedMenuItem(dish)
      setIsModifierOpen(true)
      return
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.menuItemId === dish.id)
      if (existingIdx > -1) {
        const next = [...prev]
        next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + 1 }
        return next
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          menuItemId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
          portion: 'Standard',
          modifiers: [],
          specialNote: null,
          imageUrl: dish.imageUrl || getImageForDish(dish.name),
          isVeg: dish.isVeg,
        },
      ]
    })
    showToast(`Added ${dish.name} to check`, 'success')
  }

  // Update Cart Quantity
  const handleUpdateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev]
      const current = next[index]
      if (!current) return prev
      const newQty = current.quantity + delta
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index)
      }
      next[index] = { ...current, quantity: newQty }
      return next
    })
  }

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  // Add Note Modal
  const handleOpenNote = (index: number) => {
    setActiveCartIndexForNote(index)
    setIsNoteOpen(true)
  }

  const handleSaveNote = (noteText: string) => {
    if (activeCartIndexForNote !== null) {
      setCart((prev) => {
        const next = [...prev]
        if (next[activeCartIndexForNote]) {
          next[activeCartIndexForNote] = {
            ...next[activeCartIndexForNote],
            specialNote: noteText,
          }
        }
        return next
      })
      showToast('Special note added to item', 'success')
    }
    setIsNoteOpen(false)
    setActiveCartIndexForNote(null)
  }

  // Apply coupon / loyalty points discount
  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride || couponInput).trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal,
          orderSubtotal: subtotal,
          customerId: selectedCustomer?.id,
          allowCashierOverride: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        throw new Error(data.error || data.message || 'Invalid coupon')
      }
      const discVal = Number(data.discount ?? data.coupon?.calculatedDiscount ?? 0)
      setAppliedCoupon({
        code: data.coupon.code,
        discountType: data.coupon.discountType,
        discountAmount: Number(data.coupon.discountAmount),
        discountVal: discVal,
        pointsCost: data.coupon.pointsCost,
        pointsReward: data.coupon.pointsReward,
      })
      setCouponInput('')
      showToast(
        data.message || `Coupon ${data.coupon.code} applied! -$${discVal.toFixed(2)}${data.coupon.pointsCost ? ` (${data.coupon.pointsCost} loyalty pts redeemed)` : ''}`,
        'success'
      )
    } catch (err: any) {
      showToast(err.message || 'Failed to apply coupon', 'error')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    showToast('Coupon removed', 'info')
  }

  // Item Form Modal for adding custom dishes with pictures
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)

  // Place Order / Send Directly to Kitchen (KDS)
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Please add items to check.', 'error')
      return
    }

    try {
      showToast('🔄 Sending order to Kitchen Display (KDS)...', 'info')

      // 1. Get or create the database order for this table
      //    POST /api/orders now returns the existing open order if table is ACTIVE
      const tableId = selectedTable?.id || tables[0]?.id
      if (!tableId) {
        showToast('No table selected. Please select a table first.', 'error')
        return
      }

      let targetOrderId = activeOrderId

      // Always confirm with the server — it handles ACTIVE table gracefully now
      const createRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          guestCount: 2,
          notes: orderType === 'Table' ? 'Dine In' : orderType,
        }),
      })

      if (createRes.ok) {
        const orderData = await createRes.json()
        targetOrderId = orderData.id
        setActiveOrderId(orderData.id)
        setOrderNumber(`#${orderData.id.slice(-5).toUpperCase()}`)
      } else {
        const errData = await createRes.json().catch(() => ({}))
        showToast(`Failed to create/find order: ${errData.error || createRes.statusText}`, 'error')
        return
      }

      // 2. Add cart items to the database order
      const itemsPayload = cart.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        seatNumber: 1,
        specialNote: item.specialNote || undefined,
        modifiers: item.modifiers || [],
      }))

      const itemsRes = await fetch(`/api/orders/${targetOrderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload }),
      })

      if (!itemsRes.ok) {
        const errData = await itemsRes.json().catch(() => ({}))
        showToast(`Failed to add items: ${errData.error || itemsRes.statusText}`, 'error')
        return
      }

      // 3. Fire tickets to Kitchen KDS stations
      const sendRes = await fetch(`/api/orders/${targetOrderId}/send`, {
        method: 'POST',
      })

      if (sendRes.ok) {
        const sendData = await sendRes.json()
        const ticketCount = sendData.tickets?.length || 0
        showToast(`✅ Order fired to Kitchen! ${ticketCount} ticket(s) sent. Check remains open for billing.`, 'success')

        // Clear pending cart items and load the updated check with kitchen tickets
        setCart([])
        await loadOrderIntoCheck(targetOrderId!)
        await fetchRecentOrders()
        fetchOpenOrders()
        router.refresh()
        return
      } else {
        const errData = await sendRes.json().catch(() => ({}))
        showToast(`Kitchen send failed: ${errData.error || sendRes.statusText}`, 'error')
        return
      }
    } catch (e: any) {
      showToast(e.message || 'Error sending order to kitchen', 'error')
    }
  }

  // Filter Dish List
  const filteredDishes = menuItems.filter((dish) => {
    if (selectedCategoryId !== 'all' && dish.categoryId !== selectedCategoryId) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!dish.name.toLowerCase().includes(q) && !dish.category?.name.toLowerCase().includes(q)) {
        return false
      }
    }
    if (vegFilter && !dish.isVeg) return false
    if (nonVegFilter && dish.isVeg) return false
    return true
  })

  // Filter Open Orders (all active, in-kitchen, not yet paid)
  const filteredOpenOrders = openOrders
    .filter((ro) => {
      if (recentOrderFilter === 'All Orders') return true
      return ro.type === recentOrderFilter
    })
    .slice(0, 8)

  // Filter Completed Orders (paid/settled)
  const filteredRecentOrders = recentOrders
    .filter((ro) => ro.status === 'PAID')
    .filter((ro) => {
      if (recentOrderFilter === 'All Orders') return true
      return ro.type === recentOrderFilter
    })
    .slice(0, 6)

  // Thermal Print Receipt
  const handlePrintReceipt = () => {
    window.print()
  }

  return (
    <div className="dream-pos-container">
      {/* ── TOP HEADER / NAVBAR ───────────────────────────────────────────── */}
      <header className="dream-pos-header">
        <div className="dream-pos-header__left">
          {/* App Switcher Dots */}
          <Link href="/dashboard" style={{ display: 'flex', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </Link>

          {/* Logo */}
          <Link href="/dashboard" className="dream-pos-logo">
            <span style={{ color: '#2563eb' }}>●</span>
            <span>Resto AI</span>
          </Link>

          {/* Center Navigation Pills */}
          <div className="dream-pos-nav-pills">
            <button className="dream-pos-nav-btn dream-pos-nav-btn--active">
              🛍️ POS
            </button>
            <Link href="/dashboard/orders" className="dream-pos-nav-btn">
              📋 Orders
            </Link>
            <Link href="/kds" className="dream-pos-nav-btn">
              🍳 Kitchen
            </Link>
            <Link href="/dashboard/reservations" className="dream-pos-nav-btn">
              📅 Reservation
            </Link>
            <button className="dream-pos-nav-btn" onClick={() => setIsTableFloorOpen(true)}>
              🪑 Table
            </button>
          </div>
        </div>

        {/* Right Tools & User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/dashboard/reports" style={{ color: 'var(--color-text-secondary)', display: 'flex' }} title="Reports">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </Link>

          <ThemeToggle />

          <Link href="/dashboard/settings" style={{ color: 'var(--color-text-secondary)', display: 'flex' }} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </Link>

          {/* User Profile Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 800,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'SM'}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (SPLIT SCREEN) ──────────────────────────────────── */}
      <div className="dream-pos-body">
        {/* ── LEFT PANEL: Recent Orders & Menu Catalog (~68%) ─────────────── */}
        <main className="dream-pos-main">
          {/* Section 1: Orders Strip — Open Orders + Completed Tabs */}
          <div className="dream-recent-strip">
            {/* Tab header */}
            <div className="dream-recent-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Tab buttons */}
                <button
                  onClick={() => setOrdersTab('open')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: ordersTab === 'open' ? '#ef4444' : 'var(--color-bg-raised)',
                    color: ordersTab === 'open' ? '#fff' : 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  🔴 Open Orders
                  {openOrders.length > 0 && (
                    <span style={{ background: ordersTab === 'open' ? 'rgba(255,255,255,0.3)' : '#ef4444', color: ordersTab === 'open' ? '#fff' : '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>
                      {openOrders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setOrdersTab('completed')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: ordersTab === 'completed' ? '#16a34a' : 'var(--color-bg-raised)',
                    color: ordersTab === 'completed' ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  ✅ Completed ({filteredRecentOrders.length})
                </button>
              </div>

              {/* Type Filter Pills */}
              <div className="dream-filter-pills">
                {(['All Orders', 'Dine In', 'Take Away', 'Delivery'] as const).map((filter) => (
                  <button
                    key={filter}
                    className={`dream-filter-pill ${recentOrderFilter === filter ? 'dream-filter-pill--active' : ''}`}
                    onClick={() => setRecentOrderFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* ── OPEN ORDERS TAB ─────────────────────────────── */}
            {ordersTab === 'open' && (
              filteredOpenOrders.length === 0 ? (
                <div style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                  No active orders in kitchen. Start a new order on the right ▶
                </div>
              ) : (
                <div className="dream-orders-carousel">
                  {filteredOpenOrders.map((ro) => {
                    const statusColor =
                      ro.timerLabel.includes('Ready') ? '#16a34a' :
                      ro.timerLabel.includes('Kitchen') ? '#f97316' : '#6366f1'
                    const isLoaded = activeOrderId === ro.id
                    return (
                      <div
                        key={ro.id}
                        className={`dream-order-pill-card ${isLoaded ? 'dream-order-pill-card--active' : ''}`}
                        onClick={() => loadOrderIntoCheck(ro.id)}
                        title="Click to load into billing check drawer"
                        style={{
                          cursor: 'pointer',
                          borderColor: isLoaded ? '#2563eb' : `${statusColor}55`,
                          background: isLoaded ? 'rgba(37,99,235,0.06)' : 'var(--color-bg-card)',
                        }}
                      >
                        <div className="dream-order-pill-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                              {ro.orderNumber}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${statusColor}22`, color: statusColor }}>
                              {ro.timerLabel}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: ro.type === 'Take Away' ? 'rgba(234,179,8,0.15)' : ro.type === 'Delivery' ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.12)',
                            color: ro.type === 'Take Away' ? '#b45309' : ro.type === 'Delivery' ? '#7c3aed' : '#2563eb',
                          }}>
                            {ro.type === 'Delivery' && '🚚 Delivery'}
                            {ro.type === 'Take Away' && '🛍️ Take Away'}
                            {ro.type === 'Dine In' && '🪑 Dine In'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              {ro.customerName}
                            </h4>
                            <span style={{ fontSize: 11, color: '#2563eb', marginTop: 2, display: 'block', fontWeight: 600 }}>
                              {isLoaded ? '✅ Loaded in Billing' : '💳 Click to Bill'}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              {ro.total > 0 ? `$${ro.total.toFixed(2)}` : '—'}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{ro.time}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="dream-order-progress" style={{ marginTop: 6 }}>
                          <div
                            className="dream-order-progress-fill"
                            style={{ width: `${ro.progress}%`, background: statusColor }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* ── COMPLETED ORDERS TAB ────────────────────────── */}
            {ordersTab === 'completed' && (
              filteredRecentOrders.length === 0 ? (
                <div style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                  No completed paid orders found for {recentOrderFilter}.
                </div>
              ) : (
                <div className="dream-orders-carousel">
                  {filteredRecentOrders.map((ro) => (
                    <div
                      key={ro.id}
                      className="dream-order-pill-card"
                      onClick={() => openOrderStatement(ro.id)}
                      title="Settled — click to view statement"
                      style={{ cursor: 'pointer', borderColor: 'rgba(34,197,94,0.35)' }}
                    >
                      <div className="dream-order-pill-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>{ro.orderNumber}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>PAID</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                          {ro.type === 'Delivery' && '🚚 Delivery'}
                          {ro.type === 'Take Away' && '🛍️ Take Away'}
                          {ro.type === 'Dine In' && '🪑 Dine In'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>{ro.customerName}</h4>
                          <span style={{ fontSize: 11, color: '#16a34a', marginTop: 2, display: 'block', fontWeight: 600 }}>📄 View Statement</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>${ro.total.toFixed(2)}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{ro.time}</div>
                        </div>
                      </div>
                      <div className="dream-order-progress" style={{ marginTop: 6 }}>
                        <div className="dream-order-progress-fill" style={{ width: '100%', background: '#22c55e' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Section 2: Menu Categories & Filter Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="dream-cat-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Menu Categories
                </h3>
                <button
                  onClick={() => setIsAddItemModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: '1px solid #2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                    cursor: 'pointer',
                  }}
                  title="Upload dish photo and add custom menu item"
                >
                  <span>📷 + Add Dish</span>
                </button>
              </div>

              {/* Dietary Checkboxes & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#16a34a' }}>
                  <input
                    type="checkbox"
                    checked={vegFilter}
                    onChange={(e) => {
                      setVegFilter(e.target.checked)
                      if (e.target.checked) setNonVegFilter(false)
                    }}
                  />
                  <span>⧅ Veg</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#ef4444' }}>
                  <input
                    type="checkbox"
                    checked={nonVegFilter}
                    onChange={(e) => {
                      setNonVegFilter(e.target.checked)
                      if (e.target.checked) setVegFilter(false)
                    }}
                  />
                  <span>⧅ Non Veg</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#eab308' }}>
                  <input
                    type="checkbox"
                    checked={eggFilter}
                    onChange={(e) => setEggFilter(e.target.checked)}
                  />
                  <span>⧅ Egg</span>
                </label>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: 180 }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 28px 6px 10px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 12 }}>
                    🔍
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal Category Cards Strip */}
            <div className="dream-cat-cards-row">
              <div
                className={`dream-cat-card ${selectedCategoryId === 'all' ? 'dream-cat-card--active' : ''}`}
                onClick={() => setSelectedCategoryId('all')}
              >
                <Image
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&h=120&fit=crop&q=80"
                  alt="All Menus"
                  width={36}
                  height={36}
                  className="dream-cat-thumb"
                  unoptimized
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    All Menus
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {menuItems.length} Menus
                  </span>
                </div>
              </div>

              {categories.map((cat) => {
                const count = menuItems.filter((m) => m.categoryId === cat.id).length
                const img = cat.imageUrl || getImageForDish(cat.name)
                return (
                  <div
                    key={cat.id}
                    className={`dream-cat-card ${selectedCategoryId === cat.id ? 'dream-cat-card--active' : ''}`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <Image
                      src={img}
                      alt={cat.name}
                      width={36}
                      height={36}
                      className="dream-cat-thumb"
                      unoptimized
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {cat.name}
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        {count > 0 ? `${count} Menus` : 'Available'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 3: Menu Dishes 4-Column Responsive Grid */}
          <div className="dream-dish-grid">
            {filteredDishes.map((dish) => {
              const inCartItem = cart.find((i) => i.menuItemId === dish.id)
              const qtyInCart = inCartItem?.quantity || 0

              return (
                <div key={dish.id} className="dream-dish-card">
                  <div className="dream-dish-img-wrap" onClick={() => handleAddToCart(dish)} style={{ cursor: 'pointer' }}>
                    <Image
                      src={dish.imageUrl || getImageForDish(dish.name)}
                      alt={dish.name}
                      width={280}
                      height={180}
                      className="dream-dish-img"
                      unoptimized
                    />
                    {dish.isTrending && (
                      <span className="dream-dish-badge-top dream-dish-badge--trending">
                        🔥 Trending
                      </span>
                    )}
                    {dish.isMustTry && (
                      <span className="dream-dish-badge-top dream-dish-badge--musttry">
                        ✨ Must Try
                      </span>
                    )}
                  </div>

                  <div className="dream-dish-content">
                    <div className="dream-dish-meta-row">
                      <span>{dish.category?.name || 'Main'}</span>
                      <span className={`dream-veg-tag ${dish.isVeg ? 'dream-veg-tag--veg' : 'dream-veg-tag--nonveg'}`}>
                        <span>⧅</span> {dish.isVeg ? 'Veg' : 'Non Veg'}
                      </span>
                    </div>

                    <h4
                      className="dream-dish-title"
                      title={dish.name}
                      onClick={() => handleAddToCart(dish)}
                      style={{ cursor: 'pointer' }}
                    >
                      {dish.name}
                    </h4>

                    <div className="dream-dish-bottom-row">
                      <span className="dream-dish-price">${dish.price.toFixed(2)}</span>

                      <div className="dream-qty-control">
                        <button
                          className="dream-qty-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            const idx = cart.findIndex((i) => i.menuItemId === dish.id)
                            if (idx > -1) handleUpdateQty(idx, -1)
                          }}
                        >
                          −
                        </button>
                        <span className="dream-qty-val">{qtyInCart > 0 ? qtyInCart : 1}</span>
                        <button
                          className="dream-qty-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddToCart(dish)
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </main>

        {/* ── RIGHT PANEL: Active Order Cart Drawer (~32%) ─────────────────── */}
        <aside className="dream-pos-sidebar">
          {/* Order Header */}
          <div className="dream-cart-header">
            <div className="dream-cart-title-row">
              <span className="dream-cart-order-num" suppressHydrationWarning>Order {orderNumber}</span>
              <span className="dream-cart-time" suppressHydrationWarning>{currentTime}</span>
            </div>

            {/* Order Type Tabs */}
            <div className="dream-cart-type-tabs">
              {(['Dine In', 'Take Away', 'Delivery', 'Table'] as const).map((type) => (
                <button
                  key={type}
                  className={`dream-cart-type-tab ${orderType === type ? 'dream-cart-type-tab--active' : ''}`}
                  onClick={() => {
                    setOrderType(type)
                    if (type === 'Table') setIsTableFloorOpen(true)
                    if (activeOrderId) {
                      fetch(`/api/orders/${activeOrderId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: type }),
                      }).catch(() => {})
                    }
                  }}
                >
                  {type === 'Dine In' && '🪑 Dine In'}
                  {type === 'Take Away' && '🛍️ Take Away'}
                  {type === 'Delivery' && '🚚 Delivery'}
                  {type === 'Table' && '🪑 Table'}
                </button>
              ))}
            </div>

            {/* Waiter & Customer Selectors */}
            <div className="dream-cart-selectors">
              <select
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              >
                <option value="Sarah Manager">Waiter: Sarah Manager</option>
                <option value="John Server">Waiter: John Server</option>
                <option value="Emma Host">Waiter: Emma Host</option>
              </select>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedCustomer ? `👤 ${selectedCustomer.name}` : 'Select Customer ▾'}
                </button>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  style={{
                    padding: '0 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Ordered Menus Cart List */}
          <div className="dream-cart-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Ordered Menus
              </h4>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                Total Menus : {totalItemCount}
              </span>
            </div>

            {/* Items already fired to kitchen */}
            {sentItems.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {activeOrderStatus === 'PAID' ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10,
                    padding: '12px 14px', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.16) 0%, rgba(16, 185, 129, 0.08) 100%)',
                    borderRadius: 10, border: '1.5px solid #22c55e',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>✓</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>ORDER SETTLED & PAID</div>
                          <div style={{ fontSize: 11, color: '#15803d' }}>Payment received. Check is closed.</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#22c55e', color: '#fff' }}>
                        ✓ PAID
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => openOrderStatement(activeOrderId!)}
                        style={{
                          flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #22c55e',
                          backgroundColor: '#ffffff', color: '#16a34a', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        📄 View Statement / Receipt
                      </button>
                      <button
                        onClick={handleStartNewCheck}
                        style={{
                          flex: 1, padding: '7px 10px', borderRadius: 6, border: 'none',
                          backgroundColor: '#22c55e', color: '#ffffff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        + New Check
                      </button>
                    </div>
                  </div>
                ) : sentItems.every((i) => i.status === 'SERVED') ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
                    padding: '8px 12px', background: 'rgba(34, 197, 94, 0.12)', borderRadius: 8,
                    border: '1px solid #22c55e',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🍽️</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>Dishes Prepared & Served</div>
                        <div style={{ fontSize: 10, color: '#15803d' }}>Meal served to guest · Check ready to bill</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#22c55e', color: '#fff' }}>
                      ✓ SERVED
                    </span>
                  </div>
                ) : sentItems.every((i) => i.status === 'READY' || i.status === 'SERVED') ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
                    padding: '8px 12px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: 8,
                    border: '1px solid #3b82f6',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🔔</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>Dishes Ready at Pass</div>
                        <div style={{ fontSize: 10, color: '#1d4ed8' }}>Kitchen finished cooking · Deliver to table</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#3b82f6', color: '#fff' }}>
                      🔔 READY
                    </span>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
                    padding: '8px 12px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: 8,
                    border: '1px solid #f59e0b',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🍳</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706' }}>Dishes Cooking in Kitchen</div>
                        <div style={{ fontSize: 10, color: '#b45309' }}>Tickets fired to KDS stations</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#f59e0b', color: '#fff' }}>
                      COOKING
                    </span>
                  </div>
                )}
                {sentItems.map((item, idx) => (
                  <div key={`sent-${item.id}-${idx}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', marginBottom: 6,
                    background: 'var(--color-bg-raised)', borderRadius: 8,
                    borderLeft: `3px solid ${item.status === 'SERVED' ? '#16a34a' : item.status === 'READY' ? '#2563eb' : '#f59e0b'}`,
                    opacity: 0.95,
                  }}>
                    <Image
                      src={item.imageUrl || '/placeholder-dish.jpg'}
                      alt={item.name}
                      width={36} height={36}
                      style={{ borderRadius: 6, objectFit: 'cover' }}
                      unoptimized
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        {item.portion || 'Standard'} {item.specialNote ? `• Note: "${item.specialNote}"` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {item.quantity}x · ${(item.price * item.quantity).toFixed(2)}
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: item.status === 'SERVED' ? 'rgba(34, 197, 94, 0.15)' : item.status === 'READY' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: item.status === 'SERVED' ? '#16a34a' : item.status === 'READY' ? '#2563eb' : '#d97706',
                      }}>
                        {item.status === 'SERVED' ? '🍽️ Served' : item.status === 'READY' ? '🔔 Ready' : '🍳 Cooking'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New items pending in cart */}
            {cart.length > 0 && (
              <div style={{ marginTop: sentItems.length > 0 ? 12 : 10 }}>
                {sentItems.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                    padding: '4px 10px', background: '#f59e0b18', borderRadius: 6,
                  }}>
                    <span style={{ fontSize: 12 }}>🛒</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>Pending — not yet sent</span>
                  </div>
                )}
                {cart.map((item, idx) => (
                  <div key={item.id} className="dream-cart-item-card">
                    <div className="dream-cart-item-top">
                      <Image
                        src={item.imageUrl || '/placeholder-dish.jpg'}
                        alt={item.name}
                        width={44} height={44}
                        className="dream-cart-item-img"
                        unoptimized
                      />
                      <div className="dream-cart-item-info">
                        <span className="dream-cart-item-name">{item.name}</span>
                        <span className="dream-cart-item-portion">{item.portion || 'Standard'}</span>
                      </div>
                      <div className="dream-cart-item-controls">
                        <button className="dream-qty-btn" onClick={() => handleUpdateQty(idx, -1)}>-</button>
                        <span className="dream-qty-val">{item.quantity}</span>
                        <button className="dream-qty-btn" onClick={() => handleUpdateQty(idx, 1)}>+</button>
                      </div>
                      <button
                        onClick={() => handleOpenNote(idx)}
                        style={{
                          padding: '3px 8px', fontSize: '11px', fontWeight: 700,
                          borderRadius: '6px', border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)', cursor: 'pointer',
                        }}
                      >
                        Add Note
                      </button>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        style={{ border: 'none', background: 'transparent', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="dream-cart-item-sub">
                      <span>Item Rate: ${item.price.toFixed(2)}</span>
                      <span>Amount: ${(item.price * item.quantity).toFixed(2)}</span>
                      <strong style={{ color: 'var(--color-text-primary)' }}>Total: ${(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {cart.length === 0 && sentItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-tertiary)' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🛒</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Your check is currently empty.</p>
                <p style={{ margin: '4px 0 0', fontSize: 11 }}>Click items on the left menu to add dishes.</p>
              </div>
            )}
          </div>

          {/* Cart Footer: Summary & Actions */}

          <div className="dream-cart-footer">
            {/* Promo / Coupon & Loyalty Points Section */}
            {activeOrderStatus !== 'PAID' && (
              <div style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--color-bg-raised, #f8fafc)', borderRadius: 10, border: '1px solid var(--color-border, #e2e8f0)' }}>
                {appliedCoupon ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 8px', borderRadius: 6 }}>
                        🎟️ {appliedCoupon.code}
                      </span>
                      {appliedCoupon.pointsCost ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#eab308' }}>
                          ⭐ {appliedCoupon.pointsCost} pts
                        </span>
                      ) : null}
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        (-${couponDiscount.toFixed(2)})
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      title="Remove Coupon"
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Coupon / Loyalty code..."
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleApplyCoupon()
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        borderRadius: 6,
                        border: '1px solid var(--color-border, #cbd5e1)',
                        background: 'var(--color-bg, #ffffff)',
                        color: 'var(--color-text-primary, #0f172a)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      disabled={couponLoading || !couponInput.trim()}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: '#2563eb',
                        color: '#fff',
                        cursor: couponLoading || !couponInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: couponLoading || !couponInput.trim() ? 0.6 : 1,
                      }}
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Payment Summary */}

            <div className="dream-payment-summary">
              {sentItems.length > 0 && (
                <div className="dream-pay-row" style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  <span>🍳 Kitchen (sent)</span>
                  <span>${sentSubtotal.toFixed(2)}</span>
                </div>
              )}
              {cart.length > 0 && (
                <div className="dream-pay-row" style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  <span>🛒 Pending</span>
                  <span>${cartSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="dream-pay-row">
                <span>Sub Total</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              {appliedCoupon && (
                <div className="dream-pay-row" style={{ color: '#16a34a' }}>
                  <span>Discount ({appliedCoupon.code})</span>
                  <strong>-${couponDiscount.toFixed(2)}</strong>
                </div>
              )}
              {appliedCoupon?.pointsCost ? (
                <div className="dream-pay-row" style={{ color: '#eab308', fontSize: 11 }}>
                  <span>⭐ Loyalty Points Redeemed</span>
                  <strong>-{appliedCoupon.pointsCost} pts</strong>
                </div>
              ) : null}
              <div className="dream-pay-row">
                <span>Tax (10%)</span>
                <strong>${tax.toFixed(2)}</strong>
              </div>
              <div className="dream-pay-total-row">
                <span>{activeOrderStatus === 'PAID' ? 'Total Paid (Settled)' : 'Amount to be Paid'}</span>
                <span style={{ color: activeOrderStatus === 'PAID' ? '#16a34a' : '#2563eb' }}>
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Primary Actions */}
            {activeOrderStatus === 'PAID' ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => openOrderStatement(activeOrderId!)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #16a34a',
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: '#16a34a',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  📄 View Statement / Receipt
                </button>
                <button
                  onClick={handleStartNewCheck}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  + New Check
                </button>
              </div>
            ) : (
              <>
                {cart.length > 0 && (
                  <button className="dream-btn-place-order" onClick={handlePlaceOrder}>
                    🍳 Send to Kitchen (Fire)
                  </button>
                )}

                {/* Checkout / Print Bill - shown when there are sent items */}
                {sentItems.length > 0 && cart.length === 0 && (
                  <button
                    className="dream-btn-place-order"
                    style={{ background: '#22c55e', marginTop: 6 }}
                    onClick={() => setIsCheckoutOpen(true)}
                  >
                    💳 Checkout — Generate Bill
                  </button>
                )}

                {/* If both have items, show both buttons side-by-side */}
                {sentItems.length > 0 && cart.length > 0 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="dream-btn-place-order" onClick={handlePlaceOrder} style={{ flex: 1 }}>
                      🍳 Fire More
                    </button>
                    <button
                      onClick={() => setIsCheckoutOpen(true)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                        background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      💳 Checkout
                    </button>
                  </div>
                )}

                {/* Show Send to Kitchen even if no sentItems */}
                {sentItems.length === 0 && cart.length === 0 && (
                  <button className="dream-btn-place-order" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    🍳 Send to Kitchen
                  </button>
                )}
              </>
            )}

            {/* 6 Action Buttons Grid */}
            <div className="dream-cart-action-grid">
              <button
                className="dream-cart-action-btn"
                onClick={() => {
                  handlePlaceOrder()
                  handlePrintReceipt()
                }}
              >
                🖨️ Send & Print
              </button>
              <button className="dream-cart-action-btn" onClick={() => setIsInvoiceOpen(true)}>
                🧾 Invoice
              </button>
              <button
                className="dream-cart-action-btn"
                onClick={() => {
                  showToast(`Order ${orderNumber} placed on Draft / Hold`, 'info')
                }}
              >
                📝 Hold / Draft
              </button>
              <button
                className="dream-cart-action-btn"
                onClick={() => {
                  if (cart.length === 0) {
                    showToast('No pending items to cancel', 'info')
                    return
                  }
                  if (confirm('Remove pending (unsent) items from check?')) {
                    setCart([])
                    showToast('Pending items removed', 'info')
                  }
                }}
              >
                ✕ Cancel Pending
              </button>
              <button
                className="dream-cart-action-btn"
                style={{ color: '#ef4444' }}
                onClick={() => {
                  if (confirm(`VOID entire check ${orderNumber}? This will clear all items including sent ones.`)) {
                    setCart([])
                    setSentItems([])
                    setActiveOrderId(null)
                    setOrderNumber(`#${Math.random().toString(36).substr(2, 5).toUpperCase()}`)
                    showToast(`Check ${orderNumber} voided & cleared`, 'warning')
                  }
                }}
              >
                ⚡ Void All
              </button>
              {activeOrderStatus === 'PAID' ? (
                <button
                  className="dream-cart-action-btn"
                  style={{ color: '#16a34a', fontWeight: 800 }}
                  onClick={() => openOrderStatement(activeOrderId!)}
                >
                  📄 Statement
                </button>
              ) : (
                <button
                  className="dream-cart-action-btn"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  💳 Checkout
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── MODALS INTEGRATION ────────────────────────────────────────────── */}

      {/* 1. Modifier Selector Modal */}
      {isModifierOpen && selectedMenuItem && (
        <ModifierSelector
          isOpen={isModifierOpen}
          menuItem={selectedMenuItem as any}
          onClose={() => {
            setIsModifierOpen(false)
            setSelectedMenuItem(null)
          }}
          onConfirm={(mods: any[]) => {
            const extraDelta = mods.reduce((sum: number, m: any) => sum + m.priceDelta, 0)
            setCart((prev) => [
              ...prev,
              {
                id: `cart-${Date.now()}`,
                menuItemId: selectedMenuItem.id,
                name: selectedMenuItem.name,
                price: selectedMenuItem.price + extraDelta,
                quantity: 1,
                portion: mods.length > 0 ? mods.map((m: any) => m.optionName).join(', ') : 'Custom',
                modifiers: mods,
                specialNote: null,
                imageUrl: selectedMenuItem.imageUrl || getImageForDish(selectedMenuItem.name),
                isVeg: selectedMenuItem.isVeg,
              },
            ])
            setIsModifierOpen(false)
            setSelectedMenuItem(null)
            showToast(`Added ${selectedMenuItem.name} to check`, 'success')
          }}
        />
      )}

      {/* 2. Item Special Note Modal */}
      {isNoteOpen && activeCartIndexForNote !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsNoteOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              width: '90%',
              maxWidth: 420,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              📝 Special Note for {cart[activeCartIndexForNote]?.name || 'Dish'}
            </h3>
            <textarea
              id="item-special-note-input"
              rows={3}
              defaultValue={cart[activeCartIndexForNote]?.specialNote || ''}
              placeholder="e.g. Extra spicy, sauce on the side, no onions..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                outline: 'none',
                resize: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => {
                  const el = document.getElementById('item-special-note-input') as HTMLTextAreaElement
                  handleSaveNote(el ? el.value : '')
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save Note
              </button>
              <button
                onClick={() => setIsNoteOpen(false)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-bg-raised)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Table Floor Map Selector Modal */}
      {isTableFloorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsTableFloorOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              width: '90%',
              maxWidth: 680,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                🪑 Floor Plan Tables
              </h3>
              <button
                onClick={() => setIsTableFloorOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {tables.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    handleSelectTable(t)
                  }}
                  style={{
                    backgroundColor: selectedTable?.id === t.id ? 'rgba(37, 99, 235, 0.1)' : 'var(--color-bg)',
                    border: `1.5px solid ${selectedTable?.id === t.id ? '#2563eb' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    Capacity: {t.capacity} Guests
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: t.status === 'ACTIVE' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: t.status === 'ACTIVE' ? '#2563eb' : '#16a34a',
                    }}
                  >
                    {t.status === 'ACTIVE' ? 'Occupied' : 'Available'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Invoice Receipt Modal */}
      {isInvoiceOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsInvoiceOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              width: '90%',
              maxWidth: 420,
              fontFamily: 'monospace',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: 12, marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>RESTO AI</h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Modern Restaurant POS</p>
              <p style={{ margin: '2px 0 0', fontSize: 11 }} suppressHydrationWarning>Order: {orderNumber} · {currentTime}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px dashed #cbd5e1', paddingBottom: 12, marginBottom: 12 }}>
              {[...sentItems, ...cart].map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{item.quantity}x {item.name} {item.status ? `(${item.status})` : ''}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-${couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {appliedCoupon?.pointsCost ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                  <span>⭐ Loyalty Points Redeemed</span>
                  <span>-{appliedCoupon.pointsCost} pts</span>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900, marginTop: 4 }}>
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button
                onClick={handlePrintReceipt}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Print Receipt
              </button>
              <button
                onClick={() => setIsInvoiceOpen(false)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#e2e8f0',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          order={{
            id: activeOrderId || `temp-${Date.now()}`,
            tableId: selectedTable?.id || 'table-1',
            guestCount: 2,
            notes: appliedCoupon ? `Coupon: ${appliedCoupon.code} (-$${couponDiscount.toFixed(2)})` : null,
            originalSubtotal: subtotal,
            subtotal: discountedSubtotal,
            tax,
            total,
            status: activeOrderStatus || 'OPEN',
            table: { name: selectedTable?.name || 'Table 1' },
            items: [...sentItems, ...cart].map((i) => ({
              id: i.id,
              quantity: i.quantity,
              priceAtOrder: i.price,
              modifiers: i.modifiers,
              specialNote: i.specialNote || null,
              menuItem: { name: i.name },
            })),
          }}
          initialCoupon={appliedCoupon}
          onCouponChange={(c) => setAppliedCoupon(c)}
          onClose={() => setIsCheckoutOpen(false)}
          onComplete={() => {
            showToast(`Payment completed for Order ${orderNumber}!`, 'success')
            setIsCheckoutOpen(false)
            setCart([])
            setSentItems([])
            setActiveOrderId(null)
            setActiveOrderStatus(null)
            setAppliedCoupon(null)
            setCouponInput('')
            setOrderNumber(`#${Math.random().toString(36).substr(2, 5).toUpperCase()}`)
            fetchRecentOrders()
            fetchOpenOrders()
            setOrdersTab('completed') // Switch to Completed tab to confirm payment
          }}
          showToast={(msg: string, variant: 'success' | 'error') => showToast(msg, variant)}
        />
      )}

      {/* 6. Add Custom Dish Modal (with Image Upload / Photo URL) */}
      {isAddItemModalOpen && (
        <ItemFormModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          categories={categories}
          currentCategoryId={selectedCategoryId !== 'all' ? selectedCategoryId : categories[0]?.id}
          showToast={showToast}
          onSave={async () => {
            setIsAddItemModalOpen(false)
            showToast('New dish with picture created!', 'success')
            try {
              const res = await fetch('/api/menu/items?includeUnavailable=false')
              if (res.ok) {
                const freshItems = await res.json()
                setMenuItems(
                  freshItems.map((m: any, idx: number) => ({
                    id: m.id,
                    categoryId: m.categoryId,
                    name: m.name,
                    description: m.description,
                    price: Number(m.price),
                    imageUrl: m.imageUrl || getImageForDish(m.name),
                    isAvailable: m.isAvailable,
                    category: m.category ? { id: m.category.id, name: m.category.name } : undefined,
                    modifiers: m.modifiers,
                    isTrending: idx === 0 || idx === 2,
                    isMustTry: idx === 1 || idx === 3,
                    isVeg:
                      m.name.toLowerCase().includes('bruschetta') ||
                      m.name.toLowerCase().includes('burrata') ||
                      m.name.toLowerCase().includes('fondant') ||
                      m.name.toLowerCase().includes('veg'),
                  }))
                )
              }
            } catch {}
          }}
        />
      )}

      {/* 7. Order Statement Modal for Settled / Paid Orders */}
      {isStatementModalOpen && statementOrder && (
        <OrderStatementModal
          isOpen={isStatementModalOpen}
          order={statementOrder}
          onClose={() => {
            setIsStatementModalOpen(false)
            setStatementOrder(null)
          }}
        />
      )}
    </div>
  )
}
