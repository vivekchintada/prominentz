-- Customer phone numbers are unique per restaurant, not globally.
DROP INDEX IF EXISTS "Customer_phone_key";
CREATE UNIQUE INDEX "Customer_restaurantId_phone_key"
ON "Customer"("restaurantId", "phone");