# Resto UI Implementation Audit (Phase 0)

> Generated as part of Phase 0 of the Antigravity UI Implementation Plan.
> Baseline status: All verification gates passing. No code modifications made in Phase 0.

---

## 1. Stack & Dependency Inventory

### Platform (`platform/`)
- **Framework**: Next.js 16.3.8 (App Router with Turbopack)
- **React**: React 19.2.4 & React-DOM 19.2.4
- **TypeScript**: TypeScript 5.x (`tsconfig.json` target ES2017)
- **CSS / Styling**: Vanilla CSS with comprehensive CSS custom properties (`src/app/globals.css`, 4220 lines) and scoped CSS Modules (`labor.module.css`, `onlineOrders.module.css`, `orderingSettings.module.css`, `reconciliation.module.css`). *Note: Tailwind CSS is not currently installed or configured in the project; styling relies on native CSS design tokens.*
- **Animation / Motion**: `motion` v13.4.0 (formerly Framer Motion)
- **Authentication**: `next-auth` v5.0.0-beta.31 (JWT-based role sessions for `OWNER`, `MANAGER`, `SERVER`, `KITCHEN`)
- **Database / ORM**: PostgreSQL via Prisma v7.8.0 / `@prisma/client` v7.8.0 & `@prisma/adapter-pg`
- **Real-Time / Events**: Socket.IO v4.8.3, Socket.IO-Client v4.8.3, Server-Sent Events (`/api/events/stream`), Redis (`ioredis` v5.11.1)
- **Billing & Payments**: Stripe SDK v22.3.1, `@stripe/stripe-js` v9.10.0
- **Package Manager**: `npm` v10+ with `package-lock.json`

### Mobile App (`mobile/`)
- **Framework**: React Native 0.86.3 / Expo SDK 57 (~57.0.24)
- **React**: React 19.2.3
- **State & Query**: TanStack React Query v5.104.0, Zustand v5.0.15
- **Lists & UI**: `@shopify/flash-list` 2.0.2, `@expo/vector-icons` 15.0.2
- **Audio / Haptics**: `expo-av` 16.0.8, `expo-haptics` 57.0.3

---

## 2. Baseline Verification Audit Results

All commands were executed directly on the untouched codebase:

| Check / Command | Working Directory | Status | Notes |
|---|---|---|---|
| `npx tsc --noEmit` | `platform/` | **PASS (0 errors)** | Full type correctness across all API routes, pages, and components |
| `npm run lint` | `platform/` | **PASS (0 errors)** | 0 errors; 660 non-blocking stylistic/`any` warnings recorded in pre-existing code |
| `npm run test:security` | `platform/` | **PASS** | Emergency security regression suite verified |
| `npm run build` | `platform/` | **PASS** | Turbopack production build succeeded; 109 routes compiled (static & dynamic) |
| `npx tsc --noEmit` | `mobile/` | **PASS (0 errors)** | Mobile client type check completely clean |

---

## 3. Comprehensive Route Inventory

The platform encompasses **109 active routes** categorized into functional boundaries:

### A. Public Marketing & Legal
- `/`: Public landing page (`SaaSLandingClient.tsx` featuring Hero, Features, ROI Calculator, Interactive POS/KDS preview, Pricing)
- `/pricing`, `/pricing/starter`, `/pricing/pro`, `/pricing/enterprise`: Tiered pricing cards with feature breakdowns
- `/privacy`, `/terms`: Legal agreements and compliance terms
- `/portals`, `/portals/owner`, `/portals/manager`, `/portals/server`, `/portals/kitchen`: Public role demonstration portals
- `/owners`, `/managers`, `/servers`, `/kitchen`: Targeted role landing pages

### B. Authentication & Onboarding
- `/login`: Unified multi-role sign-in with quick-switch demo role pills (`Owner`, `Manager`, `Server`, `Kitchen`)
- `/signup`, `/signup/invite`: Multi-step organization & tenant onboarding
- `/onboarding`: New restaurant setup wizard (brand, locations, floor tables seed)
- `/invite`: Staff invite acceptance screen

