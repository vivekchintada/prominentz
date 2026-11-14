/* Scroll theatre.
   The page is one stage pinned to the viewport beside a tall invisible spacer.
   Scroll position becomes a progress value; every animation frame turns that
   value into opacity, position and text on elements addressed by `data-e`. */

export const clamp01 = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)))
export const smooth = (e: number) => e * e * (3 - 2 * e)
/** smoothstep of the progress between a and b */
export const ss = (x: number, a: number, b: number) => smooth(clamp01(x, a, b))

export type Waypoint = { x: number; y: number; t: number; c?: 1 }
export type Band = { id: string; len: number; label: string }
export type RunFn = (T: Theatre, x: number) => void

export interface TheatreConfig {
  root: HTMLElement
  bands: Band[]
  runs: Record<string, RunFn>
  paths: Record<string, Waypoint[]>
  /** band id → tracker step index */
  trackerOf: Record<string, number>
  trackerCount: number
  /** band ids counted on the rail, in order */
  railIds: string[]
  heroId: string
  todayId: string
  flipId: string
  billId: string
  closeId: string
  cursor: boolean
}

const WHITE = [255, 255, 255]
const INK = [14, 16, 20]
const GRAPHITE = [14, 16, 20]
const GREY = [244, 245, 247]
const PANEL = [23, 26, 32]
const DARK_TEXT = [243, 244, 246]
const DARK_MUT = [155, 163, 175]
const LIGHT_MUT = [75, 85, 99]
const LIGHT_DIM = [107, 114, 128]

export class Theatre {
  private E: Record<string, HTMLElement | null> = {}
  private B: { id: string; start: number; len: number }[] = []
  private total = 0
  private mounted = false
  private raf = 0
  private ex = 0
  private ey = 0
  private lastYv = -1
  private lastT = -1
  private trkKey = ''
  private varEls = ['stage', 'topbar', 'rail', 'prog', 'scue']

  constructor(private cfg: TheatreConfig) {}

  /* ── element handles ─────────────────────────────────────────────────── */

  g(id: string): HTMLElement | null {
    let el = this.E[id]
    if (el && (!el.isConnected || el.getAttribute('data-e') !== id)) el = null
    if (!el) {
      el = this.cfg.root.querySelector<HTMLElement>(`[data-e="${id}"]`)
      if (el) this.E[id] = el
    }
    return el ?? null
  }

  /** opacity */
  o(id: string, v: number) {
    const el = this.g(id)
    if (el) el.style.opacity = String(v)
  }

  /** text */
  T(id: string, text: string) {
    const el = this.g(id)
    if (el && el.textContent !== text) el.textContent = text
  }

  /** styles */
  S(id: string, styles: Partial<CSSStyleDeclaration>) {
    const el = this.g(id)
    if (el) Object.assign(el.style, styles)
  }

  /** attribute */
  A(id: string, attr: string, value: string | null) {
    const el = this.g(id)
    if (!el) return
    if (value === null) {
      if (el.hasAttribute(attr)) el.removeAttribute(attr)
    } else if (el.getAttribute(attr) !== value) el.setAttribute(attr, value)
  }

  /** reveal: fade in while rising from `dy` px */
  rv(id: string, x: number, a: number, b: number, dy = 14) {
    const r = ss(x, a, b)
    const el = this.g(id)
    if (el) {
      el.style.opacity = String(r)
      el.style.transform = `translateY(${(1 - r) * dy}px)`
    }
    return r
  }

  /** window: visible between a and b, with short fades */
  win(id: string, x: number, a: number, b: number, f = 0.04) {
    const v = Math.min(ss(x, a, a + f), 1 - ss(x, b - f, b))
    this.o(id, v)
    return v
  }

  /** typewriter over data-t */
  tp(id: string, x: number, a: number, b: number) {
    const el = this.g(id)
    if (!el) return 0
    const full = el.dataset.t || ''
    const p = clamp01(x, a, b)
    const text = full.slice(0, Math.round(p * full.length))
    if (el.textContent !== text) el.textContent = text
    return p
  }

