'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown'
import { LocationSwitcher } from '@/components/layout/LocationSwitcher'
import { activeHref, type BentoNavGroup, type BentoNavLink } from '@/lib/bento-nav'
import type { PlanTier } from '@/lib/plans'
import { BentoLogo } from './BentoLogo'
import { useThemeToggle } from './useThemeToggle'

interface BentoTopBarProps {
  primary: BentoNavLink[]
  more: BentoNavGroup[]
  restaurantName: string
  userName: string
  userEmail: string
  userInitials: string
  planTier: PlanTier
  /** Link to the Prominentz HQ console, for platform admins only. */
  hqHref?: string | null
}

type Menu = 'more' | 'location' | 'user' | 'alerts' | null

function useClickAway(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

export function BentoTopBar({ primary, more, restaurantName, userName, userEmail, userInitials, planTier, hqHref = null }: BentoTopBarProps) {
  const pathname = usePathname() ?? '/dashboard'
  const [menu, setMenu] = useState<Menu>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [locationName, setLocationName] = useState<string | null>(null)
  const { isDark, toggle: toggleTheme } = useThemeToggle()
  const close = () => setMenu(null)
  const rootRef = useClickAway(menu !== null, close)

  const moreHrefs = more.flatMap((g) => g.links.map((l) => l.href))
  const current = activeHref(pathname, [...primary.map((l) => l.href), ...moreHrefs])
  const moreIsActive = current !== null && moreHrefs.includes(current)

  // Close menus when the route changes
  useEffect(() => setMenu(null), [pathname])

  // Ctrl/Cmd + K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHasUnread(Boolean(d && typeof d.unreadCount === 'number' && d.unreadCount > 0)))
      .catch(() => {})
  }, [])

  // Show the active outlet's name on the location button
  useEffect(() => {
    let cancelled = false
    const load = (wantedId?: string) =>
      fetch('/api/locations')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d?.locations?.length) return
          let saved: string | null = null
          try {
            saved = wantedId ?? localStorage.getItem('resto_active_location_id')
          } catch {}
          const loc = d.locations.find((l: { id: string }) => l.id === saved) ?? d.locations[0]
          setLocationName(loc?.name ?? null)
        })
        .catch(() => {})
    load()
    const onChange = (e: Event) => load((e as CustomEvent<{ locationId: string }>).detail?.locationId)
    window.addEventListener('resto_location_changed', onChange)
    return () => {
      cancelled = true
      window.removeEventListener('resto_location_changed', onChange)
    }
  }, [])

  const toggleMenu = (m: Exclude<Menu, null>) => setMenu((v) => (v === m ? null : m))

  return (
    <>
      <header className="bz-header" ref={rootRef}>
        <div className="bz-header__left">
          <BentoLogo href="/dashboard" />
          <nav aria-label="Sections" className="bz-nav">
            {primary.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`bz-nav__link${current === l.href ? ' bz-nav__link--active' : ''}`}
                aria-current={current === l.href ? 'page' : undefined}
              >
                {l.label}
              </Link>
            ))}
            {more.length > 0 && (
              <div className="bz-pop">
                <button
                  type="button"
                  className={`bz-nav__link${moreIsActive ? ' bz-nav__link--active' : ''}`}
                  aria-expanded={menu === 'more'}
                  aria-haspopup="true"
                  onClick={() => toggleMenu('more')}
                >
                  More
                  <Chevron />
                </button>
                {menu === 'more' && (
                  <div className="bz-menu bz-menu--wide" role="menu">
                    {more.map((g) => (
                      <div key={g.label} className="bz-menu__group">
                        <span className="bz-menu__label">{g.label}</span>
                        {g.links.map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            role="menuitem"
                            className={`bz-menu__item${current === l.href ? ' bz-menu__item--active' : ''}`}
                            onClick={close}
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="bz-header__right">
          <button type="button" className="bz-search" onClick={() => setPaletteOpen(true)} aria-label="Search orders, tables, staff (Ctrl+K)">
            <SearchIcon />
            <span className="bz-search__label">Search orders, tables, staff</span>
          </button>

          <div className="bz-pop">
            <button
              type="button"
              className="bz-btn bz-btn--outline"
              aria-expanded={menu === 'location'}
              onClick={() => toggleMenu('location')}
            >
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationName ?? restaurantName}</span>
              <Chevron />
            </button>
            {menu === 'location' && (
              <div className="bz-menu bz-menu--right" style={{ width: 280 }}>
                <div className="bz-menu__meta">
                  <strong>{restaurantName}</strong>
                  <span>Switch the outlet you are working in</span>
                </div>
                <LocationSwitcher planTier={planTier} />
              </div>
            )}
          </div>

          <div className="bz-pop">
            <button
              type="button"
              className="bz-icon-btn"
              aria-label={hasUnread ? 'Notifications, unread' : 'Notifications'}
              aria-expanded={menu === 'alerts'}
              onClick={() => toggleMenu('alerts')}
            >
              <BellIcon />
              {hasUnread && <span className="bz-icon-btn__dot" />}
            </button>
            <NotificationsDropdown
              isOpen={menu === 'alerts'}
              onClose={() => {
                setMenu(null)
                setHasUnread(false)
              }}
            />
          </div>

          <button type="button" className="bz-icon-btn" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          <div className="bz-pop">
            <button
              type="button"
              className="bz-avatar"
              aria-label={`Account menu for ${userName || 'you'}`}
              aria-expanded={menu === 'user'}
              onClick={() => toggleMenu('user')}
            >
              {userInitials}
            </button>
            {menu === 'user' && (
              <div className="bz-menu bz-menu--right" role="menu">
                <div className="bz-menu__meta">
                  <strong>{userName || 'Signed in'}</strong>
                  <span>{userEmail}</span>
                </div>
                <div className="bz-menu__sep" />
                <Link href="/dashboard/settings" className="bz-menu__item" role="menuitem" onClick={close}>Settings</Link>
                <Link href="/dashboard/settings/billing" className="bz-menu__item" role="menuitem" onClick={close}>
                  Billing and plan
                  <span className="bz-badge bz-badge--quiet">{planTier}</span>
                </Link>
                {hqHref && (
                  <Link href={hqHref} className="bz-menu__item" role="menuitem" onClick={close}>
                    Prominentz HQ
                    <span className="bz-badge bz-badge--accent" style={{ fontSize: 11 }}>Admin</span>
                  </Link>
                )}
                <div className="bz-menu__sep" />
                <button type="button" className="bz-menu__item bz-menu__item--danger" role="menuitem" onClick={() => signOut({ callbackUrl: '/login' })}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}

function Chevron() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}
function SunIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  )
}
