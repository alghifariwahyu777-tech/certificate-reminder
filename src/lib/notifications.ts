import { prisma } from "@/lib/prisma";
import { getCertificateStatus, getDaysRemaining } from "@/lib/status";

/**
 * Ensures every certificate currently in "Expiring Soon" or "Expired" state
 * has a corresponding Notification row. Safe to call repeatedly — the
 * unique constraint on (certificateId, type) means a certificate already
 * flagged for a given type is never duplicated. A certificate that moves
 * from "Expiring Soon" to "Expired" naturally gets a *new* notification,
 * since that's a different `type`.
 */
export async function syncNotifications(): Promise<void> {
  const candidates = await prisma.certificate.findMany({
    where: { deletedAt: null },
    select: { id: true, certificateName: true, certificateNumber: true, expiryDate: true },
  });

  const toCreate: { certificateId: string; type: string; message: string }[] = [];

  for (const cert of candidates) {
    const status = getCertificateStatus(cert.expiryDate);
    if (status !== "EXPIRING_SOON" && status !== "EXPIRED") continue;

    const days = getDaysRemaining(cert.expiryDate);
    const message =
      status === "EXPIRED"
        ? `Sertifikat "${cert.certificateName}" (${cert.certificateNumber}) telah kedaluwarsa ${Math.abs(days)} hari lalu.`
        : `Sertifikat "${cert.certificateName}" (${cert.certificateNumber}) akan berakhir dalam ${days} hari.`;

    toCreate.push({ certificateId: cert.id, type: status, message });
  }

  if (toCreate.length > 0) {
    // upsert-per-row keeps this simple and correct with SQLite; volume here
    // (a few dozen certificates) makes the per-row round trip a non-issue.
    await Promise.all(
      toCreate.map((n) =>
        prisma.notification.upsert({
          where: { certificateId_type: { certificateId: n.certificateId, type: n.type } },
          update: {}, // already exists — leave its status (NEW/READ/DONE) untouched
          create: { certificateId: n.certificateId, type: n.type, message: n.message, audience: "INTERNAL" },
        })
      )
    );
  }

  await syncPersonnelNotifications();
  await syncProjectNotifications();
  await syncEquipmentNotifications();
}

async function syncPersonnelNotifications(): Promise<void> {
  const candidates = await prisma.personnelCertification.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      certificationName: true,
      certificationNumber: true,
      expiryDate: true,
      employee: { select: { name: true } },
    },
  });

  const toCreate: { personnelCertificationId: string; type: string; message: string }[] = [];

  for (const cert of candidates) {
    const status = getCertificateStatus(cert.expiryDate);
    if (status !== "EXPIRING_SOON" && status !== "EXPIRED") continue;

    const days = getDaysRemaining(cert.expiryDate);
    const label = cert.certificationNumber ? `${cert.certificationName} (${cert.certificationNumber})` : cert.certificationName;
    const message =
      status === "EXPIRED"
        ? `Sertifikasi "${label}" milik ${cert.employee.name} telah kedaluwarsa ${Math.abs(days)} hari lalu.`
        : `Sertifikasi "${label}" milik ${cert.employee.name} akan berakhir dalam ${days} hari.`;

    toCreate.push({ personnelCertificationId: cert.id, type: status, message });
  }

  if (toCreate.length === 0) return;

  await Promise.all(
    toCreate.map((n) =>
      prisma.notification.upsert({
        where: {
          personnelCertificationId_type: { personnelCertificationId: n.personnelCertificationId, type: n.type },
        },
        update: {},
        create: {
          personnelCertificationId: n.personnelCertificationId,
          type: n.type,
          message: n.message,
          audience: "INTERNAL",
        },
      })
    )
  );
}

