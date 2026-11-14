---
name: Prominentz
description: Restaurant operations SaaS — POS, KDS, inventory, and staff on one calm, unshakeable floor
colors:
  # ── App world (Operate: POS, KDS, dashboard, back office) ──────────────
  ledger-black: "#0b0b0c"
  ledger-paper: "#ffffff"
  prominentz-violet: "#6835F9"
  prominentz-violet-hover: "#5b28ee"
  prominentz-violet-light: "#a78bfa"
  success-green: "#24ab5c"
  warning-amber: "#b45309"
  error-red: "#991b1b"
  # Operational semantic palette — a brighter, more saturated Tailwind-default
  # family used throughout the pre-existing POS/KDS/dashboard screens, distinct
  # from the muted badge semantics above. Documented here because it's the
  # real, heavily-reused palette of the operational surfaces, not drift.
  operational-error: "#ef4444"
  operational-error-deep: "#dc2626"
  operational-success: "#22c55e"
  operational-success-deep: "#16a34a"
  operational-warning: "#f59e0b"
  operational-muted: "#64748b"
  operational-muted-light: "#94a3b8"
  operational-border: "#cbd5e1"
  operational-expo: "#10b981"
  # ── Marketing site (Persuade: public landing "/" and "/pricing") ───────
  # The site wears the app's Direction C theme. Source: src/components/landing/Landing.module.css.
  site-ground-dark: "#0e1014"
  site-ground-light: "#f4f5f7"
  site-paper: "#ffffff"
  site-ink: "#0e1014"
  site-live: "#6835f9"
  site-live-hover: "#7a4dfa"
  site-good: "#34d278"
  site-aging: "#ffb029"
  site-late: "#d92020"
  # Text shades of the signals (legibility, not new hues)
  site-live-text: "#5b28ee"
  site-live-text-dark: "#a98bff"
  site-good-text: "#1a8a4e"
  site-late-text: "#b91c1c"
  site-late-text-dark: "#f87171"
  # Dark ground
  site-dark-text: "#f3f4f6"
  site-dark-mut: "#9ba3af"
  site-dark-dim: "#9ba3afb8"
  site-dark-line: "#ffffff14"
  site-dark-line-strong: "#ffffff26"
  site-dark-card: "#171a28"
  site-dark-cardline: "#ffffff14"
  site-dark-tint: "#ffffff08"
  site-dark-input: "#262a33"
  # Light and paper grounds
  site-light-mut: "#4b5563"
  site-light-dim: "#6b7280"
  site-light-line: "#0e101424"
  site-light-line-strong: "#0e101447"
  site-light-cardline: "#0e10141f"
  site-light-tint: "#0e101408"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, -apple-system, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.04em"
    lineHeight: 1.1
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, SF Mono, Fira Code, Cascadia Code, monospace"
    fontSize: "0.6875rem"
  # Operational scale — the real, dominant px-based scale across POS/KDS/
  # dashboard screens (confirmed 3+ uses across dozens of files per step),
  # predating the branded rem scale above. See the Two-Scale Rule.
  operational-2xs:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "10px"
  operational-xs:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "12px"
  operational-sm:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "13px"
  operational-base:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "14px"
  operational-md:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "16px"
  operational-lg:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "18px"
  operational-xl:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "20px"
  operational-2xl:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "22px"
  operational-3xl:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "24px"
  operational-4xl:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "26px"
  # Marketing world scale (next/font variables --lp-display / --lp-body / --lp-mono)
  site-display:
    fontFamily: "var(--lp-display), Funnel Display, system-ui, sans-serif"
    fontSize: "clamp(46px, 6.1vw, 94px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  site-headline:
    fontFamily: "var(--lp-display), Funnel Display, system-ui, sans-serif"
    fontSize: "clamp(32px, 3.3vw, 50px)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  site-statement:
    fontFamily: "var(--lp-display), Funnel Display, system-ui, sans-serif"
    fontSize: "clamp(30px, 4.2vw, 64px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.032em"
  site-title:
    fontFamily: "var(--lp-display), Funnel Display, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  site-question:
    fontFamily: "var(--lp-display), Funnel Display, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  site-price:
    fontFamily: "var(--lp-display), Funnel Display, system-ui, sans-serif"
    fontSize: "clamp(64px, 7vw, 104px)"
    fontWeight: 560
    lineHeight: 0.85
    letterSpacing: "-0.05em"
  site-lede:
    fontFamily: "var(--lp-body), Inter, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.3vw, 19px)"
    fontWeight: 400
    lineHeight: 1.55
  site-body:
    fontFamily: "var(--lp-body), Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "'cv11', 'ss01'"
  site-button:
    fontFamily: "var(--lp-body), Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.005em"
  site-label:
    fontFamily: "var(--lp-mono), Roboto Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.12em"
  site-data:
    fontFamily: "var(--lp-mono), Roboto Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    fontFeature: "'tnum'"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
  # Operational radius scale — a second, genuinely distinct progression used
  # across the POS/KDS/dashboard screens (34, 14, and 15 files respectively).
  # Documented separately rather than merged into the brand scale above since
  # it doesn't share its progression.
  operational-card: "10px"
  operational-panel: "14px"
  operational-modal: "20px"
  # Marketing world radius
  site-panel: "8px"
  site-tier: "8px"
  site-control: "4px"
  site-field: "4px"
  site-small: "4px"
  site-pill: "4px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  16: "4rem"
  # Marketing world rhythm
  site-topbar: "60px"
  site-gutter: "clamp(20px, 5vw, 64px)"
  site-section: "clamp(90px, 13vh, 150px)"
  site-panel-pad: "16px"
