import { prisma } from "@/lib/prisma";
import { getDaysRemaining } from "@/lib/status";
import { sendReminderEmail } from "@/lib/email";
import { sendPersonnelReminderEmail } from "@/lib/personnel-email";
import { sendProjectReminderEmail } from "@/lib/project-email";
import { sendEquipmentReminderEmail } from "@/lib/equipment-email";

/** Reminder milestones per spec: days remaining before expiry (0 = expiry day itself). */
export const REMINDER_MILESTONES = [90, 60, 30, 14, 7, 3, 1, 0] as const;

export type ReminderRunSummary = {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
  details: {
    certificateNumber: string;
    certificateName: string;
    milestoneDays: number;
    status: "SENT" | "FAILED" | "SKIPPED";
    errorMessage?: string;
  }[];
};

/**
 * Checks every certificate AND every personnel certification against the
 * same reminder milestone schedule, sending an email for anything that
 * lands exactly on a milestone today. Each (record, milestone) pair is
 * only ever sent once — tracked via EmailLog's unique constraints — so
 * running this check multiple times in a day is always safe.
 */
export async function runReminderCheck(): Promise<ReminderRunSummary> {
  const summary: ReminderRunSummary = { checked: 0, sent: 0, failed: 0, skipped: 0, details: [] };

  // Every ACTIVE supervisor is CC'd on every reminder across all four
  // domains — fetched once per run rather than per record, since it's the
  // same list regardless of which certificate/project/equipment triggered
  // the email. Toggling a supervisor active/inactive here immediately
  // changes who's CC'd everywhere on the next run.
  const activeSupervisors = await prisma.supervisor.findMany({
    where: { isActive: true },
    select: { email: true },
  });
  const supervisorCc = activeSupervisors.map((s) => s.email).join(", ") || undefined;

  await runCertificateReminders(summary, supervisorCc);
  await runPersonnelReminders(summary, supervisorCc);
  await runProjectReminders(summary, supervisorCc);
  await runEquipmentReminders(summary, supervisorCc);

  return summary;
}

/** Combines the global active-Supervisor CC list with a record's own legacy ccEmail (if any), so old free-text CC entries keep working alongside the new centralized list. */
function combineCc(supervisorCc: string | undefined, legacyCcEmail: string | null | undefined): string | undefined {
  return [supervisorCc, legacyCcEmail].filter(Boolean).join(", ") || undefined;
}

async function runCertificateReminders(summary: ReminderRunSummary, supervisorCc: string | undefined): Promise<void> {
  const certificates = await prisma.certificate.findMany({
    where: { deletedAt: null },
    include: { category: true, client: true },
  });

  for (const cert of certificates) {
    const daysRemaining = getDaysRemaining(cert.expiryDate);
    const milestone = REMINDER_MILESTONES.find((m) => m === daysRemaining);
    if (milestone === undefined) continue;

    summary.checked += 1;

    const alreadySent = await prisma.emailLog.findUnique({
      where: { certificateId_milestoneDays: { certificateId: cert.id, milestoneDays: milestone } },
    });
    if (alreadySent) continue;

    // Send to whichever of Email PIC / company email is actually filled in
    // — both if both are present. Previously this depended on whether the
    // certificate came from the Application flow (assuming a manually
    // entered PIC email couldn't be trusted), but an Admin editing PIC
    // Email by hand is just as much a deliberate, verified entry as one
    // that arrived via a client's own portal submission — the field being
    // filled in is what matters, not how the certificate was created.
    const recipients = Array.from(new Set([cert.picEmail, cert.client.email].filter((e): e is string => !!e)));

    if (recipients.length === 0) {
      const reason = "Email PIC dan email perusahaan klien belum diisi.";
      await prisma.emailLog.create({
        data: {
          certificateId: cert.id,
          milestoneDays: milestone,
          recipient: "-",
          status: "SKIPPED",
          errorMessage: reason,
        },
      });
      summary.skipped += 1;
      summary.details.push({
        certificateNumber: cert.certificateNumber,
        certificateName: cert.certificateName,
        milestoneDays: milestone,
        status: "SKIPPED",
        errorMessage: reason,
      });
      continue;
    }

    const recipientList = recipients.join(", ");
    const result = await sendReminderEmail({
      to: recipientList,
      cc: combineCc(supervisorCc, cert.ccEmail),
      data: {
        certificateName: cert.certificateName,
        certificateNumber: cert.certificateNumber,
        categoryName: cert.category.name,
        clientName: cert.client.name,
        pic: cert.pic,
        expiryDate: cert.expiryDate,
        daysRemaining,
      },
    });

    await prisma.emailLog.create({
      data: {
        certificateId: cert.id,
        milestoneDays: milestone,
        recipient: recipientList,
        cc: combineCc(supervisorCc, cert.ccEmail),
        status: result.status,
        errorMessage: "errorMessage" in result ? result.errorMessage : null,
      },
    });

    if (result.status === "SENT") summary.sent += 1;
    else if (result.status === "FAILED") summary.failed += 1;
    else summary.skipped += 1;

    summary.details.push({
      certificateNumber: cert.certificateNumber,
      certificateName: cert.certificateName,
      milestoneDays: milestone,
      status: result.status,
      errorMessage: "errorMessage" in result ? result.errorMessage : undefined,
    });
  }
}

