'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'Point of Sale',
  server: 'Server Handheld',
  kds: 'Kitchen Display',
  orders: 'Orders',
  tables: 'Floor & Tables',
  qr: 'QR Codes',
  reservations: 'Reservations',
  waitlist: 'Waitlist',
  schedule: 'Scheduling',
  attendance: 'Attendance',
  labor: 'Labor & Payroll',
  approvals: 'Approvals',
  staff: 'Staff',
  team: 'Team Directory',
  'kitchen-overview': 'Kitchen Overview',
  menu: 'Menu Management',
  inventory: 'Inventory',
  counts: 'Stock Counts',
  'purchase-orders': 'Purchase Orders',
  recipes: 'Recipes',
  suppliers: 'Suppliers',
  invoices: 'Invoices',
  'online-orders': 'Online Orders',
  reconciliation: 'Reconciliation',
  reports: 'Reports & Analytics',
  crm: 'Customer CRM',
  loyalty: 'Loyalty & Rewards',
  ai: 'AI & Automations',
  settings: 'Settings',
  billing: 'Billing & Plan',
  ordering: 'Online Ordering',
  audit: 'Audit Log',
  locations: 'Locations',
  dev: 'Developer',
  components: 'Component Showcase',
}

export function Breadcrumbs() {
  const pathname = usePathname()

  if (!pathname || pathname === '/' || pathname === '/login') {
    return null
  }

  // Remove leading/trailing slash and split into segments
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  // Generate crumbs with cumulative paths
  const crumbs = segments.map((seg, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')

    return {
      href,
      label,
      isLast,
    }
  })

  return (
    <nav aria-label="Breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.href}>
          {idx > 0 && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.35, flexShrink: 0 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          {crumb.isLast ? (
            <span
              aria-current="page"
              style={{
                fontWeight: 600,
                color: 'var(--color-text-primary, #ffffff)',
                letterSpacing: '-0.01em',
              }}
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              style={{
                color: 'var(--color-text-secondary, rgba(255, 255, 255, 0.7))',
                textDecoration: 'none',
                transition: 'color 140ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary, rgba(255, 255, 255, 0.7))'
              }}
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
