import { NAV_ITEMS, hasPlanAccess, type PlanTier } from '@/lib/plans'

/** One link in the bento top bar or its "More" menu. */
export interface BentoNavLink {
  href: string
  label: string
}

export interface BentoNavGroup {
  label: string
  links: BentoNavLink[]
}

/** The six links shown in the top bar, as on the Owner / Manager board. */
const PRIMARY: BentoNavLink[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/tables', label: 'Tables' },
  { href: '/dashboard/menu', label: 'Menu' },
  { href: '/dashboard/staff', label: 'Staff' },
  { href: '/dashboard/reports', label: 'Reports' },
]

/** Everything else, grouped for the "More" menu. Labels are short on purpose. */
const MORE: { label: string; links: BentoNavLink[] }[] = [
  {
    label: 'Floor',
    links: [
      { href: '/pos', label: 'POS' },
      { href: '/server', label: 'Captain app' },
      { href: '/kds', label: 'Kitchen display' },
      { href: '/dashboard/online-orders', label: 'Online orders' },
      { href: '/dashboard/reservations', label: 'Reservations' },
      { href: '/dashboard/waitlist', label: 'Waitlist' },
      { href: '/dashboard/tables/qr', label: 'QR codes' },
    ],
  },
  {
    label: 'Back office',
    links: [
      { href: '/dashboard/locations', label: 'All branches' },
      { href: '/dashboard/inventory', label: 'Inventory' },
      { href: '/dashboard/invoices', label: 'Payments' },
      { href: '/dashboard/kitchen-overview', label: 'Kitchen overview' },
      { href: '/dashboard/crm', label: 'Guests' },
      { href: '/dashboard/loyalty', label: 'Loyalty' },
      { href: '/dashboard/ai', label: 'Prominentz AI' },
    ],
  },
  {
    label: 'Team and settings',
    links: [
      { href: '/dashboard/schedule', label: 'Schedule' },
      { href: '/dashboard/attendance', label: 'Attendance' },
      { href: '/dashboard/labor', label: 'Labour and timesheets' },
      { href: '/dashboard/approvals', label: 'Approvals' },
      { href: '/dashboard/team', label: 'People (HR)' },
      { href: '/dashboard/settings', label: 'Settings' },
      { href: '/dashboard/settings/billing', label: 'Billing and plan' },
      { href: '/dashboard/audit', label: 'Audit log' },
    ],
  },
]

/** Pages this role and plan may open, keyed by href (same rules as the old sidebar). */
function allowedHrefs(role: string, plan: PlanTier): Set<string> {
  return new Set(
    NAV_ITEMS.filter((i) => (!i.roles || i.roles.includes(role as never)) && hasPlanAccess(plan, i.tier)).map((i) => i.href),
  )
}

export function getBentoNav(role: string, plan: PlanTier): { primary: BentoNavLink[]; more: BentoNavGroup[] } {
  const ok = allowedHrefs(role, plan)
  return {
    primary: PRIMARY.filter((l) => ok.has(l.href)),
    more: MORE.map((g) => ({ label: g.label, links: g.links.filter((l) => ok.has(l.href)) })).filter((g) => g.links.length > 0),
  }
}

/** The link that best matches the current path: exact first, then longest prefix. */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  if (hrefs.includes(pathname)) return pathname
  const match = hrefs
    .filter((h) => h !== '/dashboard' && pathname.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return match ?? null
}
