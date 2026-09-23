/*
  Warnings:

  - A unique constraint covering the columns `[projectId,milestoneDays]` on the table `EmailLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[equipmentId,milestoneDays]` on the table `EmailLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "equipmentId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "pic" TEXT NOT NULL,
    "picEmail" TEXT,
    "ccEmail" TEXT,
    "contractValue" DECIMAL(65,30),
    "startDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3) NOT NULL,
    "actualEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "description" TEXT,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAddendum" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "addendumNumber" TEXT NOT NULL,
    "description" TEXT,
    "previousEndDate" TIMESTAMP(3) NOT NULL,
    "newTargetEndDate" TIMESTAMP(3) NOT NULL,
    "newContractValue" DECIMAL(65,30),
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ProjectAddendum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetNumber" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "categoryId" TEXT NOT NULL,
    "picId" TEXT NOT NULL,
    "ccEmail" TEXT,
    "calibrationNumber" TEXT,
    "calibratedBy" TEXT,
    "lastCalibrationDate" TIMESTAMP(3),
    "nextCalibrationDate" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCategory_name_key" ON "ProjectCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- CreateIndex
CREATE INDEX "Project_categoryId_idx" ON "Project"("categoryId");

-- CreateIndex
CREATE INDEX "Project_targetEndDate_idx" ON "Project"("targetEndDate");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectAddendum_projectId_idx" ON "ProjectAddendum"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategory_name_key" ON "EquipmentCategory"("name");

-- CreateIndex
CREATE INDEX "Equipment_categoryId_idx" ON "Equipment"("categoryId");

-- CreateIndex
CREATE INDEX "Equipment_picId_idx" ON "Equipment"("picId");

-- CreateIndex
CREATE INDEX "Equipment_nextCalibrationDate_idx" ON "Equipment"("nextCalibrationDate");

-- CreateIndex
CREATE INDEX "Equipment_deletedAt_idx" ON "Equipment"("deletedAt");

-- CreateIndex
CREATE INDEX "EmailLog_projectId_idx" ON "EmailLog"("projectId");

-- CreateIndex
CREATE INDEX "EmailLog_equipmentId_idx" ON "EmailLog"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_projectId_milestoneDays_key" ON "EmailLog"("projectId", "milestoneDays");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_equipmentId_milestoneDays_key" ON "EmailLog"("equipmentId", "milestoneDays");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProjectCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAddendum" ADD CONSTRAINT "ProjectAddendum_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_picId_fkey" FOREIGN KEY ("picId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
