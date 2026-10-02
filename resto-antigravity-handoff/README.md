# Resto SaaS — Antigravity implementation handoff

This bundle is a CLI-ready plan for merging the three completed sandbox modules and implementing the remaining roadmap.

## Completed sandbox artifacts to merge first
1. Inventory & Food Cost MVP
2. Workforce Scheduling & Labor MVP
3. Online Ordering 3A–3C MVP

These are not automatically present in the local/GitLab project. Merge their ZIPs first, in order, and combine Prisma changes rather than overwriting `schema.prisma`.

## Remaining priority order
1. Integration audit and combined-schema baseline
2. Inventory completion
3. Workforce completion
4. Online-ordering production hardening
5. CRM and loyalty
6. Delivery reconciliation
7. AI phone ordering
8. Platform hardening and release automation

Run `MASTER_PROMPT.md` first. Then give Antigravity one numbered module at a time. Do not run all modules in a single unreviewed change.
