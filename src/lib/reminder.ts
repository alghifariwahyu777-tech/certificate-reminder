import { prisma } from "@/lib/prisma";
import { getDaysRemaining } from "@/lib/status";
import { sendReminderEmail } from "@/lib/email";
import { sendPersonnelReminderEmail } from "@/lib/personnel-email";

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

  await runCertificateReminders(summary);
  await runPersonnelReminders(summary);

  return summary;
}

async function runCertificateReminders(summary: ReminderRunSummary): Promise<void> {
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
      cc: cert.ccEmail,
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
        cc: cert.ccEmail,
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

async function runPersonnelReminders(summary: ReminderRunSummary): Promise<void> {
  const certifications = await prisma.personnelCertification.findMany({
    where: { deletedAt: null },
    include: { category: true, employee: { include: { department: true } } },
  });

  for (const cert of certifications) {
    if (!cert.employee.isActive) continue; // don't chase reminders for staff no longer active

    const daysRemaining = getDaysRemaining(cert.expiryDate);
    const milestone = REMINDER_MILESTONES.find((m) => m === daysRemaining);
    if (milestone === undefined) continue;

    summary.checked += 1;

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
      cc: cert.ccEmail,
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
        cc: cert.ccEmail,
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
