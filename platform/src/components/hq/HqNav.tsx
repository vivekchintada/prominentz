'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/hq', label: 'Overview' },
  { href: '/hq/restaurants', label: 'Restaurants' },
  { href: '/hq/billing', label: 'Billing' },
  { href: '/hq/trials', label: 'Trials' },
  { href: '/hq/support', label: 'Support' },
]

export function HqNav() {
  const path = usePathname() ?? ''
  return (
    <nav aria-label="HQ sections" className="bz-nav">
      {LINKS.map((l) => {
        const on = l.href === '/hq' ? path === '/hq' : path.startsWith(l.href)
        return (
          <Link key={l.href} href={l.href} className={`bz-nav__link${on ? ' bz-nav__link--active' : ''}`} aria-current={on ? 'page' : undefined}>
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
