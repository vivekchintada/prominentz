---
name: Prominentz
description: Restaurant operations SaaS — POS, KDS, inventory, and staff on one calm, unshakeable floor
colors:
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
---

# Design System: Prominentz

## Overview

> **Superseded.** The Night Shift Ledger section below (black/white/lime split) is no longer the active theme. The current theme is **Direction C · Across the Room**, described at the end of this file. It has no 60·30·10 color ratio.

**Creative North Star: "The Night Shift Ledger"**

Prominentz looks like a ledger book worked late on a busy floor: a mostly black-and-white operational surface — midblack (`#0b0b0c`, ~60% of any screen) and pure white (`#ffffff`, ~30%) — with one deliberate mark of violet (`#6835F9`, ~10%) reserved for the thing that's actually live or actionable right now. Nothing about it should read as decorative; every accent use is a signal, not a flourish. The system was built to be read correctly by someone mid-shift, not admired at rest — precise and unshakeable rather than warm or playful.

The system explicitly rejects gradient text, glow effects, and multi-hue decoration. A prior pass had the primary accent faked via `background-clip: text` on hero copy even where the underlying value was a single flat color — that's been corrected to a plain `color` assignment; gradients-as-decoration have no place here.

**Key Characteristics:**
- Mostly monochrome (black/white), with a single reserved accent color used sparingly
- Real, layered drop shadows for depth (not flat/tonal) — confirmed as the standard, not legacy
- Crisp, unambiguous component states: color changes, not soft/ambiguous affordances
- Dense, operational typography (Space Grotesk display, Inter body, JetBrains Mono for labels/mono contexts)
- Same accent and ink pairing holds in both dark and light mode — the UI doesn't change character when the theme flips, only ground/figure

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
**The One Signal Rule.** Violet is the only accent color in the system. It appears only on primary buttons, active/selected state, and focus rings — never as a secondary decorative color, never doubled up with another accent. If something needs emphasis and violet is already in use elsewhere on screen, reach for weight or size, not a second color.

### Operational (POS / KDS / dashboard screens)
These predate the Night Shift Ledger rebrand and run on a brighter, more saturated Tailwind-default semantic family — distinct in hue and shade from the muted badge semantics above, and documented here as a sanctioned second palette rather than drift, since it's the real, heavily-reused system across the operational surfaces (dozens of files each).
- **Operational Error** (`#ef4444`, deep variant `#dc2626`): error states, destructive actions, alerts on POS/KDS screens.
- **Operational Success** (`#22c55e`, deep variant `#16a34a`): active/ready/positive states on operational screens.
- **Operational Warning** (`#f59e0b`): urgent/aging states (e.g. a KDS ticket past its target time).
- **Operational Expo** (`#10b981`): the KDS "Expo & Pass" station's color — a real product status, not decoration. Also reused faithfully in the landing page's KDS mockups.
- **Operational Muted** (`#64748b`, lighter `#94a3b8`, border `#cbd5e1`): secondary text and borders on operational screens, playing the same role the ink-at-low-opacity tokens play on the branded surfaces.

**The One Signal Rule does not apply inside the operational palette** — these are status colors with real product meaning (a KDS station, an error state), not brand decoration. Don't recolor them to violet; that would make them lie about what they represent.

## Typography

**Display Font:** Space Grotesk (with Inter, -apple-system fallback)
**Body Font:** Inter (with system-ui fallback)
**Label/Mono Font:** JetBrains Mono (with SF Mono, Fira Code fallback)

**Character:** Space Grotesk's geometric, slightly mechanical headlines paired with Inter's neutral, highly legible body text — functional rather than editorial. JetBrains Mono shows up for labels, badges, and anything tabular/numeric, reinforcing the "ledger" register.

### Hierarchy
- **Display** (800 weight, clamp-based sizing, -0.04em letter-spacing, 1.1 line-height): hero/landing headlines only.
- **Headline** (700, `--text-4xl`/`--text-3xl`): page titles, section headers.
- **Title** (600, `--text-xl`/`--text-lg`): card titles, modal headers.
- **Body** (400, `--text-base` = 0.9375rem, 1.5 line-height): default UI copy.
- **Label** (600, `--text-xs` = 0.6875rem, uppercase where used): badges, eyebrow labels, table headers — set in the mono font family.

### Operational Scale (POS / KDS / dashboard screens)
The branded `--text-*` rem scale above covers the newer, marketing-adjacent surfaces. The dominant, far more heavily-used scale across the actual operational product is a raw-pixel scale that predates it — confirmed by extraction, not guessed: `10px` / `12px` / `13px` / `14px` / `16px` / `18px` / `20px` / `22px` / `24px` / `26px`, each appearing across dozens of files. Treat this as the real type scale for dense, data-heavy operational screens; don't force those screens onto the branded rem scale, and don't invent a third scale for new operational work — reuse these steps.

