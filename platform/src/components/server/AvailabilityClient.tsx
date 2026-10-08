'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './availability.module.css'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useToast, ToastContainer } from '../ui/Toast'

type Kind = 'AVAILABLE' | 'PREFERRED' | 'UNAVAILABLE'

type Day = {
  dayOfWeek: number
  type: Kind
  startTime: string
  endTime: string
  notes: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_DAYS: Day[] = DAY_NAMES.map((_, dayOfWeek) => ({
  dayOfWeek,
  type: dayOfWeek === 0 ? 'UNAVAILABLE' : 'AVAILABLE',
  startTime: '09:00',
  endTime: '17:00',
  notes: '',
}))

interface Props {
  currentUser?: {
    id: string
    name: string
    role: string
    email: string
  }
  onSignOut?: () => void
}

export default function AvailabilityClient({ currentUser, onSignOut }: Props) {
  const [days, setDays] = useState<Day[]>(DEFAULT_DAYS)
  const [saving, setSaving] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch('/api/availability')
      .then((r) => (r.ok ? r.json() : []))
      .then((slots: unknown[]) => {
        if (!slots || !slots.length) return
        setDays(
          DEFAULT_DAYS.map((d) => {
            const s = slots.find((x) => x.dayOfWeek === d.dayOfWeek && x.isRecurring)
            return s
              ? {
                  dayOfWeek: d.dayOfWeek,
                  type: s.type,
                  startTime: s.startTime ?? '09:00',
                  endTime: s.endTime ?? '17:00',
                  notes: s.notes ?? '',
                }
              : d
          })
        )
      })
      .catch(() => {})
  }, [])

  const update = (i: number, patch: Partial<Day>) =>
    setDays((v) => v.map((d, x) => (x === i ? { ...d, ...patch } : d)))

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: days.map((d) => ({ ...d, isRecurring: true })) }),
      })
      const data = await r.json()
      if (r.ok) {
        showToast('Weekly availability submitted to managers', 'success')
      } else {
        throw new Error(data.error || 'Failed to update availability')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save availability', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Top Bar ── */}
      <header className={styles.topBar}>
        <div className={styles.brandNav}>
          <Link href="/dashboard" className={styles.brandLink}>
            <span className={styles.brandDot}>●</span>
            <span className={styles.brandText}>Prominentz</span>
          </Link>
          <nav className={styles.navPills}>
            <Link href="/pos" className={styles.navPill}>🛍️ POS</Link>
            <Link href="/server" className={styles.navPill}>🍽️ Server</Link>
            <Link href="/kds" className={styles.navPill}>🍳 Kitchen</Link>
            <Link href="/dashboard/reservations" className={styles.navPill}>📅 Reservation</Link>
            <Link href="/server/availability" className={`${styles.navPill} ${styles.navPillActive}`}>⏱️ Availability</Link>
          </nav>
        </div>

        <div className={styles.topBarRight}>
          <span className={styles.clock}>
            {mounted ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </span>
          <ThemeToggle />
          <div className={styles.userAvatar}>
            {currentUser?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          {onSignOut && (
            <button onClick={onSignOut} className={styles.signOutBtn}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className={styles.content}>
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>MY WORK SCHEDULE</p>
            <h1 className={styles.title}>Weekly Availability</h1>
            <p className={styles.subtitle}>
              Submit recurring availability and shift preferences. Management uses this when generating schedules.
            </p>
          </div>
          <Link href="/server" className={styles.backBtn}>
            ← Back to Floor
          </Link>
        </div>

        <section className={styles.scheduleCard}>
          {/* Legend */}
          <div className={styles.legendBar}>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotAvailable}`} />
              <span>Available</span>
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotPreferred}`} />
              <span>Preferred Hours</span>
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotUnavailable}`} />
              <span>Unavailable</span>
            </span>
          </div>

          {/* Days List */}
          {days.map((d, i) => (
            <div className={styles.dayRow} key={d.dayOfWeek}>
              <span className={styles.dayName}>{DAY_NAMES[d.dayOfWeek]}</span>

              <select
                className={styles.selectInput}
                value={d.type}
                onChange={(e) => update(i, { type: e.target.value as Kind })}
              >
                <option value="AVAILABLE">🟢 Available</option>
                <option value="PREFERRED">🔵 Preferred</option>
                <option value="UNAVAILABLE">🔴 Unavailable</option>
              </select>

              <input
                type="time"
                className={styles.timeInput}
                disabled={d.type === 'UNAVAILABLE'}
                value={d.startTime}
                onChange={(e) => update(i, { startTime: e.target.value })}
              />

              <span className={styles.timeSep}>to</span>

              <input
                type="time"
                className={styles.timeInput}
                disabled={d.type === 'UNAVAILABLE'}
                value={d.endTime}
                onChange={(e) => update(i, { endTime: e.target.value })}
              />

              <input
                className={styles.noteInput}
                placeholder="Optional preference note (e.g. classes until 4pm)"
                value={d.notes}
                onChange={(e) => update(i, { notes: e.target.value })}
              />
            </div>
          ))}

          {/* Card Footer */}
          <div className={styles.cardFooter}>
            <span className={styles.footerNote}>
              Recurring weekly schedule repeats each week until modified.
            </span>
            <button className={styles.saveBtn} onClick={save} disabled={saving}>
              {saving ? 'Submitting…' : '✓ Save Availability'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
