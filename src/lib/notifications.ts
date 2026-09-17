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

  if (toCreate.length === 0) return;

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
