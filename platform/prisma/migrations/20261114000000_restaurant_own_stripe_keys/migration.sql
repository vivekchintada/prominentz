-- Restaurants bring their own Stripe key instead of Stripe Connect.
CREATE TABLE "RestaurantStripeKeys" (
    "restaurantId" TEXT NOT NULL,
    "secretKeyEnc" TEXT NOT NULL,
    "keyLast4" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT,
    "country" TEXT,
    "webhookEndpointId" TEXT,
    "webhookSecretEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RestaurantStripeKeys_pkey" PRIMARY KEY ("restaurantId")
);

ALTER TABLE "RestaurantStripeKeys" ADD CONSTRAINT "RestaurantStripeKeys_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Charges made through Connect accounts can no longer be reached; card payments stay off until
-- each owner saves their own key.
UPDATE "Restaurant" SET "stripeChargesEnabled" = false WHERE "stripeChargesEnabled" = true;