components:
  button-primary:
    backgroundColor: "{colors.prominentz-violet}"
    textColor: "{colors.ledger-paper}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.prominentz-violet-hover}"
    textColor: "{colors.ledger-paper}"
  button-secondary:
    backgroundColor: "#111114"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "34px"
  card:
    backgroundColor: "#141414"
    textColor: "{colors.ledger-paper}"
    rounded: "{rounded.lg}"
    padding: "{spacing.5}"
  input:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.ledger-paper}"
    rounded: "{rounded.md}"
    height: "36px"
  # Marketing world components
  site-button-solid-on-dark:
    backgroundColor: "{colors.site-ground-light}"
    textColor: "{colors.site-ground-dark}"
    typography: "{typography.site-button}"
    rounded: "{rounded.site-control}"
    padding: "0 22px"
    height: "48px"
  site-button-solid-on-light:
    backgroundColor: "{colors.site-ink}"
    textColor: "{colors.site-ground-light}"
    typography: "{typography.site-button}"
    rounded: "{rounded.site-control}"
    padding: "0 22px"
    height: "48px"
  site-button-line-on-light:
    backgroundColor: "transparent"
    textColor: "{colors.site-ink}"
    typography: "{typography.site-button}"
    rounded: "{rounded.site-control}"
    padding: "0 22px"
    height: "48px"
  site-button-small:
    rounded: "{rounded.site-small}"
    padding: "0 14px"
    height: "36px"
  site-panel:
    backgroundColor: "{colors.site-ground-light}"
    textColor: "{colors.site-ink}"
    rounded: "{rounded.site-panel}"
  site-panel-on-dark:
    backgroundColor: "{colors.site-dark-card}"
    textColor: "{colors.site-ground-light}"
    rounded: "{rounded.site-panel}"
  site-tier:
    backgroundColor: "{colors.site-ground-light}"
    textColor: "{colors.site-ink}"
    rounded: "{rounded.site-tier}"
    padding: "18px"
  site-chip-live:
    textColor: "{colors.site-live-text}"
    typography: "{typography.site-label}"
    rounded: "5px"
    padding: "0 7px"
    height: "20px"
  site-chip-good:
    textColor: "{colors.site-good-text}"
    typography: "{typography.site-label}"
    rounded: "5px"
    padding: "0 7px"
    height: "20px"
  site-chip-late:
    textColor: "{colors.site-late-text}"
    typography: "{typography.site-label}"
    rounded: "5px"
    padding: "0 7px"
    height: "20px"
  site-tracker-step:
    textColor: "{colors.site-light-dim}"
    typography: "{typography.site-label}"
    rounded: "{rounded.site-pill}"
    padding: "6px 9px"
  site-field:
    backgroundColor: "{colors.site-ground-light}"
    textColor: "{colors.site-ink}"
    rounded: "{rounded.site-field}"
    padding: "0 12px"
    height: "44px"
---

# Design System: Prominentz

## Overview

