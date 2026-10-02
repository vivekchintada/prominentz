'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { useSidebarCollapse } from './SidebarCollapseContext'
import { NotificationsDropdown } from './NotificationsDropdown'


/* ── Quick-nav links (centre of top bar) ── */
const QUICK_LINKS = [
  {
    label: 'POS',
    href: '/pos',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    label: 'Orders',
    href: '/dashboard/orders',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
      </svg>
    ),
  },
  {
    label: 'Kitchen',
    href: '/kds',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
      </svg>
    ),
  },
  {
    label: 'Reservation',
    href: '/dashboard/reservations',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    label: 'Table',
    href: '/dashboard/tables',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1"/><path d="M6 12v6M18 12v6M4 8V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/>
      </svg>
    ),
  },
]

/* ── Sun icon ── */
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

/* ── Moon icon ── */
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

/* ── Hamburger icon ── */
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

/* ── Bell icon ── */
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

/* ── Search icon ── */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

interface TopBarProps {
  restaurantName?: string
  userInitials?: string
  userImage?: string | null
  userName?: string
  userEmail?: string
  userRole?: string
}

export default function TopBar({
  restaurantName = 'My Restaurant',
  userInitials = 'U',
  userImage,
  userName = '',
  userEmail = '',
  userRole = '',
}: TopBarProps) {
  const pathname = usePathname()
  const { toggle } = useSidebarCollapse()
  const [isDark, setIsDark] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  // Check unread notifications on mount
  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.unreadCount === 'number') {
          setHasUnread(data.unreadCount > 0)
        }
      })
      .catch(() => {})
  }, [])


  // Sync theme state with current html data-theme
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    setIsDark(current !== 'light')
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    const goLight = isDark
    // Add transition class for smooth swap
    html.classList.add('theme-transitioning')
    if (goLight) {
      html.setAttribute('data-theme', 'light')
    } else {
      html.removeAttribute('data-theme')
    }
    setIsDark(!goLight)
    try { localStorage.setItem('resto-theme', goLight ? 'light' : 'dark') } catch {}
    setTimeout(() => html.classList.remove('theme-transitioning'), 300)
  }

  return (
    <header className="top-bar">
      {/* Left zone — hamburger + branding */}
      <div className="top-bar__left">
        <button
          className="top-bar__icon-btn"
          onClick={toggle}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <MenuIcon />
        </button>

        <div className="top-bar__brand">
          {/* Prominentz chef-toque mark */}
          <div className="top-bar__logo-mark">
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M8 33 C8 23 14 17 22 17 C23 13 27 9 32 9 C36 3 46 5 47 13 C52 11 56 17 54 23 C56 26 56 31 52 34 L10 34 C8.5 34 8 33.5 8 33Z" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 34 L11 38 Q11 41 14 41 L42 41 Q45 41 45 38 L45 34" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="34" x2="21" y2="41" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="28" y1="34" x2="28" y2="41" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="35" y1="34" x2="35" y2="41" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="top-bar__restaurant-name">{restaurantName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Centre zone — quick-nav links */}
      <nav className="top-bar__quicknav">
        {QUICK_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`top-bar__quicknav-link${isActive ? ' top-bar__quicknav-link--active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Right zone — actions */}
      <div className="top-bar__right">
        {/* Search */}
        <button className="top-bar__icon-btn" aria-label="Search" title="Search">
          <SearchIcon />
        </button>

        {/* Chart / Analytics shortcut */}
        <Link href="/dashboard/reports" className="top-bar__icon-btn" aria-label="Analytics" title="Analytics">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </Link>

        {/* Dark / Light toggle */}
        <button
          className="top-bar__icon-btn top-bar__theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="top-bar__icon-btn"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setShowNotifications((prev) => !prev)}
          >
            <div style={{ position: 'relative' }}>
              <BellIcon />
              {/* Notification dot */}
              {hasUnread && (
                <span style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--apple-red, #ff453a)',
                  border: '1.5px solid var(--color-bg-sidebar, #12151e)',
                }} />
              )}
            </div>
          </button>

          <NotificationsDropdown
            isOpen={showNotifications}
            onClose={() => {
              setShowNotifications(false)
              setHasUnread(false)
            }}
          />
        </div>


        {/* Direct Sign Out shortcut button */}
        <button
          className="top-bar__icon-btn"
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label="Sign Out"
          title="Sign Out"
          style={{ color: '#ef4444' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>

        {/* User Profile & Menu Dropdown */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="top-bar__avatar"
            aria-label="User account menu"
            title={userName ? `${userName} (${userRole})` : 'User profile'}
            style={{ cursor: 'pointer', border: 'none', padding: 0 }}
          >
            {userImage ? (
              <img src={userImage} alt="User profile avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{userInitials}</span>
            )}
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 240,
                backgroundColor: 'var(--color-bg-card, #1c1c1e)',
                border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                padding: '12px',
                zIndex: 1100,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div style={{ padding: '4px 6px 8px', borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName || 'User'}
                </div>
                {userEmail && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary, #888)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userEmail}
                  </div>
                )}
                {userRole && (
                  <span style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(91,69,245,0.15)',
                    color: '#7b68f7',
                    border: '1px solid rgba(91,69,245,0.3)',
                  }}>
                    {userRole}
                  </span>
                )}
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary, #eee)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span>Store Settings</span>
              </Link>

              <Link
                href="/dashboard/settings/billing"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary, #eee)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <span>Plan & Billing</span>
              </Link>

              <div style={{ height: '1px', background: 'var(--color-border, rgba(255,255,255,0.08))', margin: '2px 0' }} />

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
