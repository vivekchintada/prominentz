-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundAmount" DECIMAL(10,2);

-- CreateTable StripeEventLog
CREATE TABLE IF NOT EXISTS "StripeEventLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex StripeEventLog
CREATE UNIQUE INDEX IF NOT EXISTS "StripeEventLog_eventId_key" ON "StripeEventLog"("eventId");
CREATE INDEX IF NOT EXISTS "StripeEventLog_eventId_idx" ON "StripeEventLog"("eventId");

-- CreateTable OrderingHoliday
CREATE TABLE IF NOT EXISTS "OrderingHoliday" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderingHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex OrderingHoliday
CREATE UNIQUE INDEX IF NOT EXISTS "OrderingHoliday_locationId_date_key" ON "OrderingHoliday"("locationId", "date");
CREATE INDEX IF NOT EXISTS "OrderingHoliday_locationId_date_idx" ON "OrderingHoliday"("locationId", "date");

-- AddForeignKey OrderingHoliday
DO $$ BEGIN
    ALTER TABLE "OrderingHoliday" ADD CONSTRAINT "OrderingHoliday_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
