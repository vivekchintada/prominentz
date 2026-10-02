-- Migration: void_cascade_sync
-- Aligns kitchen (KDS) status with the order void lifecycle.

-- 1. Add VOIDED to OrderItemStatus enum
ALTER TYPE "OrderItemStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- 2. Add VOIDED to TicketStatus enum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- 3. Add VOIDED to TicketItemStatus enum
ALTER TYPE "TicketItemStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- 4. Add voidedAt column to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);

-- 5. Drop old FK on KdsTicket (without cascade) and re-add with Cascade
ALTER TABLE "KdsTicket" DROP CONSTRAINT IF EXISTS "KdsTicket_orderId_fkey";
ALTER TABLE "KdsTicket"
  ADD CONSTRAINT "KdsTicket_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Drop old FK on KdsTicketItem (without cascade) and re-add with Cascade
ALTER TABLE "KdsTicketItem" DROP CONSTRAINT IF EXISTS "KdsTicketItem_ticketId_fkey";
ALTER TABLE "KdsTicketItem"
  ADD CONSTRAINT "KdsTicketItem_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "KdsTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Create OrderVoid table
CREATE TABLE IF NOT EXISTS "OrderVoid" (
    "id"        TEXT NOT NULL,
    "orderId"   TEXT NOT NULL,
    "voidedBy"  TEXT NOT NULL,
    "reason"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderVoid_pkey" PRIMARY KEY ("id")
);

-- 8. Unique constraint: one void record per order
ALTER TABLE "OrderVoid" ADD CONSTRAINT "OrderVoid_orderId_key" UNIQUE ("orderId");

-- 9. FK: OrderVoid → Order
ALTER TABLE "OrderVoid"
  ADD CONSTRAINT "OrderVoid_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 10. FK: OrderVoid → User
ALTER TABLE "OrderVoid"
  ADD CONSTRAINT "OrderVoid_voidedBy_fkey"
  FOREIGN KEY ("voidedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 11. Index for KdsTicket status queries
CREATE INDEX IF NOT EXISTS "KdsTicket_orderId_status_idx" ON "KdsTicket"("orderId", "status");

-- 12. Index for Order status + time queries
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