> **Scope: one theme, two registers.** Every Prominentz surface wears **Direction C · Across the Room** (see the last section of this file): graphite signage, back-office grey, violet as the only action color, solid status blocks. The site keeps its own marketing faces (Funnel Display, Inter, Roboto Mono) on top of that palette; the app uses Barlow.
>
> - **App world (Operate).** Everything signed-in: POS, KDS, dashboard, inventory, staff, settings, HQ. Direction C is applied as the last layer of `src/app/globals.css`. The Night Shift Ledger sections below are the **superseded** base it overrides; they are kept because their operational palette, Operational Scale, radius steps and component rules still describe the app wherever Direction C does not override them.
> - **Marketing site (Persuade).** The landing page (`src/app/page.tsx` → `HomeLanding`) and `/pricing`. Since 2026-11-14 (user decision) it uses the same Direction C palette and shapes as the app (type stays the site's own: Funnel Display, Inter, Roboto Mono, per user decision later the same day), carried as `site-*` tokens in `src/components/landing/Landing.module.css` because the site composes them differently (a scroll theatre, grounds that flip mid-page, 48px CTAs). Each section below ends with a **Marketing world** subsection describing that composition. The earlier navy / live-blue / Funnel Display site (2026-11-13) is gone.
>
> Unless a heading says "Marketing world", the content refers to the app world.

**Creative North Star: "The Night Shift Ledger"** (app world, base layer)

Prominentz looks like a ledger book worked late on a busy floor: a mostly black-and-white operational surface — midblack (`#0b0b0c`, ~60% of any screen) and pure white (`#ffffff`, ~30%) — with one deliberate mark of violet (`#6835F9`, ~10%) reserved for the thing that's actually live or actionable right now. Nothing about it should read as decorative; every accent use is a signal, not a flourish. The system was built to be read correctly by someone mid-shift, not admired at rest — precise and unshakeable rather than warm or playful.

The system explicitly rejects gradient text, glow effects, and multi-hue decoration. A prior pass had the primary accent faked via `background-clip: text` on hero copy even where the underlying value was a single flat color — that's been corrected to a plain `color` assignment; gradients-as-decoration have no place here.

**Key Characteristics:**
- Mostly monochrome (black/white), with a single reserved accent color used sparingly
- Real, layered drop shadows for depth (not flat/tonal) — confirmed as the standard, not legacy
- Crisp, unambiguous component states: color changes, not soft/ambiguous affordances
- Dense, operational typography (Space Grotesk display, Inter body, JetBrains Mono for labels/mono contexts)
- Same accent and ink pairing holds in both dark and light mode — the UI doesn't change character when the theme flips, only ground/figure

### Marketing world: "One Order, Seat to Close"

The public site tells one dinner order, Table 12's, from the seat to the close of day, in the app's own clothes. It is staged like a night of service: the graphite signage ground (`site-ground-dark`) opens and closes the story, and the service in between happens on back-office grey (`site-ground-light`, with white `site-paper` for alternating bands). Ink (`site-ink`) carries all text on grey. Violet (`site-live`) is the only action color and marks what is happening now; status is a solid block with a word: green (`site-good`) for ready and done, amber (`site-aging`) for cooking, red (`site-late`) for late or low.

The product is the illustration. Every visual is a working demo panel (POS ticket, KDS, channel queue, split check, stock, staff, Z report, the bill) rendered in the same tokens the app uses: a white card with hairlines, 8px corners, a soft shadow and a mono label on top. Before the order begins, a dark collage of the night as it runs today (a hand-written ticket, two delivery tablets, a chat message, a stock sheet, a whiteboard, a statement, a napkin count) shows what one system replaces. On wide screens with motion allowed, the story plays as a scroll theatre; everywhere else it reads as a stacked sequence with the same content.

**Key Characteristics:**
- Graphite stage, grey back-office scenes, one ink; the topbar flips with the ground under it
- Violet for action and "now"; green, amber and red as solid status blocks; nothing decorative
- Funnel Display headlines in sentence case, Inter body, Roboto Mono for tickets, times, prices and panel labels
- Product panels instead of illustration, mockup or feature-card grids
- Scroll theatre with a static fallback that loses nothing

## Colors

The palette reads as ink-on-paper with one live signal color — not a brand-color-forward system.

### Primary
- **Prominentz Violet** (`#6835F9`): the one accent. Used only for primary actions (buttons, active nav/tab state, focus rings) and nothing else. Its rarity is the point — see the Named Rule below.
- **Prominentz Violet (hover)** (`#5b28ee`): primary button hover state — a touch deeper/more saturated than the resting accent.
- **Prominentz Violet (light)** (`#a78bfa`): the `--brand-text` token in dark mode. Logo violet is only 3.3:1 on midblack, so any violet *text* in dark mode uses this lighter step (7.2:1). Dark-mode button hover uses `#7a4dfa`.

### Neutral
- **Ledger Black** (`#0b0b0c`): the dark-mode ground (not pure `#000`) and, in light mode, the ink used for all primary text. One dark neutral does both jobs.
- **Ledger Paper** (`#ffffff`): the light-mode ground, and the text color on top of the violet accent (both modes) and the light-mode canvas.
- Supporting dark-mode surfaces step up from the ground in small increments: `#111111` → `#141414` → `#161616` → `#1a1a1a`, used for input fields, cards, raised surfaces, and hover states respectively.
- Light-mode supporting surfaces: `#f7f8fa` (raised), `#f3f5f7` (card hover) — barely-there steps off pure white.
- Borders are the ink color at low opacity in both themes: `rgba(255,255,255,0.07–0.13)` in dark mode, `rgba(11,11,12,0.14–0.22)` in light mode. Never a separate gray hex.

### Named Rules
**The One Signal Rule.** Violet is the only accent color in the app world. It appears only on primary buttons, active/selected state, and focus rings — never as a secondary decorative color, never doubled up with another accent. If something needs emphasis and violet is already in use elsewhere on screen, reach for weight or size, not a second color. (Does not govern the marketing world, which has no brand accent; see below.)

### Operational (POS / KDS / dashboard screens)
These predate the Night Shift Ledger rebrand and run on a brighter, more saturated Tailwind-default semantic family — distinct in hue and shade from the muted badge semantics above, and documented here as a sanctioned second palette rather than drift, since it's the real, heavily-reused system across the operational surfaces (dozens of files each).
- **Operational Error** (`#ef4444`, deep variant `#dc2626`): error states, destructive actions, alerts on POS/KDS screens.
- **Operational Success** (`#22c55e`, deep variant `#16a34a`): active/ready/positive states on operational screens.
- **Operational Warning** (`#f59e0b`): urgent/aging states (e.g. a KDS ticket past its target time).
- **Operational Expo** (`#10b981`): the KDS "Expo & Pass" station's color — a real product status, not decoration. (The marketing site's KDS demo no longer uses it; it uses `site-good`.)
- **Operational Muted** (`#64748b`, lighter `#94a3b8`, border `#cbd5e1`): secondary text and borders on operational screens, playing the same role the ink-at-low-opacity tokens play on the branded surfaces.