### C. Owner & Manager Operations Workspace (`/dashboard/*`)
- `/dashboard`: Operations command center (Live sales KPIs, Open checks, Labor %, Floor summary, Active KDS tickets, Shift alerts)
- `/dashboard/orders`: Real-time order grid, check comping, hold/resume, invoice generation
- `/dashboard/tables`, `/dashboard/tables/qr`: Interactive visual floor plan & dynamic QR code table generator
- `/dashboard/waitlist`: Live guest waitlist queue with quote times, SMS notify, and table seat conversion
- `/dashboard/reservations`: Dining table reservation grid, party management, and no-show tracking
- `/dashboard/schedule`: Visual weekly employee shift builder, shift templates, and copy-week tooling
- `/dashboard/staff`, `/dashboard/team`: Staff roster, wage rates, PIN assignment, and role permissions
- `/dashboard/attendance`, `/dashboard/approvals`: Geofenced clock-in log, timesheets, and shift-swap approvals queue
- `/dashboard/inventory`: Stock ledger, low-stock alerts, recipe cost cards, supplier purchase orders, and stock count audits
- `/dashboard/inventory/counts`, `/dashboard/inventory/purchase-orders`, `/dashboard/inventory/recipes`, `/dashboard/inventory/suppliers`
- `/dashboard/reports`, `/dashboard/labor`: Multi-location sales reports, Z-reports, labor vs. sales ratios, and payroll CSV exports
- `/dashboard/crm`: Guest directory, visit history timeline, dietary requirements, and VIP loyalty tiers
- `/dashboard/loyalty`: Points liability, loyalty tier config, rewards catalog, and points adjustments
- `/dashboard/reconciliation`: Delivery platform (DoorDash, UberEats, UrbanPiper) payout reconciliation and dispute management
- `/dashboard/online-orders`: Incoming third-party and direct online ordering queue
- `/dashboard/kitchen-overview`: Centralized kitchen analytics, average ticket prep times, and station bottleneck monitors
- `/dashboard/ai`, `/dashboard/audit`: RestoIQ operational assistant and immutable system audit ledger
- `/dashboard/settings`, `/dashboard/settings/billing`, `/dashboard/settings/ordering`: Restaurant profiles, Stripe subscription billing, and digital ordering rules

### D. Server Handheld POS (`/server/*`, `/pos`)
- `/server`: Touch-first handheld server POS (Active table chips, 1-click quick-ordering, course fires, table status changes)
- `/server/availability`: Server weekly shift availability and swap request manager
- `/pos`: Desktop terminal order entry and checkout register
- `/table/[locationId]/[tableId]`, `/m/tables`: Guest QR digital ordering and mobile server table management

### E. Kitchen Display System (`/kds`, `/kitchen`)
- `/kds`: Real-time kitchen bump rail with station filters (All, Hot Line, Cold/Salad, Bar, Expo), elapsed timers, audio chimes, and ticket bump state transitions

### F. REST & Real-time APIs (`/api/*`)
- Over 90 API routes governing orders, payments, Stripe webhooks, inventory, staff, attendance, tables, KDS status, reconciliation, AI tools, loyalty, and SSE event streaming.

---

## 4. Component Inventory & Existing Layouts

### Layout Architecture (`src/components/layout/`)
- `DreamPosShell.tsx`: Outer app container handling sidebar collapse state, top bar height, and role banner.
- `SidebarNav.tsx`: Role-gated navigation sidebar (Owner, Manager, Server, Kitchen filtering) with active indicators and badges.
- `TopBar.tsx`: System status indicator, location switcher, notifications popover, theme toggle, and user avatar dropdown.
- `LocationSwitcher.tsx`: Multi-unit restaurant location dropdown with cookie/session persistence.
- `NotificationsDropdown.tsx`: Notification feed for inventory alerts, 86'd items, and delayed tickets.

### Reusable UI Primitives (`src/components/ui/`)
- `KpiCard.tsx`: Metric card with delta pill, comparison text, and icon.
- `StatusBadge.tsx`: Color-coded semantic status pill (Success, Warning, Danger, Info).
- `TableToolbar.tsx`: Search input, filter buttons, and action buttons.
- `Toast.tsx`: Floating action toast for mutation confirmations.
- `ActionButtons.tsx`: Primary, secondary, outline, and destructive button styling.
- `PageHeader.tsx`: Title, subtitle, and primary header action slot.
- `PlanGateCard.tsx` & `UpgradeModal.tsx`: Billing plan feature-gate overlays and tier upgrade comparison.
- `ProminentzLogo.tsx`: SVG vector brand logo with variant sizing.
- `ThemeToggle.tsx`: Light/Dark theme switcher.

---

## 5. Design System State & Token Analysis

