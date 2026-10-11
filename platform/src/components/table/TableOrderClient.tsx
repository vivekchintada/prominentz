'use client'

import React, { useState, useEffect, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModifierOption { id: string; name: string; priceAdjustment: number }
interface ModifierGroup { id: string; name: string; isRequired: boolean; options: ModifierOption[] }

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

interface MenuCategory { id: string; name: string; items: MenuItem[] }

interface CartItem {
  menuItem: MenuItem
  quantity: number
  selectedModifiers?: ModifierOption[]
  specialNote: string
}

interface TableOrderClientProps { locationId: string; tableId: string }

interface QrMenuConfig {
  welcomeMessage?: string
  promoText?: string
  accentColor?: string
  mode?: 'dine-in' | 'takeout' | 'both'
  hiddenCategoryIds?: string[]
  combos?: ComboItem[]
}

interface ComboItem {
  id: string
  name: string
  description?: string
  originalPrice: number
  comboPrice: number
  imageEmoji?: string
  itemNames: string[]
}

// ── Dietary badge auto-detection ──────────────────────────────────────────────

function getDietaryBadges(item: MenuItem): string[] {
  const text = `${item.name} ${item.description || ''}`.toLowerCase()
  const badges: string[] = []
  const meatKeywords = ['chicken', 'beef', 'lamb', 'pork', 'bacon', 'fish', 'prawn', 'shrimp', 'seafood', 'meat', 'steak', 'tuna', 'salmon', 'crab', 'lobster', 'duck', 'turkey']
  const dairyKeywords = ['cheese', 'butter', 'cream', 'milk', 'yogurt', 'paneer', 'ghee', 'whey']
  const hasMeat = meatKeywords.some((k) => text.includes(k))
  const hasDairy = dairyKeywords.some((k) => text.includes(k))
  if (!hasMeat) badges.push(hasDairy ? '🌱 Veg' : '🌿 Vegan')
  if (text.includes('gluten-free') || text.includes('gluten free') || text.includes(' gf ')) badges.push('🌾 GF')
  if (text.includes('spicy') || text.includes('hot sauce') || text.includes('chili') || text.includes('jalapeño') || text.includes('sriracha')) badges.push('🌶️ Spicy')
  if (text.includes('nut') || text.includes('almond') || text.includes('cashew') || text.includes('peanut') || text.includes('walnut')) badges.push('🥜 Nuts')
  return badges
}

// ── Food Image & Sommelier Pairing Resolvers ───────────────────────────────

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

// ── Hero Carousel Card ────────────────────────────────────────────────────────

function HeroItemCard({
  item, idx, isPopular, onAdd, accentColor,
}: {
  item: MenuItem; idx: number; isPopular: boolean; onAdd: (item: MenuItem) => void; accentColor: string
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
      {/* High-res Photo with Luxury Vignette */}
      <div style={{ height: '150px', position: 'relative', overflow: 'hidden', backgroundColor: '#18181f' }}>
        <img
          src={imgError ? '/images/menu/hero_dish.png' : imageUrl}
          alt={item.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18,18,23,0.95) 0%, transparent 60%)' }} />

        {/* Badge overlay */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {isPopular && (
            <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#ef4444', color: '#fff', letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
              🔥 CHEF'S SIGNATURE
            </span>
          )}
          {idx === 0 && !isPopular && (
            <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#f59e0b', color: '#fff', letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}>
              ★ SOMMELIER PICK
            </span>
          )}
        </div>

        {/* Add button overlay */}
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.6)' }}>
          +
        </div>

        {/* Price on image */}
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', fontSize: '16px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
          ${Number(item.price).toFixed(2)}
        </div>
      </div>

      {/* Info */}
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

// ── Menu Item Card (Full luxury editorial presentation) ───────────────────────

function MenuItemCard({
  item, idx, isPopular, cartEntry, onOpen, accentColor,
}: {
  item: MenuItem; idx: number; isPopular: boolean; cartEntry?: CartItem; onOpen: (item: MenuItem) => void; accentColor: string
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
      <div style={{ height: '190px', overflow: 'hidden', position: 'relative', backgroundColor: '#18181f' }}>
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
          {isPopular && (
            <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#ef4444', color: '#fff', letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}>
              🔥 CHEF'S SIGNATURE
            </span>
          )}
          {item.kdsStation === 'BAR' && (
            <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: 'rgba(139,92,246,0.95)', color: '#fff' }}>
              🍸 CELLAR &amp; BAR
            </span>
          )}
          {!isAvailable && (
            <span style={{ fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px', backgroundColor: '#6b7280', color: '#fff' }}>
              86'D · SOLD OUT TODAY
            </span>
          )}
        </div>

        {/* Floating Price */}
        <div style={{ position: 'absolute', bottom: '12px', right: '14px', fontSize: '18px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.9)', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          ${Number(item.price).toFixed(2)}
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#ffffff', lineHeight: 1.3 }}>{item.name}</h3>
        </div>

        {item.description && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', lineHeight: 1.5 }}>
            {item.description}
          </p>
        )}

        {/* Sommelier Wine & Beverage Pairing */}
        {pairing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f59e0b', marginBottom: '10px', backgroundColor: 'rgba(245,158,11,0.08)', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {cartEntry ? (
            <span style={{ fontSize: '13px', fontWeight: 800, color: accentColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✓ {cartEntry.quantity} selected for table
            </span>
          ) : (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              {item.modifiers && item.modifiers.length > 0 ? '✦ Customizable Courses' : 'Direct-to-line dispatch'}
            </span>
          )}

          <button
            onClick={() => isAvailable && onOpen(item)}
            disabled={!isAvailable}
            style={{
              padding: '10px 20px',
              backgroundColor: !isAvailable ? '#27272a' : cartEntry ? 'rgba(16,185,129,0.15)' : accentColor,
              border: !isAvailable ? 'none' : cartEntry ? `1.5px solid #10b981` : 'none',
              borderRadius: '12px',
              color: !isAvailable ? 'rgba(255,255,255,0.4)' : cartEntry ? '#10b981' : '#ffffff',
              fontWeight: 800,
              fontSize: '13px',
              cursor: !isAvailable ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: !isAvailable ? 'none' : cartEntry ? 'none' : `0 4px 16px ${accentColor}44`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {!isAvailable ? 'Unavailable' : cartEntry ? '+ Add More' : '+ Add to Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Combo Deal Card ───────────────────────────────────────────────────────────

function ComboDealCard({ combo, onAddCombo, accentColor }: { combo: ComboItem; onAddCombo: (combo: ComboItem) => void; accentColor: string }) {
  const savings = (combo.originalPrice - combo.comboPrice).toFixed(2)
  const pctOff = Math.round(((combo.originalPrice - combo.comboPrice) / combo.originalPrice) * 100)

  return (
    <div style={{
      background: `linear-gradient(135deg, ${accentColor}18 0%, rgba(245,158,11,0.1) 100%)`,
      border: `1px solid ${accentColor}44`,
      borderRadius: '18px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      flexShrink: 0,
      width: '280px',
      cursor: 'pointer',
    }} onClick={() => onAddCombo(combo)}>
      {/* Emoji badge */}
      <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: `linear-gradient(135deg, ${accentColor} 0%, #f59e0b 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
        {combo.imageEmoji || '🍱'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>{combo.name}</span>
          <span style={{ fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '999px', backgroundColor: '#ef4444', color: '#fff' }}>
            {pctOff}% OFF
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
          {combo.itemNames.join(' + ')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>${combo.comboPrice.toFixed(2)}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through', fontFamily: 'monospace' }}>${combo.originalPrice.toFixed(2)}</span>
          <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>Save ${savings}</span>
        </div>
      </div>
    </div>
  )
}

// ── Item Detail Bottom Sheet ──────────────────────────────────────────────────

function ItemDetailSheet({
  item, idx, isPopular, onClose, onAdd, accentColor,
}: {
  item: MenuItem; idx: number; isPopular: boolean; onClose: () => void; onAdd: (item: MenuItem, mods: ModifierOption[], note: string) => void; accentColor: string
}) {
  const [selectedMods, setSelectedMods] = useState<ModifierOption[]>([])
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [imgError, setImgError] = useState(false)
  const gradient = getItemGradient(item, idx)
  const emoji = getItemEmoji(item, idx)
  const badges = getDietaryBadges(item)

  const modTotal = selectedMods.reduce((s, m) => s + Number(m.priceAdjustment || 0), 0)
  const lineTotal = (Number(item.price) + modTotal) * quantity

  const toggleMod = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedMods((prev) => {
      const alreadySelected = prev.find((m) => m.id === option.id)
      if (alreadySelected) return prev.filter((m) => m.id !== option.id)
      if (group.isRequired) {
        // Radio behavior for required groups
        const otherGroupOptions = group.options.map((o) => o.id)
        return [...prev.filter((m) => !otherGroupOptions.includes(m.id)), option]
      }
      return [...prev, option]
    })
  }

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) onAdd(item, selectedMods, note)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: '600px', backgroundColor: '#0f1016', borderRadius: '28px 28px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -20px 60px rgba(0,0,0,0.8)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '12px auto 0' }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Hero photo */}
          <div style={{ height: '220px', position: 'relative', background: gradient, overflow: 'hidden' }}>
            {item.imageUrl && !imgError ? (
              <img src={item.imageUrl} alt={item.name} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>{emoji}</div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,16,22,1) 0%, transparent 50%)' }} />
            {/* Close button */}
            <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>×</button>
            {isPopular && (
              <div style={{ position: 'absolute', top: '14px', left: '14px' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '999px', backgroundColor: '#ef4444', color: '#fff' }}>🔥 BEST SELLER</span>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 20px 0' }}>
            {/* Name + price */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#ffffff', lineHeight: 1.2, flex: 1, paddingRight: '12px' }}>{item.name}</h2>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', flexShrink: 0 }}>${Number(item.price).toFixed(2)}</span>
            </div>

            {/* Dietary badges */}
            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {badges.map((b) => (
                  <span key={b} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)' }}>{b}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {item.description && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 16px' }}>{item.description}</p>
            )}

            {/* Modifiers */}
            {item.modifiers && item.modifiers.length > 0 && item.modifiers.map((group) => (
              <div key={group.id} style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>{group.name}</span>
                  {group.isRequired && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Required</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.options.map((opt) => {
                    const isSelected = selectedMods.some((m) => m.id === opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleMod(group, opt)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', borderRadius: '12px',
                          backgroundColor: isSelected ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
                          border: isSelected ? `1.5px solid ${accentColor}` : '1.5px solid rgba(255,255,255,0.08)',
                          color: '#ffffff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: group.isRequired ? '50%' : '5px', border: `2px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.3)'}`, backgroundColor: isSelected ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: group.isRequired ? '50%' : '2px', backgroundColor: '#fff' }} />}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{opt.name}</span>
                        </div>
                        {Number(opt.priceAdjustment) !== 0 && (
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                            +${Number(opt.priceAdjustment).toFixed(2)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Special note */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '8px' }}>
                ✏️ Special Instructions (Optional)
              </label>
              <textarea
                placeholder="e.g. Extra spicy, no onions, sauce on the side..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Sticky add bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#0f1016', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Quantity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '8px 12px' }}>
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontWeight: 900, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff', minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: accentColor, border: 'none', color: '#fff', fontWeight: 900, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
          {/* Add CTA */}
          <button
            onClick={handleAdd}
            style={{ flex: 1, padding: '14px', backgroundColor: accentColor, border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: 900, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 6px 20px ${accentColor}55` }}
          >
            <span>Add to Order</span>
            <span style={{ fontFamily: 'monospace' }}>${lineTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TableOrderClient({ locationId, tableId }: TableOrderClientProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<{ item: MenuItem; idx: number } | null>(null)

  // Diner info
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<any>(null)

  // QR Config
  const [qrConfig, setQrConfig] = useState<QrMenuConfig>({})
  const [showPromoBanner, setShowPromoBanner] = useState(true)

  // Best sellers
  const [popularItemIds, setPopularItemIds] = useState<string[]>([])

  // AI Concierge
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMessages, setAiMessages] = useState<Array<{
    sender: 'user' | 'assistant'; text: string
    dishCards?: Array<{ id: string; name: string; price: number; category: string; is86d: boolean; dietary: string[] }>
    suggestedPills?: string[]
  }>>([{
    sender: 'assistant',
    text: "👋 Welcome! I'm your **Prominentz Digital Sommelier & Concierge**.\n\nAsk me anything about allergens, wine pairings, or recommendations!",
    suggestedPills: ['🍷 Wine with Ribeye?', '🌱 Vegetarian options', '🌾 Gluten-free dishes', '⭐ Chef special today?'],
  }])

  const categoryScrollRef = useRef<HTMLDivElement>(null)

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
        body: JSON.stringify({ prompt: activeText, locationId, tableId, mode: 'customer' }),
      })
      const data = await res.json()
      setAiMessages((prev) => [...prev, {
        sender: 'assistant',
        text: data.message || 'Here is what I found from our menu.',
        dishCards: data.actionableDishCards || [],
        suggestedPills: data.suggestedPills,
      }])
    } catch {
      setAiMessages((prev) => [...prev, { sender: 'assistant', text: 'Unable to reach the concierge. Please try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddDishFromAi = (dishId: string) => {
    for (const cat of categories) {
      const found = cat.items.find((i) => i.id === dishId)
      if (found) {
        const globalIdx = categories.flatMap((c) => c.items).indexOf(found)
        setSelectedItem({ item: found, idx: globalIdx })
        setShowAiModal(false)
        return
      }
    }
  }

  // Table Assistance (Call Waiter / Request Bill)
  const [showAssistanceModal, setShowAssistanceModal] = useState(false)
  const [assistanceType, setAssistanceType] = useState<'WATER' | 'CUTLERY' | 'CALL_WAITER' | 'REQUEST_BILL' | 'OTHER'>('CALL_WAITER')
  const [assistanceNotes, setAssistanceNotes] = useState('')
  const [sendingAssistance, setSendingAssistance] = useState(false)
  const [activeAssistance, setActiveAssistance] = useState<{ type: string; notes?: string; requestedAt: string } | null>(null)
  const [assistanceFeedback, setAssistanceFeedback] = useState<string | null>(null)

  const handleSendAssistance = async (overrideType?: 'WATER' | 'CUTLERY' | 'CALL_WAITER' | 'REQUEST_BILL' | 'OTHER') => {
    const selected = overrideType || assistanceType
    setSendingAssistance(true)
    try {
      const res = await fetch('/api/table-order/assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          tableId,
          type: selected,
          notes: assistanceNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setActiveAssistance(data.request)
        setShowAssistanceModal(false)
        setAssistanceFeedback(data.message)
        setAssistanceNotes('')
        setTimeout(() => setAssistanceFeedback(null), 8000)
      }
    } catch (e) {
      console.error('Failed to send assistance request', e)
    } finally {
      setSendingAssistance(false)
    }
  }

  const handleCancelAssistance = async () => {
    try {
      await fetch('/api/table-order/assistance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, tableId }),
      })
      setActiveAssistance(null)
      setAssistanceFeedback(null)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [menuRes, configRes, popularRes, assistanceRes] = await Promise.all([
          fetch(`/api/menu/categories?locationId=${locationId}`),
          fetch(`/api/qr-config?locationId=${locationId}`),
          fetch(`/api/menu/popular?locationId=${locationId}`),
          fetch(`/api/table-order/assistance?locationId=${locationId}&tableId=${tableId}`),
        ])
        const [menuData, configData, popularData, assistanceData] = await Promise.all([
          menuRes.json(), configRes.json(), popularRes.json(), assistanceRes.json(),
        ])
        if (Array.isArray(menuData)) setCategories(menuData)
        if (configData && !configData.error) setQrConfig(configData)
        if (popularData?.popularItemIds) setPopularItemIds(popularData.popularItemIds)
        if (assistanceData?.active) setActiveAssistance(assistanceData.active)
      } catch (err) {
        console.error('Failed to load menu', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [locationId, tableId])

  const addToCart = (item: MenuItem, mods: ModifierOption[] = [], note: string = '') => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.menuItem.id === item.id && c.specialNote === note &&
          JSON.stringify(c.selectedModifiers?.map((m) => m.id).sort()) === JSON.stringify(mods.map((m) => m.id).sort())
      )
      if (existingIdx > -1) return prev.map((c, i) => (i === existingIdx ? { ...c, quantity: c.quantity + 1 } : c))
      return [...prev, { menuItem: item, quantity: 1, selectedModifiers: mods, specialNote: note }]
    })
  }

  const addComboToCart = (combo: ComboItem) => {
    // Add a virtual item representing the combo
    const fakeItem: MenuItem = {
      id: `combo-${combo.id}`,
      name: combo.name,
      description: combo.itemNames.join(', '),
      price: combo.comboPrice,
      isAvailable: true,
      is86d: false,
    }
    addToCart(fakeItem, [], `Combo Deal: ${combo.itemNames.join(' + ')}`)
  }

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: item.quantity + delta } : item)).filter((item) => item.quantity > 0))
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
        locationId, tableId,
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
      const res = await fetch('/api/table-order/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) alert(data.error || 'Failed to place order')
      else { setOrderSuccess(data); setCart([]); setShowCartDrawer(false) }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error submitting order')
    } finally {
      setSubmittingOrder(false)
    }
  }

  const rawAccent = qrConfig.accentColor
  const accentColor = (rawAccent && rawAccent !== '#18181B' && rawAccent !== '#000000' && rawAccent !== 'var(--brand)')
    ? rawAccent
    : '#d4af37'
  const isLightAccent = accentColor === '#d4af37' || accentColor === '#f59e0b' || accentColor === '#eab308' || accentColor === '#ffffff'
  const accentBtnTextColor = isLightAccent ? '#000000' : '#ffffff'

  // Build global item index for gradient assignment
  const allItems = categories.flatMap((c) => c.items)

  // Filter categories (hidden + search)
  const visibleCategories = categories.filter((cat) => !(qrConfig.hiddenCategoryIds || []).includes(cat.id))
  const filteredCategories = visibleCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = activeCategoryId === 'ALL' || cat.id === activeCategoryId
      return matchesSearch && matchesCategory
    }),
  })).filter((cat) => cat.items.length > 0)

  // Chef's specials = popular items + first few items with images
  const heroItems = [
    ...allItems.filter((i) => popularItemIds.includes(i.id)),
    ...allItems.filter((i) => i.imageUrl && !popularItemIds.includes(i.id)),
  ].slice(0, 8)

  // Fallback if no images/popular
  const heroFallback = heroItems.length === 0 ? allItems.slice(0, 6) : heroItems

  const combos: ComboItem[] = qrConfig.combos || []

  const globalItemIdx = (itemId: string) => allItems.findIndex((i) => i.id === itemId)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: '44px', height: '44px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Loading your menu...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Order Success ──────────────────────────────────────────────────────────
  if (orderSuccess) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#fff', padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '36px 24px', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 8px', color: '#fff' }}>Order Fired to Kitchen!</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '0 0 24px' }}>Your dishes are being prepared. Sit back and relax!</p>
          <div style={{ backgroundColor: '#1b1b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', marginBottom: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Table</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: accentColor }}>{orderSuccess.tableName || 'Your Table'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Status</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>● COOKING IN KITCHEN</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: '17px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>${Number(orderSuccess.total || 0).toFixed(2)}</span>
            </div>
          </div>
          <button onClick={() => setOrderSuccess(null)} style={{ width: '100%', padding: '14px', backgroundColor: accentColor, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}>
            ➕ Order More
          </button>
        </div>
      </div>
    )
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: '100px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Promo Banner ──────────────────────────────────────────────────── */}
      {qrConfig.promoText && showPromoBanner && (
        <div style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #f59e0b 100%)`, color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎉</span><span>{qrConfig.promoText}</span>
          </div>
          <button onClick={() => setShowPromoBanner(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '18px', padding: 0 }}>×</button>
        </div>
      )}

      {/* ── Welcome Message ────────────────────────────────────────────────── */}
      {qrConfig.welcomeMessage && (
        <div style={{ background: `linear-gradient(135deg, ${accentColor}20 0%, transparent 100%)`, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontStyle: 'italic' }}>
          {qrConfig.welcomeMessage}
        </div>
      )}

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(10,10,12,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}bb 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Prominentz
                </span>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
                  📱 TABLE ORDER
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Scan · Browse · Order · Enjoy</div>
            </div>
            <button
              onClick={() => setShowCartDrawer(true)}
              style={{ position: 'relative', padding: '9px 16px', backgroundColor: accentColor, border: 'none', borderRadius: '12px', color: accentBtnTextColor, fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 4px 16px ${accentColor}44` }}
            >
              🛒 <span>Cart</span>
              {totalItemCount > 0 && (
                <span style={{ backgroundColor: accentBtnTextColor === '#000000' ? '#000000' : '#ffffff', color: accentBtnTextColor === '#000000' ? '#ffffff' : accentColor, borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: 900 }}>{totalItemCount}</span>
              )}
            </button>
          </div>

          {/* ── Table Assistance Actions (Call Waiter / Request Bill) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <button
              onClick={() => {
                setAssistanceType('CALL_WAITER')
                setShowAssistanceModal(true)
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                backgroundColor: activeAssistance ? 'rgba(234,179,8,0.15)' : '#181822',
                border: activeAssistance ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                color: activeAssistance ? '#fde047' : '#f4f4f5',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🔔</span>
              <span>{activeAssistance ? 'Staff Called' : 'Call Waiter'}</span>
            </button>

            <button
              onClick={() => {
                setAssistanceType('REQUEST_BILL')
                handleSendAssistance('REQUEST_BILL')
              }}
              disabled={sendingAssistance}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                backgroundColor: '#181822',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#f4f4f5',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: sendingAssistance ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🧾</span>
              <span>Request Bill</span>
            </button>
          </div>

          {/* Active Assistance Status Notification */}
          {(activeAssistance || assistanceFeedback) && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#fef08a',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🔔</span>
                <div>
                  <strong>{assistanceFeedback || (activeAssistance?.type === 'REQUEST_BILL' ? 'Bill requested' : 'Staff notified')}</strong>
                  <div style={{ fontSize: '11px', color: 'rgba(254, 240, 138, 0.75)' }}>
                    {activeAssistance?.type === 'REQUEST_BILL' ? 'Staff is printing your check' : 'A server is on their way to your table'}
                  </div>
                </div>
              </div>
              {activeAssistance && (
                <button
                  onClick={handleCancelAssistance}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textDecoration: 'underline',
                  }}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Search dishes, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', backgroundColor: '#16161c', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {/* AI Concierge strip */}
          <button
            onClick={() => setShowAiModal(true)}
            style={{ width: '100%', padding: '8px 14px', borderRadius: '10px', background: `linear-gradient(135deg, ${accentColor}18 0%, rgba(139,92,246,0.15) 100%)`, border: `1px solid ${accentColor}33`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '8px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px' }}>✨</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#93c5fd' }}>Ask Prominentz AI Concierge</span>
            </div>
            <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Allergens · Pairings →</span>
          </button>

          {/* Category pills */}
          <div ref={categoryScrollRef} style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveCategoryId('ALL')}
              style={{ padding: '6px 14px', borderRadius: '999px', border: activeCategoryId === 'ALL' ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', backgroundColor: activeCategoryId === 'ALL' ? `${accentColor}22` : '#16161c', color: activeCategoryId === 'ALL' ? accentColor : 'rgba(255,255,255,0.65)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              🍽️ All ({visibleCategories.reduce((s, c) => s + c.items.length, 0)})
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                style={{ padding: '6px 14px', borderRadius: '999px', border: activeCategoryId === cat.id ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)', backgroundColor: activeCategoryId === cat.id ? `${accentColor}22` : '#16161c', color: activeCategoryId === cat.id ? accentColor : 'rgba(255,255,255,0.65)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>

        {/* ── Combo Deals Strip ──────────────────────────────────────────── */}
        {combos.length > 0 && (
          <section style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: '#fff' }}>🔥 Today's Combos & Deals</h2>
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 800 }}>LIMITED</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {combos.map((combo) => (
                <ComboDealCard key={combo.id} combo={combo} onAddCombo={addComboToCart} accentColor={accentColor} />
              ))}
            </div>
          </section>
        )}

        {/* ── Chef's Specials / Hero Carousel ───────────────────────────── */}
        {heroFallback.length > 0 && !searchQuery && activeCategoryId === 'ALL' && (
          <section style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: '#fff' }}>
                {heroItems.length > 0 ? '🔥 Best Sellers & Chef Picks' : '🌟 Featured Dishes'}
              </h2>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>See all →</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
              {heroFallback.map((item) => {
                const idx = globalItemIdx(item.id)
                return (
                  <HeroItemCard
                    key={item.id}
                    item={item}
                    idx={idx}
                    isPopular={popularItemIds.includes(item.id)}
                    onAdd={(i) => setSelectedItem({ item: i, idx })}
                    accentColor={accentColor}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* ── Category Sections with Visual Cards ───────────────────────── */}
        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No Dishes Found</div>
            <div style={{ fontSize: '13px' }}>Try a different search term</div>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '4px', height: '20px', borderRadius: '2px', backgroundColor: accentColor }} />
                <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#fff' }}>{category.name}</h2>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>({category.items.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {category.items.map((item) => {
                  const idx = globalItemIdx(item.id)
                  const cartEntry = cart.find((c) => c.menuItem.id === item.id)
                  return (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      idx={idx}
                      isPopular={popularItemIds.includes(item.id)}
                      cartEntry={cartEntry}
                      onOpen={(i) => setSelectedItem({ item: i, idx })}
                      accentColor={accentColor}
                    />
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ── Floating Cart Bar ──────────────────────────────────────────────── */}
      {totalItemCount > 0 && !showCartDrawer && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 50, maxWidth: '608px', margin: '0 auto', animation: 'slideUp 0.25s ease-out' }}>
          <div
            onClick={() => setShowCartDrawer(true)}
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, borderRadius: '18px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: `0 12px 32px ${accentColor}55` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px' }}>{totalItemCount}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>View Order</div>
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>${total.toFixed(2)} →</div>
          </div>
        </div>
      )}

      {/* ── Cart Drawer ────────────────────────────────────────────────────── */}
      {showCartDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', backgroundColor: '#141418', borderTopLeftRadius: '26px', borderTopRightRadius: '26px', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s ease-out' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '12px auto 0' }} />
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#fff' }}>🛒 Your Order</h3>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Review before sending to kitchen</div>
              </div>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛒</div>
                  Your cart is empty. Add dishes from the menu!
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#1a1a22', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{item.menuItem.name}</div>
                      {item.specialNote && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>📝 {item.specialNote}</div>}
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{item.selectedModifiers.map((m) => m.name).join(', ')}</div>
                      )}
                      <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 700, fontFamily: 'monospace', marginTop: '4px' }}>
                        ${(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateQuantity(idx, -1)} style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#272730', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '16px' }}>−</button>
                      <span style={{ fontSize: '15px', fontWeight: 800, width: '22px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, 1)} style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: accentColor, border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '16px' }}>+</button>
                    </div>
                  </div>
                ))
              )}

              {/* Guest info */}
              <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="👤 Your name (Optional)" value={guestName} onChange={(e) => setGuestName(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px' }} />
                <input type="tel" placeholder="📱 Phone number (Optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px' }} />
                <input type="text" placeholder="⚠️ Allergies / Kitchen notes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px' }} />
              </div>

              {/* Totals */}
              <div style={{ backgroundColor: '#1a1a22', padding: '14px', borderRadius: '12px', fontSize: '13px' }}>
                {[['Subtotal', `$${subtotal.toFixed(2)}`], ['Tax (8%)', `$${tax.toFixed(2)}`]].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'rgba(255,255,255,0.55)' }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '17px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '4px' }}>
                  <span>Total</span>
                  <span style={{ color: '#10b981', fontFamily: 'monospace' }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={handleSubmitOrder}
                disabled={submittingOrder || cart.length === 0}
                style={{ width: '100%', padding: '15px', background: cart.length === 0 ? '#27272a' : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: 900, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', opacity: submittingOrder ? 0.7 : 1, boxShadow: cart.length > 0 ? `0 6px 24px ${accentColor}44` : 'none' }}
              >
                {submittingOrder ? '⏳ Sending to Kitchen...' : `🚀 Fire Order — $${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Detail Bottom Sheet ───────────────────────────────────────── */}
      {selectedItem && (
        <ItemDetailSheet
          item={selectedItem.item}
          idx={selectedItem.idx}
          isPopular={popularItemIds.includes(selectedItem.item.id)}
          onClose={() => setSelectedItem(null)}
          onAdd={(item, mods, note) => addToCart(item, mods, note)}
          accentColor={accentColor}
        />
      )}

      {/* ── AI Concierge Modal ─────────────────────────────────────────────── */}
      {showAiModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '540px', backgroundColor: '#0f1016', borderRadius: '28px 28px 0 0', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -20px 48px rgba(0,0,0,0.8)', animation: 'slideUp 0.25s ease-out' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '12px auto 0' }} />
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px' }}>✨</span>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>Prominentz Concierge</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Allergens · Pairings · Recommendations</div>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aiMessages.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '88%', padding: '12px 14px', borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', backgroundColor: m.sender === 'user' ? `${accentColor}33` : '#171822', border: m.sender === 'user' ? `1px solid ${accentColor}55` : '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {m.text}
                    {m.dishCards && m.dishCards.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {m.dishCards.map((dish) => (
                          <div key={dish.id} style={{ padding: '8px 10px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700 }}>{dish.name}</div>
                              <div style={{ fontSize: '11px', color: '#10b981' }}>${dish.price.toFixed(2)}</div>
                            </div>
                            <button onClick={() => handleAddDishFromAi(dish.id)} style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: accentColor, color: '#fff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
                              + Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.suggestedPills && m.suggestedPills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {m.suggestedPills.map((pill, pIdx) => (
                        <button key={pIdx} onClick={() => sendDinerAiMessage(pill)} style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#93c5fd', cursor: 'pointer' }}>
                          {pill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#171822', width: 'fit-content' }}>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: accentColor, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Consulting the menu...</span>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Ask about allergens, pairings, specials..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendDinerAiMessage() }}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', backgroundColor: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none' }}
              />
              <button
                onClick={() => sendDinerAiMessage()}
                disabled={!aiPrompt.trim() || aiLoading}
                style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: aiPrompt.trim() && !aiLoading ? accentColor : '#27272a', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Assistance Modal ─────────────────────────────────────── */}
      {showAssistanceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowAssistanceModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#121218',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
              animation: 'slideUp 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                  🔔 Call Table Server
                </h3>
                <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>
                  Select a quick request or send a message
                </div>
              </div>
              <button
                onClick={() => setShowAssistanceModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ×
              </button>
            </div>

            {/* Quick Option Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { type: 'WATER' as const, emoji: '💧', label: 'Need Water', sub: 'Refill carafes' },
                { type: 'CUTLERY' as const, emoji: '🍴', label: 'Cutlery & Napkins', sub: 'Forks, spoons, napkins' },
                { type: 'CALL_WAITER' as const, emoji: '🙋‍♂️', label: 'Call Server', sub: 'Server to table' },
                { type: 'REQUEST_BILL' as const, emoji: '🧾', label: 'Request Check', sub: 'Ready to pay' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => {
                    setAssistanceType(opt.type)
                    handleSendAssistance(opt.type)
                  }}
                  disabled={sendingAssistance}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '14px',
                    backgroundColor: assistanceType === opt.type ? '#27272a' : '#181822',
                    border: assistanceType === opt.type ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: sendingAssistance ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.emoji}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            {/* Custom Notes */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#a1a1aa', marginBottom: '6px' }}>
                Optional special note:
              </label>
              <input
                type="text"
                placeholder="e.g. extra ice, chili flakes, hot water..."
                value={assistanceNotes}
                onChange={(e) => setAssistanceNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#181822',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => handleSendAssistance()}
              disabled={sendingAssistance}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                backgroundColor: accentColor,
                border: 'none',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 900,
                cursor: sendingAssistance ? 'wait' : 'pointer',
                opacity: sendingAssistance ? 0.7 : 1,
              }}
            >
              {sendingAssistance ? 'Calling Server...' : 'Send Request to Staff 🚀'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
