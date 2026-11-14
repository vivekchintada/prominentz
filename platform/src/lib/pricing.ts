// ─── Prominentz — Central Pricing Source of Truth ──────────────────────────────
// Basic Plan ($50/mo) — Pro Plan currently removed / in development

export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE'

export const PRICING = {
  STARTER: {
    monthly: 50,
    annual:  500,   // ~2 months free
    monthlyINR: 3999,
    annualINR:  39990,
    label:   'Basic Plan',
    color:   '#5b45f5',
    tagline: 'Affordable, full-featured operating foundation for restaurants, bistros, and cafes.',
    badge:   'Most Popular · $50/mo (₹3,999/mo)',
  },
  PRO: {
    monthly: 129,
    annual:  1290,
    monthlyINR: 9999,
    annualINR:  99990,
    label:   'Pro Plan (In Development)',
    color:   '#8b5cf6',
    tagline: 'Advanced AI intelligence and multi-location (coming soon).',
    badge:   'Coming Soon',
  },
  ENTERPRISE: {
    monthly: 299,
    annual:  2990,
    monthlyINR: 24999,
    annualINR:  249990,
    label:   'Enterprise',
    color:   '#10b981',
    tagline: 'Custom infrastructure and multi-unit restaurant chain operations.',
    badge:   'Custom',
  },
} as const

// All features by tier
// NOTE: Prominentz AI is excluded from the Basic Plan. Guest CRM and Loyalty are included (decision 2026-11-14).
// STARTER is printed line for line on the landing bill (components/landing/PlanBill.tsx); keep 11 entries.
export const PLAN_FEATURES = {
  STARTER: [
    { icon: '🛎️', label: 'Point of Sale (POS) & Table Floor Management' },
    { icon: '🍳', label: 'Real-Time Kitchen Display System (KDS) & Bump Rail' },
    { icon: '📱', label: 'Table & Food Menu QR Code Studio (Direct-to-KDS)' },
    { icon: '🧩', label: 'Menu Editor & Custom Item Modifiers' },
    { icon: '💳', label: 'Cash, Card, Table-Side & Split Bill Payments' },
    { icon: '👥', label: 'Guest CRM, Dining History & Loyalty Rewards' },
    { icon: '📦', label: 'Inventory Stock Count & Recipe Depletion Tracking' },
    { icon: '👷', label: 'Staff Schedules, Clock-In/Clock-Out & Leave Approvals' },
    { icon: '📅', label: 'Table Reservations & Walk-In Waitlist' },
    { icon: '📈', label: 'End-of-Day Z-Reports & Daily Sales Analytics' },
    { icon: '🛵', label: 'Delivery Aggregator Sync (Zomato / Swiggy / DoorDash / UberEats)' },
  ],
  NOT_INCLUDED_IN_BASIC: [
    { icon: '🧠', label: 'Prominentz AI Operations Agent & Intelligence' },
  ],
  PRO: [
    { icon: '🧠', label: 'Prominentz AI Conversational Analytics & Intelligence' },
    { icon: '🏢', label: 'Multi-Location Switching & Outlets' },
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
  const fromPrice = PRICING[fromPlan]?.monthly || 50
  const toPrice = PRICING[toPlan]?.monthly || 129
  const delta = Math.max(toPrice - fromPrice, 0)
  return {
    from: fromPlan,
    to: toPlan,
    delta,
    savings: 258,
  }
}

