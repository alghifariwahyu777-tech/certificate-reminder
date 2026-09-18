/*
  Warnings:

  - A unique constraint covering the columns `[personnelCertificationId,milestoneDays]` on the table `EmailLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "personnelCertificationId" TEXT,
ALTER COLUMN "certificateId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "position" TEXT,
    "departmentId" TEXT,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelCertificationCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonnelCertificationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelCertification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "certificationName" TEXT NOT NULL,
    "certificationNumber" TEXT,
    "issuingBody" TEXT,
    "issueDate" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "ccEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PersonnelCertification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelCertificationCategory_name_key" ON "PersonnelCertificationCategory"("name");

-- CreateIndex
CREATE INDEX "PersonnelCertification_employeeId_idx" ON "PersonnelCertification"("employeeId");

-- CreateIndex
CREATE INDEX "PersonnelCertification_categoryId_idx" ON "PersonnelCertification"("categoryId");

-- CreateIndex
CREATE INDEX "PersonnelCertification_expiryDate_idx" ON "PersonnelCertification"("expiryDate");

-- CreateIndex
CREATE INDEX "PersonnelCertification_deletedAt_idx" ON "PersonnelCertification"("deletedAt");

-- CreateIndex
CREATE INDEX "EmailLog_personnelCertificationId_idx" ON "EmailLog"("personnelCertificationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_personnelCertificationId_milestoneDays_key" ON "EmailLog"("personnelCertificationId", "milestoneDays");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_personnelCertificationId_fkey" FOREIGN KEY ("personnelCertificationId") REFERENCES "PersonnelCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelCertification" ADD CONSTRAINT "PersonnelCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelCertification" ADD CONSTRAINT "PersonnelCertification_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PersonnelCertificationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
