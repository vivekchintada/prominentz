# Master prompt for Antigravity CLI

You are working in the existing Resto SaaS repository. Do not rebuild the application from scratch.

## First objective
Audit the repository and determine which parts of Inventory/Food Cost, Workforce/Labor, and Online Ordering are already present. Inspect the real filesystem, Prisma schema, migrations, package scripts, routes, authentication, role checks, KDS integration, payment integration, and tests before editing.

## Mandatory safety rules
- Create a Git branch named `feature/remaining-resto-roadmap`.
- Make a clean baseline commit or confirm the working tree state before changes.
- Never replace `prisma/schema.prisma` wholesale. Merge models, enums, indexes, relations, and migrations.
- Never edit an already-applied migration. Add a new migration for corrections.
- Preserve existing POS, KDS, QR ordering, inventory depletion, scheduling, and authentication behavior.
- Use server-authoritative money calculations and idempotency for payments/orders.
- Enforce restaurant and location isolation on every protected query.
- Keep public tracking tokens cryptographically random and non-enumerable.
- Do not expose secrets or commit `.env` files.
- Implement one module per commit and show the diff plus validation results before continuing.

## Baseline validation
Run and save results for:
```bash
npm ci
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
```

## Merge audit
Compare the local repository against the three implementation archives. Produce `docs/implementation-audit.md` containing:
- present and missing files
- schema and migration conflicts
- routes that compile but are not reachable
- environment variables still required
- database services required
- security and idempotency gaps
- exact merge order

After the audit, execute the remaining modules in this order:
1. `01-inventory-completion.md`
2. `02-workforce-completion.md`
3. `03-online-ordering-hardening.md`
4. `04-crm-loyalty.md`
5. `05-delivery-reconciliation.md`
6. `06-ai-phone-ordering.md`
7. `07-platform-hardening.md`

For each module: inspect current code, propose the file/schema plan, implement, add tests, run Prisma/TypeScript/build validation, and commit with a specific message. Stop and report blockers instead of inventing credentials or provider configuration.
