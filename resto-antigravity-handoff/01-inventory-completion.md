# Module 1 — Inventory completion

## Goal
Turn the existing inventory MVP into daily restaurant inventory operations.

## Implement
- Recipe editor connecting menu items to ingredients and portion quantities.
- Stock count sessions with expected, counted, and variance quantities.
- Supplier management and purchase-order create/send/receive workflow.
- Partial PO receiving with unit-cost updates and inventory transactions.
- Waste reasons, approvals, and waste-cost reporting.
- Theoretical versus actual usage and variance by ingredient/menu item.
- Ingredient cost history and recipe-cost recalculation.
- Low-stock suggestions using par stock, lead time, and recent consumption.
- CSV import/export for ingredients, recipes, suppliers, and stock counts.

## Primary UI
`/dashboard/inventory`, `/dashboard/inventory/counts`, `/dashboard/inventory/purchase-orders`, `/dashboard/inventory/recipes`, `/dashboard/inventory/suppliers`.

## Acceptance
Receiving a PO increases stock exactly once; selling an item depletes its recipe exactly once; a stock count posts auditable adjustments; menu food cost updates when ingredient cost changes; location isolation and manager permissions are tested.
