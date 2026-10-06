'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { NAV_ITEMS, hasPlanAccess, PlanTier } from '@/lib/plans'
import { useSidebarCollapse } from './SidebarCollapseContext'

/* ─────────────────────────────────────────────
   NAV GROUP DEFINITIONS
   Each group has an icon for the rail and
   a list of sub-page hrefs.
───────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    id: 'main',
    label: 'Main',
    railIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    hrefs: ['/dashboard', '/pos', '/server', '/kds', '/dashboard/orders'],
  },
  {
    id: 'workforce',
    label: 'Workforce',
    railIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    hrefs: ['/dashboard/schedule', '/dashboard/attendance', '/dashboard/labor', '/dashboard/approvals', '/dashboard/kitchen-overview', '/dashboard/team', '/dashboard/staff'],
  },
  {
    id: 'operations',
    label: 'Operations',
    railIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    hrefs: ['/dashboard/tables', '/dashboard/tables/qr', '/dashboard/reservations', '/dashboard/menu', '/dashboard/inventory', '/dashboard/invoices', '/dashboard/online-orders'],
  },
  {
    id: 'sales',
    label: 'Sales & Guests',
    railIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    hrefs: ['/dashboard/reports', '/dashboard/waitlist'],
  },
  {
    id: 'settings',
    label: 'Settings',
    railIcon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    hrefs: ['/dashboard/settings', '/dashboard/settings/billing', '/dashboard/audit'],
  },
]

/* ── Per-page SVG icons for the text panel ── */
const PAGE_ICONS: Record<string, React.ReactNode> = {
  '/dashboard': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  '/pos': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  '/server': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  '/kds': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  ),
  '/dashboard/schedule': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  '/dashboard/attendance': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  '/dashboard/approvals': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  '/dashboard/kitchen-overview': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  '/dashboard/labor': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  '/dashboard/orders': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  '/dashboard/tables': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="10" rx="2"/><path d="M4 15v5M20 15v5M8 15v5M16 15v5M2 8h20"/>
    </svg>
  ),
  '/dashboard/invoices': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  '/dashboard/online-orders': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  '/dashboard/menu': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18"/>
    </svg>
  ),
  '/dashboard/inventory': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  '/dashboard/team': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  '/dashboard/staff': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  '/dashboard/reports': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  '/dashboard/reservations': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  '/dashboard/waitlist': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  '/dashboard/crm': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  '/dashboard/loyalty': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  '/dashboard/ai': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
      <circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/>
    </svg>
  ),
  '/dashboard/tables/qr': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3v3"/><path d="M21 21v.01"/>
      <path d="M12 7v3"/><path d="M12 3v.01"/><path d="M12 14v.01"/><path d="M12 17v3"/>
    </svg>
  ),
  '/dashboard/locations': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  '/dashboard/settings/billing': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  '/dashboard/audit': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  '/dashboard/settings': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  '/dashboard/reconciliation': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      <path d="M7 15h.01M11 15h4"/>
    </svg>
  ),
}

interface SidebarNavProps {
  planTier?: PlanTier
  userRole?: string
}

