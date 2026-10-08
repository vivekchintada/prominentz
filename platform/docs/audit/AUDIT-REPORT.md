# Resto SaaS Pre-Production Audit Report: Final Audit Assessment

**Project:** Resto SaaS (Prominentz)  
**Date:** October 9, 2026  
**Auditor:** Principal Software Engineer, Application-Security Auditor & SaaS Compliance Reviewer  
**Scope:** Multi-Tenant Restaurant Operating Platform (`platform/`)  
**Verdict:** 🛑 **NO-GO FOR PRODUCTION DEPLOYMENT** (Deployment halted pending remediation of 1 Critical and 3 High severity vulnerabilities)

---

## 1. Executive Summary

A comprehensive pre-production security, multi-tenant isolation, data compliance, and operational resilience audit was conducted across the Resto SaaS codebase. 

The stack comprises **Next.js 16.3.8 (App Router)**, **React 19.2.4**, **Prisma ORM 7.8.0** connected to PostgreSQL on Supabase (`aws-0-ap-south-1.pooler.supabase.com:5432`), Redis (`ioredis` 5.11.1) for pub/sub event broadcasting, NextAuth.js v5 (beta 31), and Stripe payment processing.

### Key Deployment Decision: 🛑 NO-GO
Immediate production release cannot proceed due to:
1. **Zero Database Migrations Applied (`CRIT-01`):** 21 migrations have not been applied to the live production database target, guaranteeing immediate 500 runtime errors on all database queries.
2. **Cross-Tenant IDOR (`HIGH-01`):** Any authenticated user can read, patch, or delete orders belonging to competing restaurant tenants by passing foreign order IDs to `/api/orders/[id]`.
3. **Cross-Tenant Fallback Leak (`HIGH-02`):** When `restaurantId` is missing from an authenticated session or resolver context, multiple platform routes fall back to `prisma.restaurant.findFirst()`, inadvertently leaking and binding Tenant #1's live store to unauthorized users.
4. **Self-Service Plan Gating Bypass (`HIGH-03`):** Any tenant owner can bypass Stripe billing and force an upgrade to `ENTERPRISE` tier without payment via `/api/billing/activate`.
5. **Build Invalidation (`INFO-01`):** 792 lines of TypeScript strict compiler errors prevent a clean `npm run build` production release.

---

## 2. Risk & Vulnerability Matrix

| ID | Severity | Category / CWE | Affected Component / File | Impact Summary | Status |
|---|---|---|---|---|---|
| **CRIT-01** | 🚨 **CRITICAL** | CWE-1059: Operational / Schema Drift | `prisma/migrations/*` vs Supabase Pooler | 21 unapplied migrations; target DB lacks core schema tables | **Open (Blocker)** |
| **HIGH-01** | 🔴 **HIGH** | CWE-639: BOLA / Cross-Tenant IDOR | `src/app/api/orders/[id]/route.ts` | Authenticated tenant can view, mutate, and void orders of other tenants | **Open (Blocker)** |
| **HIGH-02** | 🔴 **HIGH** | CWE-200: Broken Tenant Isolation | `src/lib/location-resolver.ts`, `dashboard/layout.tsx`, `kds/page.tsx` | Unbound sessions fall back to Tenant #1, exposing first restaurant's operations | **Open (Blocker)** |
| **HIGH-03** | 🔴 **HIGH** | CWE-863: Broken Access Control | `src/app/api/billing/activate/route.ts` | Any tenant owner can activate Enterprise plan without payment via direct POST | **Open (Blocker)** |
| **MED-01** | 🟡 **MEDIUM** | CWE-862: Geofence Logic Bypass | `src/lib/geo.ts`, `src/app/api/server/clock/route.ts` | Staff can clock in remotely by withholding browser GPS permissions | **Open** |
| **MED-02** | 🟡 **MEDIUM** | CWE-200 / CWE-203: User Enumeration | `src/app/api/auth/lookup-role/route.ts` | Unauthenticated attacker can harvest registered emails and administrative roles | **Open** |
| **MED-03** | 🟡 **MEDIUM** | Regulatory: India DPDP Act 2023 Non-Compliance | `src/app/privacy/page.tsx`, `src/app/api/customers/[id]/route.ts` | Missing Data Fiduciary terms, grievance officer contact, and RTBF erasure controls | **Open** |
| **LOW-01** | 🔵 **LOW** | CWE-1236: CSV Formula Injection | `src/app/api/inventory/export/route.ts` | Untrusted inventory item names starting with `=,+,-,@` execute in Excel | **Open** |
| **LOW-02** | 🔵 **LOW** | CWE-209: Verbose Error Disclosures | Catch blocks across API routes | Stack traces or raw `err.message` returned to client callers | **Open** |
| **INFO-01** | ⚪ **INFO** | Build / Code Quality Debt | Entire project (60+ files) | 792 lines of TypeScript compiler errors blocking clean production build | **Open** |

