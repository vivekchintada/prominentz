'use client'

import React, { useState, useEffect } from 'react'

interface ModifierOption {
  id: string
  name: string
  priceAdjustment: number
}

interface ModifierGroup {
  id: string
  name: string
  isRequired: boolean
  options: ModifierOption[]
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable: boolean
  is86d: boolean
  kdsStation?: string
  modifiers?: ModifierGroup[]
}

interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  selectedModifiers?: ModifierOption[]
  specialNote: string
}

interface TableOrderClientProps {
  locationId: string
  tableId: string
}

export function TableOrderClient({ locationId, tableId }: TableOrderClientProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItem | null>(null)
  const [selectedMods, setSelectedMods] = useState<ModifierOption[]>([])
  const [itemNote, setItemNote] = useState('')

  // Diner info for order
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<any>(null)

  // AI Diner Concierge
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMessages, setAiMessages] = useState<Array<{
    sender: 'user' | 'assistant'
    text: string
    dishCards?: Array<{ id: string; name: string; price: number; category: string; is86d: boolean; dietary: string[] }>
    suggestedPills?: string[]
  }>>([
    {
      sender: 'assistant',
      text: "👋 Welcome! I am your **RestoIQ Digital Sommelier & Concierge**.\n\nAsk me anything about our dishes, allergen safety, preparation, or wine pairings!",
      suggestedPills: [
        '🍷 What wine pairs with Ribeye?',
        '🌱 Which dishes are vegetarian?',
        '🌾 Show gluten-free options',
        '⭐ What is the chef special?',
      ],
    },
  ])

  const sendDinerAiMessage = async (queryText?: string) => {
    const activeText = (queryText || aiPrompt).trim()
    if (!activeText || aiLoading) return

    setAiMessages((prev) => [...prev, { sender: 'user', text: activeText }])
    if (!queryText) setAiPrompt('')
    setAiLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activeText,
          locationId,
          tableId,
          mode: 'customer',
        }),
      })

      const data = await res.json()
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: data.message || 'Here is what I found from our menu.',
          dishCards: data.actionableDishCards || [],
          suggestedPills: data.suggestedPills,
        },
      ])
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to reach the culinary concierge. Please try again or ask your server.',
        },
      ])
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddDishFromAi = (dishId: string) => {
    for (const cat of categories) {
      const found = cat.items.find((i) => i.id === dishId)
      if (found) {
        handleOpenItem(found)
        setShowAiModal(false)
        return
      }
    }
  }

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch(`/api/menu/categories?locationId=${locationId}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setCategories(data)
        }
      } catch (err) {
        console.error('Failed to load table menu', err)
      } finally {
        setLoading(false)
      }
    }
    loadMenu()
  }, [locationId])

  const handleOpenItem = (item: MenuItem) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setSelectedItemForMod(item)
      setSelectedMods([])
      setItemNote('')
    } else {
      addToCartDirect(item)
    }
  }

  const addToCartDirect = (item: MenuItem, mods: ModifierOption[] = [], note: string = '') => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (c) =>
          c.menuItem.id === item.id &&
          c.specialNote === note &&
          JSON.stringify(c.selectedModifiers?.map((m) => m.id).sort()) ===
            JSON.stringify(mods.map((m) => m.id).sort())
      )

      if (existingIdx > -1) {
        return prev.map((c, i) => (i === existingIdx ? { ...c, quantity: c.quantity + 1 } : c))
      }
      return [
        ...prev,
        {
          menuItem: item,
          quantity: 1,
          selectedModifiers: mods,
          specialNote: note,
        },
      ]
    })
    setSelectedItemForMod(null)
  }

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === index ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    )
  }

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((acc, item) => {
    const modDelta = (item.selectedModifiers || []).reduce((mSum, m) => mSum + Number(m.priceAdjustment || 0), 0)
    return acc + (Number(item.menuItem.price) + modDelta) * item.quantity
  }, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return
    setSubmittingOrder(true)
    try {
      const payload = {
        locationId,
        tableId,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          specialNote: c.specialNote || undefined,
          modifiers: c.selectedModifiers?.map((m) => ({ name: m.name, priceDelta: m.priceAdjustment })) || [],
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
    } catch (err: any) {
      alert(err?.message || 'Error submitting order')
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
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>Order Fired to Kitchen!</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0' }}>
            The chef is preparing your dishes. Your order ticket is now live on the kitchen display.
          </p>

          <div style={{ backgroundColor: '#1b1b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Dining Table:</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb' }}>{orderSuccess.tableName || 'Your Table'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Order Status:</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>● COOKING IN KITCHEN</span>
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
            style={{ width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
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
              <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Resto AI
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.3)' }}>
                📱 TABLE SELF-ORDER
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
              Browse all food categories &amp; order directly to kitchen
            </div>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            style={{ position: 'relative', padding: '8px 14px', backgroundColor: '#2563eb', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🛒</span>
            <span>Check</span>
            {totalItemCount > 0 && (
              <span style={{ backgroundColor: '#ffffff', color: '#2563eb', borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: 900 }}>
                {totalItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: '640px', margin: '12px auto 0' }}>
          <input
            type="text"
            placeholder="🔍 Search appetizers, pizzas, pastas, drinks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#16161c', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* RestoIQ AI Sommelier & Allergen Concierge Trigger */}
        <div style={{ maxWidth: '640px', margin: '8px auto 0' }}>
          <button
            onClick={() => setShowAiModal(true)}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(139,92,246,0.15) 100%)',
              border: '1px solid rgba(37,99,235,0.35)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'conic-gradient(from 0deg, #2563eb, #8b5cf6, #06b6d4, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px' }}>✨</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#93c5fd' }}>
                Ask RestoIQ AI Concierge
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
              Allergens · Wine Pairings · Recommendations →
            </span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div style={{ maxWidth: '640px', margin: '10px auto 0', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategoryId('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: activeCategoryId === 'ALL' ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)',
              backgroundColor: activeCategoryId === 'ALL' ? 'rgba(37,99,235,0.2)' : '#16161c',
              color: activeCategoryId === 'ALL' ? '#2563eb' : 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🍽️ All Menu Categories ({categories.reduce((s, c) => s + c.items.length, 0)})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: activeCategoryId === cat.id ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: activeCategoryId === cat.id ? 'rgba(37,99,235,0.2)' : '#16161c',
                color: activeCategoryId === cat.id ? '#2563eb' : 'rgba(255,255,255,0.7)',
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
                        transition: 'transform 0.15s ease',
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
                          onClick={() => handleOpenItem(item)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#2563eb',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                          }}
                        >
                          + Add
                        </button>
                        {cartEntry && (
                          <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, marginTop: '6px' }}>
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
              backgroundColor: '#2563eb',
              borderRadius: '16px',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(37,99,235,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: '#ffffff', color: '#2563eb', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px' }}>
                {totalItemCount}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>View Table Check</span>
            </div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
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
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>🛒 Review Table Order</h3>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Direct self-ordering to kitchen KDS</div>
              </div>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)' }}>Your check is empty. Add dishes from the menu!</div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#1a1a22', borderRadius: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{item.menuItem.name}</div>
                      <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                        ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateQuantity(idx, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#272730', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: '14px', fontWeight: 800, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#2563eb', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))
              )}

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
                  Phone Number (For Loyalty Points ⭐)
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
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: submittingOrder || cart.length === 0 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {submittingOrder ? 'Sending to Kitchen KDS...' : `🚀 Fire Order to Kitchen ($${total.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RestoIQ Diner AI Concierge Modal ────────────────────────────────── */}
      {showAiModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '540px', backgroundColor: '#0f1016', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -20px 40px rgba(0,0,0,0.8)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'conic-gradient(from 0deg, #2563eb, #8b5cf6, #ec4899, #06b6d4, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px' }}>✨</span>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>RestoIQ Food &amp; Wine Concierge</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Ask about allergens, pairings, or recommendations</div>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Conversation Log */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aiMessages.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '88%',
                    padding: '12px 14px',
                    borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: m.sender === 'user' ? 'rgba(37,99,235,0.2)' : '#171822',
                    border: m.sender === 'user' ? '1px solid rgba(37,99,235,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.text}

                    {/* Actionable Dishes */}
                    {m.dishCards && m.dishCards.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {m.dishCards.map((dish) => (
                          <div
                            key={dish.id}
                            style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700 }}>{dish.name}</div>
                              <div style={{ fontSize: '11px', color: '#10b981' }}>${dish.price.toFixed(2)}</div>
                            </div>
                            <button
                              onClick={() => handleAddDishFromAi(dish.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              + Add to Order
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pills */}
                  {m.suggestedPills && m.suggestedPills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {m.suggestedPills.map((pill, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => sendDinerAiMessage(pill)}
                          style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#93c5fd', cursor: 'pointer' }}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {aiLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#171822', width: 'fit-content' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'conic-gradient(from 0deg, #2563eb, #8b5cf6, #06b6d4, #2563eb)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 600 }}>Sommelier is consulting the kitchen &amp; cellar...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendDinerAiMessage()
                }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="text"
                  placeholder="Ask about ingredients, wine pairings, allergens..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', backgroundColor: '#161720', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '13px', cursor: aiLoading || !aiPrompt.trim() ? 'not-allowed' : 'pointer' }}
                >
                  Ask
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
