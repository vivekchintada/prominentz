'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSidebarCollapse } from './SidebarCollapseContext'

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
}

export default function TopBar({ restaurantName = 'My Restaurant', userInitials = 'U', userImage }: TopBarProps) {
  const pathname = usePathname()
  const { toggle } = useSidebarCollapse()
  const [isDark, setIsDark] = useState(true)

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
          {/* Logo mark */}
          <div className="top-bar__logo-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
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
        <button className="top-bar__icon-btn" aria-label="Notifications" title="Notifications">
          <div style={{ position: 'relative' }}>
            <BellIcon />
            {/* Notification dot */}
            <span style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--apple-red)',
              border: '1.5px solid var(--color-bg-sidebar)',
            }} />
          </div>
        </button>

        {/* User avatar */}
        <Link href="/dashboard/settings" className="top-bar__avatar" aria-label="User settings">
          {userImage ? (
            <img src={userImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{userInitials}</span>
          )}
        </Link>
      </div>
    </header>
  )
}
