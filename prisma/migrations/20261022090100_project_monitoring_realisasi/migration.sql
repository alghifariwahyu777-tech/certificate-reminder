-- Project Monitoring — realisasi: milestones, planned/actual progress (Kurva S),
-- payment terms, budget vs actual cost, issues/risks, alert dedup log,
-- plus monitoring thresholds on AppSettings.

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "projectDeviationWarning" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN "projectDeviationCritical" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN "projectProgressStaleDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN "projectInvoiceOverdueDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plannedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProgressPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "plannedPercent" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ProjectProgressPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProgressReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "actualPercent" DECIMAL(65,30) NOT NULL,
    "summary" TEXT,
    "nextPlan" TEXT,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTerm" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "percent" DECIMAL(65,30),
    "amount" DECIMAL(65,30) NOT NULL,
    "requirement" TEXT,
    "plannedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(65,30),
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBudgetItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectBudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectExpense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectIssue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ISSUE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "impact" TEXT NOT NULL DEFAULT 'MEDIUM',
    "owner" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAlertLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "cc" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectProgressPlan_projectId_periodDate_key" ON "ProjectProgressPlan"("projectId", "periodDate");

-- CreateIndex
CREATE INDEX "ProjectProgressPlan_projectId_idx" ON "ProjectProgressPlan"("projectId");

-- CreateIndex
CREATE INDEX "ProjectProgressReport_projectId_idx" ON "ProjectProgressReport"("projectId");

-- CreateIndex
CREATE INDEX "ProjectProgressReport_reportDate_idx" ON "ProjectProgressReport"("reportDate");

-- CreateIndex
CREATE INDEX "ProjectTerm_projectId_idx" ON "ProjectTerm"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTerm_status_idx" ON "ProjectTerm"("status");

-- CreateIndex
CREATE INDEX "ProjectBudgetItem_projectId_idx" ON "ProjectBudgetItem"("projectId");

-- CreateIndex
CREATE INDEX "ProjectExpense_projectId_idx" ON "ProjectExpense"("projectId");

-- CreateIndex
CREATE INDEX "ProjectIssue_projectId_idx" ON "ProjectIssue"("projectId");

-- CreateIndex
CREATE INDEX "ProjectIssue_status_idx" ON "ProjectIssue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAlertLog_projectId_alertType_refKey_key" ON "ProjectAlertLog"("projectId", "alertType", "refKey");

-- CreateIndex
CREATE INDEX "ProjectAlertLog_projectId_idx" ON "ProjectAlertLog"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProgressPlan" ADD CONSTRAINT "ProjectProgressPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProgressReport" ADD CONSTRAINT "ProjectProgressReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTerm" ADD CONSTRAINT "ProjectTerm_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetItem" ADD CONSTRAINT "ProjectBudgetItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectExpense" ADD CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAlertLog" ADD CONSTRAINT "ProjectAlertLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
