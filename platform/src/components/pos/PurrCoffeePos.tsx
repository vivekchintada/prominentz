'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  price: number
  category: 'Coffee' | 'Non Coffee' | 'Food' | 'Snack' | 'Dessert'
  description: string
  image: string
}

const PRODUCTS: Product[] = [
  {
    id: 'cappuccino',
    name: 'Cappuccino',
    price: 1.50,
    category: 'Coffee',
    description: 'Enticing inhouse coffee with small and homemade cappuccino.',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'latte',
    name: 'Coffee Latte',
    price: 1.60,
    category: 'Coffee',
    description: 'Enticing coffee with smooth catmes, bottom coffee Latte.',
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'americano',
    name: 'Americano',
    price: 1.55,
    category: 'Coffee',
    description: 'Fast roasted recent and enjoyed coffee americano.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'v60',
    name: 'V60 Pour Over',
    price: 2.50,
    category: 'Coffee',
    description: 'High hand coffee with convectator balanced coffee warm.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'croissant',
    name: 'Butter Croissant',
    price: 2.20,
    category: 'Snack',
    description: 'Freshly baked flaky butter croissant with rich aroma.',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cheesecake',
    name: 'Berry Cheesecake',
    price: 3.50,
    category: 'Dessert',
    description: 'Creamy New York cheesecake topped with fresh berry compote.',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
  },
]

interface CartItem {
  product: Product
  size: 'Small' | 'Large'
  quantity: number
}