### Named Rules
**The Two-Scale Rule.** Branded/marketing surfaces use the `--text-*` rem scale; operational/POS/KDS/dashboard surfaces use the px-based Operational Scale. Don't mix them on the same screen, and don't "fix" one by converting it to the other — they serve different surfaces (see Modes in SKILL.md: Persuade vs. Operate).

## Layout

Density is operational, not editorial — spacing steps are tight (`--space-1` through `--space-16`, 4px to 64px) and most interactive elements (buttons, inputs) sit at a fixed 34–36px height rather than scaling with content. Containers use crisp 1px hairline borders rather than whitespace alone to separate regions, consistent with a POS/KDS surface that needs scannability under time pressure over generous breathing room.

## Elevation & Depth

Real layered drop shadows, confirmed as the standard (not flat/tonal layering). Dark mode shadows are pure-black-based and deliberately heavy (`rgba(0,0,0,0.6–0.95)`) since they need to read against an already-dark ground; light mode shadows use the ink color at low opacity instead of pure black, layered with a 1px inset border for crispness.

### Shadow Vocabulary
- **sm** (dark: `0 1px 2px rgba(0,0,0,0.6)` / light: `0 1px 2px rgba(11,11,12,0.04), 0 10px 30px rgba(11,11,12,0.07)`): resting card elevation.
- **md** (dark: `0 4px 16px rgba(0,0,0,0.7)` / light: `0 4px 16px rgba(11,11,12,0.08), 0 0 0 1px rgba(11,11,12,0.08)`): hover/elevated card state, dropdowns.
- **lg** (dark: `0 8px 32px rgba(0,0,0,0.85)`): popovers, larger overlays.
- **xl** (dark: `0 20px 60px rgba(0,0,0,0.95)`): modals.

### Named Rules
**The Weight-Over-Glow Rule.** Depth comes from shadow weight and layering, never from a colored glow except as a deliberate, sparing focus-ring treatment on the violet accent itself (`--brand-glow`). Don't add decorative glow to anything else.

## Shapes

A tight radius scale from 4px to 24px, plus a `full` (pill) value for badges and avatars. Buttons and inputs use the `md` step (6px) — small enough to stay crisp and "operational," not soft/bubbly. Cards use `lg` (8px); larger containers/modals step up to `xl`/`2xl` (12–16px). Borders are always 1px hairlines, never thicker.

A second, genuinely distinct radius progression runs across the POS/KDS/dashboard screens — `10px` (cards, ~34 files), `14px` (panels, ~14 files), `20px` (modals, ~15 files). It doesn't share the brand scale's progression, so it's documented separately as the Operational radius rather than forced to fit. New operational work should reuse these three steps, not invent a fourth.

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

## Do's and Don'ts

### Do:
- **Do** keep violet (`#6835F9`) reserved for primary actions and active/focus state only — never decorative.
- **Do** use Ledger Black (`#0b0b0c`) as the dark-mode ground and the light-mode ink; don't introduce a second "almost black."
- **Do** keep real layered box-shadows for elevation in both themes — this system is not flat/tonal.
- **Do** use white text on violet backgrounds, and `--brand-text` (not `--brand`) when violet is the text color itself — it switches to `#a78bfa` in dark mode for contrast.

### Don't:
- **Don't** fake colored text with `background-clip: text` / gradient tricks — set `color` directly. (Already corrected once this session; don't reintroduce it.)
- **Don't** add a second accent color alongside violet on the same screen.
- **Don't** soften button/input radii below the `md` (6px) step — it reads as off-brand "soft SaaS," not this system's operational character.
- **Don't** let sidebar/nav "current" states borrow the violet accent — that's reserved for actions, not location indicators.

## Direction C · Across the Room (current theme, 2026-11-10)

"Earlier — C Across the Room" from the visual-directions canvas, with the Pz logo violet `#6835F9` in place of its original cyan action color. It's applied as the last layer of `src/app/globals.css` and `src/components/landing/MiddayMarketing.module.css`, and it overrides the older tokens above wherever they conflict.

- **Dark-first, like signage.** Graphite `#0E1014` ground, panel `#171A20`, raised `#262A33`, text `#F3F4F6`, muted `#9BA3AF`. The landing page is dark too.
- **Light mode = back office.** Ground `#F4F5F7`, white cards, ink `#0E1014`, muted `#4B5563`.
- **Violet is the only action color.** Primary buttons, the current-nav bar (4px), focus rings. White text on violet; violet *text* on dark uses `#A98BFF`.
- **Status is a solid block with a word, never a small dot.** Ready `#34D27B`, aging `#FFB020`, late `#D92D20`.
- **Type:** Barlow Condensed 800 uppercase for headlines, timers and totals; Barlow 400/600 for interface text; JetBrains Mono for IDs and codes only.
- **Shape:** 4px buttons and inputs, 6–8px cards. Secondary buttons are a 2px outline (white on dark, ink on light).
