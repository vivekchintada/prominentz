# Module 7 — Platform hardening

## Goal
Make the combined SaaS safe to deploy and operate.

## Implement
- Merge and baseline all Prisma migrations against staging before production.
- Seed/demo data that covers inventory, workforce, ordering, loyalty, delivery, and phone flows.
- Central authorization helpers for restaurant/location/role isolation.
- Structured logging, error reporting, health checks, metrics, job monitoring, and audit retention.
- Unit, integration, and browser E2E suites for critical financial and inventory flows.
- CI pipeline: install, Prisma validate/generate, lint, type-check, test, build, migration check.
- Backup/restore runbook, migration rollback strategy, secret rotation, rate limits, CSP review.
- Feature flags and staged rollout by location.

## Final release gate
Zero TypeScript/build errors; migration tested on a staging database clone; payment/order/inventory idempotency tests pass; cross-tenant authorization tests pass; critical routes pass mobile and desktop visual QA; deployment and rollback are documented.
