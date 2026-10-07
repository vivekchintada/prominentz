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
  // ─── Core & Operations (STARTER) ───────────────────────────────────────────
  { href: '/dashboard',              icon: '📊', label: 'Dashboard',        tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/pos',                    icon: '🛎️', label: 'POS Terminal',     tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/server',                 icon: '📱', label: 'Server Floor',     tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/kds',                    icon: '🍳', label: 'Kitchen (KDS)',    tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'KITCHEN', 'SERVER'] },
  { href: '/dashboard/schedule',     icon: '📅', label: 'Schedule',         tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/attendance',   icon: '⏱️', label: 'Attendance',       tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/labor',        icon: '💼', label: 'Labor & Timesheets', tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/approvals',    icon: '✅', label: 'Approvals',        tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/kitchen-overview', icon: '🍲', label: 'Kitchen Overview', tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/team',         icon: '👷', label: 'People (HR)',      tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/staff',        icon: '👥', label: 'Staff & Access',   tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/orders',       icon: '📋', label: 'Orders',           tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/dashboard/online-orders', icon: '🛍️', label: 'Online Orders',    tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/tables',       icon: '🪑', label: 'Tables & Floor',   tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/dashboard/tables/qr',    icon: '📱', label: 'QR Code Studio',   tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/invoices',     icon: '🧾', label: 'Invoices',         tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/reservations', icon: '📆', label: 'Reservation',      tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/dashboard/menu',         icon: '🧩', label: 'Menu Editor',      tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/reports',      icon: '📈', label: 'Sales Reports',    tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/inventory',    icon: '📦', label: 'Inventory Mgmt',   tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/waitlist',     icon: '⏳', label: 'Walk-in Waitlist', tier: 'STARTER', roles: ['OWNER', 'MANAGER', 'SERVER'] },
  { href: '/dashboard/crm',          icon: '👥', label: 'Guest CRM',        tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/loyalty',      icon: '🎁', label: 'Loyalty Rewards',  tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },
  { href: '/dashboard/ai',           icon: '✨', label: 'RestoIQ AI',       tier: 'STARTER', roles: ['OWNER', 'MANAGER'] },

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
  STARTER:    'Basic Plan',
  PRO:        'Pro (Coming Soon)',
  ENTERPRISE: 'Enterprise',
}

export const PLAN_COLORS: Record<PlanTier, string> = {
  STARTER:    '#5b45f5',
  PRO:        '#8b5cf6',
  ENTERPRISE: '#10b981',
}

