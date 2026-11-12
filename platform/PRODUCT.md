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
- Diner-facing payments (online orders, in-person card/Terminal) run on Stripe Connect, separate from the restaurant's own Prominentz subscription billing (Dodo Payments, with a Stripe-direct fallback for local testing only).
- Simultaneously selling into India and the US — copy, pricing, and support flows should read as country-neutral, not anchored to either market.

## Capabilities and Constraints

- Stack: Next.js (App Router) + React, Prisma/PostgreSQL, Redis (event bus), NextAuth — already established by the existing codebase.
- Plan tiers: STARTER (Basic, $50/mo — core POS/KDS/inventory/staff/delivery sync), PRO (in development — CRM, loyalty, AI agent, multi-location, labor scheduling; no real purchase path yet, Dodo product ID is a placeholder), ENTERPRISE (custom, multi-outlet).
- Known inconsistency as of this session: the Loyalty page has no plan-tier gate despite being marketed as Pro-exclusive — not yet resolved.
- PCI-DSS Level 1 compliance claimed for payment processing (Stripe/Dodo/Razorpay) per the privacy page.

## Brand Commitments

- Name: Prominentz.
- Current visual system (as of this session): adopted from waybill.to's palette — ink `#07122b` / accent `#309efe` / success `#24ab5c`, Inter (body) + Funnel Display (headings) + Roboto Mono, with light/dark theme variants driven by CSS custom properties in `src/app/globals.css`.

## Evidence on Hand

- No existing customer testimonials, case studies, or press on hand — future work must not fabricate these.
- Pricing and feature claims are sourced from `src/lib/pricing.ts` and `src/lib/plans.ts`; treat those files as source of truth over any marketing copy that drifts from them.

## Product Principles

1. Billing and payment flows must stay country-neutral — nothing should assume an India-only or US-only customer.
2. Plan-tier gating (STARTER/PRO/ENTERPRISE) must match what the code actually enforces, not just what marketing copy claims.
3. Diner payments (Stripe Connect) and the restaurant's own subscription billing (Dodo Payments) are separate systems — never conflate them in UI or docs.
4. The primary user is a working owner-operator, not a back-office admin — flows should assume someone who is also on the floor, not just at a desk.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established yet; standard WCAG AA practice applies by default (per the existing CSS's stated contrast targets).