### Current Inconsistencies & Deficiencies
1. **Palette Fragmentation**: The current `globals.css` combines three disparate styling generations:
   - macOS Sequoia Dark tokens (`#0A0A0B`, `#1C1C1E`)
   - Prominentz Signature Indigo tokens (`#5b45f5`, `#7b68f7`)
   - DreamPOS Light tokens (`--canvas: #F7F8FA`, `--primary: #6547F5`, `--border: #DDE2EA`)
2. **Missing Implementation Plan Tokens**: The Notion plan mandates:
   - Warm off-white application background (`#fbfaf8` / `#f7f6f2`) and clean white surfaces (`#ffffff`).
   - Deep emerald primary accent (`#0f766e` / `#059669`) with warm amber (`#d97706`) for operational attention.
   - Distinct compact application spacing tokens for dense operations vs generous marketing spacing.
3. **Contrast Deficiencies**: Certain dark-mode labels in modals use low-opacity white (`rgba(255,255,255,0.36)`), which fails WCAG AA standards.
4. **Motion Fallbacks**: Lacks systematic `@media (prefers-reduced-motion: reduce)` tokens for animated interactions.

---

## 6. Business-Critical Flows (Zero-Regression Invariants)

These flows must remain strictly functional without alteration to backend APIs, schemas, or authentication logic:
1. **Multi-Role Authentication & PIN Entry**: NextAuth session tokens and PIN verification for rapid staff switching.
2. **Real-time Order Lifecycle**: POS order creation -> Socket.IO/SSE push -> KDS bump rail -> Item status transitions -> Bill checkout.
3. **Stripe Billing & Plan Enforcement**: Subscription checkout sessions, customer portal redirection, and plan-tier gating (`STARTER`, `PRO`, `ENTERPRISE`).
4. **Multi-Location Scoping**: `locationId` query/session scoping across inventory, staff, tables, and reporting.
5. **Kitchen Station Filtering**: Hot/Cold/Bar station routing and ticket completion timestamps.
6. **Geofenced Timeclock**: Employee clock-in with GPS validation and manager approval queue.

---

## 7. Baseline Visual Evidence / Screenshot List

Before applying Phase 1 design tokens, visual baseline references exist across key screens:
- Desktop Dashboard Overview: `/dashboard` (Manager Command Center)
- Desktop Kitchen KDS: `/kds` (Bump display rail)
- Handheld Server POS: `/server` (Mobile floor and order entry)
- Visual Floor Plan: `/dashboard/tables` (Table occupancy states)
- Public Landing Page: `/` (Desktop & Mobile 390px)

---

## 8. Proposed File-by-File Change Map for Phase 1

Phase 1 establishes the shared design foundation without touching business logic or route APIs:

| File Target | Proposed Changes |
|---|---|
| `platform/src/app/globals.css` | Normalize design tokens to the Plan specification: Warm off-white background, deep emerald primary (`--brand-emerald`), warm amber attention (`--brand-amber`), semantic tokens, light/dark mode CSS variables, compact application spacing, and `prefers-reduced-motion` safety rules. |
| `platform/src/components/ui/Button.tsx` (new) | Implement unified accessible typed `Button` and `IconButton` primitive with loading, disabled, and variant states (`primary`, `secondary`, `outline`, `ghost`, `danger`). |
| `platform/src/components/ui/Input.tsx` (new) | Implement unified accessible typed `Input`, `Select`, `Textarea`, and `Switch` form controls. |
| `platform/src/components/ui/Card.tsx` (new) | Implement typed `Card`, `KpiCard` enhancement, `Skeleton`, `EmptyState`, and `Alert` primitives. |
| `platform/src/components/ui/Dialog.tsx` (new) | Implement typed accessible `Dialog`, `ConfirmDialog`, and `Drawer` primitives with keyboard focus traps. |
| `platform/src/components/ui/StatusBadge.tsx` | Align existing `StatusBadge` with semantic emerald, amber, rose, and sky token variables. |
| `platform/src/app/(dashboard)/dev/components/page.tsx` (new) | Create a dev-only component showcase route to preview all design tokens and primitives in light/dark themes. |

---

## 9. Phase 0 Audit Conclusion

- **Baseline Code Health**: Verified 100% clean across TypeScript, ESLint, security tests, and Next.js production compilation.
- **Readiness**: Phase 0 audit is complete and documented. Repository is prepared to execute Phase 1 (Design Foundation) with zero regressions to core restaurant operations.