---

## 3. In-Depth Verified Findings

### [CRIT-01] 21 Unapplied Database Migrations in Target Production Database
- **Severity:** 🚨 **CRITICAL**
- **Location:** `prisma/migrations/*` vs `aws-0-ap-south-1.pooler.supabase.com:5432`
- **Verified Evidence:**
  Running `npx prisma migrate status` produces exit code 1 with:
  ```text
  Following migrations have not yet been applied:
  20260715184138_init
  20260716000000_add_missing_relations
  20260717000000_kds_course_management
  20260721000000_add_time_entry_model
  20260722000000_add_delivery_management
  20260723000000_add_tip_pooling
  20260724000000_add_loyalty_program
  20260725000000_add_recipe_management
  20260726000000_add_gift_cards
  20260727000000_add_kitchen_station_routing
  20260728000000_add_notification_model
  20260729000000_add_performance_indexes
  20260802000000_add_marketing_campaigns
  20260803000000_add_waitlist_model
  20260804000000_add_multi_currency
  20260805000000_add_device_pairing
  20260806000000_add_audit_log_model
  20260807000000_add_qr_ordering_enhancements
  20260901000000_add_stripe_billing
  20260915000000_add_urbanpiper_integration
  20261002170000_customer_phone_tenant_scope
  ```
- **Exploit / Operational Impact:** The target database instance does not contain the tables and foreign keys expected by the application. Launching traffic against this database will result in immediate `P2021` ("The table does not exist") and fatal 500 errors on every route.
- **Remediation:** 
  Execute `npx prisma migrate deploy` in the deployment pipeline against the direct connection string, and verify `npx prisma migrate status` returns clean.

---

### [HIGH-01] Global IDOR & Cross-Tenant Data Tampering in Orders API
- **Severity:** 🔴 **HIGH** (CVSS 8.5)
- **Location:** `src/app/api/orders/[id]/route.ts`, lines 9–25, 104–157, 334
- **Verified Evidence:**
  ```typescript
  // src/app/api/orders/[id]/route.ts (lines 9-25)
  async function resolveOrder(id: string, restaurantId?: string | null) {
    if (restaurantId) {
      const found = await prisma.order.findFirst({
        where: {
          id,
          OR: [
            { table: { location: { restaurantId } } },
            { server: { restaurantId } },
          ],
        },
      })
      if (found) return found
    }
    // VULNERABILITY: If not found under current tenant, falls back to raw ID lookup!
    return prisma.order.findUnique({
      where: { id },
    })
  }
  ```
- **Exploit / Impact:** 
  1. An attacker authenticated as a server or manager in Restaurant A sends `GET /api/orders/{restaurant_b_order_id}`.
  2. The query fails the tenant-scoped match, falls through to `prisma.order.findUnique({ where: { id } })`, and returns Tenant B's order including customer PII and server details.
  3. The attacker sends `PATCH /api/orders/{restaurant_b_order_id}` with `{ "status": "VOIDED" }` or adds items, successfully altering Restaurant B's live orders and KDS queues.
  4. The attacker sends `DELETE /api/orders/{restaurant_b_order_id}` and cancels Restaurant B's order.
