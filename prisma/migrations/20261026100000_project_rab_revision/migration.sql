-- Target margin per project, account code on RAB lines, RAB revision history
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "targetMarginPct" DOUBLE PRECISION;
ALTER TABLE "ProjectBudgetItem" ADD COLUMN IF NOT EXISTS "accountCode" TEXT;

CREATE TABLE IF NOT EXISTS "ProjectRabRevision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT,
    "fileName" TEXT,
    "contractValue" DECIMAL(65,30),
    "projectCost" DECIMAL(65,30) NOT NULL,
    "contingency" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "overhead" DECIMAL(65,30),
    "operatingProfit" DECIMAL(65,30),
    "marginPct" DOUBLE PRECISION,
    "dataJson" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectRabRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectRabRevision_projectId_version_key" ON "ProjectRabRevision"("projectId", "version");
CREATE INDEX IF NOT EXISTS "ProjectRabRevision_projectId_idx" ON "ProjectRabRevision"("projectId");
DO $$ BEGIN
  ALTER TABLE "ProjectRabRevision" ADD CONSTRAINT "ProjectRabRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
