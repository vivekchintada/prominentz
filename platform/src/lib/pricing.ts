// ─── Resto AI — Central Pricing Source of Truth ──────────────────────────────
// Streamlined 2-Tier Model: Starter ($49) and Professional ($129)

export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE'

export const PRICING = {
  STARTER: {
    monthly: 49,
    annual:  490,   // ~2 months free
    label:   'Starter Plan',
    color:   '#6b7280',
    tagline: 'Core operations for single-location restaurants and cafes.',
    badge:   null,
  },
  PRO: {
    monthly: 129,
    annual:  1290,
    label:   'Professional Plan',
    color:   '#2563eb',
    tagline: 'The complete high-performance restaurant suite with QR ordering, CRM & AI.',
    badge:   'Most Popular (All Features)',
  },
  ENTERPRISE: {
    monthly: 129,
    annual:  1290,
    label:   'Professional Plan',
    color:   '#2563eb',
    tagline: 'The complete high-performance restaurant suite with QR ordering, CRM & AI.',
    badge:   'All Features Included',
  },
} as const

// All features by tier
export const PLAN_FEATURES = {
  STARTER: [
    { icon: '🧾', label: 'Point of Sale (POS) & Table Management' },
    { icon: '🍳', label: 'Real-Time Kitchen Display Screen (KDS)' },
    { icon: '🧩', label: 'Menu Editor & Custom Modifiers' },
    { icon: '💳', label: 'Cash, Card, Split & QR Payments' },
    { icon: '📦', label: 'Inventory Stock & Recipe Tracking' },
    { icon: '👷', label: 'Staff & Shift Management (Up to 5 Users)' },
    { icon: '📅', label: 'Reservations & Walk-In Waitlist' },
    { icon: '📈', label: 'End-of-Day Z-Reports & Sales Analytics' },
  ],
  PRO: [
    { icon: '📱', label: 'Table & Food Menu QR Code Studio (Direct-to-KDS)' },
    { icon: '👥', label: 'Guest CRM & VIP Guest Intelligence' },
    { icon: '⭐', label: 'Automatic Loyalty Points & Rewards Engine' },
    { icon: '🏢', label: 'Multi-Location Switching & Outlets' },
    { icon: '🛵', label: 'UrbanPiper Aggregators (Zomato / Swiggy / DoorDash)' },
    { icon: '🤖', label: 'RestoIQ AI Conversational Analytics' },
    { icon: '🖨️', label: 'Seat Split Checks & Direct ESC/POS Thermal Printing' },
    { icon: '⏰', label: 'Deputy HR Shift Scheduling & Timeclock' },
  ],
  ENTERPRISE: [
    { icon: '📱', label: 'Table & Food Menu QR Code Studio (Direct-to-KDS)' },
    { icon: '👥', label: 'Guest CRM & VIP Guest Intelligence' },
    { icon: '⭐', label: 'Automatic Loyalty Points & Rewards Engine' },
    { icon: '🏢', label: 'Multi-Location Switching & Outlets' },
    { icon: '🛵', label: 'UrbanPiper Aggregators (Zomato / Swiggy / DoorDash)' },
    { icon: '🤖', label: 'RestoIQ AI Conversational Analytics' },
  ],
}

export function getUpgradeFeatures(fromPlan: PlanTier, toPlan: PlanTier) {
  if (toPlan === 'PRO' || toPlan === 'ENTERPRISE') {
    return PLAN_FEATURES.PRO
  }
  return PLAN_FEATURES.STARTER
}

export function getUpgradeMessage(fromPlan: PlanTier, toPlan: PlanTier) {
  const fromPrice = PRICING[fromPlan]?.monthly || 49
  const toPrice = PRICING[toPlan]?.monthly || 129
  const delta = Math.max(toPrice - fromPrice, 0)
  return {
    from: fromPlan,
    to: toPlan,
    delta,
    savings: 258,
  }
}