- **Remediation:** 
  Remove the unscoped `findUnique` fallback completely. If `restaurantId` is provided and no matching record exists within that tenant, return `null` immediately. If `restaurantId` is null or missing, reject with `401 Unauthorized`.

---

### [HIGH-02] Silent Cross-Tenant Data Leak via `prisma.restaurant.findFirst()` Fallbacks
- **Severity:** 🔴 **HIGH** (CVSS 8.1)
- **Location:**
  - `src/lib/location-resolver.ts`, line 56
  - `src/app/(dashboard)/dashboard/layout.tsx`, line 48
  - `src/app/(dashboard)/dashboard/page.tsx`, line 77
  - `src/app/(dashboard)/dashboard/crm/page.tsx`, line 19
  - `src/app/(kds)/kds/page.tsx`, line 30
- **Verified Evidence:**
  ```typescript
  // src/lib/location-resolver.ts (lines 54-65)
  if (!restaurantId) {
    const firstRest = await prisma.restaurant.findFirst({
      include: {
        locations: {
          select: { id: true, name: true, isHeadquarters: true },
          orderBy: { isHeadquarters: 'desc' },
        },
      },
    })
    if (firstRest) {
      restaurantId = firstRest.id
      ...
    }
  }
  ```
  ```typescript
  // src/app/(dashboard)/dashboard/layout.tsx (lines 46-50)
  let restaurantId: string | undefined = session?.user?.restaurantId
  if (!restaurantId) {
    const fb = await prisma.restaurant.findFirst()
    restaurantId = fb?.id
  }
  ```
- **Exploit / Impact:** Any user whose session lacks an explicit `restaurantId` (e.g., pending onboarding, invited user with unlinked record, or misconfigured profile) is automatically bound to Tenant #1 (the first created restaurant in the database). The user will view Tenant #1's financial revenue, orders, staff, CRM contacts, and kitchen tickets.
- **Remediation:** 
  Eliminate all `prisma.restaurant.findFirst()` fallback routines in multi-tenant contexts. If `restaurantId` is absent, strictly redirect the user to `/onboarding` or return `403 Forbidden`.

---

### [HIGH-03] Self-Service Billing Bypass to Enterprise Plan
- **Severity:** 🔴 **HIGH** (CVSS 7.8)
- **Location:** `src/app/api/billing/activate/route.ts`, lines 23–28, 47–51
- **Verified Evidence:**
  ```typescript
  // src/app/api/billing/activate/route.ts
  if (process.env.NODE_ENV === 'production' && !['ADMIN', 'OWNER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Plan activation must be completed through Stripe checkout' },
      { status: 403 }
    )
  }
  
  // Lines 47-51:
  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      planTier,
      stripeSubscriptionId: restaurant.stripeSubscriptionId || `manual_${Date.now()}`,
      subscriptionStatus: 'ACTIVE',
    },
  })
  ```
- **Exploit / Impact:** 
  The condition explicitly permits any tenant with role `OWNER` to bypass the Stripe checkout flow. Any authenticated restaurant owner can submit `POST /api/billing/activate` with `{"planTier": "ENTERPRISE"}` and self-upgrade their subscription in the database without paying, causing direct SaaS revenue loss.
- **Remediation:** 
  Restrict `/api/billing/activate` exclusively to internal platform admins (`role === 'SUPER_ADMIN'`) or internal maintenance scripts, ensuring all tenant owners can only upgrade subscriptions via verified Stripe Checkout Webhook events (`checkout.session.completed` / `customer.subscription.created`).

---