async function syncProjectNotifications(): Promise<void> {
  const candidates = await prisma.project.findMany({
    where: { deletedAt: null, status: "ONGOING" }, // only projects still in progress
    select: { id: true, projectName: true, projectNumber: true, targetEndDate: true },
  });

  const toCreate: { projectId: string; type: string; message: string }[] = [];

  for (const project of candidates) {
    const status = getCertificateStatus(project.targetEndDate);
    if (status !== "EXPIRING_SOON" && status !== "EXPIRED") continue;

    const days = getDaysRemaining(project.targetEndDate);
    const message =
      status === "EXPIRED"
        ? `Project "${project.projectName}" (${project.projectNumber}) telah melewati target selesai ${Math.abs(days)} hari lalu.`
        : `Project "${project.projectName}" (${project.projectNumber}) akan mencapai target selesai dalam ${days} hari.`;

    toCreate.push({ projectId: project.id, type: status, message });
  }

  if (toCreate.length === 0) return;

  await Promise.all(
    toCreate.map((n) =>
      prisma.notification.upsert({
        where: { projectId_type: { projectId: n.projectId, type: n.type } },
        update: {},
        create: { projectId: n.projectId, type: n.type, message: n.message, audience: "INTERNAL" },
      })
    )
  );
}

async function syncEquipmentNotifications(): Promise<void> {
  const candidates = await prisma.equipment.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, assetNumber: true, nextCalibrationDate: true, pic: { select: { isActive: true } } },
  });

  const toCreate: { equipmentId: string; type: string; message: string }[] = [];

  for (const equipment of candidates) {
    if (!equipment.pic.isActive) continue; // consistent with the reminder-email skip rule

    const status = getCertificateStatus(equipment.nextCalibrationDate);
    if (status !== "EXPIRING_SOON" && status !== "EXPIRED") continue;

    const days = getDaysRemaining(equipment.nextCalibrationDate);
    const label = equipment.assetNumber ? `${equipment.name} (${equipment.assetNumber})` : equipment.name;
    const message =
      status === "EXPIRED"
        ? `Kalibrasi alat "${label}" telah jatuh tempo ${Math.abs(days)} hari lalu.`
        : `Kalibrasi alat "${label}" akan jatuh tempo dalam ${days} hari.`;

    toCreate.push({ equipmentId: equipment.id, type: status, message });
  }

  if (toCreate.length === 0) return;

  await Promise.all(
    toCreate.map((n) =>
      prisma.notification.upsert({
        where: { equipmentId_type: { equipmentId: n.equipmentId, type: n.type } },
        update: {},
        create: { equipmentId: n.equipmentId, type: n.type, message: n.message, audience: "INTERNAL" },
      })
    )
  );
}

// --- Application lifecycle notifications ---
// Unlike syncNotifications() above (a periodic idempotent sync), these fire
// once at a specific user action (submit, review, approve, issue), so a
// plain create() is correct — two real actions should produce two real
// notifications, there's nothing to deduplicate.

export async function notifyApplicationSubmitted(params: {
  applicationId: string;
  applicationNumber: string;
  clientName: string;
  serviceName: string;
  isResubmission: boolean;
}) {
  const message = params.isResubmission
    ? `${params.clientName} mengajukan ulang permohonan ${params.applicationNumber} (${params.serviceName}) setelah revisi.`
    : `Permohonan baru ${params.applicationNumber} (${params.serviceName}) dari ${params.clientName}.`;

  await prisma.notification.create({
    data: {
      applicationId: params.applicationId,
      audience: "INTERNAL",
      type: "APP_SUBMITTED",
      message,
    },
  });
}

export async function notifyDocumentRevisionRequested(params: {
  applicationId: string;
  applicationNumber: string;
  documentTypeName: string;
}) {
  await prisma.notification.create({
    data: {
      applicationId: params.applicationId,
      audience: "CLIENT",
      type: "APP_REVISION_REQUIRED",
      message: `Dokumen "${params.documentTypeName}" pada permohonan ${params.applicationNumber} perlu direvisi. Silakan unggah ulang.`,
    },
  });
}

export async function notifyApplicationApproved(params: { applicationId: string; applicationNumber: string }) {
  await prisma.notification.create({
    data: {
      applicationId: params.applicationId,
      audience: "CLIENT",
      type: "APP_APPROVED",
      message: `Permohonan ${params.applicationNumber} telah disetujui dan akan diproses lebih lanjut.`,
    },
  });
}

export async function notifyCertificateIssued(params: {
  applicationId: string;
  applicationNumber: string;
  certificateNumber: string;
}) {
  await prisma.notification.create({
    data: {
      applicationId: params.applicationId,
      audience: "CLIENT",
      type: "APP_CERTIFICATE_ISSUED",
      message: `Sertifikat ${params.certificateNumber} untuk permohonan ${params.applicationNumber} telah diterbitkan.`,
    },
  });
}