async function runPersonnelReminders(summary: ReminderRunSummary, supervisorCc: string | undefined): Promise<void> {
  const certifications = await prisma.personnelCertification.findMany({
    where: { deletedAt: null },
    include: { category: true, employee: { include: { department: true } } },
  });

  for (const cert of certifications) {
    const daysRemaining = getDaysRemaining(cert.expiryDate);
    const milestone = REMINDER_MILESTONES.find((m) => m === daysRemaining);
    if (milestone === undefined) continue;

    summary.checked += 1;

    // Inactive staff still get logged as SKIPPED (not silently ignored) —
    // otherwise the Dashboard's pending count (which has no way to know
    // about this exclusion) would count this as forever-pending, since
    // clicking "Kirim Reminder Sekarang" would never actually resolve it.
    if (!cert.employee.isActive) {
      await prisma.emailLog.create({
        data: {
          personnelCertificationId: cert.id,
          milestoneDays: milestone,
          recipient: "-",
          status: "SKIPPED",
          errorMessage: "Personil sudah tidak aktif.",
        },
      });
      summary.skipped += 1;
      summary.details.push({
        certificateNumber: cert.certificationNumber || "-",
        certificateName: `${cert.certificationName} (${cert.employee.name})`,
        milestoneDays: milestone,
        status: "SKIPPED",
        errorMessage: "Personil sudah tidak aktif.",
      });
      continue;
    }

    const alreadySent = await prisma.emailLog.findUnique({
      where: {
        personnelCertificationId_milestoneDays: { personnelCertificationId: cert.id, milestoneDays: milestone },
      },
    });
    if (alreadySent) continue;

    if (!cert.employee.email) {
      await prisma.emailLog.create({
        data: {
          personnelCertificationId: cert.id,
          milestoneDays: milestone,
          recipient: "-",
          status: "SKIPPED",
          errorMessage: "Email personil belum diisi.",
        },
      });
      summary.skipped += 1;
      summary.details.push({
        certificateNumber: cert.certificationNumber || "-",
        certificateName: `${cert.certificationName} (${cert.employee.name})`,
        milestoneDays: milestone,
        status: "SKIPPED",
        errorMessage: "Email personil belum diisi.",
      });
      continue;
    }

    const result = await sendPersonnelReminderEmail({
      to: cert.employee.email,
      cc: combineCc(supervisorCc, cert.ccEmail),
      data: {
        employeeName: cert.employee.name,
        position: cert.employee.position,
        departmentName: cert.employee.department?.name || null,
        certificationName: cert.certificationName,
        certificationNumber: cert.certificationNumber,
        categoryName: cert.category.name,
        expiryDate: cert.expiryDate,
        daysRemaining,
      },
    });

    await prisma.emailLog.create({
      data: {
        personnelCertificationId: cert.id,
        milestoneDays: milestone,
        recipient: cert.employee.email,
        cc: combineCc(supervisorCc, cert.ccEmail),
        status: result.status,
        errorMessage: "errorMessage" in result ? result.errorMessage : null,
      },
    });

    if (result.status === "SENT") summary.sent += 1;
    else if (result.status === "FAILED") summary.failed += 1;
    else summary.skipped += 1;

    summary.details.push({
      certificateNumber: cert.certificationNumber || "-",
      certificateName: `${cert.certificationName} (${cert.employee.name})`,
      milestoneDays: milestone,
      status: result.status,
      errorMessage: "errorMessage" in result ? result.errorMessage : undefined,
    });
  }
}

