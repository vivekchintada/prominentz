# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the independent owner-operator of a single-location restaurant, cafe, or bistro: the person who buys Prominentz, configures it, and also works the floor day to day (runs the POS, checks the KDS, manages staff). Multi-location/chain operators are a supported but secondary audience (Enterprise tier: multi-outlet, HQ hierarchy).

## Product Purpose

Prominentz is a restaurant operations platform: POS and table/floor management, a real-time Kitchen Display System (KDS), digital menu/QR ordering, inventory and recipe tracking, staff shift management and clock-in/out, reservations and waitlist, end-of-day sales reporting, and delivery-aggregator sync (DoorDash, UberEats, UrbanPiper/Zomato/Swiggy). A Pro tier (in development) adds a CRM/loyalty layer and an AI operations agent.

## Positioning

Built by an Indian operator but able to bill and serve customers in both India and the US cleanly through one merchant-of-record gateway (Dodo Payments), rather than forcing a choice between an India-only payment stack (Cashfree/Razorpay, INR-only, blocked on US recurring cards) or a US-only one (Stripe direct, hard for an Indian entity to get approved for). Competing restaurant POS platforms (Toast, Square, Petpooja) are generally anchored to one market's payment/compliance regime; Prominentz's billing layer is not.

## Operating Context

- Multi-tenant: each restaurant is its own tenant (`Restaurant` record); staff roles are OWNER / MANAGER / SERVER / KITCHEN with different feature access.
- 14-day trial, then a soft lock if no active paid subscription.
- Diner-facing payments (online orders, in-person card/Terminal) run on each restaurant's own Stripe account (the owner pastes their Stripe secret key in Settings → Payments), separate from the restaurant's own Prominentz subscription billing (Dodo Payments, with a Stripe-direct fallback for local testing only).
- Simultaneously selling into India and the US — copy, pricing, and support flows should read as country-neutral, not anchored to either market.

## Capabilities and Constraints

- Stack: Next.js (App Router) + React, Prisma/PostgreSQL, Redis (event bus), NextAuth — already established by the existing codebase.
- Plan tiers: STARTER (Basic, $50/mo — core POS/KDS/inventory/staff/delivery sync), PRO (in development — CRM, loyalty, AI agent, multi-location, labor scheduling; no real purchase path yet, Dodo product ID is a placeholder), ENTERPRISE (custom, multi-outlet).
- Pro-only features are gated server-side through `src/lib/plan-gate.ts` (`verifyRestaurantPlan`): the CRM, AI agent and multi-location pages, and the customers, loyalty and multi-location report APIs check for PRO. The Loyalty dashboard page renders for every plan, but its reward and redemption calls are gated (confirmed 2026-11-14).
- PCI-DSS Level 1 compliance claimed for payment processing (Stripe/Dodo/Razorpay) per the privacy page.

## Brand Commitments

- Name: Prominentz.
- One visual theme across the product (user decision 2026-11-14, superseding the same-day "two worlds" note): the signed-in app and the public marketing site both wear Direction C "Across the Room": graphite `#0e1014` and back-office grey `#f4f5f7` grounds, violet `#6835F9` as the only action color, solid status blocks (green `#34d278`, amber `#ffb029`, red `#d92020`). Type differs by register: the app uses Barlow Condensed / Barlow / JetBrains Mono; the marketing site keeps Funnel Display / Inter / Roboto Mono (user decision 2026-11-14, after trying the app faces on the site). The app defines the palette in `src/app/globals.css`; the site mirrors the values in `src/components/landing/Landing.module.css`. waybill.to was the landing page's structural inspiration only, never its copy, palette or brand.
- The product is shown only as a labelled demo restaurant; no invented customers, logos, uptime or usage numbers anywhere.

## Evidence on Hand

- No existing customer testimonials, case studies, or press on hand — future work must not fabricate these.
- Pricing and feature claims are sourced from `src/lib/pricing.ts` and `src/lib/plans.ts`; treat those files as source of truth over any marketing copy that drifts from them.

## Product Principles

1. Billing and payment flows must stay country-neutral — nothing should assume an India-only or US-only customer.
2. Plan-tier gating (STARTER/PRO/ENTERPRISE) must match what the code actually enforces, not just what marketing copy claims.
3. Diner payments (the restaurant's own Stripe key) and the restaurant's own subscription billing (Dodo Payments) are separate systems — never conflate them in UI or docs.
4. The primary user is a working owner-operator, not a back-office admin — flows should assume someone who is also on the floor, not just at a desk.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established yet; standard WCAG AA practice applies by default (per the existing CSS's stated contrast targets).
