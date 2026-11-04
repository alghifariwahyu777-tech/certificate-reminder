-- Gantt per project: planned and actual start of each milestone (finish dates already exist).
ALTER TABLE "ProjectMilestone" ADD COLUMN IF NOT EXISTS "plannedStartDate" TIMESTAMP(3);
ALTER TABLE "ProjectMilestone" ADD COLUMN IF NOT EXISTS "actualStartDate" TIMESTAMP(3);
