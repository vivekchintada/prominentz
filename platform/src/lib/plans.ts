// Plan tier types and feature gate utility
export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE'

export interface PlanFeature {
  href: string
  icon: string
  label: string
  tier: PlanTier        // minimum tier required
  roles?: ('OWNER' | 'MANAGER' | 'SERVER' | 'KITCHEN')[] // authorized roles
  group?: string        // optional group label for sidebar sections
}

// Full nav definition with tier and role requirements
export const NAV_ITEMS: PlanFeature[] = [
  // ─── Core (STARTER) ────────────────────────────────────────────────────────
  { href: '/dashboard',              icon: '📊', label: 'Dashboard',        tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/pos',                    icon: '🛎️', label: 'POS',              tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/dashboard/orders',       icon: '📋', label: 'Orders',           tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/kds',                    icon: '🍳', label: 'Kitchen (KDS)',    tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'KITCHEN', 'SERVER'] },
  { href: '/dashboard/tables',       icon: '🪑', label: 'Tables',           tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/dashboard/invoices',     icon: '🧾', label: 'Invoices',         tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/reservations', icon: '📅', label: 'Reservation',      tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/dashboard/menu',         icon: '🧩', label: 'Menu Editor',      tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/reports',      icon: '📈', label: 'Sales Reports',    tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/inventory',    icon: '📦', label: 'Inventory Mgmt',   tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/team',         icon: '👷', label: 'Staff & Shifts',   tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/waitlist',     icon: '⏳', label: 'Walk-in Waitlist', tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },

  // ─── Professional (All Pro Features Unlocked) ──────────────────────────────
  { href: '/dashboard/ai',           icon: '🧠', label: 'Resto IQ Agent',   tier: 'PRO',     roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/crm',          icon: '👥', label: 'Guest CRM',        tier: 'PRO',     roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/loyalty',      icon: '⭐', label: 'Loyalty Rewards',  tier: 'PRO',     roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/tables/qr',        icon: '📱', label: 'QR Code Studio',   tier: 'PRO',     roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/locations',        icon: '🏢', label: 'Multi-Location',   tier: 'PRO',     roles: ['OWNER', 'MANAGER'] },

  // ─── Settings & Admin ──────────────────────────────────────────────────────
  { href: '/dashboard/settings',         icon: '⚙️', label: 'General Settings', tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/settings/billing', icon: '💳', label: 'Billing & Plan',   tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/audit',            icon: '📜', label: 'Audit Log',        tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
]

// Returns true if the given plan meets or exceeds the required tier
export function hasPlanAccess(userPlan: PlanTier, requiredTier: PlanTier): boolean {
  if (userPlan === 'ENTERPRISE' || userPlan === 'PRO') return true
  return requiredTier === 'STARTER'
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  STARTER:    'Starter Plan',
  PRO:        'Professional Plan',
  ENTERPRISE: 'Professional Plan',
}

export const PLAN_COLORS: Record<PlanTier, string> = {
  STARTER:    '#6b7280',
  PRO:        '#2563eb',
  ENTERPRISE: '#2563eb',
}