**The One Signal Rule does not apply inside the operational palette** — these are status colors with real product meaning (a KDS station, an error state), not brand decoration. Don't recolor them to violet; that would make them lie about what they represent.

### Marketing world

The app palette, composed for a page that flips its ground. Every neutral is the ground's figure color at a fixed opacity, never a separate gray.

**Grounds**
- **Signage Graphite** (`site-ground-dark`, `#0e1014`): the hero, the Friday-night collage, the facts, FAQ, demo form, closing band and footer. Text on it is `site-dark-text`; panels on it are `site-dark-card` (`#171a28`) with a heavy black shadow.
- **Back-office Grey** (`site-ground-light`, `#f4f5f7`): the story chapters, the flip statement, the bill. Panels on it are pure white.
- **Paper** (`site-paper`, white): the alternating light band on `/pricing`; panels on it take the grey as their fill so they still separate.

**Ink**
- **Ink** (`site-ink`, `#0e1014`): all text on grey and white, the late-ticket action, the tender bars, the theatre rail, the secondary button's 2px outline on light grounds.

**Action and status**
- **Violet** (`site-live`): the only action color, and the "now" signal. Solid CTAs (white text), the current tracker step's 3px bar and block, the demo tag block, new tickets' left border, the cursor pill, field focus rings, caret, text selection and the focus outline. Violet *text* uses `site-live-text` on light and `site-live-text-dark` on dark.
- **Ready Green** (`site-good`): ready, paid, done. Solid blocks with ink text; green text on light uses `site-good-text`.
- **Aging Amber** (`site-aging`): cooking / aging tickets. Solid block with ink text.
- **Late Red** (`site-late`): late tickets, low stock, allergy notes, the form error. Solid block with white text; red text uses `site-late-text` on light and `site-late-text-dark` on dark.

**Alpha ramps.** Each ground sets the same roles: `mut` (secondary text), `dim` (labels and tertiary text), `line` (section hairlines), `line-strong` (control borders, dashed outlines), `card` (panel fill), `cardline` (hairlines inside panels), `tint` (panel heads and footers, neutral chips), `input` (field fill). The theatre engine interpolates the same roles between the dark and light values while the ground flips.

**The Status Block Rule.** On the site as in the app, status is a solid block with a word, never a small dot or a tinted outline. Chips, ticket heads, seat payment marks and the tracker's markers are filled blocks.

**The Text Shade Rule.** A signal color at full strength is a fill or a border. When it has to be read as text, use its derived text shade, which clears 4.5:1 on its ground.

## Typography

**Display Font:** Space Grotesk (with Inter, -apple-system fallback)
**Body Font:** Inter (with system-ui fallback)
**Label/Mono Font:** JetBrains Mono (with SF Mono, Fira Code fallback)

**Character:** Space Grotesk's geometric, slightly mechanical headlines paired with Inter's neutral, highly legible body text — functional rather than editorial. JetBrains Mono shows up for labels, badges, and anything tabular/numeric, reinforcing the "ledger" register. (In the app, Direction C replaces the display face with Barlow Condensed; see the last section.)