export default function PurrCoffeePos() {
  const [activeCategory, setActiveCategory] = useState<string>('Coffee')
  const [search, setSearch] = useState<string>('')
  const [selectedSizes, setSelectedSizes] = useState<Record<string, 'Small' | 'Large'>>({})
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({})
  const [cart, setCart] = useState<CartItem[]>([
    { product: PRODUCTS[0], size: 'Small', quantity: 1 },
    { product: PRODUCTS[1], size: 'Small', quantity: 1 },
    { product: PRODUCTS[3], size: 'Large', quantity: 1 },
  ])
  const [orderType, setOrderType] = useState<'delivery' | 'dinein' | 'takeaway'>('dinein')
  const [orderSuccess, setOrderSuccess] = useState(false)

  const handleSizeChange = (productId: string, size: 'Small' | 'Large') => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }))
  }

  const handleQtyChange = (productId: string, delta: number) => {
    setCardQuantities((prev) => {
      const current = prev[productId] || 1
      const next = Math.max(1, current + delta)
      return { ...prev, [productId]: next }
    })
  }

  const handleAddToCart = (product: Product) => {
    const size = selectedSizes[product.id] || 'Small'
    const qty = cardQuantities[product.id] || 1

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id && item.size === size)
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx].quantity += qty
        return next
      }
      return [...prev, { product, size, quantity: qty }]
    })
  }

  const handleCartQtyChange = (idx: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev]
      const newQty = next[idx].quantity + delta
      if (newQty <= 0) {
        return next.filter((_, i) => i !== idx)
      }
      next[idx].quantity = newQty
      return next
    })
  }

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const discount = subtotal > 5 ? 1.00 : 0
  const grandTotal = Math.max(0, subtotal - discount)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF0E6', // Warm cream background matching screenshot
        color: '#2B231D',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        padding: '24px',
        boxSizing: 'border-box',
        gap: '24px',
      }}
    >
      {/* ── 1. LEFT SIDEBAR ────────────────────────────────────────────────── */}
      <aside
        style={{
          width: '230px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '28px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 8px 30px rgba(180, 140, 110, 0.08)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#E87A5D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '18px',
              }}
            >
              ☕
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#2B231D', letterSpacing: '-0.02em' }}>
              Purr&apos;Coffee
            </span>
          </div>

          {/* Navigation links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { icon: '🏠', label: 'Home page', active: false },
              { icon: '📋', label: 'Menu', active: true },
              { icon: '🛒', label: 'My orders', active: false, badge: cart.reduce((s, i) => s + i.quantity, 0) },
              { icon: '🕒', label: 'History', active: false },
              { icon: '👥', label: 'Partners', active: false },
              { icon: '⚙️', label: 'Settings', active: false },
            ].map((link, i) => (
              <button
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: 'none',
                  background: link.active ? '#F8ECE0' : 'transparent',
                  color: link.active ? '#D97745' : '#7A6E65',
                  fontSize: '14px',
                  fontWeight: link.active ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <span>{link.icon}</span>
                <span style={{ flex: 1 }}>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span
                    style={{
                      background: '#E87A5D',
                      color: '#FFF',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    {link.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Pinned Bottom Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '14px',
              border: 'none',
              background: 'transparent',
              color: '#7A6E65',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>♡</span> Donate to shelter
          </button>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '14px',
              border: 'none',
              background: 'transparent',
              color: '#7A6E65',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>↳</span> Log out to Dashboard
          </Link>
        </div>
      </aside>

      {/* ── 2. CENTER MAIN PRODUCT BROWSER ─────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        {/* Top Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '52px',
              boxShadow: '0 4px 20px rgba(180, 140, 110, 0.05)',
            }}
          >
            <span style={{ color: '#A0948A', fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search coffee, dessert, snacks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                background: 'transparent',
                fontSize: '14px',
                color: '#2B231D',
              }}
            />
          </div>

          <button
            style={{
              height: '52px',
              padding: '0 24px',
              borderRadius: '24px',
              background: '#E87A5D',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(232, 122, 93, 0.25)',
            }}
          >
            <span>≡</span> Filter
          </button>
        </div>

        {/* Section Heading */}
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#2B231D', margin: 0, letterSpacing: '-0.02em' }}>
          Coffee menu
        </h1>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['Coffee', 'Non Coffee', 'Food', 'Snack', 'Dessert'].map((cat) => {
            const isSelected = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '20px',
                  border: isSelected ? 'none' : '1px solid #E8DDD2',
                  background: isSelected ? '#E87A5D' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#6E6259',
                  fontSize: '14px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(232, 122, 93, 0.25)' : 'none',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Product Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px',
            overflowY: 'auto',
            paddingBottom: '20px',
          }}
        >
          {filteredProducts.map((product) => {
            const currentSize = selectedSizes[product.id] || 'Small'
            const currentQty = cardQuantities[product.id] || 1

            return (
              <div
                key={product.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(180, 140, 110, 0.06)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Product Image */}
                <div
                  style={{
                    width: '100%',
                    height: '160px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#F5EBE1',
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Title & Price Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#2B231D', margin: 0 }}>
                    {product.name}
                  </h3>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#2B231D' }}>
                    ${product.price.toFixed(2)}
                  </span>
                </div>

                {/* Short Description */}
                <p
                  style={{
                    fontSize: '12px',
                    color: '#8A7D74',
                    margin: 0,
                    lineHeight: 1.4,
                    height: '34px',
                    overflow: 'hidden',
                  }}
                >
                  {product.description}
                </p>

                {/* Size Selector */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#7A6E65', display: 'block', marginBottom: '6px' }}>
                    Size
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['Small', 'Large'] as const).map((sz) => {
                      const active = currentSize === sz
                      return (
                        <button
                          key={sz}
                          onClick={() => handleSizeChange(product.id, sz)}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: '12px',
                            border: 'none',
                            background: active ? '#F5DDCB' : '#F5EBE1',
                            color: active ? '#D97745' : '#7A6E65',
                            fontSize: '12px',
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {sz}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Action Row: Quantity + Add to Cart */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  {/* Stepper */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#F5EBE1',
                      borderRadius: '14px',
                      padding: '0 8px',
                      gap: '8px',
                    }}
                  >
                    <button
                      onClick={() => handleQtyChange(product.id, -1)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#7A6E65' }}
                    >
                      –
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                      {currentQty}
                    </span>
                    <button
                      onClick={() => handleQtyChange(product.id, 1)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#7A6E65' }}
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    style={{
                      flex: 1,
                      height: '38px',
                      borderRadius: '14px',
                      border: 'none',
                      background: '#A36843', // Warm brown caramel pill from reference
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(163, 104, 67, 0.25)',
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* ── 3. RIGHT CART SUMMARY PANEL ───────────────────────────────────── */}
      <aside
        style={{
          width: '320px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 8px 30px rgba(180, 140, 110, 0.08)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#2B231D', margin: 0 }}>
            Cart summary
          </h2>

          {/* Service Option Tabs (Delivery / Dine in / Take away) */}
          <div
            style={{
              display: 'flex',
              background: '#F5EBE1',
              borderRadius: '16px',
              padding: '4px',
              gap: '4px',
            }}
          >
            {[
              { id: 'delivery', icon: '🛵', label: 'Delivery' },
              { id: 'dinein', icon: '🍽️', label: 'Dine in' },
              { id: 'takeaway', icon: '🛍️', label: 'Take away' },
            ].map((tab) => {
              const active = orderType === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setOrderType(tab.id as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '12px',
                    border: 'none',
                    background: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#2B231D' : '#7A6E65',
                    fontSize: '11px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Cart Item List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '320px', overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9E9085', padding: '30px 0', fontSize: '13px' }}>
                Your cart is empty. Pick a drink!
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Thumbnail */}
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#2B231D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.product.name} ({item.size})
                    </div>
                    <div style={{ fontSize: '12px', color: '#7A6E65', fontWeight: 600 }}>
                      ${item.product.price.toFixed(2)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#F5EBE1',
                      borderRadius: '12px',
                      padding: '2px 6px',
                      gap: '6px',
                    }}
                  >
                    <button
                      onClick={() => handleCartQtyChange(idx, -1)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                    >
                      –
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{item.quantity}</span>
                    <button
                      onClick={() => handleCartQtyChange(idx, 1)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Price Breakdown & Place Order CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px', borderTop: '1px solid #F5EBE1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7A6E65' }}>
            <span>Price</span>
            <span style={{ fontWeight: 700, color: '#2B231D' }}>${subtotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7A6E65' }}>
            <span>Discount applied</span>
            <span style={{ fontWeight: 700, color: '#E87A5D' }}>-${discount.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#2B231D' }}>Grand total</span>
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#2B231D' }}>
              ${grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Big Caramel Brown Pill Button */}
          <button
            onClick={() => {
              if (cart.length > 0) {
                setOrderSuccess(true)
                setTimeout(() => setOrderSuccess(false), 3000)
              }
            }}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '24px',
              border: 'none',
              background: cart.length > 0 ? '#A36843' : '#D1C6BC',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: cart.length > 0 ? '0 4px 16px rgba(163, 104, 67, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {orderSuccess ? '✓ Order Sent to Kitchen!' : 'Place an order'}
          </button>
        </div>
      </aside>
    </div>
  )
}
