'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Menu, X } from 'lucide-react'
import { ProminentzLogo } from '@/components/brand/ProminentzLogo'
import { CookieSettingsButton } from '@/components/ui/CookieSettingsButton'
import s from './Landing.module.css'

export type Ground = 'dark' | 'light'

export type TrackerStep = {
  id: string
  label: string
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

type TopbarProps = {
  ground: Ground
  steps?: TrackerStep[]
  onStep?: (id: string) => void
  /** the theatre drives colours and the tracker through data-e handles */
  scripted?: boolean
}

export function Topbar({ ground, steps, onStep, scripted }: TopbarProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const groundClass = ground === 'dark' ? s.dark : s.light

  return (
    <>
      <header className={`${s.topbar} ${groundClass}`} data-e="topbar">
        <Link href="/" className={s.brand} aria-label="Prominentz home">
          <span className={s.brandDark}>
            <ProminentzLogo variant="one-color-white" size={103} height={22} />
          </span>
          <span className={s.brandLight} aria-hidden="true">
            <ProminentzLogo variant="one-color" size={103} height={22} />
          </span>
        </Link>

        {steps && steps.length > 0 && (
          <ol className={s.tracker} data-e="tracker" style={scripted ? { opacity: 0 } : undefined} aria-label="Where the order is">
            {steps.map((step, i) => (
              <li key={step.id} style={{ display: 'contents' }}>
                {i > 0 && <ChevronRight className={s.trackArrow} size={13} strokeWidth={1.5} aria-hidden="true" />}
                <button type="button" className={s.trackStep} onClick={() => onStep?.(step.id)}>
                  <span className={s.trackIcon} data-e={`st${i}d`} aria-hidden="true">
                    {step.icon ? <step.icon size={13} strokeWidth={1.75} /> : <span className={s.trackDot} />}
                  </span>
                  <span data-e={`st${i}`}>{step.label}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        <nav className={s.navLinks} aria-label="Primary">
          <Link href="/pricing" className={s.navLink}>
            Pricing
          </Link>
          <Link href="/#demo" className={s.navLink}>
            Book a demo
          </Link>
          <Link href="/login" className={s.navLink}>
            Sign in
          </Link>
          <Link href="/signup" className={`${s.btnSolid} ${s.btnSmall} plausible-event-name=Trial+Click`}>
            Start free trial
          </Link>
        </nav>

        <button
          type="button"
          className={s.menuBtn}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="site-sheet"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
        </button>
      </header>

      {open && (
        <div id="site-sheet" className={`${s.sheet} ${groundClass}`}>
          <Link href="/pricing" className={s.sheetLink} onClick={() => setOpen(false)}>
            Pricing
          </Link>
          <Link href="/#demo" className={s.sheetLink} onClick={() => setOpen(false)}>
            Book a demo
          </Link>
          <Link href="/#faq" className={s.sheetLink} onClick={() => setOpen(false)}>
            Questions
          </Link>
          <div className={s.sheetActions}>
            <Link href="/login" className={s.btnLine} onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link href="/signup" className={`${s.btnSolid} plausible-event-name=Trial+Click`} onClick={() => setOpen(false)}>
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

/** Public page wrapper for pages without the story: topbar follows the ground under it. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ground, setGround] = useState<Ground>('light')

  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const els = ref.current?.querySelectorAll<HTMLElement>('[data-ground]') ?? []
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.top <= 30 && r.bottom > 30) {
          setGround(el.dataset.ground === 'dark' ? 'dark' : 'light')
          break
        }
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className={s.root}>
      <Topbar ground={ground} />
      {children}
      <SiteFooter />
    </div>
  )
}

export function CloseBand({ title }: { title: string }) {
  return (
    <section className={`${s.close} ${s.dark}`} data-ground="dark" aria-labelledby="close-title">
      <h2 id="close-title" className={s.h1}>
        {title}
      </h2>
      <p className={s.lede} style={{ marginInline: 'auto' }}>
        Start a 14-day free trial and set it up yourself, or book a demo and we&apos;ll load your menu for you.
      </p>
      <div className={s.btnRow}>
        <Link href="/signup" className={`${s.btnSolid} plausible-event-name=Trial+Click`}>
          Start free trial
        </Link>
        <Link href="/#demo" className={s.btnLine}>
          Book a demo
        </Link>
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className={`${s.footer} ${s.dark}`} data-ground="dark">
      <div className={s.footerInner}>
        <ProminentzLogo variant="one-color-white" size={94} height={20} />
        <nav className={s.footerLinks} aria-label="Footer">
          <Link href="/pricing">Pricing</Link>
          <Link href="/#demo">Book a demo</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <CookieSettingsButton
            style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }}
          />
        </nav>
        <span className={s.footerNote}>© {new Date().getFullYear()} Prominentz</span>
      </div>
    </footer>
  )
}
