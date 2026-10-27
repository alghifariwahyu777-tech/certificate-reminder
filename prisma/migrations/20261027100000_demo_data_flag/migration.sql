-- One-time automatic demo data for the Project module
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "demoDataSeededAt" TIMESTAMP(3);
