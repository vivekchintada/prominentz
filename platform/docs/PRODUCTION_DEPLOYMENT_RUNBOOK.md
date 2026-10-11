# 🚀 Prominentz — Production Deployment Runbook & Compliance Playbook

This runbook documents the complete end-to-end procedure for deploying **Prominentz** to production.

---

## 🏢 Business & Legal Profile
* **Entity**: Prominentz (Incorporated in India)
* **Target Audience**: United States (B2B Restaurants, Bistros, Cafes, Hospitality Operators)
* **Product**: Cloud Restaurant Operating Platform (POS, KDS, Table QR Ordering, Inventory, Reporting)
* **Subscription Price**: **$50 / month** (or **$500 / year**)
* **Data Collected**: Business credentials, administrator and staff names, business emails, and phone numbers
* **Payment Gateways**: Razorpay / Cashfree / Stripe

---

## Phase 1: Code & Application Adjustments (✅ COMPLETED)

All required code and legal modifications have been applied and verified in the repository:
1. **$50/mo Plan Pricing**:
   - `src/lib/pricing.ts`: `PRICING.STARTER` updated to `$50/mo` ($500/yr).
   - `src/app/pricing/page.tsx`: Updated hero and feature matrix to reflect `$50/month`.
   - `src/components/landing/SaaSLandingClient.tsx`: All hero badges, KPI cells, comparison tables, and pricing cards updated to `$50/mo`.
   - `src/components/dashboard/BillingManagerClient.tsx`: Monthly rate display updated to `$50/mo`.
   - `src/components/ui/UpgradeModal.tsx` & `src/components/ui/PlanGateCard.tsx`: Basic plan descriptions updated to `$50/mo`.
2. **Clickwrap Legal Consent on Sign-up**:
   - `src/app/(auth)/signup/page.tsx`: Added explicit legal agreement above registration buttons linking to `/terms` and `/privacy`, establishing binding B2B contracts.
3. **Security Headers & CSP for Payment Gateways**:
   - `next.config.ts`: Added origins for Razorpay (`https://checkout.razorpay.com`, `https://api.razorpay.com`, `https://lumberjack.razorpay.com`) and Cashfree (`https://sdk.cashfree.com`, `https://api.cashfree.com`) into `script-src`, `connect-src`, and `frame-src`.
4. **Terms of Service & Privacy Policy Alignment**:
   - `src/app/terms/page.tsx`: Formally documented Prominentz (India), $50/mo subscription terms, arbitration and limitation of liability.
   - `src/app/privacy/page.tsx`: Updated to reflect Prominentz (India), data collection (email & phone number), payment processors (Razorpay / Cashfree / Stripe), and international transfer safeguards.

---

## Phase 2: Payment Gateway & Commercial Setup (India Entity → US Customers)

Because Prominentz is an Indian entity invoicing US customers in USD:

### 1. Razorpay International Setup
1. Log into your **Razorpay Dashboard** (`https://dashboard.razorpay.com`).
2. Navigate to **Account & Settings > International Payments**.
3. Submit business KYC to enable **International Card Acceptance (USD)**.
4. For subscriptions: Under **Subscriptions**, create your **$50/mo** plan in USD or configure your checkout to handle recurring card authorization.
5. In your Razorpay Dashboard, generate **Live API Keys** (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`).
6. Set Webhook URL to: `https://your-domain.com/api/ordering/payments/webhook`.

### 2. Cashfree Alternative Setup
1. Log into **Cashfree Merchant Dashboard** (`https://merchant.cashfree.com`).
2. Enable International Payments under **Payment Gateway > International**.
3. Obtain your `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` from Developer Settings.

### 3. Indian Export of Software Compliance (0% GST)
* **Letter of Undertaking (LUT)**: File an LUT for Export of Services on the Indian GST Portal (`gst.gov.in`). This takes 10 minutes and ensures your SaaS exports to US customers are **Zero-Rated (0% GST)** without blocking working capital.
* **FIRC / FIRA**: Ensure your receiving bank account provides Foreign Inward Remittance Certificates for international USD settlements.

---

## Phase 3: Cloud Infrastructure Provisioning

### 1. Managed PostgreSQL Database
Deploy a serverless or pooled PostgreSQL instance:
* **Recommended Providers**: Supabase, Neon.tech, AWS RDS Aurora, or Railway.
* Note both connection strings:
  * `DATABASE_URL`: Pooled connection string (with `pgbouncer=true` if using Supabase).
  * `DIRECT_URL`: Direct session connection string for Prisma migrations.

### 2. Managed Redis Event Bus
Deploy an instant Redis instance to handle realtime KDS bump bar events and table streams:
* **Recommended Provider**: Upstash Redis (`https://upstash.com`) — Serverless, zero-maintenance.
* Copy the `rediss://...` connection URI to `REDIS_URL`.

### 3. Production Deployment (Vercel Recommended)
1. Push your repository to GitHub: `git push origin main`.
2. Connect your repo in **Vercel** (`https://vercel.com/new`).
3. Set Framework Preset: **Next.js**.
4. Root Directory: `platform`.
5. In **Project Settings > Environment Variables**, add:
   ```bash
   DATABASE_URL="postgresql://..."
   DIRECT_URL="postgresql://..."
   NEXTAUTH_SECRET="<generate with openssl rand -base64 32>"
   NEXTAUTH_URL="https://prominentz.com"
   NEXT_PUBLIC_APP_URL="https://prominentz.com"
   REDIS_URL="rediss://..."
   
   # Razorpay Keys
   RAZORPAY_KEY_ID="rzp_live_..."
   RAZORPAY_KEY_SECRET="..."
   NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_..."
   
   # Optional Email & SMS
   RESEND_API_KEY="re_..."
   RESEND_FROM_EMAIL="Prominentz <support@prominentz.com>"
   CRON_SECRET="<random secret string>"
   ```

---

## Phase 4: Database Migrations & Pre-Flight Launch Checklist

### 1. Run Production Database Migrations
Before directing user traffic, apply the Prisma schema to the production database:
```bash
npx prisma migrate deploy
```

### 2. Custom Domain & DNS
1. Add `prominentz.com` and `www.prominentz.com` to your Vercel domains.
2. In your DNS registrar (GoDaddy, Namecheap, Cloudflare, Route53), create:
   * **A Record**: `@` → `76.76.21.21` (or your host IP)
   * **CNAME Record**: `www` → `cname.vercel-dns.com`
3. Verify SSL certificate generation (automatic in Vercel/Cloudflare).

### 3. Pre-Flight Smoke Test Checklist
- [ ] **Home Page**: Test navigation, responsive layout, and branding.
- [ ] **Pricing Page**: Confirm `$50/mo` and `$500/yr` plans load with all features.
- [ ] **Sign-up Flow**: Create a test restaurant owner account. Verify Terms and Privacy links open in new tabs.
- [ ] **Legal Verification**: Confirm `/terms` and `/privacy` reflect Prominentz, governing terms, and support emails.
- [ ] **Floor & POS**: Verify tables load, order entry functions, and KDS realtime synchronization works over Redis.
- [ ] **Payment Checkout**: Execute a test $50 transaction via your gateway in test mode, then switch keys to live.
- [ ] **Receipts & Print**: Test thermal printer WebUSB connection and digital receipt rendering.
