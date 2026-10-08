# Resto SaaS Pre-Production Audit Report: Final Audit Assessment

**Project:** Resto SaaS (Prominentz)  
**Date:** October 9, 2026  
**Auditor:** Principal Software Engineer, Application-Security Auditor & SaaS Compliance Reviewer  
**Scope:** Multi-Tenant Restaurant Operating Platform (`platform/`)  
**Verdict:** ✅ **GO FOR PRODUCTION DEPLOYMENT** (All identified vulnerabilities remediated, verified, and automated regressions passing)

---

## 1. Executive Summary

A comprehensive pre-production security, multi-tenant isolation, data compliance, and operational resilience audit was conducted across the Resto SaaS codebase. 

The stack comprises **Next.js 16.3.8 (App Router)**, **React 19.2.4**, **Prisma ORM 7.8.0** connected to PostgreSQL on Supabase (`<supabase-pooler-host>`), Redis (`ioredis` 5.11.1) for pub/sub event broadcasting, NextAuth.js v5 (beta 31), and Stripe payment processing.

### Key Deployment Decision: ✅ GO FOR PRODUCTION
All identified vulnerabilities and operational blockers have been remediated:
1. **Multi-Tenant Scoping (`HIGH-01` & `HIGH-02`):** Unsafe `findUnique` fallback deleted; all order actions (`GET`, `PATCH`, `DELETE`) are strictly scoped to `restaurantId`. All silent fallbacks to Tenant #1 via `prisma.restaurant.findFirst()` eliminated across all dashboard and KDS routes.
2. **Billing & Webhook Integrity (`HIGH-03` & Stripe):** `/api/billing/activate` locked down behind `INTERNAL_ADMIN_SECRET`. Stripe webhooks validate plan tier against allowed enums and reject unrecognized price IDs rather than defaulting to Pro.
3. **Staff Geolocation & Attendance (`MED-01`):** Geofence distance checks hardened; `Permissions-Policy` header in `next.config.ts` explicitly configured to `geolocation=(self)` so mobile devices can transmit valid GPS coordinates.
4. **India DPDP Act 2023 & GDPR (`MED-03`):** Legal disclosures added for Data Fiduciary / Processor roles and Grievance Redressal Officer; programmatic Right to Erasure (`DELETE /api/customers/:id`) implemented.
5. **Build Integrity (`INFO-01`):** Production bundle compilation verified (`npm run build` succeeds with 110/110 routes generated).

---

## 2. Risk & Vulnerability Matrix

| ID | Severity | Category / CWE | Affected Component / File | Impact Summary | Status |
|---|---|---|---|---|---|
| **CRIT-01** | 🚨 **CRITICAL** | CWE-1059: Operational / Schema Drift | `prisma/migrations/*` vs Supabase Pooler | Baselined via `prisma migrate resolve --applied` | ✅ **Remediated** |
| **HIGH-01** | 🔴 **HIGH** | CWE-639: BOLA / Cross-Tenant IDOR | `src/app/api/orders/[id]/route.ts` | Authenticated tenant can view, mutate, or void orders of other tenants | ✅ **Remediated & Verified** |
| **HIGH-02** | 🔴 **HIGH** | CWE-200: Broken Tenant Isolation | `src/lib/location-resolver.ts`, `dashboard/layout.tsx`, `kds/page.tsx` | Unbound sessions fall back to Tenant #1, exposing first restaurant's operations | ✅ **Remediated & Verified** |
| **HIGH-03** | 🔴 **HIGH** | CWE-863: Broken Access Control | `src/app/api/billing/activate/route.ts` | Any tenant owner can activate Enterprise plan without payment via direct POST | ✅ **Remediated & Verified** |
| **MED-01** | 🟡 **MEDIUM** | CWE-862: Geofence Logic Bypass | `src/lib/geo.ts`, `next.config.ts` | Missing GPS coordinates rejected; Permissions-Policy updated to `geolocation=(self)` | ✅ **Remediated & Verified** |
| **MED-02** | 🟡 **MEDIUM** | CWE-200 / CWE-203: User Enumeration | `src/app/api/auth/lookup-role/route.ts` | Unauthenticated attacker can harvest registered emails and administrative roles | ✅ **Remediated & Verified** |
| **MED-03** | 🟡 **MEDIUM** | Regulatory: India DPDP Act 2023 Non-Compliance | `src/app/privacy/page.tsx`, `src/app/api/customers/[id]/route.ts` | Missing Data Fiduciary terms, grievance officer contact, and RTBF erasure controls | ✅ **Remediated & Verified** |
| **LOW-01** | 🔵 **LOW** | CWE-1236: CSV Formula Injection | `src/app/api/inventory/export/route.ts`, `labor/payroll/export/route.ts` | Formula characters (`=,+,-,@,\t,\r`) sanitized with single quote prefix | ✅ **Remediated & Verified** |
| **LOW-02** | 🔵 **LOW** | CWE-209: Verbose Error Disclosures | Catch blocks across API routes | Sanitized to return generic server errors to external callers | ✅ **Remediated & Verified** |
| **INFO-01** | ⚪ **INFO** | Build / Code Quality Debt | Build pipeline & `PurrCoffeePos.tsx` | ESLint 0 errors; `npm run build` completed cleanly | ✅ **Remediated & Verified** |

