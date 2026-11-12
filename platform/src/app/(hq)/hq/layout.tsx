import type { ReactNode } from 'react'
import Link from 'next/link'
import { BentoLogo } from '@/components/bento/BentoLogo'
import { HqNav } from '@/components/hq/HqNav'
import { requirePlatformAdmin } from '@/lib/hq/hq-data'
import { initials } from '@/lib/bento/time'

export const metadata = {
  title: { default: 'HQ', template: '%s · Prominentz HQ' },
  robots: { index: false, follow: false },
}

/** Prominentz HQ: the console for the Prominentz team. Each page checks access again. */
export default async function HqLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin()
  return (
    <div className="bz">
      <div className="bz-wrap">
        <header className="bz-header bz-header--ink">
          <div className="bz-header__left">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <BentoLogo href="/hq" />
              <span className="bz-hq-badge">HQ</span>
            </span>
            <HqNav />
          </div>
          <div className="bz-header__right">
            <Link href="/dashboard" className="bz-link bz-hide-sm" style={{ fontSize: 14 }}>
              My restaurant
            </Link>
            <span className="bz-avatar" style={{ background: 'var(--bz-accent)', color: '#FFFFFF', fontWeight: 800 }} role="img" aria-label={`Signed in as ${user.name || user.email}, Prominentz team`}>
              {initials(user.name || user.email)}
            </span>
          </div>
        </header>
        <main id="main-content" className="bz-main">
          {children}
        </main>
      </div>
    </div>
  )
}
