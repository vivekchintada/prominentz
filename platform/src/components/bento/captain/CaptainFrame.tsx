'use client'

import { useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { OfflineBanner } from '@/components/bento/OfflineBanner'

export type CaptainTab = 'tables' | 'orders' | 'alerts'

interface Props {
  active: CaptainTab
  firstName: string
  locationId: string
  onSignOut: () => void
  children: ReactNode
}

/** Phone frame shared by the Captain tabs: grey ground, scrolling body, dark tab bar, and the "Me" sheet. */
export function CaptainFrame({ active, firstName, locationId, onSignOut, children }: Props) {
  const meRef = useRef<HTMLDialogElement>(null)
  const tab = (t: CaptainTab) => (active === t ? 'bz-tab bz-tab--on' : 'bz-tab')
  const current = (t: CaptainTab) => (active === t ? ('page' as const) : undefined)

  return (
    <div className="bz bz-phone-ground">
      <div className="bz-phone">
        <div className="bz-phone__body">
          <OfflineBanner />
          {children}
        </div>

        <nav aria-label="App" className="bz-tabbar">
          <Link href="/server" className={tab('tables')} aria-current={current('tables')}>
            <TabIcon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
            <span>Tables</span>
          </Link>
          <Link href="/server/orders" className={tab('orders')} aria-current={current('orders')}>
            <TabIcon d="M4 6h16M4 12h16M4 18h10" />
            <span>Orders</span>
          </Link>
          <Link href="/pos" className="bz-tab bz-tab--new" aria-label="New order">
            <TabIcon d="M12 5v14M5 12h14" w={2.6} />
            <span>New</span>
          </Link>
          <Link href={`/menu/${locationId}`} className="bz-tab">
            <TabIcon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            <span>Menu</span>
          </Link>
          <button type="button" className="bz-tab" onClick={() => meRef.current?.showModal()}>
            <TabIcon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
            <span>Me</span>
          </button>
        </nav>
      </div>

      <dialog ref={meRef} className="bz-dialog" aria-labelledby="me-title">
        <div className="bz-stack bz-stack--lg">
          <h2 id="me-title" className="bz-title bz-title--lg">{firstName}</h2>
          <Link href="/server/alerts" className="bz-menu__item" onClick={() => meRef.current?.close()}>Alerts</Link>
          <Link href="/server/availability" className="bz-menu__item" onClick={() => meRef.current?.close()}>My availability</Link>
          <Link href="/kds" className="bz-menu__item" onClick={() => meRef.current?.close()}>Kitchen display</Link>
          <button type="button" className="bz-menu__item bz-menu__item--danger" onClick={onSignOut}>Sign out</button>
          <div className="bz-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="bz-btn bz-btn--outline" onClick={() => meRef.current?.close()}>Close</button>
          </div>
        </div>
      </dialog>
    </div>
  )
}

/** Bell button for the Captain header. Links to the Alerts tab and shows a dot when something is waiting. */
export function CaptainBell({ count }: { count: number }) {
  return (
    <Link
      href="/server/alerts"
      className="bz-icon-btn"
      style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--bz-card)' }}
      aria-label={count ? `Alerts, ${count} new` : 'Alerts'}
    >
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
      {count > 0 && <span className="bz-icon-btn__dot" style={{ top: 8, right: 8, width: 10, height: 10, borderColor: 'var(--bz-card)' }} />}
    </Link>
  )
}

export function TabIcon({ d, w = 2 }: { d: string; w?: number }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