---

## 3. In-Depth Verified Findings & Applied Fixes

### [CRIT-01] Database Baselining & Migration History
- **Initial Finding:** 21 unapplied migrations in target database.
- **Resolution:** Because database tables already exist from active environment operations, migrations are baselined using `npx prisma migrate resolve --applied <migration_name>` to synchronize `_prisma_migrations` with active database state.

---

### [HIGH-01] Cross-Tenant IDOR in Orders API
- **Location:** `src/app/api/orders/[id]/route.ts`
- **Resolution:** Unscoped `findUnique` fallback removed. All operations (`GET`, `PATCH`, `DELETE`) require non-null `restaurantId` matching the order's location or server restaurant. Order table reallocation now validates that the target `tableId` belongs to the requesting restaurant. Order voiding restricted strictly to `OWNER` and `MANAGER` roles.

---

### [HIGH-02] Silent Cross-Tenant Data Leak via `findFirst()`
- **Location:** `location-resolver.ts`, `dashboard/layout.tsx`, `dashboard/page.tsx`, `crm/page.tsx`, `kds/page.tsx`, `menu/categories/route.ts`
- **Resolution:** Removed all `prisma.restaurant.findFirst()` fallbacks. Unbound sessions without `restaurantId` are redirected to `/onboarding` or rejected with `400/403`.

---

### [HIGH-03] Self-Service Billing Bypass to Enterprise Plan
- **Location:** `src/app/api/billing/activate/route.ts`
- **Resolution:** Direct self-service activation locked in production. Request must supply valid `INTERNAL_ADMIN_SECRET` in `x-admin-secret` header. All standard tenant upgrades must transit through Stripe Checkout sessions.

---

### [MED-01] Geofenced Attendance Clock-In & Permissions Policy
- **Location:** `src/lib/geo.ts`, `next.config.ts`
- **Resolution:** If a restaurant location has coordinates configured, employees submitting null GPS coordinates are marked `inBounds: false` and flagged for manager review. Additionally, `Permissions-Policy` in `next.config.ts` updated from `geolocation=()` to `geolocation=(self)` to allow browser GPS prompts.

---

### [MED-02] Public User & Administrative Role Enumeration
- **Location:** `src/app/api/auth/lookup-role/route.ts`
- **Resolution:** Endpoint requires an active authenticated session. Non-owner users can only query their own role; external unauthenticated probes receive `401 Unauthorized`.

---

### [MED-03] India DPDP Act 2023 & GDPR Statutory Compliance
- **Location:** `src/app/privacy/page.tsx`, `src/app/api/customers/[id]/route.ts`
- **Resolution:** Privacy policy updated with explicit DPDP Act 2023 provisions, Data Fiduciary/Processor roles, and Grievance Officer contact email (`grievance-officer@prominentz.com`). Implemented `DELETE /api/customers/:id` for Data Principal Right to Erasure, scrubbing PII while maintaining transactional consistency.

---

### [LOW-01] CSV Formula Injection
- **Location:** `src/app/api/inventory/export/route.ts`, `src/app/api/labor/payroll/export/route.ts`
- **Resolution:** Escaped leading formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quote prefix (`'`).

---

## 4. Automated Regression Verification

The platform automated security regression suite (`node scripts/security-regression.mjs`) verifies all controls:
```text
Emergency and pre-production security regression checks passed. (Exit Code: 0)
```
ESLint static analysis:
```text
✖ 348 problems (0 errors, 348 warnings) (Exit Code: 0)
```
Next.js production build:
```text
✓ Compiled successfully
✓ Generating static pages using 4 workers (110/110) in 2.1s
✓ Finalizing page optimization
(Exit Code: 0)
```

**Pre-Production Audit Complete. Release Approved.**
