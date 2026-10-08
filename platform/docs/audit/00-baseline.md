# Resto SaaS Pre-Production Audit: 00 - Baseline Architecture & Quality Checks

**Date:** October 9, 2026  
**Auditor:** Principal Engineer & Application-Security Auditor  
**Scope:** Multi-Tenant Restaurant Operating Platform (`platform/`)  
**Repository:** `Prominentz / Resto SaaS`  
**Git Commit / Worktree:** Dirty worktree (post-minimalist UI refactoring, pre-deployment)

---

## 1. System & Architecture Overview

Resto SaaS is a comprehensive multi-tenant restaurant operational platform built for fast-casual, fine dining, cafes, and multi-outlet enterprises.

### Tech Stack
- **Framework:** Next.js 16.3.8 (App Router), React 19.2.4
- **ORM & Database:** Prisma ORM 7.8.0, PostgreSQL hosted on Supabase (`aws-0-ap-south-1.pooler.supabase.com:5432`) with `@prisma/adapter-pg`
- **Real-Time & Messaging:** Redis (`ioredis` 5.11.1), Server-Sent Events (SSE) `/api/events/stream`, Socket.io
- **Auth & Session:** NextAuth.js v5 (beta 31) with Credentials provider, BCrypt, and HMAC-signed mobile bearer tokens
- **Billing & Payment:** Stripe (Checkout Sessions, Payment Intents, Webhooks)
- **Third-Party Integrations:** UrbanPiper, DoorDash, UberEats, Resend (Email), Twilio/WhatsApp

### Core Modules
1. **Manager / Owner Dashboard:** Financial reports, inventory control, recipe costing, staff scheduling, table floors, CRM & loyalty.
2. **Server POS & Mobile POS:** Order entry, modifiers, table split billing, table status changes, server clock-in.
3. **Kitchen Display System (KDS):** Multi-station tickets (HOT, COLD, BAR, EXPO), live prep timers, status synchronization.
4. **Table QR Ordering & Web Ordering:** Public diner menus, self-checkout, live order tracking.
5. **Staff Geofenced Attendance:** GPS/geofenced clock-in, overtime detection, shift trading.

---

## 2. Baseline Check Battery Results

| Check | Tool / Command | Result | Details |
|---|---|---|---|
| **Prisma Schema** | `npx prisma validate` | ✅ **PASS** | Schema is valid (1,655 lines, 30+ relational models). |
| **Prisma Migration Status** | `npx prisma migrate status` | 🚨 **CRITICAL BLOCKER** | **21 migrations unapplied** on `aws-0-ap-south-1.pooler.supabase.com`. Zero migrations have been run on the active target database. |
| **TypeScript Typecheck** | `npx tsc --noEmit` | ❌ **FAIL (792 lines)** | 792 lines of errors across 60+ files (primarily `TS18046: '...' is of type 'unknown'` from strict catch blocks and uncast JSON parameters). |
| **ESLint Static Analysis** | `npm run lint` | ❌ **FAIL (12 Errors)** | 12 fatal errors, 348 warnings. All 12 errors originate from `PurrCoffeePos.tsx` where `<Button>` is used without an import. |
| **Security Regression Script** | `node scripts/security-regression.mjs` | ✅ **PASS** | Emergency security containment assertions passed. |
| **Next.js Production Build** | `npm run build` | ⚠️ **BLOCKED** | Blocked by TypeScript errors and ESLint failure in `PurrCoffeePos.tsx`. |

---

## 3. Route & Attack Surface Inventory

A full recursive crawl of `src/app/api` mapped **172 API route handlers**:

- **155 Authenticated Endpoints:** Call `auth()` to resolve session and tenant identity.
- **17 Public / Unauthenticated Endpoints:**
  1. `/api/auth/lookup-role` — ⚠️ Allows public email enumeration & role disclosure.
  2. `/api/auth/mobile-login` — Rate-limited mobile login with HMAC token issuance.
  3. `/api/auth/signup` — Public tenant owner registration.
  4. `/api/auth/[...nextauth]` — NextAuth OAuth/credentials handler.
  5. `/api/health` — Public health check.
  6. `/api/integrations/urbanpiper` — Returns integration configuration status.
  7. `/api/invitations/[token]/accept` — Token-gated staff invite acceptance.
  8. `/api/menu/popular` — Public menu item recommendations.
  9. `/api/ordering/menu` — Public digital menu.
  10. `/api/ordering/orders` — Public online order placement.
  11. `/api/ordering/orders/[token]` — Order tracking via 24-byte random tracking token.
  12. `/api/ordering/payments/webhook` — Payment gateway webhook.
  13. `/api/ordering/quote` — Public cart pricing & delivery validation.
  14. `/api/table-order` — QR code dine-in order placement.
  15. `/api/table-order/checkout` — QR code self-checkout and KDS ticket dispatch.
  16. `/api/webhooks/delivery` — Multi-platform delivery order ingestion (DoorDash, UberEats, UrbanPiper).
  17. `/api/webhooks/stripe` — Stripe webhook receiver.

---

## 4. Immediate High-Risk Architecture Findings (Pre-Audit Preview)

1. **Unmigrated Database (Severity: CRITICAL):**  
   The database configured in `.env` is missing all 21 migrations. Attempting to deploy or start the app in production will cause immediate runtime table-not-found errors on any query.

2. **Cross-Tenant Fallback via `prisma.restaurant.findFirst()` (Severity: HIGH):**  
   Multiple files (`location-resolver.ts`, `dashboard/layout.tsx`, `dashboard/page.tsx`, `menu/categories/route.ts`, `kds/page.tsx`) fall back to `prisma.restaurant.findFirst()` when `restaurantId` is missing on a user session, exposing Tenant #1's data to unassociated or misconfigured users.

3. **Global IDOR in `GET`, `PATCH`, `DELETE` `/api/orders/[id]` (Severity: HIGH):**  
   The `resolveOrder()` helper falls back to `prisma.order.findUnique({ where: { id } })` when an order does not belong to the user's restaurant. This allows any authenticated user from any tenant to read, modify, or void orders belonging to other restaurants.

4. **Self-Service Plan Upgrade Bypass in `/api/billing/activate` (Severity: HIGH):**  
   The endpoint allows any user with the `OWNER` role to send `{ "planTier": "ENTERPRISE" }` and directly update their subscription tier in the database without going through Stripe checkout.

5. **Geofence Clock-in Bypass in `isWithinGeofence` (Severity: MEDIUM):**  
   When an employee does not grant GPS permissions or sends `lat: null, lng: null`, `isWithinGeofence()` returns `{ inBounds: true, distanceMeters: null }`, allowing staff to clock in remotely without being flagged.

6. **Missing India DPDP Act 2023 Compliance in Privacy Policy (Severity: MEDIUM):**  
   The legal docs mention GDPR and CCPA but omit India's Digital Personal Data Protection Act 2023, missing mandatory Data Fiduciary/Processor classifications and grievance officer disclosures for Indian operations.

---

## 5. Next Steps
Proceeding to **Phase 1-3 Deep Audit** covering:
- Full Tenant Isolation & IDOR Review
- Authentication & Session Hardening
- Payment & Webhook Verification
- Real-Time & Event Stream Security
- Input Sanitization & Data Protection Compliance
- Compilation of the formal `AUDIT-REPORT.md`.
