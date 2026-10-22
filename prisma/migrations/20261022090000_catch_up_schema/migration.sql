-- Catch-up migration (idempotent).
--
-- prisma/migrations only contained `init`, while schema.prisma had grown by
-- ~14 models (Employee, Project, Equipment, Supervisor, ...) and new columns
-- on existing tables — those were most likely applied with `prisma db push`.
-- Every statement below is guarded (IF NOT EXISTS / DROP NOT NULL / a
-- pg_constraint check), so:
--   * on a database that already has these objects (production) it is a no-op;
--   * on a fresh database it brings the schema fully up to date after `init`.
-- It only ever ADDS objects or relaxes NOT NULL; it never drops or rewrites data.

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientUser" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "certificateName" TEXT NOT NULL,
    "issuingBody" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validFrom" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "storageLocation" TEXT,
    "pic" TEXT NOT NULL,
    "picEmail" TEXT,
    "ccEmail" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "categoryId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "departmentId" TEXT,
    "applicationId" TEXT,
    "serviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Renewal" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousNumber" TEXT NOT NULL,
    "previousExpiryDate" TIMESTAMP(3) NOT NULL,
    "newCertificateNumber" TEXT NOT NULL,
    "newValidFrom" TIMESTAMP(3),
    "newExpiryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "fileMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Renewal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "mode" TEXT NOT NULL DEFAULT 'SIMPLE',
    "subject" TEXT NOT NULL,
    "companyName" TEXT,
    "systemName" TEXT,
    "greeting" TEXT,
    "introText" TEXT,
    "closingText" TEXT,
    "buttonText" TEXT,
    "footerText" TEXT,
    "bodyHtml" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT,
    "personnelCertificationId" TEXT,
    "projectId" TEXT,
    "equipmentId" TEXT,
    "milestoneDays" INTEGER NOT NULL,
    "recipient" TEXT NOT NULL,
    "cc" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT,
    "personnelCertificationId" TEXT,
    "projectId" TEXT,
    "equipmentId" TEXT,
    "applicationId" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'INTERNAL',
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresAudit" BOOLEAN NOT NULL DEFAULT true,
    "requiresSurveillance" BOOLEAN NOT NULL DEFAULT false,
    "surveillanceCount" INTEGER,
    "surveillanceIntervalMonths" INTEGER,
    "estimatedProcessingDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ServiceRequirement" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "allowedFileTypes" TEXT NOT NULL DEFAULT 'pdf,jpg,png',
    "maxFileSizeMB" INTEGER NOT NULL DEFAULT 10,
    "templateUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkflowStage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stageType" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "slaDays" INTEGER,
    "picRole" TEXT,
    "clientVisible" BOOLEAN NOT NULL DEFAULT true,
    "clientDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPosition" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "contractValue" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "serviceRequirementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileUrl" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "reviewComment" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApplicationStage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "workflowStageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "picName" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Surveillance" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "completedDate" TIMESTAMP(3),
    "picName" TEXT,
    "notes" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surveillance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Employee" (
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
CREATE TABLE IF NOT EXISTS "PersonnelCertificationCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonnelCertificationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PersonnelCertification" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "adminWhatsappNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Project" (
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
CREATE TABLE IF NOT EXISTS "ProjectAddendum" (
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
CREATE TABLE IF NOT EXISTS "EquipmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetNumber" TEXT,
    "serialNumber" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "categoryId" TEXT NOT NULL,
    "picId" TEXT NOT NULL,
    "ccEmail" TEXT,
    "condition" TEXT,
    "usageStatus" TEXT,
    "ownerUnit" TEXT,
    "calibrationNumber" TEXT,
    "calibratedBy" TEXT,
    "calibrationType" TEXT,
    "calibrationInterval" TEXT,
    "measurementRange" TEXT,
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "Supervisor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supervisor_pkey" PRIMARY KEY ("id")
);

-- AddMissingColumns (tables that already existed before this migration)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "User" ALTER COLUMN "resetToken" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);
ALTER TABLE "User" ALTER COLUMN "resetTokenExpiry" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "Client" ALTER COLUMN "contactPerson" DROP NOT NULL;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Client" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Client" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Client" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "clientId" TEXT NOT NULL;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "ClientUser" ALTER COLUMN "resetToken" DROP NOT NULL;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);
ALTER TABLE "ClientUser" ALTER COLUMN "resetTokenExpiry" DROP NOT NULL;
ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "certificateNumber" TEXT NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "certificateName" TEXT NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "issuingBody" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "issuingBody" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "issueDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3);
ALTER TABLE "Certificate" ALTER COLUMN "validFrom" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "storageLocation" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "storageLocation" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "pic" TEXT NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "picEmail" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "picEmail" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "ccEmail" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "ccEmail" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "driveFileId" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "fileMimeType" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "categoryId" TEXT NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "clientId" TEXT NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "departmentId" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "applicationId" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "applicationId" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "Certificate" ALTER COLUMN "serviceId" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Certificate" ALTER COLUMN "deletedAt" DROP NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "certificateId" TEXT NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "renewalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "previousNumber" TEXT NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "previousExpiryDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "newCertificateNumber" TEXT NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "newValidFrom" TIMESTAMP(3);
ALTER TABLE "Renewal" ALTER COLUMN "newValidFrom" DROP NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "newExpiryDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Renewal" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "Renewal" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
ALTER TABLE "Renewal" ALTER COLUMN "driveFileId" DROP NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT;
ALTER TABLE "Renewal" ALTER COLUMN "fileMimeType" DROP NOT NULL;
ALTER TABLE "Renewal" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'SIMPLE';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "companyName" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "systemName" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "systemName" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "greeting" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "greeting" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "introText" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "introText" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "closingText" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "closingText" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "buttonText" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "buttonText" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "footerText" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "footerText" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "bodyHtml" DROP NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "updatedBy" DROP NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "certificateId" TEXT;
ALTER TABLE "EmailLog" ALTER COLUMN "certificateId" DROP NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "personnelCertificationId" TEXT;
ALTER TABLE "EmailLog" ALTER COLUMN "personnelCertificationId" DROP NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "EmailLog" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "equipmentId" TEXT;
ALTER TABLE "EmailLog" ALTER COLUMN "equipmentId" DROP NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "milestoneDays" INTEGER NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "recipient" TEXT NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "cc" TEXT;
ALTER TABLE "EmailLog" ALTER COLUMN "cc" DROP NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "EmailLog" ALTER COLUMN "errorMessage" DROP NOT NULL;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userName" TEXT NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "AuditLog" ALTER COLUMN "entityId" DROP NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "certificateId" TEXT;
ALTER TABLE "Notification" ALTER COLUMN "certificateId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "personnelCertificationId" TEXT;
ALTER TABLE "Notification" ALTER COLUMN "personnelCertificationId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Notification" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "equipmentId" TEXT;
ALTER TABLE "Notification" ALTER COLUMN "equipmentId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "applicationId" TEXT;
ALTER TABLE "Notification" ALTER COLUMN "applicationId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Service" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "requiresAudit" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "requiresSurveillance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "surveillanceCount" INTEGER;
ALTER TABLE "Service" ALTER COLUMN "surveillanceCount" DROP NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "surveillanceIntervalMonths" INTEGER;
ALTER TABLE "Service" ALTER COLUMN "surveillanceIntervalMonths" DROP NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "estimatedProcessingDays" INTEGER;
ALTER TABLE "Service" ALTER COLUMN "estimatedProcessingDays" DROP NOT NULL;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "DocumentType" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "DocumentType" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "DocumentType" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "DocumentType" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "DocumentType" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "serviceId" TEXT NOT NULL;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "documentTypeId" TEXT NOT NULL;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "mandatory" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "allowedFileTypes" TEXT NOT NULL DEFAULT 'pdf,jpg,png';
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "maxFileSizeMB" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "templateUrl" TEXT;
ALTER TABLE "ServiceRequirement" ALTER COLUMN "templateUrl" DROP NOT NULL;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceRequirement" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "serviceId" TEXT NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "stageType" TEXT NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "slaDays" INTEGER;
ALTER TABLE "WorkflowStage" ALTER COLUMN "slaDays" DROP NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "picRole" TEXT;
ALTER TABLE "WorkflowStage" ALTER COLUMN "picRole" DROP NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "clientVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "clientDescription" TEXT;
ALTER TABLE "WorkflowStage" ALTER COLUMN "clientDescription" DROP NOT NULL;
ALTER TABLE "WorkflowStage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "applicationNumber" TEXT NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "clientId" TEXT NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "serviceId" TEXT NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "contactName" TEXT NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "contactPosition" TEXT;
ALTER TABLE "Application" ALTER COLUMN "contactPosition" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Application" ALTER COLUMN "contactEmail" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Application" ALTER COLUMN "contactPhone" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Application" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Application" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "contractValue" DECIMAL(65,30);
ALTER TABLE "Application" ALTER COLUMN "contractValue" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Application" ALTER COLUMN "submittedAt" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "applicationId" TEXT NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "serviceRequirementId" TEXT NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'UPLOADED';
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
ALTER TABLE "ApplicationDocument" ALTER COLUMN "reviewComment" DROP NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
ALTER TABLE "ApplicationDocument" ALTER COLUMN "reviewedBy" DROP NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "ApplicationDocument" ALTER COLUMN "reviewedAt" DROP NOT NULL;
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "applicationId" TEXT NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "workflowStageId" TEXT NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "ApplicationStage" ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "targetDate" TIMESTAMP(3);
ALTER TABLE "ApplicationStage" ALTER COLUMN "targetDate" DROP NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "completedDate" TIMESTAMP(3);
ALTER TABLE "ApplicationStage" ALTER COLUMN "completedDate" DROP NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "picName" TEXT;
ALTER TABLE "ApplicationStage" ALTER COLUMN "picName" DROP NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "internalNote" TEXT;
ALTER TABLE "ApplicationStage" ALTER COLUMN "internalNote" DROP NOT NULL;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ApplicationStage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "certificateId" TEXT NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "sequenceNumber" INTEGER NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "scheduledDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "completedDate" TIMESTAMP(3);
ALTER TABLE "Surveillance" ALTER COLUMN "completedDate" DROP NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "picName" TEXT;
ALTER TABLE "Surveillance" ALTER COLUMN "picName" DROP NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Surveillance" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "result" TEXT;
ALTER TABLE "Surveillance" ALTER COLUMN "result" DROP NOT NULL;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Surveillance" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "Employee" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "Employee" ALTER COLUMN "position" DROP NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Employee" ALTER COLUMN "departmentId" DROP NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "PersonnelCertificationCategory" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "PersonnelCertificationCategory" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "PersonnelCertificationCategory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "employeeId" TEXT NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "categoryId" TEXT NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "certificationName" TEXT NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "certificationNumber" TEXT;
ALTER TABLE "PersonnelCertification" ALTER COLUMN "certificationNumber" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "issuingBody" TEXT;
ALTER TABLE "PersonnelCertification" ALTER COLUMN "issuingBody" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "issueDate" TIMESTAMP(3);
ALTER TABLE "PersonnelCertification" ALTER COLUMN "issueDate" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3);
ALTER TABLE "PersonnelCertification" ALTER COLUMN "validFrom" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "PersonnelCertification" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
ALTER TABLE "PersonnelCertification" ALTER COLUMN "driveFileId" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT;
ALTER TABLE "PersonnelCertification" ALTER COLUMN "fileMimeType" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "ccEmail" TEXT;
ALTER TABLE "PersonnelCertification" ALTER COLUMN "ccEmail" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "PersonnelCertification" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "PersonnelCertification" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "PersonnelCertification" ALTER COLUMN "deletedAt" DROP NOT NULL;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "adminWhatsappNumber" TEXT;
ALTER TABLE "AppSettings" ALTER COLUMN "adminWhatsappNumber" DROP NOT NULL;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "ProjectCategory" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "ProjectCategory" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "ProjectCategory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectNumber" TEXT NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectName" TEXT NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "categoryId" TEXT NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "clientName" TEXT NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "pic" TEXT NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "picEmail" TEXT;
ALTER TABLE "Project" ALTER COLUMN "picEmail" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ccEmail" TEXT;
ALTER TABLE "Project" ALTER COLUMN "ccEmail" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "contractValue" DECIMAL(65,30);
ALTER TABLE "Project" ALTER COLUMN "contractValue" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "targetEndDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "actualEndDate" TIMESTAMP(3);
ALTER TABLE "Project" ALTER COLUMN "actualEndDate" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ONGOING';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Project" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "Project" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
ALTER TABLE "Project" ALTER COLUMN "driveFileId" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT;
ALTER TABLE "Project" ALTER COLUMN "fileMimeType" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Project" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Project" ALTER COLUMN "deletedAt" DROP NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "projectId" TEXT NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "addendumNumber" TEXT NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ProjectAddendum" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "previousEndDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "newTargetEndDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "newContractValue" DECIMAL(65,30);
ALTER TABLE "ProjectAddendum" ALTER COLUMN "newContractValue" DROP NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "ProjectAddendum" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
ALTER TABLE "ProjectAddendum" ALTER COLUMN "driveFileId" DROP NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT;
ALTER TABLE "ProjectAddendum" ALTER COLUMN "fileMimeType" DROP NOT NULL;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProjectAddendum" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "ProjectAddendum" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "EquipmentCategory" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "EquipmentCategory" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "EquipmentCategory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "assetNumber" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "assetNumber" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "serialNumber" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "brand" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "model" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "color" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "categoryId" TEXT NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "picId" TEXT NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "ccEmail" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "ccEmail" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "condition" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "condition" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "usageStatus" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "usageStatus" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "ownerUnit" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "ownerUnit" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "calibrationNumber" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "calibrationNumber" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "calibratedBy" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "calibratedBy" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "calibrationType" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "calibrationType" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "calibrationInterval" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "calibrationInterval" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "measurementRange" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "measurementRange" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "lastCalibrationDate" TIMESTAMP(3);
ALTER TABLE "Equipment" ALTER COLUMN "lastCalibrationDate" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "nextCalibrationDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "fileUrl" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "driveFileId" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "fileMimeType" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Equipment" ALTER COLUMN "notes" DROP NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Equipment" ALTER COLUMN "deletedAt" DROP NOT NULL;
ALTER TABLE "Supervisor" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
ALTER TABLE "Supervisor" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "Supervisor" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL;
ALTER TABLE "Supervisor" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "Supervisor" ALTER COLUMN "position" DROP NOT NULL;
ALTER TABLE "Supervisor" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Supervisor" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Supervisor" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientUser_email_key" ON "ClientUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientUser_resetToken_key" ON "ClientUser"("resetToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientUser_clientId_idx" ON "ClientUser"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_applicationId_key" ON "Certificate"("applicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Certificate_categoryId_idx" ON "Certificate"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Certificate_clientId_idx" ON "Certificate"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Certificate_departmentId_idx" ON "Certificate"("departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Certificate_expiryDate_idx" ON "Certificate"("expiryDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Certificate_deletedAt_idx" ON "Certificate"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Certificate_serviceId_idx" ON "Certificate"("serviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Renewal_certificateId_idx" ON "Renewal"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailLog_certificateId_milestoneDays_key" ON "EmailLog"("certificateId", "milestoneDays");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailLog_personnelCertificationId_milestoneDays_key" ON "EmailLog"("personnelCertificationId", "milestoneDays");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailLog_projectId_milestoneDays_key" ON "EmailLog"("projectId", "milestoneDays");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailLog_equipmentId_milestoneDays_key" ON "EmailLog"("equipmentId", "milestoneDays");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailLog_certificateId_idx" ON "EmailLog"("certificateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailLog_personnelCertificationId_idx" ON "EmailLog"("personnelCertificationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailLog_projectId_idx" ON "EmailLog"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailLog_equipmentId_idx" ON "EmailLog"("equipmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_certificateId_type_key" ON "Notification"("certificateId", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_personnelCertificationId_type_key" ON "Notification"("personnelCertificationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_projectId_type_key" ON "Notification"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_equipmentId_type_key" ON "Notification"("equipmentId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_audience_idx" ON "Notification"("audience");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_applicationId_idx" ON "Notification"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Service_name_key" ON "Service"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceRequirement_serviceId_documentTypeId_key" ON "ServiceRequirement"("serviceId", "documentTypeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServiceRequirement_serviceId_idx" ON "ServiceRequirement"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStage_serviceId_sequence_key" ON "WorkflowStage"("serviceId", "sequence");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkflowStage_serviceId_idx" ON "WorkflowStage"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Application_applicationNumber_key" ON "Application"("applicationNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Application_clientId_idx" ON "Application"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Application_serviceId_idx" ON "Application"("serviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApplicationDocument_serviceRequirementId_idx" ON "ApplicationDocument"("serviceRequirementId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationStage_applicationId_workflowStageId_key" ON "ApplicationStage"("applicationId", "workflowStageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApplicationStage_applicationId_idx" ON "ApplicationStage"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Surveillance_certificateId_sequenceNumber_key" ON "Surveillance"("certificateId", "sequenceNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Surveillance_certificateId_idx" ON "Surveillance"("certificateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Surveillance_status_idx" ON "Surveillance"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Surveillance_scheduledDate_idx" ON "Surveillance"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PersonnelCertificationCategory_name_key" ON "PersonnelCertificationCategory"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PersonnelCertification_employeeId_idx" ON "PersonnelCertification"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PersonnelCertification_categoryId_idx" ON "PersonnelCertification"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PersonnelCertification_expiryDate_idx" ON "PersonnelCertification"("expiryDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PersonnelCertification_deletedAt_idx" ON "PersonnelCertification"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCategory_name_key" ON "ProjectCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Project_projectNumber_key" ON "Project"("projectNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_categoryId_idx" ON "Project"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_targetEndDate_idx" ON "Project"("targetEndDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectAddendum_projectId_idx" ON "ProjectAddendum"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EquipmentCategory_name_key" ON "EquipmentCategory"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipment_categoryId_idx" ON "Equipment"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipment_picId_idx" ON "Equipment"("picId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipment_nextCalibrationDate_idx" ON "Equipment"("nextCalibrationDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipment_deletedAt_idx" ON "Equipment"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Supervisor_email_key" ON "Supervisor"("email");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientUser_clientId_fkey') THEN
    ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_categoryId_fkey') THEN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_clientId_fkey') THEN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_departmentId_fkey') THEN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_applicationId_fkey') THEN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_serviceId_fkey') THEN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Renewal_certificateId_fkey') THEN
    ALTER TABLE "Renewal" ADD CONSTRAINT "Renewal_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_certificateId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_personnelCertificationId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_personnelCertificationId_fkey" FOREIGN KEY ("personnelCertificationId") REFERENCES "PersonnelCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_projectId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_equipmentId_fkey') THEN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_certificateId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_personnelCertificationId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_personnelCertificationId_fkey" FOREIGN KEY ("personnelCertificationId") REFERENCES "PersonnelCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_projectId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_equipmentId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_applicationId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceRequirement_serviceId_fkey') THEN
    ALTER TABLE "ServiceRequirement" ADD CONSTRAINT "ServiceRequirement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceRequirement_documentTypeId_fkey') THEN
    ALTER TABLE "ServiceRequirement" ADD CONSTRAINT "ServiceRequirement_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkflowStage_serviceId_fkey') THEN
    ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Application_clientId_fkey') THEN
    ALTER TABLE "Application" ADD CONSTRAINT "Application_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Application_serviceId_fkey') THEN
    ALTER TABLE "Application" ADD CONSTRAINT "Application_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApplicationDocument_applicationId_fkey') THEN
    ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApplicationDocument_serviceRequirementId_fkey') THEN
    ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_serviceRequirementId_fkey" FOREIGN KEY ("serviceRequirementId") REFERENCES "ServiceRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApplicationStage_applicationId_fkey') THEN
    ALTER TABLE "ApplicationStage" ADD CONSTRAINT "ApplicationStage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApplicationStage_workflowStageId_fkey') THEN
    ALTER TABLE "ApplicationStage" ADD CONSTRAINT "ApplicationStage_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "WorkflowStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Surveillance_certificateId_fkey') THEN
    ALTER TABLE "Surveillance" ADD CONSTRAINT "Surveillance_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_departmentId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PersonnelCertification_employeeId_fkey') THEN
    ALTER TABLE "PersonnelCertification" ADD CONSTRAINT "PersonnelCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PersonnelCertification_categoryId_fkey') THEN
    ALTER TABLE "PersonnelCertification" ADD CONSTRAINT "PersonnelCertification_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PersonnelCertificationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_categoryId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProjectCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAddendum_projectId_fkey') THEN
    ALTER TABLE "ProjectAddendum" ADD CONSTRAINT "ProjectAddendum_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Equipment_categoryId_fkey') THEN
    ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Equipment_picId_fkey') THEN
    ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_picId_fkey" FOREIGN KEY ("picId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
