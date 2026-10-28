-- Risk likelihood & category on issues
ALTER TABLE "ProjectIssue" ADD COLUMN IF NOT EXISTS "likelihood" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "ProjectIssue" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- Monthly HSE records
CREATE TABLE IF NOT EXISTS "ProjectHseReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "manHours" INTEGER NOT NULL DEFAULT 0,
    "nearMiss" INTEGER NOT NULL DEFAULT 0,
    "firstAid" INTEGER NOT NULL DEFAULT 0,
    "medicalTreatment" INTEGER NOT NULL DEFAULT 0,
    "lostTimeInjury" INTEGER NOT NULL DEFAULT 0,
    "fatality" INTEGER NOT NULL DEFAULT 0,
    "propertyDamage" INTEGER NOT NULL DEFAULT 0,
    "unsafeObservations" INTEGER NOT NULL DEFAULT 0,
    "safetyTalks" INTEGER NOT NULL DEFAULT 0,
    "inspections" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectHseReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectHseReport_projectId_periodDate_key" ON "ProjectHseReport"("projectId", "periodDate");
CREATE INDEX IF NOT EXISTS "ProjectHseReport_projectId_idx" ON "ProjectHseReport"("projectId");
DO $$ BEGIN
  ALTER TABLE "ProjectHseReport" ADD CONSTRAINT "ProjectHseReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
