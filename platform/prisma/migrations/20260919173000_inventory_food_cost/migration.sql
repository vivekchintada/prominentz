-- Inventory and food-cost controls
ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "parStock" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_locationId_name_key"
  ON "InventoryItem"("locationId", "name");

CREATE INDEX IF NOT EXISTS "InventoryItem_locationId_currentStock_idx"
  ON "InventoryItem"("locationId", "currentStock");

ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