### [MED-01] Geofenced Attendance Clock-In Bypass via Null Coordinates
- **Severity:** 🟡 **MEDIUM** (CVSS 5.3)
- **Location:** `src/lib/geo.ts`, lines 43–52; `src/app/api/server/clock/route.ts`, lines 182–194
- **Verified Evidence:**
  ```typescript
  // src/lib/geo.ts (lines 43-52)
  export function isWithinGeofence(
    userLat?: number | null,
    userLng?: number | null,
    locLat?: number | null,
    locLng?: number | null,
    radiusMeters: number = 150
  ): { inBounds: boolean; distanceMeters: number | null } {
    if (
      userLat == null ||
      userLng == null ||
      locLat == null ||
      locLng == null
    ) {
      // VULNERABILITY: If user doesn't send GPS, inBounds defaults to TRUE!
      return { inBounds: true, distanceMeters: null }
    }
  ```
- **Exploit / Impact:** Dishwashers, servers, and kitchen staff can clock in remotely from home by simply turning off GPS permissions in their mobile browser or sending an empty payload. The server treats `inBounds` as `true`, completely defeating the purpose of the geofenced attendance system.
- **Remediation:** 
  When restaurant geofence coordinates are configured, missing user coordinates must return `{ inBounds: false, distanceMeters: null }` and flag the attendance record with `outOfBounds: true` or require manager override.

---

### [MED-02] Public User & Administrative Role Enumeration Endpoint
- **Severity:** 🟡 **MEDIUM** (CVSS 5.3)
- **Location:** `src/app/api/auth/lookup-role/route.ts`, lines 18–27
- **Verified Evidence:**
  ```typescript
  // src/app/api/auth/lookup-role/route.ts (lines 18-27)
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { role: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ role: user.role })
  ```
- **Exploit / Impact:** An unauthenticated external attacker can iterate over potential employee or company email addresses. The endpoint provides an exact oracle indicating whether the email exists (`200` vs `404`) and exposes their operational role (`OWNER`, `MANAGER`, `SERVER`, `KITCHEN`), facilitating targeted spear-phishing and credential stuffing against privileged accounts.
- **Remediation:** 
  Delete `/api/auth/lookup-role` or require authentication, or return a uniform generic response with constant-time lookup.

---

### [MED-03] India DPDP Act 2023 & GDPR Statutory Non-Compliance
- **Severity:** 🟡 **MEDIUM** (Regulatory / Legal Risk)
- **Location:** `src/app/privacy/page.tsx`, `src/app/api/customers/[id]/route.ts`
- **Verified Evidence:**
  The privacy documentation references GDPR and California privacy principles, but explicitly omits compliance with India's **Digital Personal Data Protection (DPDP) Act, 2023**:
  1. Missing designation of the Prominentz entity as **Data Fiduciary** and restaurants as **Data Processors**.
  2. Lack of mandatory Grievance Redressal Officer contact information and Indian statutory response timelines (within 30 days).
  3. No programmatic Data Principal Right to Erasure / Right to Correction (`DELETE` / `PURGE`) endpoint for restaurant diner records under `/api/customers/[id]`.
- **Exploit / Impact:** Non-compliance with DPDP Act 2023 carries statutory financial penalties up to ₹250 Crore for significant data breaches or non-fulfillment of Data Principal rights.
- **Remediation:** 
  1. Update `src/app/privacy/page.tsx` with explicit DPDP Act 2023 provisions, Data Fiduciary/Processor roles, and Grievance Officer email.
  2. Implement an authenticated Right to Erasure (`DELETE /api/customers/[id]`) endpoint with anonymization/soft-delete safeguards.

---

### [LOW-01] CSV Formula Injection in Inventory Exports
- **Severity:** 🔵 **LOW** (CVSS 3.8)
- **Location:** `src/app/api/inventory/export/route.ts`, lines 8–16
- **Verified Evidence:**
  ```typescript
  // src/app/api/inventory/export/route.ts
  function toCsvRow(fields: (string | number | null | undefined)[]): string {
    return fields
      .map((val) => {
        if (val === null || val === undefined) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      })
      .join(',')
  }
  ```
