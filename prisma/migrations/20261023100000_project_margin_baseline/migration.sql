-- Triple constraint & margin monitoring: project baseline, expense cause +
-- Excel import key, margin figures in weekly snapshots, margin alert threshold.

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "projectMarginDropAlert" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "baselineLockedAt" TIMESTAMP(3),
ADD COLUMN "baselineLockedBy" TEXT,
ADD COLUMN "baselineContractValue" DECIMAL(65,30),
ADD COLUMN "baselineBudget" DECIMAL(65,30),
ADD COLUMN "baselineBudgetJson" TEXT,
ADD COLUMN "baselineEndDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectExpense" ADD COLUMN "cause" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "referenceNo" TEXT,
ADD COLUMN "importKey" TEXT;

-- AlterTable
ALTER TABLE "ProjectSnapshot" ADD COLUMN "cpi" DOUBLE PRECISION,
ADD COLUMN "actualMarginPct" DOUBLE PRECISION,
ADD COLUMN "forecastMarginPct" DOUBLE PRECISION,
ADD COLUMN "plannedMarginPct" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectExpense_projectId_importKey_key" ON "ProjectExpense"("projectId", "importKey");
