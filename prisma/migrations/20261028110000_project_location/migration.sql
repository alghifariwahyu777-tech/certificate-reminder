-- Project location for the portfolio map
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "province" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
