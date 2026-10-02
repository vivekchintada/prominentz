# Module 3 — Online-ordering production hardening

## Goal
Finish the 3A–3C MVP for production traffic.

## Implement
- Stripe Elements customer card-confirmation UI and payment-failure recovery.
- Signed webhook replay protection with stored Stripe event IDs.
- Real maps/geocoding provider adapter and server-side delivery-distance validation.
- Weekly ordering hours, holiday closures, slot capacity, and timezone-safe validation.
- Scheduled-order worker/cron deployment with locking and retry safety.
- Refund workflow for rejected prepaid orders.
- Rate limiting, bot protection, abandoned-draft expiry, and structured audit events.
- Customer receipts and optional SMS/email notifications.
- End-to-end tests for pickup, delivery, QR dine-in, modifiers, payment, rejection/refund, KDS routing, and inventory depletion.

## Acceptance
No client-supplied prices are trusted; duplicate requests/webhooks create no duplicates; out-of-radius delivery is rejected; scheduled orders release once; rejected prepaid orders are refunded and audited.
