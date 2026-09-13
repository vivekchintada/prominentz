-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING_PEER', 'PENDING_MANAGER', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShiftTradeRequest" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetEmployeeId" TEXT,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING_PEER',
    "reason" TEXT,
    "managerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTradeRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShiftTradeRequest" ADD CONSTRAINT "ShiftTradeRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTradeRequest" ADD CONSTRAINT "ShiftTradeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTradeRequest" ADD CONSTRAINT "ShiftTradeRequest_targetEmployeeId_fkey" FOREIGN KEY ("targetEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
