CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');

ALTER TABLE "Employee"
  ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'PART_TIME',
  ADD COLUMN "maxWeeklyHours" INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN "minRestHours" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "overtimeEligible" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "WorkerAvailability"
  ADD COLUMN "specificDate" TIMESTAMP(3),
  ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Shift"
  ADD COLUMN "station" TEXT,
  ADD COLUMN "hourlyRateSnapshot" DECIMAL(10,2),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishedBy" TEXT;

ALTER TABLE "TimeEntry"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "managerNote" TEXT;

CREATE INDEX "WorkerAvailability_employeeId_dayOfWeek_idx" ON "WorkerAvailability"("employeeId", "dayOfWeek");
CREATE INDEX "WorkerAvailability_employeeId_specificDate_idx" ON "WorkerAvailability"("employeeId", "specificDate");
CREATE INDEX "Shift_locationId_scheduledStart_idx" ON "Shift"("locationId", "scheduledStart");
CREATE INDEX "Shift_employeeId_scheduledStart_idx" ON "Shift"("employeeId", "scheduledStart");
