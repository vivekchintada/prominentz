-- AlterTable
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduleVersion" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "shiftCount" INTEGER NOT NULL DEFAULT 0,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "station" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CoverageRule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "role" "UserRole" NOT NULL,
    "station" TEXT,
    "minStaff" INTEGER NOT NULL DEFAULT 1,
    "targetStaff" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OvertimeRule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dailyThresholdHours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "weeklyThresholdHours" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "overtimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduleVersion_locationId_weekStart_idx" ON "ScheduleVersion"("locationId", "weekStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShiftTemplate_locationId_dayOfWeek_idx" ON "ShiftTemplate"("locationId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CoverageRule_locationId_dayOfWeek_role_station_key" ON "CoverageRule"("locationId", "dayOfWeek", "role", "station");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OvertimeRule_locationId_key" ON "OvertimeRule"("locationId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ScheduleVersion" ADD CONSTRAINT "ScheduleVersion_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "CoverageRule" ADD CONSTRAINT "CoverageRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "OvertimeRule" ADD CONSTRAINT "OvertimeRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
