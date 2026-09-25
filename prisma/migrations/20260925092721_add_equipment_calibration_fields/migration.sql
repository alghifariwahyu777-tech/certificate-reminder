-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "calibrationInterval" TEXT,
ADD COLUMN     "calibrationType" TEXT,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "measurementRange" TEXT,
ADD COLUMN     "ownerUnit" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "usageStatus" TEXT;