export default function SidebarNav({ planTier = 'ENTERPRISE', userRole }: SidebarNavProps) {
  const pathname = usePathname()
  const { collapsed } = useSidebarCollapse()
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [upgradeModal, setUpgradeModal] = useState<{ tier: PlanTier; label: string } | null>(null)

  // Filter nav items by role and plan tier: only show required, accessible items
  const availableNavItems = NAV_ITEMS.filter((item) => {
    const hasRole = !item.roles || (userRole && item.roles.includes(userRole as any))
    const hasPlan = hasPlanAccess(planTier, item.tier)
    return hasRole && hasPlan
  })
  const availableHrefs = new Set(availableNavItems.map((i) => i.href))
  const getNavItem = (href: string) => availableNavItems.find((i) => i.href === href)


  // Determine which group is currently active (for rail highlight)
  const getActiveGroupId = () => {
    for (const group of NAV_GROUPS) {
      const hasActive = group.hrefs.some(
        (href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
      )
      if (hasActive) return group.id
    }
    return null
  }
  const currentActiveGroupId = getActiveGroupId()

  // Which group panel is open: user-selected OR auto from current route
  const openGroupId = activeGroupId ?? currentActiveGroupId

  const handleRailClick = (groupId: string) => {
    setActiveGroupId(activeGroupId === groupId ? null : groupId)
  }

  // Build the open group's nav items
  const openGroup = NAV_GROUPS.find((g) => g.id === openGroupId)
  const openGroupItems = openGroup
    ? openGroup.hrefs
        .filter((href) => availableHrefs.has(href))
        .map((href) => getNavItem(href))
        .filter(Boolean) as typeof availableNavItems
    : []

  return (
    <>
      {/* ── TIER 1: Icon Rail (always visible) ── */}
      <div className="sidebar-rail">
        {NAV_GROUPS.map((group) => {
          const isGroupActive = group.id === currentActiveGroupId
          const isGroupOpen = group.id === openGroupId
          return (
            <button
              key={group.id}
              className={`sidebar-rail__btn${isGroupActive ? ' sidebar-rail__btn--current' : ''}${isGroupOpen && !collapsed ? ' sidebar-rail__btn--open' : ''}`}
              onClick={() => handleRailClick(group.id)}
              title={group.label}
              aria-label={group.label}
            >
              {group.railIcon}
            </button>
          )
        })}

        {/* Spacer to push Sign Out to the bottom */}
        <div style={{ marginTop: 'auto' }} />

        <button
          className="sidebar-rail__btn"
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sign Out"
          aria-label="Sign Out"
          style={{ color: '#ef4444' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* ── TIER 2: Text Panel (collapses) ── */}
      <div className={`sidebar-panel${collapsed ? ' sidebar-panel--collapsed' : ''}`}>
        {/* Section header */}
        {openGroup && (
          <div className="sidebar-panel__section-header">
            {openGroup.label}
          </div>
        )}

        {/* Nav links */}
        <nav className="sidebar-panel__nav">
          {(() => {
            if (openGroupItems.length === 0) {
              return (
                <div style={{ padding: '24px 16px', color: 'var(--color-text-tertiary)', fontSize: 12, textAlign: 'center' }}>
                  No pages available
                </div>
              )
            }

            const exactMatch = openGroupItems.find((i) => i.href === pathname)
            const longestPrefixMatch = !exactMatch
              ? openGroupItems
                  .filter((i) => i.href !== '/dashboard' && pathname.startsWith(i.href + '/'))
                  .sort((a, b) => b.href.length - a.href.length)[0]
              : null
            const activeItemHref = exactMatch ? exactMatch.href : (longestPrefixMatch?.href ?? (pathname === '/dashboard' ? '/dashboard' : null))

            return openGroupItems.map((item) => {
              const isActive = item.href === activeItemHref
              const isLocked = !hasPlanAccess(planTier, item.tier)

              if (isLocked) {
                return (
                  <button
                    key={item.href}
                    onClick={() => setUpgradeModal({ tier: item.tier, label: item.label })}
                    className="sidebar-panel__link"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: '8px 12px',
                      opacity: 0.75,
                      transition: 'opacity 150ms ease',
                    }}
                    title={`${item.label} (Not included in Basic Plan)`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="sidebar-panel__link-icon" style={{ opacity: 0.7 }}>
                        {PAGE_ICONS[item.href] ?? <span style={{ fontSize: 12 }}>{item.icon}</span>}
                      </span>
                      <span className="sidebar-panel__link-label">{item.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239,68,68,0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.25)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      🔒 SOON
                    </span>
                  </button>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-panel__link${isActive ? ' sidebar-panel__link--active' : ''}`}
                >
                  <span className="sidebar-panel__link-icon">
                    {PAGE_ICONS[item.href] ?? <span style={{ fontSize: 12 }}>{item.icon}</span>}
                  </span>
                  <span className="sidebar-panel__link-label">{item.label}</span>
                </Link>
              )
            })
          })()}
        </nav>

        {/* Panel bottom sign out action */}
        <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '0.5px solid var(--color-border, rgba(255,255,255,0.08))' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            title="Sign out of dashboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: '12px' }}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Upgrade modal */}
      {upgradeModal && (
        <UpgradeModal
          requiredTier={upgradeModal.tier}
          featureName={upgradeModal.label}
          currentPlan={planTier}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </>
  )
}
