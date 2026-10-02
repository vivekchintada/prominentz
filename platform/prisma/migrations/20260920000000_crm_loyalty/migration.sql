-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PointsLedgerType" AS ENUM ('EARNED_PURCHASE', 'REDEEMED', 'MANUAL_ADJUSTMENT', 'REFUND_REVERSAL', 'WELCOME_BONUS', 'BIRTHDAY_BONUS', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CampaignChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CampaignSegment" AS ENUM ('ALL', 'NEW', 'REPEAT', 'HIGH_VALUE', 'LAPSED', 'BIRTHDAY', 'DIETARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Coupon
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "minimumOrderAmount" DECIMAL(10,2);
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "channels" JSONB NOT NULL DEFAULT '["POS", "ONLINE", "QR"]';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "perCustomerLimit" INTEGER DEFAULT 1;

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingConsentEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingConsentSms" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingConsentWhatsApp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "consentRecordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastVisitAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'POS';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tierId" TEXT;

-- CreateTable LoyaltyConfig
CREATE TABLE IF NOT EXISTS "LoyaltyConfig" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "pointsPerDollar" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "pointsExpiryDays" INTEGER DEFAULT 365,
    "welcomeBonusPoints" INTEGER NOT NULL DEFAULT 0,
    "birthdayBonusPoints" INTEGER NOT NULL DEFAULT 0,
    "minimumRedemptionPoints" INTEGER NOT NULL DEFAULT 100,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable LoyaltyTier
CREATE TABLE IF NOT EXISTS "LoyaltyTier" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minimumSpend" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "pointsMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "perks" JSONB NOT NULL DEFAULT '[]',
    "badgeColor" TEXT NOT NULL DEFAULT '#6366f1',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable PointsLedger
CREATE TABLE IF NOT EXISTS "PointsLedger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "PointsLedgerType" NOT NULL DEFAULT 'EARNED_PURCHASE',
    "pointsChange" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable MarketingCampaign
CREATE TABLE IF NOT EXISTS "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "targetSegment" "CampaignSegment" NOT NULL DEFAULT 'ALL',
    "subject" TEXT,
    "messageBody" TEXT NOT NULL,
    "couponId" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyConfig_restaurantId_key" ON "LoyaltyConfig"("restaurantId");
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyTier_restaurantId_name_key" ON "LoyaltyTier"("restaurantId", "name");
CREATE INDEX IF NOT EXISTS "LoyaltyTier_restaurantId_minimumSpend_idx" ON "LoyaltyTier"("restaurantId", "minimumSpend");
CREATE INDEX IF NOT EXISTS "PointsLedger_customerId_createdAt_idx" ON "PointsLedger"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketingCampaign_restaurantId_status_idx" ON "MarketingCampaign"("restaurantId", "status");
CREATE INDEX IF NOT EXISTS "Customer_restaurantId_lifetimeSpend_idx" ON "Customer"("restaurantId", "lifetimeSpend");
CREATE INDEX IF NOT EXISTS "Customer_tierId_idx" ON "Customer"("tierId");

-- AddForeignKeys
DO $$ BEGIN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "LoyaltyConfig" ADD CONSTRAINT "LoyaltyConfig_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
