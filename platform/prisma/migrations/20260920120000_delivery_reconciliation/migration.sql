-- Migration: 20260920120000_delivery_reconciliation
-- Module 5 — Delivery Reconciliation schema

CREATE TYPE "ReconciliationStatus" AS ENUM ('OPEN', 'REVIEWING', 'LOCKED', 'EXPORTED');
CREATE TYPE "ExceptionType" AS ENUM ('UNMATCHED_ORDER', 'AMOUNT_DIFF', 'MISSING_PAYOUT', 'DUPLICATE_IMPORT');

CREATE TABLE "DeliveryProvider" (
    "id"            TEXT NOT NULL,
    "locationId"    TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "apiKey"        TEXT,
    "webhookSecret" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryProvider_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryProvider_locationId_slug_key" ON "DeliveryProvider"("locationId", "slug");
CREATE INDEX "DeliveryProvider_locationId_idx" ON "DeliveryProvider"("locationId");

CREATE TABLE "DeliveryStatement" (
    "id"               TEXT NOT NULL,
    "providerId"       TEXT NOT NULL,
    "locationId"       TEXT NOT NULL,
    "periodStart"      TIMESTAMP(3) NOT NULL,
    "periodEnd"        TIMESTAMP(3) NOT NULL,
    "rawCsvHash"       TEXT NOT NULL,
    "importedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedBy"       TEXT,
    "totalGross"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTax"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRefunds"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAdjustments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedPayout"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineCount"        INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DeliveryStatement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeliveryStatement_prov_period_idx" ON "DeliveryStatement"("providerId", "periodStart", "periodEnd");
CREATE INDEX "DeliveryStatement_loc_period_idx" ON "DeliveryStatement"("locationId", "periodStart");

CREATE TABLE "DeliveryStatementLine" (
    "id"              TEXT NOT NULL,
    "statementId"     TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "restoOrderId"    TEXT,
    "matchedAt"       TIMESTAMP(3),
    "orderDate"       TIMESTAMP(3) NOT NULL,
    "customerName"    TEXT,
    "itemsJson"       TEXT,
    "grossAmount"     DOUBLE PRECISION NOT NULL,
    "commission"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax"             DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promotionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustment"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount"       DOUBLE PRECISION NOT NULL,
    "paymentMethod"   TEXT,
    "status"          TEXT,
    CONSTRAINT "DeliveryStatementLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryStatementLine_stmt_ext_key" ON "DeliveryStatementLine"("statementId", "externalOrderId");
CREATE INDEX "DeliveryStatementLine_statementId_idx" ON "DeliveryStatementLine"("statementId");
CREATE INDEX "DeliveryStatementLine_externalOrderId_idx" ON "DeliveryStatementLine"("externalOrderId");
CREATE INDEX "DeliveryStatementLine_restoOrderId_idx" ON "DeliveryStatementLine"("restoOrderId");

CREATE TABLE "ReconciliationPeriod" (
    "id"             TEXT NOT NULL,
    "locationId"     TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "periodStart"    TIMESTAMP(3) NOT NULL,
    "periodEnd"      TIMESTAMP(3) NOT NULL,
    "status"         "ReconciliationStatus" NOT NULL DEFAULT 'OPEN',
    "lockedAt"       TIMESTAMP(3),
    "lockedBy"       TEXT,
    "exportedAt"     TIMESTAMP(3),
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "totalGross"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTax"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRefunds"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNet"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchedCount"   INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
    "exceptionCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReconciliationPeriod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReconciliationPeriod_loc_start_idx" ON "ReconciliationPeriod"("locationId", "periodStart");
CREATE INDEX "ReconciliationPeriod_loc_status_idx" ON "ReconciliationPeriod"("locationId", "status");

CREATE TABLE "ReconciliationPeriodStatement" (
    "periodId"    TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    CONSTRAINT "ReconciliationPeriodStatement_pkey" PRIMARY KEY ("periodId", "statementId")
);

CREATE TABLE "ReconciliationException" (
    "id"             TEXT NOT NULL,
    "periodId"       TEXT NOT NULL,
    "lineId"         TEXT,
    "type"           "ExceptionType" NOT NULL,
    "description"    TEXT NOT NULL,
    "amount"         DOUBLE PRECISION,
    "isResolved"     BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt"     TIMESTAMP(3),
    "resolvedBy"     TEXT,
    "resolutionNote" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReconciliationException_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReconciliationException_period_resolved_idx" ON "ReconciliationException"("periodId", "isResolved");
CREATE INDEX "ReconciliationException_period_type_idx" ON "ReconciliationException"("periodId", "type");

ALTER TABLE "DeliveryProvider" ADD CONSTRAINT "DeliveryProvider_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryStatement" ADD CONSTRAINT "DeliveryStatement_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DeliveryProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryStatement" ADD CONSTRAINT "DeliveryStatement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryStatementLine" ADD CONSTRAINT "DeliveryStatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "DeliveryStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReconciliationPeriod" ADD CONSTRAINT "ReconciliationPeriod_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReconciliationPeriodStatement" ADD CONSTRAINT "ReconPeriodStmt_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReconciliationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReconciliationPeriodStatement" ADD CONSTRAINT "ReconPeriodStmt_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "DeliveryStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReconciliationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
