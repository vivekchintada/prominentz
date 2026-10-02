# Module 5 — Delivery reconciliation

## Goal
Reconcile marketplace orders, payouts, fees, cancellations, and taxes.

## Implement
- Provider adapter interface for UrbanPiper and future delivery platforms.
- Import orders and payout statements by API/CSV.
- Match provider orders to Resto orders using external IDs and guarded fallback rules.
- Calculate gross sales, commission, taxes, promotions, refunds, adjustments, and expected payout.
- Exception queue for unmatched orders, amount differences, missing payouts, and duplicate imports.
- Reconciliation periods with review/lock/export workflow.
- Provider profitability by location, platform, item, and period.

## Acceptance
Imports are idempotent; matched totals are reproducible; exceptions explain every difference; locked periods cannot silently change; CSV exports tie to statement totals.
