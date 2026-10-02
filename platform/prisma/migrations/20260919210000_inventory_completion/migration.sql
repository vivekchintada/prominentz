-- AlterEnum
ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_RECEIVED';

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WasteReason" AS ENUM ('SPOILED', 'EXPIRED', 'PREP_MISTAKE', 'DROPPED', 'CUSTOMER_COMPLAINT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WasteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "StockCountSession" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StockCountItem" (
    "id" TEXT NOT NULL,
    "stockCountSessionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "expectedQuantity" DOUBLE PRECISION NOT NULL,
    "countedQuantity" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0.0,
    "varianceCost" DECIMAL(12,4) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WasteLog" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0.0,
    "totalCost" DECIMAL(12,4) NOT NULL DEFAULT 0.0,
    "reason" "WasteReason" NOT NULL DEFAULT 'SPOILED',
    "status" "WasteStatus" NOT NULL DEFAULT 'APPROVED',
    "reportedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StockCountSession_locationId_sessionNumber_key" ON "StockCountSession"("locationId", "sessionNumber");
CREATE INDEX IF NOT EXISTS "StockCountSession_locationId_status_idx" ON "StockCountSession"("locationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StockCountItem_stockCountSessionId_inventoryItemId_key" ON "StockCountItem"("stockCountSessionId", "inventoryItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WasteLog_locationId_createdAt_idx" ON "WasteLog"("locationId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "StockCountSession" ADD CONSTRAINT "StockCountSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "StockCountItem" ADD CONSTRAINT "StockCountItem_stockCountSessionId_fkey" FOREIGN KEY ("stockCountSessionId") REFERENCES "StockCountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "StockCountItem" ADD CONSTRAINT "StockCountItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WasteLog" ADD CONSTRAINT "WasteLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WasteLog" ADD CONSTRAINT "WasteLog_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
