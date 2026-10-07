'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface CommandItem {
  id: string
  label: string
  category: 'Quick Actions' | 'Operations' | 'Workforce' | 'Inventory' | 'Analytics & CRM' | 'Settings'
  icon: React.ReactNode
  href?: string
  action?: () => void
  keywords?: string[]
}

const COMMAND_ITEMS: CommandItem[] = [
  // Quick Actions
  {
    id: 'act-pos',
    label: 'Open Point of Sale (POS)',
    category: 'Quick Actions',
    href: '/pos',
    keywords: ['order', 'checkout', 'register', 'terminal'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'act-res',
    label: 'New Reservation',
    category: 'Quick Actions',
    href: '/dashboard/reservations',
    keywords: ['book', 'table', 'guest'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'act-clock',
    label: 'Clock In / Out Attendance',
    category: 'Quick Actions',
    href: '/kiosk/clockin',
    keywords: ['time', 'shift', 'pin'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'act-86',
    label: 'Manage 86 / Out of Stock Items',
    category: 'Quick Actions',
    href: '/dashboard/menu',
    keywords: ['sold out', 'inventory', 'item', 'menu'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
  // Operations
  {
    id: 'nav-dashboard',
    label: 'Live Operations Command Center',
    category: 'Operations',
    href: '/dashboard',
    keywords: ['home', 'overview', 'kpi'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'nav-server',
    label: 'Server Handheld Terminal',
    category: 'Operations',
    href: '/server',
    keywords: ['mobile', 'waiter', 'tables'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'nav-kds',
    label: 'Kitchen Display System (KDS)',
    category: 'Operations',
    href: '/kds',
    keywords: ['chef', 'cook', 'tickets', 'expo', 'line'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
    ),
  },
  {
    id: 'nav-orders',
    label: 'Order Management & History',
    category: 'Operations',
    href: '/dashboard/orders',
    keywords: ['receipts', 'payments', 'closed', 'active'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    id: 'nav-tables',
    label: 'Floor Plan & Table Map',
    category: 'Operations',
    href: '/dashboard/tables',
    keywords: ['seating', 'layout', 'turns'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M6 12v6M18 12v6M4 8V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
      </svg>
    ),
  },
  // Workforce
  {
    id: 'nav-schedule',
    label: 'Visual Scheduling Workspace',
    category: 'Workforce',
    href: '/dashboard/schedule',
    keywords: ['calendar', 'shifts', 'roster', 'swap'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'nav-labor',
    label: 'Labor & Payroll Optimization',
    category: 'Workforce',
    href: '/dashboard/labor',
    keywords: ['wages', 'cost', 'hours', 'overtime'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'nav-team',
    label: 'Staff Directory & Roles',
    category: 'Workforce',
    href: '/dashboard/staff',
    keywords: ['employees', 'servers', 'cooks', 'pin'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  // Inventory
  {
    id: 'nav-inv',
    label: 'Real-Time Inventory Levels',
    category: 'Inventory',
    href: '/dashboard/inventory',
    keywords: ['stock', 'ingredients', 'waste', 'variance'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    id: 'nav-po',
    label: 'Purchase Orders & Suppliers',
    category: 'Inventory',
    href: '/dashboard/inventory/purchase-orders',
    keywords: ['vendors', 'orders', 'delivery'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      </svg>
    ),
  },
  // Analytics & CRM
  {
    id: 'nav-reports',
    label: 'Sales & Performance Reports',
    category: 'Analytics & CRM',
    href: '/dashboard/reports',
    keywords: ['revenue', 'sales', 'analytics', 'z-report'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'nav-crm',
    label: 'Guest Directory & CRM',
    category: 'Analytics & CRM',
    href: '/dashboard/crm',
    keywords: ['customers', 'vip', 'spend', 'history'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'nav-ai',
    label: 'RestoIQ AI & Automations',
    category: 'Analytics & CRM',
    href: '/dashboard/ai',
    keywords: ['artificial intelligence', 'assistant', 'forecast', 'insights'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  // Settings
  {
    id: 'nav-billing',
    label: 'Subscription & Billing Plans',
    category: 'Settings',
    href: '/dashboard/settings/billing',
    keywords: ['stripe', 'upgrade', 'invoice', 'pro', 'enterprise'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'nav-settings',
    label: 'Store Settings & Hardware',
    category: 'Settings',
    href: '/dashboard/settings',
    keywords: ['printers', 'taxes', 'receipt', 'general'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return COMMAND_ITEMS
    const q = query.toLowerCase()
    return COMMAND_ITEMS.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q)
      const matchCat = item.category.toLowerCase().includes(q)
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q))
      return matchLabel || matchCat || matchKeywords
    })
  }, [query])

  // Ensure index stays in bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1))
    }
  }, [filteredItems.length, selectedIndex])

  // Key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredItems[selectedIndex]
      if (selected) {
        handleSelect(selected)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleSelect = (item: CommandItem) => {
    onClose()
    if (item.action) {
      item.action()
    } else if (item.href) {
      router.push(item.href)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--surface, #181715)',
          borderRadius: '16px',
          border: '1px solid var(--surface-border-strong, rgba(255, 255, 255, 0.15))',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--surface-border, rgba(255, 255, 255, 0.08))',
            gap: '12px',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--brand-emerald, #059669)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or jump to page... (e.g. POS, Schedule, Reports)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary, #ffffff)',
              fontSize: '15px',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-tertiary, rgba(255, 255, 255, 0.5))',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: 'var(--color-text-tertiary, rgba(255, 255, 255, 0.5))',
                fontSize: '14px',
              }}
            >
              No matching commands or pages found for &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--brand-emerald-light, rgba(5, 150, 105, 0.15))' : 'transparent',
                    border: isSelected ? '1px solid var(--brand-emerald-border, rgba(5, 150, 105, 0.3))' : '1px solid transparent',
                    transition: 'background-color 100ms ease, border-color 100ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        color: isSelected ? 'var(--brand-emerald, #059669)' : 'var(--color-text-secondary, rgba(255, 255, 255, 0.7))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--color-text-primary, #ffffff)' : 'var(--color-text-secondary, rgba(255, 255, 255, 0.85))',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 600,
                      color: 'var(--color-text-quaternary, rgba(255, 255, 255, 0.4))',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: '1px solid var(--surface-border, rgba(255, 255, 255, 0.08))',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            fontSize: '12px',
            color: 'var(--color-text-tertiary, rgba(255, 255, 255, 0.5))',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <span><kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>↑</kbd> <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>↓</kbd> Navigate</span>
            <span><kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>↵</kbd> Select</span>
          </div>
          <span>Antigravity Quick Command</span>
        </div>
      </div>
    </div>
  )
}
