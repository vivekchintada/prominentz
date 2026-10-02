// ─── Prominentz — Central Pricing Source of Truth ──────────────────────────────
// Basic Plan ($40/mo) — Pro Plan currently removed / in development

export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE'

export const PRICING = {
  STARTER: {
    monthly: 40,
    annual:  400,   // ~2 months free
    label:   'Basic Plan',
    color:   '#5b45f5',
    tagline: 'Affordable, full-featured operating foundation for restaurants, bistros, and cafes.',
    badge:   'Most Popular · $40/mo',
  },
  PRO: {
    monthly: 129,
    annual:  1290,
    label:   'Pro Plan (In Development)',
    color:   '#8b5cf6',
    tagline: 'Advanced AI intelligence, guest CRM, loyalty rewards, and multi-location (coming soon).',
    badge:   'Coming Soon',
  },
  ENTERPRISE: {
    monthly: 129,
    annual:  1290,
    label:   'Enterprise',
    color:   '#10b981',
    tagline: 'Custom infrastructure and multi-unit restaurant chain operations.',
    badge:   'Custom',
  },
} as const

// All features by tier
// NOTE: Intelligence (RestoIQ AI), Guest CRM, and Loyalty Rewards are strictly EXCLUDED from the Basic Plan.
export const PLAN_FEATURES = {
  STARTER: [
    { icon: '🛎️', label: 'Point of Sale (POS) & Table Floor Management' },
    { icon: '🍳', label: 'Real-Time Kitchen Display System (KDS) & Bump Rail' },
    { icon: '📱', label: 'Table & Food Menu QR Code Studio (Direct-to-KDS)' },
    { icon: '🧩', label: 'Menu Editor & Custom Item Modifiers' },
    { icon: '💳', label: 'Cash, Card, Table-Side & Split Bill Payments' },
    { icon: '🪑', label: 'Live Table Status Switcher & Seat-by-Seat Splitting' },
    { icon: '📦', label: 'Inventory Stock Count & Recipe Depletion Tracking' },
    { icon: '👷', label: 'Staff Shift Management & Clock-In/Clock-Out' },
    { icon: '📅', label: 'Table Reservations & Walk-In Waitlist' },
    { icon: '📈', label: 'End-of-Day Z-Reports & Daily Sales Analytics' },
  ],
  NOT_INCLUDED_IN_BASIC: [
    { icon: '🧠', label: 'RestoIQ AI Operations Agent & Intelligence' },
    { icon: '👥', label: 'Guest CRM, Dining History & VIP Profiles' },
    { icon: '⭐', label: 'Automatic Loyalty Points & Customer Rewards Engine' },
  ],
  PRO: [
    { icon: '🧠', label: 'RestoIQ AI Conversational Analytics & Intelligence' },
    { icon: '👥', label: 'Guest CRM & VIP Guest Intelligence' },
    { icon: '⭐', label: 'Automatic Loyalty Points & Rewards Engine' },
    { icon: '🏢', label: 'Multi-Location Switching & Outlets' },
    { icon: '🛵', label: 'UrbanPiper Aggregators (Zomato / Swiggy / DoorDash)' },
    { icon: '⏰', label: 'Deputy HR Shift Scheduling & Labor Cost %' },
  ],
  ENTERPRISE: [
    { icon: '🏢', label: 'Unlimited Outlets & Multi-Location HQ Hierarchy' },
    { icon: '🔒', label: 'Dedicated Database Cluster & SLA' },
  ],
}

export function getUpgradeFeatures(fromPlan: PlanTier, toPlan: PlanTier) {
  if (toPlan === 'PRO' || toPlan === 'ENTERPRISE') {
    return PLAN_FEATURES.PRO
  }
  return PLAN_FEATURES.STARTER
}

export function getUpgradeMessage(fromPlan: PlanTier, toPlan: PlanTier) {
  const fromPrice = PRICING[fromPlan]?.monthly || 40
  const toPrice = PRICING[toPlan]?.monthly || 129
  const delta = Math.max(toPrice - fromPrice, 0)
  return {
    from: fromPlan,
    to: toPlan,
    delta,
    savings: 258,
  }
}

