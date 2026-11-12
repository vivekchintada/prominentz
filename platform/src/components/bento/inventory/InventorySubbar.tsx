'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeHref } from '@/lib/bento-nav'

const LINKS = [
  { href: '/dashboard/inventory', label: 'Stock' },
  { href: '/dashboard/inventory/purchase-orders', label: 'Purchase orders' },
  { href: '/dashboard/inventory/recipes', label: 'Recipes' },
  { href: '/dashboard/inventory/suppliers', label: 'Suppliers' },
  { href: '/dashboard/inventory/waste', label: 'Wastage' },
  { href: '/dashboard/inventory/items', label: 'All items' },
]

/** The Store keeper board's section links, shown on every inventory page. */
export function InventorySubbar() {
  const pathname = usePathname() ?? ''
  const current = activeHref(pathname, LINKS.map((l) => l.href))
  return (
    <div className="bz-subbar">
      <nav aria-label="Inventory sections" className="bz-nav">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`bz-nav__link${current === l.href ? ' bz-nav__link--active' : ''}`}
            aria-current={current === l.href ? 'page' : undefined}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <Link href="/dashboard/inventory/counts" className="bz-btn bz-btn--lime bz-btn--outline">
        Start stock count
      </Link>
    </div>
  )
}
