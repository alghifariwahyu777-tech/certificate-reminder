-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "contractValue" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'INTERNAL',
ALTER COLUMN "certificateId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Notification_audience_idx" ON "Notification"("audience");

-- CreateIndex
CREATE INDEX "Notification_applicationId_idx" ON "Notification"("applicationId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
