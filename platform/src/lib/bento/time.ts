/** Small time-zone helpers for the bento dashboards. */

const fmtCache = new Map<string, Intl.DateTimeFormat>()

function safeZone(tz: string | null | undefined): string {
  const zone = tz || 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
}

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    })
    fmtCache.set(tz, f)
  }
  return f
}

/** Local calendar day ("2026-11-11"), hour (0–23) and weekday ("Wed") of a moment in a zone. */
export function localParts(date: Date, timeZone: string) {
  const tz = safeZone(timeZone)
  const p = Object.fromEntries(partsFormatter(tz).formatToParts(date).map((x) => [x.type, x.value]))
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, weekday: p.weekday as string }
}

/** Short clock time in the zone, e.g. "19:42". */
export function clockTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: safeZone(timeZone), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}

/** "Good morning" / "Good afternoon" / "Good evening" for the zone's current hour. */
export function greeting(timeZone: string, now = new Date()): string {
  const h = localParts(now, timeZone).hour
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Whole minutes between two moments, never negative. */
export function minutesBetween(from: Date, to = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000))
}

/** "18 min", "1h 05m" */
export function durationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** "02:45" style mm:ss (or h:mm:ss past an hour) between a start and now. */
export function stopwatch(from: Date, to = new Date()): string {
  const total = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Initials from a person's name: "Asha Rao" → "AR". */
export function initials(name: string | null | undefined): string {
  return (
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}

/** One day in milliseconds. */
export const DAY_MS = 24 * 60 * 60 * 1000
