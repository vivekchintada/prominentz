'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number | string
  badgeVariant?: 'primary' | 'warning' | 'danger' | 'success'
  href?: string
}

export interface NavGroup {
  id: string
  label: string
  railIcon: React.ReactNode
  items: NavItem[]
}

export interface QuickLink {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  onClick?: () => void
  active?: boolean
  readOnlyBadge?: string
}

interface DreamPosShellProps {
  role: 'SERVER' | 'KITCHEN' | 'MANAGER' | 'OWNER'
  workstationTitle?: string
  user: {
    name: string
    role: string
    email?: string
  }
  navGroups: NavGroup[]
  activeNavId: string
  onSelectNav: (id: string) => void
  quickLinks?: QuickLink[]
  topBarRight?: React.ReactNode
  defaultSidebarCollapsed?: boolean
  onSignOut?: () => void
  children: React.ReactNode
}

export default function DreamPosShell({
  role,
  workstationTitle,
  user,
  navGroups,
  activeNavId,
  onSelectNav,
  quickLinks,
  topBarRight,
  defaultSidebarCollapsed = false,
  onSignOut,
  children,
}: DreamPosShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(defaultSidebarCollapsed)
  const [activeGroupId, setActiveGroupId] = useState<string>(navGroups[0]?.id || '')
  const [isDark, setIsDark] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(false)

  useEffect(() => {
    // Check initial theme
    const theme = document.documentElement.getAttribute('data-theme')
    setIsDark(theme === 'dark')

    const checkDimensions = () => {
      const isSmall = window.innerWidth < 1024
      setIsMobileOrTablet(isSmall)
      if (isSmall) {
        setSidebarCollapsed(true)
      }
    }
    checkDimensions()
    window.addEventListener('resize', checkDimensions)

    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', checkDimensions)
    }
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    const nextDark = !isDark
    setIsDark(nextDark)
    const nextTheme = nextDark ? 'dark' : 'light'
    html.setAttribute('data-theme', nextTheme)
    try {
      localStorage.setItem('resto-theme', nextTheme)
      localStorage.setItem('prominentz-theme', nextTheme)
    } catch {}
  }

  const currentGroup = navGroups.find((g) => g.id === activeGroupId) || navGroups[0]

  return (
    <div
      className="dreampos-root"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--canvas)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ── Compact 60–64px Top Navigation ── */}
      <header
        style={{
          height: '62px',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 2px rgba(7, 21, 46, 0.04)',
        }}
      >
        {/* Left: Brand + Workstation Indicator + Sidebar Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: sidebarCollapsed ? 'var(--canvas)' : 'var(--surface)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={sidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link
            href={role === 'SERVER' ? '/server' : role === 'KITCHEN' ? '/kds' : '/dashboard'}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#18181B',
                border: '1px solid #18181B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
              }}
            >
              <ProminentzLogo variant="icon" size="sm" inverse={true} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Resto
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {workstationTitle || (role === 'SERVER' ? 'Server Floor' : 'Kitchen KDS')}
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Module Quick Links (Role-specific) */}
        {quickLinks && quickLinks.length > 0 && (
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--canvas)',
              padding: '3px 4px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              overflowX: 'auto',
              maxWidth: isMobileOrTablet ? 'calc(100vw - 190px)' : 'none',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              flexShrink: 1,
            }}
          >
            {quickLinks.map((link) => {
              const active = link.active
              const content = (
                <>
                  {link.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{link.icon}</span>}
                  <span>{link.label}</span>
                  {link.readOnlyBadge && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--primary)',
                        fontWeight: 700,
                        marginLeft: '4px',
                      }}
                    >
                      {link.readOnlyBadge}
                    </span>
                  )}
                </>
              )

              const buttonStyle: React.CSSProperties = {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                color: active ? '#ffffff' : 'var(--text-muted)',
                backgroundColor: active ? 'var(--primary)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }

              if (link.onClick) {
                return (
                  <button key={link.id} onClick={link.onClick} style={buttonStyle}>
                    {content}
                  </button>
                )
              }

              return (
                <Link key={link.id} href={link.href || '#'} style={buttonStyle}>
                  {content}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Right: Workstation Controls + Clock + User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {topBarRight}

          {/* Time Clock */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              backgroundColor: 'var(--canvas)',
              border: '1px solid var(--border)',
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* User Avatar */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px',
              border: '1.5px solid var(--primary)',
            }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>

          {/* Sign Out */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Exit
            </button>
          )}
        </div>
      </header>

      {/* ── Main Body: Dual-Level Left Navigation + Workspace ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Tier 1: Slim Icon Rail (56px) */}
        <aside
          style={{
            width: '56px',
            backgroundColor: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 0',
            gap: '8px',
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          {navGroups.map((group) => {
            const isGroupActive = group.id === activeGroupId
            return (
              <button
                key={group.id}
                onClick={() => {
                  setActiveGroupId(group.id)
                  if (sidebarCollapsed) setSidebarCollapsed(false)
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  border: isGroupActive ? '1px solid var(--primary)' : '1px solid transparent',
                  backgroundColor: isGroupActive ? 'var(--primary-soft)' : 'transparent',
                  color: isGroupActive ? 'var(--primary)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={group.label}
                aria-label={group.label}
              >
                {group.railIcon}
              </button>
            )
          })}

          <div style={{ marginTop: 'auto' }} />

          {/* Quick Sign Out icon at bottom of rail */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </aside>

        {/* Tier 2: Expanded Submenu Panel (Collapsible) */}
        {!sidebarCollapsed && currentGroup && (
          <>
            {isMobileOrTablet && (
              <div
                onClick={() => setSidebarCollapsed(true)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(7, 21, 46, 0.4)',
                  zIndex: 45,
                }}
              />
            )}
            <aside
              style={{
                width: '210px',
                backgroundColor: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                padding: '16px 12px',
                zIndex: isMobileOrTablet ? 50 : 20,
                position: isMobileOrTablet ? 'fixed' : 'relative',
                left: isMobileOrTablet ? '56px' : undefined,
                top: isMobileOrTablet ? '62px' : undefined,
                bottom: isMobileOrTablet ? 0 : undefined,
                boxShadow: isMobileOrTablet ? '4px 0 20px rgba(0, 0, 0, 0.15)' : undefined,
                transition: 'width 0.2s ease',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '4px 8px 12px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '8px',
                }}
              >
                {currentGroup.label}
              </div>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                {currentGroup.items.map((item) => {
                  const isActive = item.id === activeNavId
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectNav(item.id)
                        if (isMobileOrTablet) setSidebarCollapsed(true)
                      }}
                      style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? 'var(--primary-soft)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: '10px',
                          backgroundColor:
                            item.badgeVariant === 'danger'
                              ? 'var(--danger-soft)'
                              : item.badgeVariant === 'warning'
                              ? 'var(--warning-soft)'
                              : item.badgeVariant === 'success'
                              ? 'var(--success-soft)'
                              : 'var(--primary-soft)',
                          color:
                            item.badgeVariant === 'danger'
                              ? 'var(--danger)'
                              : item.badgeVariant === 'warning'
                              ? 'var(--warning)'
                              : item.badgeVariant === 'success'
                              ? 'var(--success)'
                              : 'var(--primary)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>
          </>
        )}

        {/* ── Internal Workspace ── */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
