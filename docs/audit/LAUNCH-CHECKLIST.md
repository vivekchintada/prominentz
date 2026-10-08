# Resto SaaS Pre-Deployment Launch Checklist

**Project:** Resto SaaS (Prominentz)  
**Deployment Target:** Production (AWS ap-south-1 / Supabase / Vercel)  
**Date:** October 9, 2026  
**Status:** 🟡 **GATED — READY FOR PRE-FLIGHT MIGRATION EXECUTION**

---

## 1. Automated Security & Quality Pre-Flight Checks

Before triggering the deployment pipeline, all local gates must evaluate to GREEN:

| Check | Target Command | Expected Output | Status |
|---|---|---|---|
| **ESLint Analysis** | `npm run lint` | `0 errors` | ✅ **PASS** (Fixed `PurrCoffeePos.tsx` import) |
| **Security Regressions** | `node scripts/security-regression.mjs` | `Emergency and pre-production security regression checks passed.` | ✅ **PASS** (100% assertions verified) |
| **Prisma Schema** | `npx prisma validate` | `The schema is valid` | ✅ **PASS** |
| **IDOR Containment** | Orders API Test | Scoped to `restaurantId` (no fallback) | ✅ **PASS** (Patched) |
| **Tenant Isolation** | Location Resolver & Layouts | No fallback to Tenant #1 | ✅ **PASS** (Patched) |
| **Billing Protection** | Billing Activation Route | Restricted with `INTERNAL_ADMIN_SECRET` | ✅ **PASS** (Patched) |
| **Geofence Clock-in** | Haversine Distance Check | Missing user coordinates rejected/flagged | ✅ **PASS** (Patched) |
| **CSV Export Sanitization**| Inventory & Payroll Exports | Formula triggers (`=,+,-,@`) escaped | ✅ **PASS** (Patched) |
| **DPDP Act 2023** | Privacy Policy & Data Erasure | Grievance officer + `DELETE /api/customers/:id` | ✅ **PASS** (Implemented) |

---

## 2. Critical Database Migration Protocol (P0 Gate)

> ⚠️ **CRITICAL WARNING (`CRIT-01`):**  
> 21 migrations are currently pending on `aws-0-ap-south-1.pooler.supabase.com:5432`. Launching without applying these migrations will trigger runtime database failure.

### Migration Execution Steps
1. **Take Pre-Migration Snapshot:**
   Log into the Supabase project dashboard and trigger a manual database backup snapshot.
2. **Execute Schema Deploy:**
   Run the deployment command against the direct PostgreSQL connection:
   ```bash
   cd platform
   npx prisma migrate deploy
   ```
3. **Verify Clean Migration State:**
   Confirm all 21 migrations are recorded:
   ```bash
   npx prisma migrate status
   ```
   *Expected Output:* `Database schema is up to date!`

---

## 3. Production Environment Variable Inventory

Ensure all required secrets are configured in the hosting environment (e.g. Vercel / Railway / AWS ECS):

| Variable Name | Required | Description / Security Note |
|---|---|---|
| `DATABASE_URL` | **YES** | Supabase pooled connection string (`?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | **YES** | Direct port 5432 connection for Prisma migrations |
| `NEXTAUTH_SECRET` | **YES** | High-entropy 64-char string for JWT/cookie signing |
| `NEXTAUTH_URL` | **YES** | Production canonical domain (`https://resto.prominentz.com`) |
| `INTERNAL_ADMIN_SECRET` | **YES** | High-entropy secret for platform administrative operations |
| `STRIPE_SECRET_KEY` | **YES** | Production Stripe API key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | **YES** | Webhook endpoint secret (`whsec_...`) for event signature verification |
| `REDIS_URL` | **YES** | Production Redis connection string for SSE / pub-sub |
| `RESEND_API_KEY` | **YES** | Transactional email provider key |
| `URBANPIPER_API_KEY` | Conditional | UrbanPiper production key if multi-aggregator sync is enabled |

---

## 4. Post-Deployment Smoke Verification

Immediately following production artifact cutover:

1. **Health Endpoint:**  
   `GET /api/health` -> Verify `200 OK` with database connection healthy.
2. **Tenant Isolation Verification:**  
   Log in with a test server account. Attempt `GET /api/orders/{foreign_id}` -> Verify `404 Not Found`.
3. **Billing Gating Verification:**  
   Attempt `POST /api/billing/activate` without secret -> Verify `403 Forbidden`.
4. **Geofence Clock-in Verification:**  
   Attempt clock-in with disabled geolocation -> Verify attendance is flagged as `Out of geofence` and requires manager override.
5. **KDS Event Stream Verification:**  
   Place a test order on Server POS -> Verify kitchen ticket immediately appears on KDS screen via Redis SSE event.
6. **DPDP Data Erasure Verification:**  
   Execute `DELETE /api/customers/{test_id}` -> Verify customer identity is anonymized while preserving financial totals.

---

## 5. Emergency Rollback Protocol

In the event of an unresolvable P0 failure post-launch:
1. **Traffic Reversion:** Re-point DNS / CDN alias to previous immutable deployment tag.
2. **Database Rollback:** If migration rollback is required, restore from pre-migration Supabase backup snapshot.
3. **Event Queue Drain:** Flush active Redis keys matching `resto:stream:*` to prevent deserialization poison pills.

---

## 6. Pre-Production Sign-Off

- **Security & Multi-Tenant Audit:** ✅ Signed off (All identified vulnerabilities remediated)
- **Code Quality & Static Analysis:** ✅ Signed off (ESLint 0 errors, security regression 100%)
- **Target DB Migrations:** ⏳ Pending pipeline execution (`npx prisma migrate deploy`)
