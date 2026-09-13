/*
  Warnings:

  - You are about to drop the column `is86d` on the `AvailabilityLog` table. All the data in the column will be lost.
  - You are about to drop the column `priceDelta` on the `ModifierOption` table. All the data in the column will be lost.
  - Added the required column `action` to the `AvailabilityLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurantId` to the `MenuCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MenuCategory" DROP CONSTRAINT "MenuCategory_locationId_fkey";

-- DropForeignKey
ALTER TABLE "MenuModifier" DROP CONSTRAINT "MenuModifier_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "ModifierOption" DROP CONSTRAINT "ModifierOption_modifierId_fkey";

-- AlterTable
ALTER TABLE "AvailabilityLog" DROP COLUMN "is86d",
ADD COLUMN     "action" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "restaurantId" TEXT NOT NULL,
ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MenuModifier" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ModifierOption" DROP COLUMN "priceDelta",
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priceAdjustment" DECIMAL(10,2) NOT NULL DEFAULT 0.0;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuModifier" ADD CONSTRAINT "MenuModifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "MenuModifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