### Hierarchy
- **Display** (800 weight, clamp-based sizing, -0.04em letter-spacing, 1.1 line-height): large app headlines only (no longer used on the public site).
- **Headline** (700, `--text-4xl`/`--text-3xl`): page titles, section headers.
- **Title** (600, `--text-xl`/`--text-lg`): card titles, modal headers.
- **Body** (400, `--text-base` = 0.9375rem, 1.5 line-height): default UI copy.
- **Label** (600, `--text-xs` = 0.6875rem, uppercase where used): badges, eyebrow labels, table headers — set in the mono font family.

### Operational Scale (POS / KDS / dashboard screens)
The branded `--text-*` rem scale above covers the newer, branded app surfaces. The dominant, far more heavily-used scale across the actual operational product is a raw-pixel scale that predates it — confirmed by extraction, not guessed: `10px` / `12px` / `13px` / `14px` / `16px` / `18px` / `20px` / `22px` / `24px` / `26px`, each appearing across dozens of files. Treat this as the real type scale for dense, data-heavy operational screens; don't force those screens onto the branded rem scale, and don't invent a third scale for new operational work — reuse these steps.

### Named Rules
**The Two-Scale Rule.** Inside the app, branded surfaces use the `--text-*` rem scale; operational/POS/KDS/dashboard surfaces use the px-based Operational Scale. Don't mix them on the same screen, and don't "fix" one by converting it to the other. The public site uses neither; it has its own marketing scale below.

### Marketing world

**Display Font:** Funnel Display, loaded with `next/font` as `--lp-display` (fallback system-ui)
**Body Font:** Inter, as `--lp-body` (fallback system-ui), with `cv11` and `ss01` features on
**Mono Font:** Roboto Mono, as `--lp-mono` (fallback ui-monospace), always with tabular numerals

The three variables are attached by the page wrapper (`landingFontVars` from `src/components/landing/fonts.ts`) on `/` and `/pricing` only, so the faces never load in the app. The site shares the app's palette and shapes but keeps its own voice: Funnel Display gives warm, slightly open headlines at weight 700 in sentence case; Inter does the explaining; Roboto Mono is the product's own voice: ticket seats, times, prices, totals, panel labels and the tracker.

**Hierarchy (as built)**
- **Display** (`site-display`, 700, clamp 48–96px, 1.02, -0.022em, balanced wrap): the hero headline and the closing headline only.
- **Statement** (`site-statement`, 700, clamp 34–58px, 1.15, -0.02em): the single flip line between the collage and the story; emphasized words in violet text, never italic.
- **Headline** (`site-headline`, 700, clamp 32–50px, 1.08, -0.02em; clamp 30–44px inside the theatre): section and chapter headlines.
- **Price** (`site-price`, 700, clamp 64–104px, 0.85, -0.05em): the plan price on the bill only.
- **Title** (`site-title`, 700, 24px, 1.15): tier names, the form's sent state; ticket table names at 17px / 600.
- **Question** (`site-question`, 500, 20px, 1.25): FAQ summaries.
- **Lede** (`site-lede`, 400, clamp 17–19px, 1.55, max 34em, in `mut`): the paragraph under a display or headline.
- **Body** (`site-body`, 400, 17px, 1.55, max 30em, 16px under 720px wide): running copy.
- **Button** (`site-button`, 600, 15px; 14px on small buttons).
- **Label** (`site-label`, 500, 11px, 0.12em, uppercase, in `dim`): panel heads, stat names, the matrix header.
- **Chip** (mono 500, 10.5px, 0.06em, uppercase) on a solid status block.
- **Data** (`site-data`, 400–500, 12–22px by context, tabular): prices, totals, times, seat numbers.

**The Sentence Case Rule.** Marketing headings are sentence case. `src/app/globals.css` sets every `h1`–`h6` to Barlow Condensed 800 uppercase for the app; every marketing heading class must re-declare `font-family`, `font-weight` and `text-transform: none` (as `.h1`, `.h2`, `.h3` do). Never use a bare `h1`–`h6` on a marketing page without one of the site's type classes.

**The Label Lives In The Panel Rule.** The mono uppercase label is product chrome: it appears inside panels, bills, tables and the tracker, describing the data beside it. It never sits above a section headline as a kicker or eyebrow.

## Layout

Density is operational, not editorial — spacing steps are tight (`--space-1` through `--space-16`, 4px to 64px) and most interactive elements (buttons, inputs) sit at a fixed 34–36px height rather than scaling with content. Containers use crisp 1px hairline borders rather than whitespace alone to separate regions, consistent with a POS/KDS surface that needs scannability under time pressure over generous breathing room.

### Marketing world

**Frame.** A fixed 60px topbar (`site-topbar`) over full-bleed ground bands. Side gutters are `site-gutter` (20–64px; the hero and topbar reach 72px). Section padding is `site-section` (90–150px vertical). Content measures: 1240px for bill, FAQ, demo and facts grids; 1440px for story beats and footer; 1560px for the hero.

