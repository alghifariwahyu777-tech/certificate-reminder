-- Realisasi harian per kegiatan (milestone)
CREATE TABLE IF NOT EXISTS "ProjectMilestoneProgress" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "percent" DECIMAL(65,30) NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectMilestoneProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMilestoneProgress_milestoneId_date_key" ON "ProjectMilestoneProgress"("milestoneId", "date");
CREATE INDEX IF NOT EXISTS "ProjectMilestoneProgress_projectId_idx" ON "ProjectMilestoneProgress"("projectId");
DO $$ BEGIN
  ALTER TABLE "ProjectMilestoneProgress" ADD CONSTRAINT "ProjectMilestoneProgress_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Laporan progres yang dibuat dari realisasi per kegiatan
ALTER TABLE "ProjectProgressReport" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- Peran PIC lapangan dihapus: akun PIC menjadi Viewer
UPDATE "User" SET "role" = 'VIEWER' WHERE "role" = 'PIC';