  /** stamp: scale in from `from` while fading in */
  stamp(id: string, x: number, a: number, b: number, from = 1.3, rot = 0) {
    const r = ss(x, a, b)
    this.S(id, {
      opacity: String(r),
      transform: `${rot ? `rotate(${rot}deg) ` : ''}scale(${from - (from - 1) * r})`,
    })
    return r
  }

  /** button press between a and b */
  press(id: string, x: number, a: number, b: number, to = 0.9) {
    this.S(id, { transform: x > a && x < b ? `scale(${to})` : 'scale(1)' })
  }

  /* ── bands ───────────────────────────────────────────────────────────── */

  private ensureBands() {
    if (this.B.length) return
    let e = 0
    this.B = this.cfg.bands.map((b) => {
      const o = { id: b.id, start: e, len: b.len }
      e += b.len
      return o
    })
    this.total = e
    const sp = this.g('spacer')
    if (sp) sp.style.height = `${this.total + 100}vh`
  }

  bandStart(id: string) {
    return this.B.find((b) => b.id === id)?.start ?? 0
  }

  /** scroll so a band begins */
  scrollToBand(id: string, offsetVh = 8) {
    this.ensureBands()
    const top = ((this.bandStart(id) + offsetVh) / 100) * innerHeight
    const sp = this.g('spacer')
    const base = sp ? sp.getBoundingClientRect().top + scrollY : 0
    window.scrollTo({ top: base + top, behavior: 'smooth' })
  }

  private setVars(t: number) {
    if (Math.abs(t - this.lastT) < 0.004) return
    this.lastT = t
    const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
    const rgb = (a: number[], b: number[]) => `rgb(${mix(a[0], b[0])} ${mix(a[1], b[1])} ${mix(a[2], b[2])})`
    const rgba = (a: number[], aa: number, b: number[], ba: number) =>
      `rgba(${mix(a[0], b[0])},${mix(a[1], b[1])},${mix(a[2], b[2])},${(aa + (ba - aa) * t).toFixed(3)})`
    const vars: Record<string, string> = {
      '--bg': rgb(GRAPHITE, GREY),
      '--fg': rgb(DARK_TEXT, INK),
      '--mut': rgb(DARK_MUT, LIGHT_MUT),
      '--dim': rgba(DARK_MUT, 0.72, LIGHT_DIM, 1),
      '--line': rgba(WHITE, 0.08, INK, 0.14),
      '--line-strong': rgba(WHITE, 0.15, INK, 0.28),
      '--cardline': rgba(WHITE, 0.08, INK, 0.12),
      '--card': rgb(PANEL, WHITE),
      '--tint': rgba(WHITE, 0.03, INK, 0.035),
      '--live-t': t > 0.5 ? '#6835f9' : '#a98bff',
      '--good-t': t > 0.5 ? '#15803d' : '#34d27b',
      '--late-t': '#d92d20',
      '--shd': t > 0.5 ? '0 1px 2px rgba(14,16,20,.04), 0 10px 30px rgba(14,16,20,.07)' : '0 4px 16px rgba(0,0,0,.6)',
      '--lw': String(1 - Math.round(t)),
      '--lb': String(Math.round(t)),
    }
    this.varEls.forEach((id) => {
      const el = this.g(id)
      if (el) for (const k in vars) el.style.setProperty(k, vars[k])
    })
  }

  private tracker(cur: number, allDone: boolean) {
    const key = `${cur}|${allDone}|${innerWidth}`
    if (this.trkKey === key) return
    this.trkKey = key
    for (let i = 0; i < this.cfg.trackerCount; i++) {
      const dot = this.g(`st${i}d`)
      const label = this.g(`st${i}`)
      if (!dot || !label) continue
      if (allDone || i < cur) {
        dot.style.color = 'var(--good)'
        dot.style.opacity = '1'
        label.style.color = 'var(--mut)'
      } else if (i === cur) {
        dot.style.color = 'var(--live)'
        dot.style.opacity = '1'
        label.style.color = 'var(--fg)'
      } else {
        dot.style.color = 'var(--dim)'
        dot.style.opacity = '.75'
        label.style.color = 'var(--dim)'
      }
    }
  }

