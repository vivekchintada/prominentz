---
version: 1
slug: "src-components-landing-homelanding-tsx"
primary_target: "src/components/landing/HomeLanding.tsx"
related_targets: ["src/app/pricing/page.tsx"]
---

## Scope

Marketing home (`src/components/landing/HomeLanding.tsx`) and `/pricing`. Mode: Persuade. Replacement world (old Bento / Midday look discarded). User asked 2026-11-13 for a page "like waybill.to": take its structure and register as inspiration (scroll theatre, chaptered story, live product panels), never its copy or brand.

## Audience, job, action

Independent owner-operator who also works the floor. Must believe: one $50/mo system runs the whole service on tablets they already own, with 0% take on sales. Actions, equal weight: Start free trial (`/signup`) and Book a demo (`#demo` form, `/api/leads`). Proof: the product shown working as a labelled demo restaurant; no invented customers, logos, uptime or numbers. Plans: Basic $50 only; Pro "coming soon"; Enterprise "contact us"; no annual price.

## Direction contract

THESIS: One dinner order, followed from the seat to the close of day, is the whole pitch. Refuses the category's headline + tablet mockup + feature-card grid.
OWN-WORLD: The app's own Direction C theme on the public stage (user decision 2026-11-14, replacing the navy / live-blue world): graphite #0e1014 signage that flips to back-office grey #f4f5f7 scenes; violet #6835f9 is the only action color and marks what is happening now; status is a solid block with a word: green #34d278 ready, amber #ffb029 cooking, red #d92020 late. Funnel Display headlines in sentence case, Inter body, Roboto Mono for tickets, timers, prices (the site keeps its own faces; only palette and shape come from the app). Product panels are white cards, 1px hairlines, 8px corners, the app's card shadow, a mono panel label on top.
STORY: See a service running → follow Table 12's order through POS, kitchen, online orders, payment, stock, staff, close → read the $50 bill → start a trial or book a demo.
FIRST VIEWPORT: Black. One centered column: the display headline, a 62ch lede, two equal CTAs and the trial terms in one line; a scroll cue at the bottom. No product panel in the first viewport. The next band is a dark collage of the night as it runs today (paper ticket, two delivery tablets, a chat, a stock sheet, a whiteboard, a statement, a napkin count), then the flip to white. Topbar carries a stage tracker named after the chapters: Order · Kitchen · Online · Payment · Stock · Staff · Close. (Revised 2026-11-14 with the user: the left-headline + live floor plan hero from the 2026-11-13 contract was replaced during the build and the shipped version stands.)
FORM: Scroll theatre (sticky stage, chapters with phase changes), 1st on my list. seed:1727a722b8718357
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction

Scrolling drives one pinned stage: each chapter advances its panel from one state to the next (ticket built → sent; ticket arrives on KDS → bumped; seats paid one by one; stock depletes and flags; a shift clocks out; the drawer balances) while the caption swaps at the half-way point. A guided cursor walks the panels and clicks where the script does. The topbar tracker, a left rail with a mono chapter counter, and a bottom-right percentage follow. Below 900×560 or with reduced motion, the stacked static story shows the finished states.