async function runProjectReminders(summary: ReminderRunSummary, supervisorCc: string | undefined): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "ONGOING" }, // only chase reminders for projects still in progress
    include: { category: true },
  });

  for (const project of projects) {
    const daysRemaining = getDaysRemaining(project.targetEndDate);
    const milestone = REMINDER_MILESTONES.find((m) => m === daysRemaining);
    if (milestone === undefined) continue;

    summary.checked += 1;

    const alreadySent = await prisma.emailLog.findUnique({
      where: { projectId_milestoneDays: { projectId: project.id, milestoneDays: milestone } },
    });
    if (alreadySent) continue;

    if (!project.picEmail) {
      await prisma.emailLog.create({
        data: {
          projectId: project.id,
          milestoneDays: milestone,
          recipient: "-",
          status: "SKIPPED",
          errorMessage: "Email PIC belum diisi untuk project ini.",
        },
      });
      summary.skipped += 1;
      summary.details.push({
        certificateNumber: project.projectNumber,
        certificateName: project.projectName,
        milestoneDays: milestone,
        status: "SKIPPED",
        errorMessage: "Email PIC belum diisi.",
      });
      continue;
    }

    const result = await sendProjectReminderEmail({
      to: project.picEmail,
      cc: combineCc(supervisorCc, project.ccEmail),
      data: {
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        categoryName: project.category.name,
        clientName: project.clientName,
        pic: project.pic,
        targetEndDate: project.targetEndDate,
        daysRemaining,
      },
    });

    await prisma.emailLog.create({
      data: {
        projectId: project.id,
        milestoneDays: milestone,
        recipient: project.picEmail,
        cc: combineCc(supervisorCc, project.ccEmail),
        status: result.status,
        errorMessage: "errorMessage" in result ? result.errorMessage : null,
      },
    });

    if (result.status === "SENT") summary.sent += 1;
    else if (result.status === "FAILED") summary.failed += 1;
    else summary.skipped += 1;

    summary.details.push({
      certificateNumber: project.projectNumber,
      certificateName: project.projectName,
      milestoneDays: milestone,
      status: result.status,
      errorMessage: "errorMessage" in result ? result.errorMessage : undefined,
    });
  }
}

async function runEquipmentReminders(summary: ReminderRunSummary, supervisorCc: string | undefined): Promise<void> {
  const equipmentList = await prisma.equipment.findMany({
    where: { deletedAt: null },
    include: { category: true, pic: true },
  });

  for (const equipment of equipmentList) {
    const daysRemaining = getDaysRemaining(equipment.nextCalibrationDate);
    const milestone = REMINDER_MILESTONES.find((m) => m === daysRemaining);
    if (milestone === undefined) continue;

    summary.checked += 1;

    if (!equipment.pic.isActive) {
      await prisma.emailLog.create({
        data: {
          equipmentId: equipment.id,
          milestoneDays: milestone,
          recipient: "-",
          status: "SKIPPED",
          errorMessage: "PIC alat sudah tidak aktif.",
        },
      });
      summary.skipped += 1;
      summary.details.push({
        certificateNumber: equipment.assetNumber || "-",
        certificateName: `${equipment.name} (${equipment.pic.name})`,
        milestoneDays: milestone,
        status: "SKIPPED",
        errorMessage: "PIC alat sudah tidak aktif.",
      });
      continue;
    }

    const alreadySent = await prisma.emailLog.findUnique({
      where: { equipmentId_milestoneDays: { equipmentId: equipment.id, milestoneDays: milestone } },
    });
    if (alreadySent) continue;

    if (!equipment.pic.email) {
      await prisma.emailLog.create({
        data: {
          equipmentId: equipment.id,
          milestoneDays: milestone,
          recipient: "-",
          status: "SKIPPED",
          errorMessage: "Email PIC belum diisi.",
        },
      });
      summary.skipped += 1;
      summary.details.push({
        certificateNumber: equipment.assetNumber || "-",
        certificateName: `${equipment.name} (${equipment.pic.name})`,
        milestoneDays: milestone,
        status: "SKIPPED",
        errorMessage: "Email PIC belum diisi.",
      });
      continue;
    }

    const result = await sendEquipmentReminderEmail({
      to: equipment.pic.email,
      cc: combineCc(supervisorCc, equipment.ccEmail),
      data: {
        name: equipment.name,
        assetNumber: equipment.assetNumber,
        categoryName: equipment.category.name,
        brand: equipment.brand,
        model: equipment.model,
        picName: equipment.pic.name,
        nextCalibrationDate: equipment.nextCalibrationDate,
        daysRemaining,
      },
    });

    await prisma.emailLog.create({
      data: {
        equipmentId: equipment.id,
        milestoneDays: milestone,
        recipient: equipment.pic.email,
        cc: combineCc(supervisorCc, equipment.ccEmail),
        status: result.status,
        errorMessage: "errorMessage" in result ? result.errorMessage : null,
      },
    });

    if (result.status === "SENT") summary.sent += 1;
    else if (result.status === "FAILED") summary.failed += 1;
    else summary.skipped += 1;

    summary.details.push({
      certificateNumber: equipment.assetNumber || "-",
      certificateName: `${equipment.name} (${equipment.pic.name})`,
      milestoneDays: milestone,
      status: result.status,
      errorMessage: "errorMessage" in result ? result.errorMessage : undefined,
    });
  }
}