- **Exploit / Impact:** If a supplier or employee creates an inventory item with a name starting with `=`, `-`, `+`, or `@` (e.g., `=cmd|' /C calc'!A0`), when a manager downloads the CSV and opens it in Microsoft Excel or LibreOffice Calc, the spreadsheet software executes the formula.
- **Remediation:** 
  Prefix any field starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single apostrophe (`'`).

---

### [LOW-02] Verbose Error Disclosures in API Handlers
- **Severity:** 🔵 **LOW** (CVSS 3.1)
- **Location:** Multiple API routes (e.g. `src/app/api/auth/lookup-role/route.ts`, line 29)
- **Verified Evidence:**
  ```typescript
  catch (err: unknown) {
    return NextResponse.json({ error: (err as any)?.message || 'Server error' }, { status: 500 })
  }
  ```
- **Exploit / Impact:** Unhandled Prisma and internal server exceptions can bubble raw database table names, constraint violations, and connection error details back to the client.
- **Remediation:** 
  Log errors server-side and return generic error messages (`"Internal server error"`) to external consumers in production.

---

### [INFO-01] TypeScript Compilation & Build Pipeline Debt
- **Severity:** ⚪ **INFO** (Operational)
- **Location:** Across 60+ files in `src/`
- **Verified Evidence:**
  Running `npx tsc --noEmit` yields 792 lines of compiler errors. The dominant error pattern is `TS18046: 'err' is of type 'unknown'` inside catch blocks, along with uncast dynamic parameters.
- **Impact:** Blocks Next.js production packaging (`npm run build`) from completing cleanly.
- **Remediation:** 
  Add safe error narrowing helper (`getErrorMessage(err: unknown): string`) across affected handlers.

---

## 4. Remediation Plan & Execution Sequence

| Phase | Action Item | Target Files | Verification Method |
|---|---|---|---|
| **Step 1** | Patch Critical IDOR | `src/app/api/orders/[id]/route.ts` | Validate cross-tenant query returns 404/403 |
| **Step 2** | Remove Silent Tenant Fallbacks | `src/lib/location-resolver.ts`, `dashboard/layout.tsx`, `kds/page.tsx` | Confirm missing tenant redirects/rejects |
| **Step 3** | Lock Billing Activation | `src/app/api/billing/activate/route.ts` | Verify owner cannot self-activate Enterprise |
| **Step 4** | Harden Geofence Validation | `src/lib/geo.ts`, `src/app/api/server/clock/route.ts` | Confirm null GPS flags out-of-bounds |
| **Step 5** | Sanitize CSV Exports | `src/app/api/inventory/export/route.ts` | Confirm formula characters prefixed with `'` |
| **Step 6** | DPDP 2023 & Privacy Policy Update | `src/app/privacy/page.tsx`, `customers/[id]/route.ts` | Review legal clauses and erasure endpoint |
| **Step 7** | Clean TypeScript & Lint Errors | Catch blocks across `src/` & `PurrCoffeePos.tsx` | `npx tsc --noEmit` & `npm run lint` pass |
| **Step 8** | Database Migration Deploy | Supabase Database | `npx prisma migrate status` reports up to date |

---

## 5. Pre-Deployment Go / No-Go Checklist

- [ ] **DB Migrations:** `npx prisma migrate status` reports 0 unapplied migrations.
- [ ] **Multi-Tenant Tests:** Zero cross-tenant data access confirmed on Orders, Menus, and Reports.
- [ ] **Billing Integrity:** Only valid Stripe webhooks can mutate subscription tier.
- [ ] **Build Validation:** `npm run build` succeeds without type or lint errors.
- [ ] **Security Regression:** `node scripts/security-regression.mjs` passes 100%.

**End of Audit Report.**
