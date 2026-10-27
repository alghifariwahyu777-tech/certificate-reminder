-- Batch 2: PIC progress updates, weekly snapshots, project close-out,
-- personnel mapping (SDB), weekly management report settings + mailing log.

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "weeklyReportRecipients" TEXT,
ADD COLUMN "weeklyReportDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "picUpdateRequestEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "picUpdateRequestDay" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ProjectSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "plannedPercent" DOUBLE PRECISION NOT NULL,
    "actualPercent" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION NOT NULL,
    "spi" DOUBLE PRECISION,
    "health" TEXT NOT NULL,
    "invoiced" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openIssues" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCloseout" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "bappDate" TIMESTAMP(3),
    "bastDate" TIMESTAMP(3),
    "finalReportDate" TIMESTAMP(3),
    "satisfaction" INTEGER,
    "lessonsLearned" TEXT,
    "notes" TEXT,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCloseout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailingLog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSnapshot_projectId_weekKey_key" ON "ProjectSnapshot"("projectId", "weekKey");

-- CreateIndex
CREATE INDEX "ProjectSnapshot_weekKey_idx" ON "ProjectSnapshot"("weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCloseout_projectId_key" ON "ProjectCloseout"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_projectId_employeeId_role_key" ON "ProjectAssignment"("projectId", "employeeId", "role");

-- CreateIndex
CREATE INDEX "ProjectAssignment_employeeId_idx" ON "ProjectAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "ProjectAssignment_projectId_idx" ON "ProjectAssignment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MailingLog_key_key" ON "MailingLog"("key");

-- AddForeignKey
ALTER TABLE "ProjectSnapshot" ADD CONSTRAINT "ProjectSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCloseout" ADD CONSTRAINT "ProjectCloseout_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
