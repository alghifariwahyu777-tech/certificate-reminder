/*
  Warnings:

  - A unique constraint covering the columns `[personnelCertificationId,type]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,type]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[equipmentId,type]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "equipmentId" TEXT,
ADD COLUMN     "personnelCertificationId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_personnelCertificationId_type_key" ON "Notification"("personnelCertificationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_projectId_type_key" ON "Notification"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_equipmentId_type_key" ON "Notification"("equipmentId", "type");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_personnelCertificationId_fkey" FOREIGN KEY ("personnelCertificationId") REFERENCES "PersonnelCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