**Compositions.** The hero is one centered column: display headline, a 62ch lede and two equal CTAs, with nothing else in the first viewport. Everything after it is two-column, copy then product: story beats (copy column 300–420px, panel up to 720px; 860px for the kitchen display and Z report), the bill (intro and tiers left, bill right), FAQ (0.8fr / 1.2fr) and demo (0.9fr / 1.1fr). The facts strip is four columns separated by hairlines, going to two at 900px and one at 520px.

**The topbar follows the ground.** Each band carries `data-ground="dark|light"`; the topbar takes the palette of the band under its midline and is translucent (86% ground mix, 14px backdrop blur) with a hairline bottom border.

**Scroll theatre (signature).** When the viewport is at least 900px wide and 560px tall and `prefers-reduced-motion` is not `reduce`, the page becomes a theatre: one stage pinned to the viewport beside a 2460vh spacer. Scroll position drives every frame, and each band owns a stretch of it: the hero (110vh), the Friday-night collage (220vh), the flip line (110vh), seven chapters (180–260vh each), the bill (200vh) and the close (150vh).
- The ground flips inside the flip band: black for the hero and collage, white for the chapters and bill, black again for the close. The topbar follows.
- The stage is copy left (300–420px), panel right (up to 720px; 860px for the kitchen display and Z report). Each chapter carries two captions: the first fades out at the half-way point as the second rises, while the panel advances state instead of being replaced.
- Fixed chrome, ink-colored and theatre-only: a 76px left rail with one tick per chapter, a fill that grows with progress and a mono chapter counter; a mono percentage bottom right; a "Keep scrolling" cue bottom centre that hides on the hero's first half, the bill and the close.
- A guided cursor (ink arrow with a violet "prominentz" pill) follows scripted waypoints per band and pulses where the script clicks. It exists only with a fine pointer at 900px and wider.
- The topbar's stage tracker names the chapters (Order → Kitchen → Online → Payment → Stock → Staff → Close) and marks done, now and to-do; each step scrolls to its chapter.

**Static fallback.** Below 900px wide, below 560px tall, or with reduced motion, there is no stage, rail, cursor or counter: the hero renders in flow, then the flip line and every chapter as a copy-and-panel block in its finished state, then the bill, facts, FAQ, demo and a closing band, so nothing is hidden. Beats stack to one column under 960px. Reduced motion additionally disables all animations and transitions under the site root.

**Breakpoints.** 1180px hides the tracker; 960px stacks beats, bill and demo; 900px stacks FAQ; 760px collapses nav links into a menu button with a full-width sheet; 720px tightens panels (single-column KDS, trimmed table columns, 16px body); 560px stacks tiers, bill actions, form rows and turns the plan matrix into labeled cards.

## Elevation & Depth

Real layered drop shadows, confirmed as the standard (not flat/tonal layering). Dark mode shadows are pure-black-based and deliberately heavy (`rgba(0,0,0,0.6–0.95)`) since they need to read against an already-dark ground; light mode shadows use the ink color at low opacity instead of pure black, layered with a 1px inset border for crispness.

### Shadow Vocabulary
- **sm** (dark: `0 1px 2px rgba(0,0,0,0.6)` / light: `0 1px 2px rgba(11,11,12,0.04), 0 10px 30px rgba(11,11,12,0.07)`): resting card elevation.
- **md** (dark: `0 4px 16px rgba(0,0,0,0.7)` / light: `0 4px 16px rgba(11,11,12,0.08), 0 0 0 1px rgba(11,11,12,0.08)`): hover/elevated card state, dropdowns.
- **lg** (dark: `0 8px 32px rgba(0,0,0,0.85)`): popovers, larger overlays.
- **xl** (dark: `0 20px 60px rgba(0,0,0,0.95)`): modals.

### Named Rules
**The Weight-Over-Glow Rule.** Depth comes from shadow weight and layering, never from a colored glow except as a deliberate, sparing focus-ring treatment on the violet accent itself (`--brand-glow`). Don't add decorative glow to anything else.

### Marketing world

Grounds and hairlines do the separating; panels are lifted the way the app lifts cards.
- **Panel shadow, light grounds** (`0 1px 2px #0e10140a, 0 10px 30px #0e101412`): every panel and bill on grey or white. A tight contact line plus a wide, faint ink lift.
- **Panel shadow, dark ground** (`0 4px 16px rgba(0,0,0,.6)`): panels on graphite use the solid `card` fill, a `cardline` hairline and the app's heavy black shadow.
- **Segment shadow** (`0 1px 2px #0e101414`): the selected segment of a segmented control inside a panel.
- **State rings, not glows.** Focused fields take a 3px violet ring at 22%. The current tracker step takes a 3px violet bar, not a ring.

**The One Lift Rule.** Only product panels are lifted. Tier cards, seat cards, tickets and fields sit flat with a hairline.