  private rail(on: boolean, cur: number, x: number) {
    this.o('rail', on ? 1 : 0)
    if (!on) return
    const n = this.cfg.railIds.length
    for (let i = 0; i < n; i++) {
      const d = this.g(`r${i + 1}`)
      if (d) d.style.background = i < cur ? 'var(--good)' : i === cur ? 'var(--live)' : 'var(--dim)'
    }
    const fill = this.g('railFill')
    if (fill) fill.style.height = `${Math.min(100, ((cur + x) / (n - 1)) * 100)}%`
    this.T('railCur', String(cur + 1).padStart(2, '0'))
  }

  /* ── the frame ───────────────────────────────────────────────────────── */

  private update(now: number) {
    this.ensureBands()
    const { heroId, todayId, flipId, billId, closeId } = this.cfg
    const vh = innerHeight || 1
    const sp = this.g('spacer')
    const y = Math.max(0, sp ? -sp.getBoundingClientRect().top : scrollY)
    const r = (y / vh) * 100
    const bands = this.B
    let d = bands.length - 1
    let x = 1
    for (let i = 0; i < bands.length; i++) {
      if (r < bands[i].start + bands[i].len) {
        d = i
        x = Math.max(0, (r - bands[i].start) / bands[i].len)
        break
      }
    }
    const h = bands[d].id

    const show = (id: string, op: number, pe?: boolean) => {
      const el = this.g(id)
      if (!el) return
      el.style.opacity = String(op)
      el.style.pointerEvents = (pe === undefined ? op > 0.05 : pe) ? 'auto' : 'none'
      el.inert = op <= 0.05
    }

    for (const b of bands) {
      if (b.id === heroId) {
        show(b.id, h === heroId ? 1 - ss(x, 0.58, 0.96) : 0, h === heroId && x < 0.5)
      } else if (b.id === todayId) {
        show(b.id, h === todayId ? 1 : h === flipId ? 1 - ss(x, 0.02, 0.42) : 0, false)
        if (h === todayId) this.S(b.id, { transform: 'none' })
        if (h === flipId) this.S(b.id, { transform: `translateY(${-(30 * ss(x, 0, 0.5))}vh)` })
      } else if (b.id === billId || b.id === closeId) {
        show(b.id, h === b.id ? 1 : 0)
      } else {
        show(b.id, h === b.id ? 1 : 0, false)
      }
    }
    if (h === flipId) {
      const r1 = ss(x, 0.3, 0.55) * (1 - ss(x, 0.86, 0.98))
      this.S('fline', { opacity: String(r1), transform: `translateY(${(1 - ss(x, 0.3, 0.55)) * 16}px)` })
    }

    // Ground: dark for the opening, white for the service, dark again to close.
    const flipIdx = bands.findIndex((b) => b.id === flipId)
    let light = 0
    if (h === flipId) light = ss(x, 0.12, 0.8)
    else if (d > flipIdx && h !== closeId) light = 1
    else if (h === closeId) light = 1 - ss(x, 0.02, 0.32)
    this.setVars(light)
    this.o('bgLight', light)

    const step = this.cfg.trackerOf[h] ?? -1
    this.tracker(step, h === closeId || h === billId)
    const railIdx = this.cfg.railIds.indexOf(h)
    this.o('tracker', step >= 0 || h === billId ? 1 : h === flipId ? ss(x, 0.55, 0.85) : 0)
    this.rail(railIdx >= 0, Math.max(0, railIdx), railIdx >= 0 ? x : 0)

    const pct = Math.round(Math.min(1, r / this.total) * 100)
    this.T('prog', `${pct}%`)
    this.o('prog', h === closeId ? 0 : 1)

    const cue =
      h === heroId ? ss(x, 0.58, 0.96) : h === todayId ? 1 - ss(x, 0.78, 0.82) : h === flipId ? ss(x, 0.12, 0.3) : h === closeId || h === billId ? 0 : 1
    this.o('scue', cue)

    if (h === todayId) this.cfg.runs[todayId]?.(this, x)
    else if (h === flipId) this.cfg.runs[todayId]?.(this, 1)
    if (h !== todayId) this.cfg.runs[h]?.(this, x)

    this.elf(d, x, now, vh, innerWidth, r)
    this.lastYv = r
  }

