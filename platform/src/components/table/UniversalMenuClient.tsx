'use client'

import React, { useState, useEffect } from 'react'

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable: boolean
  is86d: boolean
  kdsStation?: string
}

interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
}

interface TableOption {
  id: string
  name: string
  capacity: number
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  specialNote: string
}

export function UniversalMenuClient({ locationId }: { locationId: string }) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [tables, setTables] = useState<TableOption[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Diner info for order
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [menuRes, tableRes] = await Promise.all([
          fetch(`/api/menu/categories?locationId=${locationId}`),
          fetch(`/api/tables?locationId=${locationId}`),
        ])

        const menuData = await menuRes.json()
        const tableData = await tableRes.json()

        if (Array.isArray(menuData)) {
          setCategories(menuData)
        }
        if (Array.isArray(tableData)) {
          setTables(tableData)
          if (tableData.length > 0) {
            setSelectedTableId(tableData[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load menu & tables', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [locationId])

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id)
      if (existing) {
        return prev.map((c) => (c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
      }
      return [...prev, { menuItem: item, quantity: 1, specialNote: '' }]
    })
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItem.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    )
  }

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return
    if (!selectedTableId) {
      alert('Please select your dining table number before sending the order.')
      return
    }

    setSubmittingOrder(true)
    try {
      const payload = {
        locationId,
        tableId: selectedTableId,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          specialNote: c.specialNote || undefined,
        })),
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        notes: orderNotes.trim() || undefined,
      }

      const res = await fetch('/api/table-order/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to place order')
      } else {
        setOrderSuccess(data)
        setCart([])
        setShowCartDrawer(false)
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error submitting order')
    } finally {
      setSubmittingOrder(false)
    }
  }

  // Filter items across categories
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = activeCategoryId === 'ALL' || cat.id === activeCategoryId
      return matchesSearch && matchesCategory
    }),
  })).filter((cat) => cat.items.length > 0)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Loading Digital Food Menu...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#ffffff', padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>Order Fired Directly to Kitchen!</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0' }}>
            Your dishes are now firing in the kitchen and live on the chef&apos;s KDS screen.
          </p>

          <div style={{ backgroundColor: '#1b1b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Dining Table:</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>{orderSuccess.tableName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Status:</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>● LIVE IN KITCHEN (KDS)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>Total Check:</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                ${Number(orderSuccess.total || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setOrderSuccess(null)}
            style={{ width: '100%', padding: '14px', backgroundColor: 'var(--color-bg-card)', color: '#000000', border: '1px solid #ffffff', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
          >
            ➕ Order More Food &amp; Drinks
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#ffffff', fontFamily: 'system-ui, sans-serif', paddingBottom: '90px' }}>
      {/* Top Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(10,10,12,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Resto
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#d4d4d8', border: '1px solid rgba(255,255,255,0.12)' }}>
                📱 DINE-IN DIGITAL MENU
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
              Order direct to kitchen from your phone
            </div>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            style={{ position: 'relative', padding: '8px 14px', backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff', borderRadius: '8px', color: '#000000', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🛒</span>
            <span>Check</span>
            {totalItemCount > 0 && (
              <span style={{ backgroundColor: '#000000', color: '#ffffff', borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: 800 }}>
                {totalItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Table Selector Banner */}
        <div style={{ maxWidth: '640px', margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '10px' }}>
          <span style={{ fontSize: '13px' }}>🪑</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>Seated at:</span>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: '#1b1b22',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Cap: {t.capacity})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: '640px', margin: '10px auto 0' }}>
          <input
            type="text"
            placeholder="🔍 Search appetizers, pizzas, pastas, drinks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#16161c', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ maxWidth: '640px', margin: '10px auto 0', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategoryId('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: activeCategoryId === 'ALL' ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
              backgroundColor: activeCategoryId === 'ALL' ? '#ffffff' : '#16161c',
              color: activeCategoryId === 'ALL' ? '#000000' : 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🍽️ All Dishes ({categories.reduce((s, c) => s + c.items.length, 0)})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: activeCategoryId === cat.id ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: activeCategoryId === cat.id ? '#ffffff' : '#16161c',
                color: activeCategoryId === cat.id ? '#000000' : 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </div>
      </header>

      {/* Main Menu Feed */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍽️</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>No Dishes Found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try searching for a different dish name</div>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>{category.name}</h2>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>({category.items.length} items)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {category.items.map((item) => {
                  const cartEntry = cart.find((c) => c.menuItem.id === item.id)
                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: '#141418',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '14px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff' }}>{item.name}</h3>
                          {item.kdsStation === 'BAR' && (
                            <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(139,92,246,0.2)', color: '#8b5cf6' }}>🍷 BAR</span>
                          )}
                        </div>
                        {item.description && (
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '6px 0 10px 0', lineHeight: 1.4 }}>
                            {item.description}
                          </p>
                        )}
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                          ${Number(item.price).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                        <button
                          onClick={() => addToCart(item)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--color-bg-card)',
                            border: '1px solid #ffffff',
                            borderRadius: '8px',
                            color: '#000000',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                        >
                          + Add
                        </button>
                        {cartEntry && (
                          <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600, marginTop: '6px' }}>
                            {cartEntry.quantity} in check
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Bottom Check Bar */}
      {totalItemCount > 0 && !showCartDrawer && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 50, maxWidth: '608px', margin: '0 auto' }}>
          <div
            onClick={() => setShowCartDrawer(true)}
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: '12px',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: '#000000', color: '#ffffff', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                {totalItemCount}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#000000' }}>View Table Check</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#000000', fontFamily: 'monospace' }}>
              ${total.toFixed(2)} →
            </div>
          </div>
        </div>
      )}

      {/* Cart & Self-Checkout Drawer */}
      {showCartDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', backgroundColor: '#141418', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Drawer Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>🛒 Review Order</h3>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Fires directly to kitchen KDS screen</div>
              </div>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#1a1a22', borderRadius: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{item.menuItem.name}</div>
                    <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                      ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => updateQuantity(item.menuItem.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#272730', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>-</button>
                    <span style={{ fontSize: '14px', fontWeight: 800, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuItem.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff', color: '#000000', fontWeight: 700, cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              ))}

              {/* Guest Details */}
              <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                  Guest Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', marginBottom: '10px' }}
                />

                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', marginBottom: '10px' }}
                />

                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                  Special Kitchen Notes / Allergies ⚠️
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, gluten allergy, sauce on side"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px' }}
                />
              </div>

              {/* Totals */}
              <div style={{ marginTop: '8px', backgroundColor: '#1a1a22', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                  <span>Total Check</span>
                  <span style={{ color: '#10b981', fontFamily: 'monospace' }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={handleSubmitOrder}
                disabled={submittingOrder || cart.length === 0}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid #ffffff',
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: submittingOrder || cart.length === 0 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {submittingOrder ? 'Firing to Kitchen KDS...' : `🚀 Fire Order to Kitchen ($${total.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