## Shapes

A tight radius scale from 4px to 24px, plus a `full` (pill) value for badges and avatars. Buttons and inputs use the `md` step (6px) — small enough to stay crisp and "operational," not soft/bubbly. Cards use `lg` (8px); larger containers/modals step up to `xl`/`2xl` (12–16px). Borders are always 1px hairlines, never thicker.

A second, genuinely distinct radius progression runs across the POS/KDS/dashboard screens — `10px` (cards, ~34 files), `14px` (panels, ~14 files), `20px` (modals, ~15 files). It doesn't share the brand scale's progression, so it's documented separately as the Operational radius rather than forced to fit. New operational work should reuse these three steps, not invent a fourth.

### Marketing world

The app's sharper geometry. `site-panel` and `site-tier` (8px) for product panels, the bill and tier cards; `site-control` (4px) for buttons, tickets, seat cards, the cursor pill, dashed outlines and tracker steps; `site-field` (4px) for fields, the menu button, segmented controls and the form error. Chips are 3px. Status markers (tracker, demo tag, queue, rail) are 1px-radius squares, never circles; only avatars are circles. The collage fragments keep their own paper and chat-bubble shapes because they depict the old way, not the product.

Borders are 1px hairlines, except the secondary button's 2px outline and the KDS ticket's 4px status edge on the left, both inherited from the app. Dashed 1px outlines mean "a place, not a thing": the bill's line items and the suggested purchase order.

## Components

### Buttons
- **Shape:** 6px radius (`--radius-md`), 34px fixed height, no scaling with content.
- **Primary:** Prominentz Violet background (`#6835F9`, the logo color), white text (`#ffffff`, 6.1:1) — never dark text on violet. Hover goes to `#7a4dfa` (dark mode) / `#5b28ee` (light mode) with a soft violet-tinted shadow.
- **Secondary:** dark surface (`#111114`) background, white text, 1px white-alpha border. Hover lightens the surface slightly, never changes the border to the accent color.
- **State:** `:active` scales to 0.98 and drops its shadow — a tactile press, not a color change.

### Badges
- Pill-shaped (`--radius-full`), 2px/8px padding, mono-weight semibold text at `--text-xs`.
- Semantic variants (success/warning/error/info) use their respective color at 12–16% background opacity with the solid color as text — never the violet accent for anything except a deliberate `badge--brand` variant.

### Cards
- **Corner Style:** 8px radius (`--radius-lg`), stepping to 16px (`--radius-2xl`) only for glass/vibrancy cards.
- **Background:** one step up from the page ground (`#141414` in dark mode).
- **Shadow Strategy:** `sm` at rest, `md` on hover/elevated — see Elevation.
- **Border:** 1px hairline at `--color-border`.

### Inputs
- **Style:** 36px height, 6px radius, subtle translucent background (`rgba(255,255,255,0.05)` dark mode), 1px translucent border.
- **Focus:** a 3px glow ring in the brand-glow color plus a 0.5px inset violet border — the one place a glow effect is sanctioned (see Named Rule above).

### Navigation
- Active/current states use a dark neutral background (`#18181b`), not the violet accent — the accent stays reserved for primary actions, not passive "you are here" indicators.

### Marketing world components

All live in `src/components/landing/` and read their colors from the ground they sit on (`.dark`, `.light`, `.paper`), so one component works on every ground.

**Buttons (solid / line).** 48px tall, 22px side padding, `site-control` radius, `site-button` type. Solid is violet with white text; hover goes to `site-live-hover`. Line is transparent with a 2px outline in the ground's figure color (white on graphite, ink on grey); hover adds the `tint` fill. Press drops 1px. Primary and secondary CTAs sit side by side at equal size with 12px between. Small variant: 36px, 14px padding.

**Topbar with stage tracker.** Logo left (one-color white on dark, one-color ink on light), tracker centered, nav links and a small solid CTA right. Tracker steps are mono 11.5px, 4px radius: to-do in `dim` with an outlined icon, done with the icon in green, now with figure text and a 3px violet bar underneath. Steps are joined by thin chevrons. Mobile: menu button (40px, `site-field` radius) opens a sheet of 17px links with two equal CTAs.

**Panel with mono label.** The site's core container, the app's card. `card` fill, `cardline` border, `site-panel` radius, the panel shadow for its ground. A head row (11px / 16px padding, `tint` fill, hairline under) carries the label left, prefixed with an 8px violet block (the demo tag), and meta right. Body pads 16px; footers use the `tint` fill with a hairline above, and hold totals in mono and the panel's one action, a violet block that turns green when done.

**Chips.** 20px tall, 3px radius, mono 10.5px uppercase on a solid block: neutral is the `tint` fill in `mut`; live is violet with white text; good is green and aging is amber, both with ink text; late is red with white text.

