'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/m',        label: 'Dashboard', icon: '⚡' },
  { href: '/m/tables', label: 'Tables',    icon: '🍽️' },
  { href: '/m/team',   label: 'Team',      icon: '👥' },
  { href: '/dashboard/reports', label: 'Reports', icon: '📊' },
  { href: '/pos',      label: 'POS',       icon: '🧾' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 480,
      background: 'rgba(18,18,20,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/m' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px 12px',
              textDecoration: 'none',
              gap: 3,
              transition: 'opacity 0.15s ease',
              opacity: isActive ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#5b45f5' : '#8E8E93',
              letterSpacing: '0.2px',
            }}>
              {item.label}
            </span>
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                width: 32,
                height: 2,
                background: 'linear-gradient(90deg, #5b45f5, #7b68f7)',
                borderRadius: '0 0 2px 2px',
              }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
