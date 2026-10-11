'use client'

import React, { useState, useEffect } from 'react'
import ProminentzLogo from '@/components/brand/ProminentzLogo'

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

// ── Theme Colors ──────────────────────────────────────────────────────────────

export function getThemeColors(isDark: boolean) {
  return {
    isDark,
    bg: isDark ? '#0a0a0c' : '#f8fafc',
    bgCard: isDark ? '#121217' : '#ffffff',
    bgCardHover: isDark ? '#181820' : '#f1f5f9',
    bgElevated: isDark ? '#1b1b22' : '#f1f5f9',
    bgInput: isDark ? '#16161c' : '#ffffff',
    bgHeader: isDark ? 'rgba(10, 10, 12, 0.94)' : 'rgba(255, 255, 255, 0.94)',
    bgDrawer: isDark ? '#141418' : '#ffffff',
    bgDrawerLine: isDark ? '#1a1a22' : '#f8fafc',
    border: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(15, 23, 42, 0.12)',
    borderStrong: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.22)',
    borderSubtle: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)',
    textPrimary: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.65)' : '#475569',
    textTertiary: isDark ? 'rgba(255, 255, 255, 0.45)' : '#64748b',
    badgeBg: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)',
    badgeBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
    cardShadow: isDark
      ? '0 4px 16px rgba(0,0,0,0.35)'
      : '0 4px 16px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.06)',
    pairingBg: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
    pairingBorder: isDark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.22)',
    pairingText: isDark ? '#a5b4fc' : '#4f46e5',
  }
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
  colors,
}: {
  item: MenuItem
  onAdd: (item: MenuItem) => void
  accentColor: string
  accentTextColor: string
  colors: ReturnType<typeof getThemeColors>
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
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
        boxShadow: colors.cardShadow,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
      onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <div style={{ height: '145px', position: 'relative', overflow: 'hidden', backgroundColor: colors.bgElevated }}>
        <img
          src={imgError ? '/images/menu/hero_dish.png' : imageUrl}
          alt={item.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />

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
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', fontSize: '16px', fontWeight: 900, color: '#34d399', fontFamily: 'monospace', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
          ${Number(item.price).toFixed(2)}
        </div>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: colors.textPrimary, lineHeight: 1.3, marginBottom: '6px' }}>{item.name}</div>
          {badges.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {badges.slice(0, 2).map((b) => (
                <span key={b} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', backgroundColor: colors.badgeBg, color: colors.textSecondary, fontWeight: 700, border: `1px solid ${colors.badgeBorder}` }}>{b}</span>
              ))}
            </div>
          )}
        </div>
        {pairing && (
          <div style={{ fontSize: '10px', color: colors.pairingText, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
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
  colors,
}: {
  item: MenuItem
  cartEntry?: CartItem
  onAdd: (item: MenuItem) => void
  onUpdateQuantity: (itemId: string, delta: number) => void
  accentColor: string
  accentTextColor: string
  colors: ReturnType<typeof getThemeColors>
}) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = resolveDishImage(item)
  const badges = getDietaryBadges(item)
  const pairing = getSommelierPairing(item)
  const isAvailable = item.isAvailable && !item.is86d

  return (
    <div
      style={{
        backgroundColor: colors.bgCard,
        border: cartEntry ? `1.5px solid ${accentColor}88` : `1px solid ${colors.border}`,
        borderRadius: '20px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: cartEntry ? `0 8px 28px ${accentColor}25` : colors.cardShadow,
        opacity: isAvailable ? 1 : 0.6,
        filter: isAvailable ? 'none' : 'grayscale(0.4)',
      }}
    >
      {/* High-res Editorial Image Section */}
      <div style={{ height: '185px', overflow: 'hidden', position: 'relative', backgroundColor: colors.bgElevated }}>
        <img
          src={imgError ? '/images/menu/hero_dish.png' : imageUrl}
          alt={item.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)' }} />

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
        <div style={{ position: 'absolute', bottom: '12px', right: '14px', fontSize: '18px', fontWeight: 900, color: '#34d399', fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.9)', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}>
          ${Number(item.price).toFixed(2)}
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: colors.textPrimary, lineHeight: 1.3 }}>{item.name}</h3>
        </div>

        {item.description && (
          <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0 0 10px', lineHeight: 1.5 }}>
            {item.description}
          </p>
        )}

        {/* Sommelier Wine & Beverage Pairing */}
        {pairing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.pairingText, marginBottom: '12px', backgroundColor: colors.pairingBg, padding: '6px 10px', borderRadius: '8px', border: `1px solid ${colors.pairingBorder}` }}>
            <span>🍷</span>
            <span><strong>Sommelier Recommendation:</strong> {pairing}</span>
          </div>
        )}

        {/* Dietary badges */}
        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {badges.map((b) => (
              <span key={b} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', backgroundColor: colors.badgeBg, color: colors.textSecondary, fontWeight: 700, border: `1px solid ${colors.badgeBorder}` }}>{b}</span>
            ))}
          </div>
        )}

        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${colors.borderSubtle}` }}>
          <div>
            {cartEntry ? (
              <span style={{ fontSize: '13px', fontWeight: 800, color: accentColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✓ {cartEntry.quantity} on table check
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: colors.textTertiary, fontStyle: 'italic' }}>
                Direct-to-line dispatch
              </span>
            )}
          </div>

          <div>
            {!isAvailable ? (
              <button
                disabled
                style={{ padding: '8px 16px', backgroundColor: colors.bgElevated, border: 'none', borderRadius: '10px', color: colors.textTertiary, fontWeight: 700, fontSize: '13px', cursor: 'not-allowed' }}
              >
                Unavailable
              </button>
            ) : cartEntry ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgElevated, padding: '4px 6px', borderRadius: '10px', border: `1px solid ${accentColor}44` }}>
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  -
                </button>
                <span style={{ fontSize: '14px', fontWeight: 900, minWidth: '22px', textAlign: 'center', color: colors.textPrimary }}>
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

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Diner info for order
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<any>(null)

  useEffect(() => {
    // Detect theme
    const active =
      (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ||
      (localStorage.getItem('prominentz-theme') as 'dark' | 'light') ||
      (localStorage.getItem('resto-theme') as 'dark' | 'light') ||
      'dark'
    setTheme(active)

    const observer = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute('data-theme') as 'dark' | 'light'
      if (attr && (attr === 'dark' || attr === 'light')) {
        setTheme(attr)
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

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

    return () => observer.disconnect()
  }, [locationId])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('prominentz-theme', next)
    localStorage.setItem('resto-theme', next)
  }

  const isDark = theme === 'dark'
  const colors = getThemeColors(isDark)

  const rawAccent = qrConfig.accentColor
  const accentColor = (rawAccent && rawAccent !== '#18181B' && rawAccent !== '#000000' && rawAccent !== 'var(--brand)' && rawAccent !== '#d4af37' && rawAccent !== '#c29d38')
    ? rawAccent
    : isDark ? '#6366f1' : '#4f46e5'
  const isLightAccent = accentColor === '#ffffff'
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
    } catch (err: any) {
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
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.textPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: '44px', height: '44px', border: `3px solid ${accentColor}33`, borderTopColor: accentColor, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '15px', color: colors.textPrimary, fontWeight: 700, letterSpacing: '0.02em' }}>Prominentz Haute Cuisine</div>
        <div style={{ fontSize: '13px', color: colors.textTertiary }}>Curating digital dining cellar &amp; menu...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.textPrimary, padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '440px', width: '100%', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '36px 24px', textAlign: 'center', boxShadow: colors.cardShadow }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 8px 0', color: colors.textPrimary }}>Order Fired to Kitchen!</h2>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 20px 0' }}>
            Your culinary selections are firing in the kitchen and live on the chef&apos;s KDS line.
          </p>

          <div style={{ backgroundColor: colors.bgElevated, border: `1px solid ${colors.borderSubtle}`, borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textTertiary }}>Dining Table:</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: accentColor }}>{orderSuccess.tableName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textTertiary }}>Status:</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>● LIVE IN KITCHEN (KDS)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px dashed ${colors.borderSubtle}`, paddingTop: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary }}>Total Check:</span>
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
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.textPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingBottom: '110px', transition: 'background-color 0.2s ease, color 0.2s ease' }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Top Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: colors.bgHeader, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${colors.border}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ProminentzLogo variant="app-icon" size={36} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.03em', color: colors.textPrimary }}>
                    Prominentz
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(79, 70, 229, 0.1)', color: isDark ? '#a5b4fc' : '#4f46e5', border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.25)'}`, letterSpacing: '0.04em' }}>
                    HAUTE CUISINE
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '1px' }}>
                  Michelin-Grade Table Service · Direct-to-Line KDS
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                padding: '8px 10px',
                backgroundColor: colors.bgElevated,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                color: colors.textPrimary,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Check / Cart Button */}
            <button
              onClick={() => setShowCartDrawer(true)}
              style={{ position: 'relative', padding: '9px 14px', backgroundColor: accentColor, border: 'none', borderRadius: '12px', color: accentTextColor, fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 4px 16px ${accentColor}44` }}
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
        </div>

        {/* Table Selector Banner */}
        <div style={{ maxWidth: '640px', margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgElevated, border: `1px solid ${colors.border}`, padding: '8px 12px', borderRadius: '12px' }}>
          <span style={{ fontSize: '14px' }}>🪑</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textSecondary, whiteSpace: 'nowrap' }}>Seated Table:</span>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: colors.bgInput,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id} style={{ backgroundColor: colors.bgCard, color: colors.textPrimary }}>
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
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ maxWidth: '640px', margin: '10px auto 0', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategoryId('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: activeCategoryId === 'ALL' ? `1px solid ${accentColor}` : `1px solid ${colors.border}`,
              backgroundColor: activeCategoryId === 'ALL' ? `${accentColor}22` : colors.bgElevated,
              color: activeCategoryId === 'ALL' ? accentColor : colors.textSecondary,
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
                border: activeCategoryId === cat.id ? `1px solid ${accentColor}` : `1px solid ${colors.border}`,
                backgroundColor: activeCategoryId === cat.id ? `${accentColor}22` : colors.bgElevated,
                color: activeCategoryId === cat.id ? accentColor : colors.textSecondary,
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
                <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: colors.textPrimary }}>
                  ★ Chef&apos;s Highlights &amp; House Signatures
                </h2>
                <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '2px' }}>
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
                  colors={colors}
                />
              ))}
            </div>
          </section>
        )}

        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textTertiary }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍽️</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>No Dishes Found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try searching for wagyu, pasta, salmon, or cocktail</div>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: `1px solid ${colors.borderSubtle}`, paddingBottom: '8px' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 900, margin: 0, color: colors.textPrimary, letterSpacing: '-0.01em' }}>{category.name}</h2>
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
                      colors={colors}
                    />
                  )
                })}
              </div>
            </section>
          ))
        )}

        {/* ── Prominentz Dining OS Footer ── */}
        <footer style={{
          marginTop: '48px',
          marginBottom: '24px',
          padding: '24px 16px',
          borderTop: `1px solid ${colors.borderSubtle}`,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ProminentzLogo variant="app-icon" size={24} />
            <span style={{ fontSize: '14px', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
              Prominentz Dining Experience
            </span>
            <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(79,70,229,0.1)', color: isDark ? '#a5b4fc' : '#4f46e5' }}>
              VERIFIED
            </span>
          </div>
          <div style={{ fontSize: '11px', color: colors.textTertiary }}>
            Powered by Prominentz · Ultra-low latency KDS kitchen routing
          </div>
        </footer>
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
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', backgroundColor: colors.bgDrawer, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', border: `1px solid ${colors.border}`, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Drawer Header */}
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${colors.borderSubtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: colors.textPrimary }}>🛒 Review Table Order</h3>
                <div style={{ fontSize: '12px', color: colors.textTertiary }}>Direct-to-line dispatch to kitchen &amp; bar KDS</div>
              </div>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', color: colors.textPrimary, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: colors.bgDrawerLine, borderRadius: '14px', border: `1px solid ${colors.borderSubtle}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: colors.textPrimary }}>{item.menuItem.name}</div>
                    <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', marginTop: '2px' }}>
                      ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => updateQuantity(item.menuItem.id, -1)} style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: colors.bgElevated, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontWeight: 800, cursor: 'pointer' }}>-</button>
                    <span style={{ fontSize: '14px', fontWeight: 900, minWidth: '22px', textAlign: 'center', color: colors.textPrimary }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuItem.id, 1)} style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: accentColor, border: 'none', color: accentTextColor, fontWeight: 800, cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              ))}

              {/* Dining Table Confirmation */}
              <div style={{ marginTop: '12px', borderTop: `1px dashed ${colors.border}`, paddingTop: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                  Confirm Seated Table 🪑
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', backgroundColor: colors.bgInput, border: `1px solid ${accentColor}66`, color: colors.textPrimary, fontSize: '13px', fontWeight: 700, marginBottom: '12px', outline: 'none' }}
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id} style={{ backgroundColor: colors.bgCard, color: colors.textPrimary }}>
                      {t.name} (Seating for {t.capacity})
                    </option>
                  ))}
                </select>

                <label style={{ fontSize: '12px', fontWeight: 700, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                  Guest Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: '13px', marginBottom: '12px', outline: 'none' }}
                />

                <label style={{ fontSize: '12px', fontWeight: 700, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                  Phone Number (Optional - for SMS updates)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: '13px', marginBottom: '12px', outline: 'none' }}
                />

                <label style={{ fontSize: '12px', fontWeight: 700, color: colors.textSecondary, display: 'block', marginBottom: '6px' }}>
                  Special Culinary Notes &amp; Allergies ⚠️
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medium rare steak, no cilantro, dressing on side"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: '13px', outline: 'none' }}
                />
              </div>

              {/* Totals Breakdown */}
              <div style={{ marginTop: '8px', backgroundColor: colors.bgElevated, padding: '14px', borderRadius: '12px', fontSize: '13px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: colors.textSecondary }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: colors.textSecondary }}>
                  <span>State &amp; City Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '17px', borderTop: `1px dashed ${colors.border}`, paddingTop: '8px' }}>
                  <span style={{ color: colors.textPrimary }}>Total Check</span>
                  <span style={{ color: '#10b981', fontFamily: 'monospace' }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.borderSubtle}` }}>
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
