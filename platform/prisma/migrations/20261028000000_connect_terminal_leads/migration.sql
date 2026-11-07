-- Stripe Connect: each restaurant gets paid into its own Stripe account.
ALTER TABLE "Restaurant" ADD COLUMN "stripeConnectAccountId" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Restaurant_stripeConnectAccountId_key" ON "Restaurant"("stripeConnectAccountId");

-- Stripe Terminal card readers per location.
ALTER TABLE "Location" ADD COLUMN "stripeTerminalLocationId" TEXT;
ALTER TABLE "Location" ADD COLUMN "stripeReaderId" TEXT;

-- Marketing site demo requests.
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "phone" TEXT,
    "locations" INTEGER,
    "currentPos" TEXT,
    "message" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- Indexes for dinner-rush query paths (Postgres does not index foreign keys automatically).
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "KdsTicketItem_ticketId_idx" ON "KdsTicketItem"("ticketId");
CREATE INDEX IF NOT EXISTS "Order_serverId_status_idx" ON "Order"("serverId", "status");
CREATE INDEX IF NOT EXISTS "KdsTicket_status_createdAt_idx" ON "KdsTicket"("status", "createdAt");