**KDS ticket.** A white card with a 4px left edge in its status color (violet new, amber cooking, red late, green ready), a solid status chip and a mono timer in the head, the table name in Funnel Display 600, and one action: violet "Start" on new, ink "Bump to pass" on late, green block when ready.

**Bill.** The plan as a receipt, built on the panel: the mono plan label and a "14 days free" green block over the `site-price` figure with its unit in body type; dashed-rule line items with "Included" in green text mono caps; a tinted totals block; two equal CTAs.

**Tiers.** The other plans as flat cards: `site-tier` radius, 18px padding, `cardline` hairline, a `site-title` name, a list in `mut` and an underlined link whose underline darkens on hover.

**FAQ details.** Native `details`/`summary` rows between `line` hairlines; `site-question` type; a thin plus icon in `dim` rotates 45° when open; answers in `mut` at 62ch.

**Demo form fields.** Labels above in 13.5px `mut`; fields 44px tall, `site-field` radius, `input` fill (raised graphite on dark, white on light), `line-strong` border, violet caret. Hover darkens the border to the figure color; focus turns it violet with a 3px violet ring at 22%. Errors sit in a red-tinted block; the sent state replaces the form inside the same panel.

## Do's and Don'ts

### Do:
- **Do** keep violet (`#6835F9`) reserved for primary actions and active/focus state only — never decorative.
- **Do** use Ledger Black (`#0b0b0c`) as the dark-mode ground and the light-mode ink; don't introduce a second "almost black."
- **Do** keep real layered box-shadows for elevation in both themes — this system is not flat/tonal.
- **Do** use white text on violet backgrounds, and `--brand-text` (not `--brand`) when violet is the text color itself — it switches to `#a78bfa` in dark mode for contrast.
- **Do** (marketing) take every color on the public site from a ground class (`.dark`, `.light`, `.paper`) and the `site-*` tokens, which carry the app's Direction C values, so components work on any ground.
- **Do** (marketing) show the product through demo panels in site tokens, with a mono label in the panel head.
- **Do** (marketing) use the text shades (`site-live-text`, `site-good-text`, `site-late-text`, and their dark variants) whenever violet, green or red is read as text.
- **Do** (marketing) give every marketing heading a site type class that resets the global uppercase Barlow rule.
- **Do** (marketing) keep the static fallback complete: anything shown in the theatre must also render in the stacked story.

### Don't:
- **Don't** fake colored text with `background-clip: text` / gradient tricks — set `color` directly. (Already corrected once this session; don't reintroduce it.)
- **Don't** add a second accent color alongside violet on the same app screen.
- **Don't** soften button/input radii below the `md` (6px) step — it reads as off-brand "soft SaaS," not this system's operational character.
- **Don't** let sidebar/nav "current" states borrow the violet accent — that's reserved for actions, not location indicators.
- **Don't** import app CSS classes or `--brand`/`--color-*` variables into the site, or `site-*` tokens into the app; the values match, the composition does not.
- **Don't** (marketing) use violet, green, amber or red as decoration; violet is action or "now", the rest are states.
- **Don't** (marketing) put the mono label above a section headline as a kicker or eyebrow.
- **Don't** (marketing) set ink text on violet or white text on green or amber; white goes on violet and red, ink goes on green and amber.

## Direction C · Across the Room (current app theme, 2026-11-10)

Scope: the whole product. "Earlier — C Across the Room" from the visual-directions canvas, with the Pz logo violet `#6835F9` in place of its original cyan action color. In the app it's applied as the last layer of `src/app/globals.css`, and it overrides the older app tokens above wherever they conflict. Since 2026-11-14 the public site carries the same palette and shapes through its `site-*` tokens (its type stays Funnel Display / Inter / Roboto Mono) (see the Marketing world subsections above for how they are composed).

- **Dark-first, like signage.** Graphite `#0E1014` ground, panel `#171A20`, raised `#262A33`, text `#F3F4F6`, muted `#9BA3AF`.
- **Light mode = back office.** Ground `#F4F5F7`, white cards, ink `#0E1014`, muted `#4B5563`.
- **Violet is the only action color.** Primary buttons, the current-nav bar (4px), focus rings. White text on violet; violet *text* on dark uses `#A98BFF`.
- **Status is a solid block with a word, never a small dot.** Ready `#34D27B`, aging `#FFB020`, late `#D92D20`.
- **Type:** Barlow Condensed 800 uppercase for headlines, timers and totals; Barlow 400/600 for interface text; JetBrains Mono for IDs and codes only. The global `h1`–`h6` uppercase rule belongs to this theme; marketing pages override it.
- **Shape:** 4px buttons and inputs, 6–8px cards. Secondary buttons are a 2px outline (white on dark, ink on light).
