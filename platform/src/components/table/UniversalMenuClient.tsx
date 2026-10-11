'use client'

import React, { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface QrMenuConfig {
  welcomeMessage?: string
  promoText?: string
  accentColor?: string
  mode?: 'dine-in' | 'takeout' | 'both'
  hiddenCategoryIds?: string[]
}

// ── Dietary badge auto-detection ──────────────────────────────────────────────

function getDietaryBadges(item: MenuItem): string[] {
  const text = `${item.name} ${item.description || ''}`.toLowerCase()
  const badges: string[] = []
  const meatKeywords = ['chicken', 'beef', 'lamb', 'pork', 'bacon', 'fish', 'prawn', 'shrimp', 'seafood', 'meat', 'steak', 'tuna', 'salmon', 'crab', 'lobster', 'duck', 'turkey', 'wagyu', 'prosciutto']
  const dairyKeywords = ['cheese', 'butter', 'cream', 'milk', 'yogurt', 'paneer', 'ghee', 'whey', 'burrata', 'mascarpone']
  const hasMeat = meatKeywords.some((k) => text.includes(k))
  const hasDairy = dairyKeywords.some((k) => text.includes(k))
  if (!hasMeat) badges.push(hasDairy ? '🌱 Veg' : '🌿 Vegan')
  if (text.includes('gluten-free') || text.includes('gluten free') || text.includes(' gf ')) badges.push('🌾 GF')
  if (text.includes('spicy') || text.includes('hot sauce') || text.includes('chili') || text.includes('jalapeño') || text.includes('sriracha')) badges.push('🌶️ Spicy')
  if (text.includes('nut') || text.includes('almond') || text.includes('cashew') || text.includes('peanut') || text.includes('walnut')) badges.push('🥜 Nuts')
  return badges
}

// ── Customer Food Images & Sommelier Pairing Resolvers ────────────────────────

const DEFAULT_MENU_IMAGES: { pattern: RegExp; url: string; pairing?: string }[] = [
  { pattern: /wagyu|ribeye|steak|beef|tenderloin|sirloin|filet|burger/i, url: '/images/menu/hero_dish.png', pairing: '2021 Barolo DOCG or Napa Valley Cabernet' },
  { pattern: /pasta|tagliolini|tagliatelle|linguine|spaghetti|risotto|carbonara/i, url: '/images/menu/gallery_pasta.png', pairing: 'Tuscan Chianti Classico or Pinot Grigio' },
  { pattern: /burrata|caprese|prosciutto|arugula|antipast/i, url: '/images/menu/burrata_prosciutto.jpg', pairing: 'Prosecco Superiore or Crisp Sancerre' },
  { pattern: /arancini|bread|bruschetta|focaccia|sourdough|crostini/i, url: '/images/menu/gallery_bread.png', pairing: 'Franciacorta or Aperol Spritz' },
  { pattern: /calamari|squid|fritti|shrimp|prawn|crab|lobster/i, url: '/images/menu/calamari_fritti.jpg', pairing: 'Chablis Premier Cru or Dry Vermentino' },
  { pattern: /salmon|halibut|fish|tuna|branzino|cod|seabass/i, url: '/images/menu/pan_seared_salmon.jpg', pairing: 'Sauvignon Blanc or Saffron Chardonnay' },
  { pattern: /tiramisu|brule|brûlée|custard|panna cotta/i, url: '/images/menu/tiramisu_classic.jpg', pairing: 'Espresso Martini or Vin Santo' },
  { pattern: /chocolate|fondant|mousse|cake|dessert|brownie|lava/i, url: '/images/menu/gallery_dessert.png', pairing: 'Ruby Port or Highland Single Malt' },
  { pattern: /cocktail|negroni|spritz|old fashioned|wine|champagne|gin|whiskey|beer|lemonade|sparkling|drink/i, url: '/images/menu/gallery_drinks.png', pairing: 'Artisan Citrus Twist & Torched Herbs' },
]

export function resolveDishImage(item: { name: string; description?: string; imageUrl?: string }): string {
  if (item.imageUrl && !item.imageUrl.includes('placeholder') && !item.imageUrl.includes('undefined')) {
    return item.imageUrl
  }
  const text = `${item.name} ${item.description || ''}`.toLowerCase()
  for (const rule of DEFAULT_MENU_IMAGES) {
    if (rule.pattern.test(text)) {
      return rule.url
    }
  }
  return '/images/menu/hero_dish.png'
}

export function getSommelierPairing(item: { name: string; description?: string }): string | null {
  const text = `${item.name} ${item.description || ''}`.toLowerCase()
  for (const rule of DEFAULT_MENU_IMAGES) {
    if (rule.pattern.test(text) && rule.pairing) {
      return rule.pairing
    }
  }
  return null
}

// ── Featured Hero Item Card ───────────────────────────────────────────────────

function HeroDishCard({
  item,
  onAdd,
  accentColor,
  accentTextColor,
}: {
  item: MenuItem
  onAdd: (item: MenuItem) => void
  accentColor: string
  accentTextColor: string
}) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = resolveDishImage(item)
  const badges = getDietaryBadges(item)
  const pairing = getSommelierPairing(item)

  return (
    <div
      onClick={() => onAdd(item)}
      style={{
        width: '240px',
        flexShrink: 0,
        borderRadius: '20px',
        overflow: 'hidden',
        backgroundColor: '#121217',
        border: '1px solid rgba(255,255,255,0.12)',
        cursor: 'pointer',
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
      onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <div style={{ height: '145px', position: 'relative', overflow: 'hidden', backgroundColor: '#18181f' }}>
        <img
          src={imgError ? '/images/menu/hero_dish.png' : imageUrl}
          alt={item.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18,18,23,0.95) 0%, transparent 60%)' }} />

        {/* Badge overlay */}
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#ef4444', color: '#fff', letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
            🔥 CHEF&apos;S SIGNATURE
          </span>
        </div>

        {/* Add button overlay */}
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: accentColor, color: accentTextColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, boxShadow: '0 4px 14px rgba(0,0,0,0.6)' }}>
          +
        </div>

        {/* Price on image */}
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', fontSize: '16px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
          ${Number(item.price).toFixed(2)}
        </div>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', lineHeight: 1.3, marginBottom: '6px' }}>{item.name}</div>
          {badges.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {badges.slice(0, 2).map((b) => (
                <span key={b} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>{b}</span>
              ))}
            </div>
          )}
        </div>
        {pairing && (
          <div style={{ fontSize: '10px', color: '#f59e0b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <span>🍷</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pairing}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Luxury Menu Item Card ─────────────────────────────────────────────────────

function LuxuryMenuItemCard({
  item,
  cartEntry,
  onAdd,
  onUpdateQuantity,
  accentColor,
  accentTextColor,
}: {
  item: MenuItem
  cartEntry?: CartItem
  onAdd: (item: MenuItem) => void
  onUpdateQuantity: (itemId: string, delta: number) => void
  accentColor: string
  accentTextColor: string
}) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = resolveDishImage(item)
  const badges = getDietaryBadges(item)
  const pairing = getSommelierPairing(item)
  const isAvailable = item.isAvailable && !item.is86d

  return (
    <div
      style={{
        backgroundColor: '#121217',
        border: cartEntry ? `1.5px solid ${accentColor}88` : '1px solid rgba(255,255,255,0.09)',
        borderRadius: '20px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: cartEntry ? `0 8px 28px ${accentColor}25` : '0 4px 16px rgba(0,0,0,0.35)',
        opacity: isAvailable ? 1 : 0.6,
        filter: isAvailable ? 'none' : 'grayscale(0.4)',
      }}
    >
      {/* High-res Editorial Image Section */}
      <div style={{ height: '185px', overflow: 'hidden', position: 'relative', backgroundColor: '#18181f' }}>
        <img
          src={imgError ? '/images/menu/hero_dish.png' : imageUrl}
          alt={item.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
        {/* Luxury Vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18,18,23,0.96) 0%, rgba(18,18,23,0.2) 50%, rgba(0,0,0,0.4) 100%)' }} />

        {/* Top Badges */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.kdsStation === 'BAR' && (
            <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: 'rgba(139,92,246,0.95)', color: '#fff' }}>
              🍸 CELLAR &amp; BAR
            </span>
          )}
          {!isAvailable && (
            <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#6b7280', color: '#fff' }}>
              86&apos;D · SOLD OUT TODAY
            </span>
          )}
        </div>

        {/* Floating Price */}
        <div style={{ position: 'absolute', bottom: '12px', right: '14px', fontSize: '18px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.9)', backgroundColor: 'rgba(0,0,0,0.65)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          ${Number(item.price).toFixed(2)}
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#ffffff', lineHeight: 1.3 }}>{item.name}</h3>
        </div>

        {item.description && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', lineHeight: 1.5 }}>
            {item.description}
          </p>
        )}

        {/* Sommelier Wine & Beverage Pairing */}
        {pairing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f59e0b', marginBottom: '12px', backgroundColor: 'rgba(245,158,11,0.08)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span>🍷</span>
            <span><strong>Sommelier Recommendation:</strong> {pairing}</span>
          </div>
        )}

        {/* Dietary badges */}
        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {badges.map((b) => (
              <span key={b} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)' }}>{b}</span>
            ))}
          </div>
        )}

        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            {cartEntry ? (
              <span style={{ fontSize: '13px', fontWeight: 800, color: accentColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✓ {cartEntry.quantity} on table check
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                Direct-to-line dispatch
              </span>
            )}
          </div>

          <div>
            {!isAvailable ? (
              <button
                disabled
                style={{ padding: '8px 16px', backgroundColor: '#27272a', border: 'none', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '13px', cursor: 'not-allowed' }}
              >
                Unavailable
              </button>
            ) : cartEntry ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1a1a22', padding: '4px 6px', borderRadius: '10px', border: `1px solid ${accentColor}44` }}>
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#272730', border: 'none', color: '#ffffff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  -
                </button>
                <span style={{ fontSize: '14px', fontWeight: 900, minWidth: '22px', textAlign: 'center', color: '#ffffff' }}>
                  {cartEntry.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: accentColor, border: 'none', color: accentTextColor, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAdd(item)}
                style={{
                  padding: '9px 18px',
                  backgroundColor: accentColor,
                  border: 'none',
                  borderRadius: '10px',
                  color: accentTextColor,
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${accentColor}33`,
                  transition: 'transform 0.15s ease',
                }}
              >
                + Add to Check
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Universal Menu Client ────────────────────────────────────────────────

export function UniversalMenuClient({ locationId }: { locationId: string }) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [tables, setTables] = useState<TableOption[]>([])
  const [qrConfig, setQrConfig] = useState<QrMenuConfig>({})
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
        const [menuRes, tableRes, configRes] = await Promise.all([
          fetch(`/api/menu/categories?locationId=${locationId}`),
          fetch(`/api/tables?locationId=${locationId}`),
          fetch(`/api/qr-config?locationId=${locationId}`),
        ])

        const menuData = await menuRes.json()
        const tableData = await tableRes.json()
        if (configRes.ok) {
          const configData = await configRes.json()
          if (configData && !configData.error) setQrConfig(configData)
        }

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

  const rawAccent = qrConfig.accentColor
  const accentColor = (rawAccent && rawAccent !== '#18181B' && rawAccent !== '#000000' && rawAccent !== 'var(--brand)')
    ? rawAccent
    : '#d4af37'
  const isLightAccent = accentColor === '#d4af37' || accentColor === '#f59e0b' || accentColor === '#eab308' || accentColor === '#ffffff'
  const accentTextColor = isLightAccent ? '#000000' : '#ffffff'

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
  const allItems = categories.flatMap((c) => c.items)
  const heroItems = allItems.slice(0, 6)

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
        <div style={{ width: '44px', height: '44px', border: `3px solid ${accentColor}33`, borderTopColor: accentColor, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: 700, letterSpacing: '0.02em' }}>Prominentz Haute Cuisine</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Curating digital dining cellar &amp; menu...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#ffffff', padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '36px 24px', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 8px 0', color: '#ffffff' }}>Order Fired to Kitchen!</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0' }}>
            Your culinary selections are firing in the kitchen and live on the chef&apos;s KDS line.
          </p>

          <div style={{ backgroundColor: '#1b1b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Dining Table:</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: accentColor }}>{orderSuccess.tableName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Status:</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>● LIVE IN KITCHEN (KDS)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>Total Check:</span>
              <span style={{ fontSize: '17px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                ${Number(orderSuccess.total || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setOrderSuccess(null)}
            style={{ width: '100%', padding: '14px', backgroundColor: accentColor, color: accentTextColor, border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
          >
            ➕ Order Additional Courses &amp; Wine
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingBottom: '110px' }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Top Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(10,10,12,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '19px', fontWeight: 900, letterSpacing: '-0.02em', background: `linear-gradient(135deg, ${accentColor} 0%, #ffffff 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Prominentz
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44`, letterSpacing: '0.04em' }}>
                ★ HAUTE CUISINE
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
              Michelin-Grade Table Service · Direct-to-Line KDS
            </div>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            style={{ position: 'relative', padding: '9px 16px', backgroundColor: accentColor, border: 'none', borderRadius: '12px', color: accentTextColor, fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 4px 16px ${accentColor}44` }}
          >
            <span>🛒</span>
            <span>Check</span>
            {totalItemCount > 0 && (
              <span style={{ backgroundColor: accentTextColor === '#000000' ? '#000000' : '#ffffff', color: accentTextColor === '#000000' ? '#ffffff' : accentColor, borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: 900 }}>
                {totalItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Table Selector Banner */}
        <div style={{ maxWidth: '640px', margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '12px' }}>
          <span style={{ fontSize: '14px' }}>🪑</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>Seated Table:</span>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: '#1b1b22',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Seating for {t.capacity})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: '640px', margin: '10px auto 0' }}>
          <input
            type="text"
            placeholder="🔍 Search wagyu, pasta, seafood, wines, cocktails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#16161c', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ maxWidth: '640px', margin: '10px auto 0', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategoryId('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: activeCategoryId === 'ALL' ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)',
              backgroundColor: activeCategoryId === 'ALL' ? `${accentColor}22` : '#16161c',
              color: activeCategoryId === 'ALL' ? accentColor : 'rgba(255,255,255,0.7)',
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
                border: activeCategoryId === cat.id ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: activeCategoryId === cat.id ? `${accentColor}22` : '#16161c',
                color: activeCategoryId === cat.id ? accentColor : 'rgba(255,255,255,0.7)',
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

        {/* Chef's Signature Highlights Carousel (Customer Food Photography) */}
        {!searchQuery && activeCategoryId === 'ALL' && heroItems.length > 0 && (
          <section style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: '#ffffff' }}>
                  ★ Chef&apos;s Highlights &amp; House Signatures
                </h2>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  Hand-crafted tasting selections &amp; artisanal pairings
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
              {heroItems.map((item) => (
                <HeroDishCard
                  key={`hero-${item.id}`}
                  item={item}
                  onAdd={addToCart}
                  accentColor={accentColor}
                  accentTextColor={accentTextColor}
                />
              ))}
            </div>
          </section>
        )}

        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍽️</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>No Dishes Found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try searching for wagyu, pasta, salmon, or cocktail</div>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>{category.name}</h2>
                <span style={{ fontSize: '11px', color: accentColor, fontWeight: 700, backgroundColor: `${accentColor}18`, padding: '2px 8px', borderRadius: '6px' }}>
                  {category.items.length} items
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {category.items.map((item) => {
                  const cartEntry = cart.find((c) => c.menuItem.id === item.id)
                  return (
                    <LuxuryMenuItemCard
                      key={item.id}
                      item={item}
                      cartEntry={cartEntry}
                      onAdd={addToCart}
                      onUpdateQuantity={updateQuantity}
                      accentColor={accentColor}
                      accentTextColor={accentTextColor}
                    />
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
              backgroundColor: accentColor,
              borderRadius: '16px',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: `0 12px 32px ${accentColor}55`,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: accentTextColor === '#000000' ? '#000000' : '#ffffff', color: accentTextColor === '#000000' ? '#ffffff' : accentColor, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px' }}>
                {totalItemCount}
              </span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: accentTextColor }}>View Table Check</div>
                <div style={{ fontSize: '11px', color: accentTextColor === '#000000' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}>
                  {tables.find((t) => t.id === selectedTableId)?.name || 'Table Order'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: accentTextColor, fontFamily: 'monospace' }}>
              ${total.toFixed(2)} →
            </div>
          </div>
        </div>
      )}

      {/* Cart & Self-Checkout Drawer */}
      {showCartDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', backgroundColor: '#141418', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Drawer Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#ffffff' }}>🛒 Review Table Order</h3>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Direct-to-line dispatch to kitchen &amp; bar KDS</div>
              </div>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#1a1a22', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>{item.menuItem.name}</div>
                    <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', marginTop: '2px' }}>
                      ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => updateQuantity(item.menuItem.id, -1)} style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#272730', border: 'none', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}>-</button>
                    <span style={{ fontSize: '14px', fontWeight: 900, minWidth: '22px', textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuItem.id, 1)} style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: accentColor, border: 'none', color: accentTextColor, fontWeight: 800, cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              ))}

              {/* Dining Table Confirmation */}
              <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                  Confirm Seated Table 🪑
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', backgroundColor: '#1a1a22', border: `1px solid ${accentColor}66`, color: '#ffffff', fontSize: '13px', fontWeight: 700, marginBottom: '12px', outline: 'none' }}
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Seating for {t.capacity})
                    </option>
                  ))}
                </select>

                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                  Guest Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', marginBottom: '12px', outline: 'none' }}
                />

                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                  Phone Number (Optional - for SMS updates)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', marginBottom: '12px', outline: 'none' }}
                />

                <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                  Special Culinary Notes &amp; Allergies ⚠️
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medium rare steak, no cilantro, dressing on side"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {/* Totals Breakdown */}
              <div style={{ marginTop: '8px', backgroundColor: '#1a1a22', padding: '14px', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'rgba(255,255,255,0.6)' }}>
                  <span>State &amp; City Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '17px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
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
                  padding: '15px',
                  backgroundColor: accentColor,
                  border: 'none',
                  borderRadius: '14px',
                  color: accentTextColor,
                  fontSize: '15px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  opacity: submittingOrder || cart.length === 0 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: `0 8px 24px ${accentColor}44`,
                }}
              >
                {submittingOrder ? 'Firing Order to Kitchen KDS...' : `🚀 Fire Order to Kitchen ($${total.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
