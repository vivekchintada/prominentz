-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'PREFERRED');

-- CreateTable
CREATE TABLE "WorkerAvailability" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "type" "AvailabilityType" NOT NULL DEFAULT 'AVAILABLE',
    "startTime" TEXT,
    "endTime" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerAvailability_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkerAvailability" ADD CONSTRAINT "WorkerAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
