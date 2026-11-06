-- Paket pekerjaan (kontrak turunan) di bawah kontrak induk project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "usePackages" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ProjectPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'SPK',
    "docNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "value" DECIMAL(65,30),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3) NOT NULL,
    "actualEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "notes" TEXT,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectPackage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProjectPackage_projectId_idx" ON "ProjectPackage"("projectId");
DO $$ BEGIN
  ALTER TABLE "ProjectPackage" ADD CONSTRAINT "ProjectPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- kegiatan, termin, RAB, dan biaya dapat ditautkan ke satu paket
ALTER TABLE "ProjectMilestone" ADD COLUMN IF NOT EXISTS "packageId" TEXT;
ALTER TABLE "ProjectTerm" ADD COLUMN IF NOT EXISTS "packageId" TEXT;
ALTER TABLE "ProjectBudgetItem" ADD COLUMN IF NOT EXISTS "packageId" TEXT;
ALTER TABLE "ProjectExpense" ADD COLUMN IF NOT EXISTS "packageId" TEXT;
CREATE INDEX IF NOT EXISTS "ProjectMilestone_packageId_idx" ON "ProjectMilestone"("packageId");
CREATE INDEX IF NOT EXISTS "ProjectTerm_packageId_idx" ON "ProjectTerm"("packageId");
CREATE INDEX IF NOT EXISTS "ProjectBudgetItem_packageId_idx" ON "ProjectBudgetItem"("packageId");
CREATE INDEX IF NOT EXISTS "ProjectExpense_packageId_idx" ON "ProjectExpense"("packageId");
DO $$ BEGIN
  ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProjectPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProjectTerm" ADD CONSTRAINT "ProjectTerm_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProjectPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProjectBudgetItem" ADD CONSTRAINT "ProjectBudgetItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProjectPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProjectExpense" ADD CONSTRAINT "ProjectExpense_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProjectPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
