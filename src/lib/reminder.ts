import { prisma } from "@/lib/prisma";
import { getDaysRemaining } from "@/lib/status";
import { sendReminderEmail } from "@/lib/email";

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
 * Checks every certificate against the reminder milestone schedule and
 * sends an email for any certificate that lands exactly on a milestone
 * today, skipping any (certificate, milestone) pair that already has an
 * EmailLog entry so the same reminder is never sent twice.
 */
export async function runReminderCheck(): Promise<ReminderRunSummary> {
  const certificates = await prisma.certificate.findMany({
    where: { deletedAt: null },
    include: { category: true, client: true },
  });

  const summary: ReminderRunSummary = { checked: 0, sent: 0, failed: 0, skipped: 0, details: [] };

  for (const cert of certificates) {
    const daysRemaining = getDaysRemaining(cert.expiryDate);
    const milestone = REMINDER_MILESTONES.find((m) => m === daysRemaining);
    if (milestone === undefined) continue;

    summary.checked += 1;

    // Already sent for this exact certificate + milestone? Skip silently.
    const alreadySent = await prisma.emailLog.findUnique({
      where: { certificateId_milestoneDays: { certificateId: cert.id, milestoneDays: milestone } },
    });
    if (alreadySent) continue;

    if (!cert.picEmail) {
      await prisma.emailLog.create({
        data: {
          certificateId: cert.id,
          milestoneDays: milestone,
          recipient: "-",
          status: "SKIPPED",
          errorMessage: "Email PIC belum diisi untuk sertifikat ini.",
        },
      });
      summary.skipped += 1;
      summary.details.push({
        certificateNumber: cert.certificateNumber,
        certificateName: cert.certificateName,
        milestoneDays: milestone,
        status: "SKIPPED",
        errorMessage: "Email PIC belum diisi.",
      });
      continue;
    }

    const result = await sendReminderEmail({
      to: cert.picEmail,
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
        recipient: cert.picEmail,
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

  return summary;
}