  /* ── the cursor ──────────────────────────────────────────────────────── */

  private elf(d: number, s: number, now: number, vh: number, vw: number, r: number) {
    const el = this.g('elf')
    if (!el) return
    if (!this.cfg.cursor || vw < 900) {
      el.style.opacity = '0'
      return
    }
    const bands = this.B
    const id = bands[d].id
    el.style.opacity = String(id === this.cfg.closeId ? Math.max(0, 1 - clamp01(s, 0.02, 0.2)) : 1)
    const path = this.cfg.paths[id] || []
    let hx = this.ex / vw
    let hy = this.ey / vh
    if (path.length) {
      if (s >= 0.88 && d < bands.length - 1) {
        // Arc toward the next band's first waypoint.
        const nxt = (this.cfg.paths[bands[d + 1].id] || [])[0] || path[path.length - 1]
        const last = path[path.length - 1]
        const o = smooth((s - 0.88) / 0.12)
        const cx = (last.x + nxt.x) / 2
        const cy = Math.min(last.y, nxt.y) - 0.12
        const l = 1 - o
        hx = l * l * last.x + 2 * l * o * cx + o * o * nxt.x
        hy = l * l * last.y + 2 * l * o * cy + o * o * nxt.y
      } else {
        const a = Math.min(0.999, s / 0.88)
        for (let i = 0; i < path.length - 1; i++) {
          const p = path[i]
          const q = path[i + 1]
          if (a >= p.t && a <= q.t) {
            const e = smooth((a - p.t) / (q.t - p.t || 1))
            hx = p.x + (q.x - p.x) * e
            hy = p.y + (q.y - p.y) * e
            break
          }
          if (a > q.t) {
            hx = q.x
            hy = q.y
          }
        }
        if (a < path[0].t) {
          hx = path[0].x
          hy = path[0].y
        }
        for (const p of path) {
          if (!p.c) continue
          const at = bands[d].start + 0.88 * p.t * bands[d].len
          if (this.lastYv < at && r >= at) this.pulse()
        }
      }
    }
    let gx = hx * vw
    let gy = hy * vh
    if (id === this.cfg.heroId && s < 0.55) {
      gx += 9 * Math.sin(now / 1300)
      gy += 3.2 * Math.sin(now / 640)
    }
    this.ex += (gx - this.ex) * 0.14
    this.ey += (gy - this.ey) * 0.14
    el.style.transform = `translate3d(${this.ex.toFixed(1)}px,${this.ey.toFixed(1)}px,0)`
  }

  private pulse() {
    const ring = this.g('elfPulse')
    const cur = this.g('elfCur')
    if (ring) {
      ring.style.animation = 'none'
      void ring.offsetWidth
      ring.style.animation = 'lpPulse .5s ease-out'
    }
    if (cur) {
      cur.style.animation = 'none'
      void cur.offsetWidth
      cur.style.animation = 'lpClick .34s ease'
    }
  }

  /* ── lifecycle ───────────────────────────────────────────────────────── */

  boot() {
    this.mounted = true
    this.ex = 0.5 * innerWidth
    this.ey = 0.58 * innerHeight
    this.update(performance.now())
    const loop = (t: number) => {
      if (!this.mounted) return
      this.update(t)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    this.mounted = false
    cancelAnimationFrame(this.raf)
  }
}
