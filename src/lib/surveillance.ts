import { prisma } from "@/lib/prisma";

export const SURVEILLANCE_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Terjadwal",
  CONFIRMED: "Dikonfirmasi",
  IN_PROGRESS: "Sedang Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  POSTPONED: "Ditunda",
};

export const SURVEILLANCE_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "text-slate-500 bg-slate-100 border-slate-200",
  CONFIRMED: "text-accent bg-accent/5 border-accent/20",
  IN_PROGRESS: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
  COMPLETED: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
  CANCELLED: "text-slate-500 bg-slate-100 border-slate-200",
  POSTPONED: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
};

/**
 * "Overdue" is never stored — it's derived the same way certificate status
 * is: a SCHEDULED/CONFIRMED/POSTPONED visit whose date has passed is shown
 * as overdue without needing a background job to flip a stored value.
 */
export function isSurveillanceOverdue(status: string, scheduledDate: Date | string): boolean {
  if (!["SCHEDULED", "CONFIRMED", "POSTPONED"].includes(status)) return false;
  return new Date(scheduledDate).getTime() < Date.now();
}

/**
 * Instantiates one Surveillance row per visit required by the service,
 * spaced `intervalMonths` apart starting from the certificate's issue date.
 * Called once, right after a Certificate is created via issuance — a no-op
 * if the service doesn't require surveillance or rows already exist.
 */
export async function generateSurveillanceSchedule(params: {
  certificateId: string;
  issueDate: Date;
  count: number;
  intervalMonths: number;
}) {
  const { certificateId, issueDate, count, intervalMonths } = params;
  if (!count || count < 1 || !intervalMonths || intervalMonths < 1) return;

  const existing = await prisma.surveillance.count({ where: { certificateId } });
  if (existing > 0) return;

  const rows = Array.from({ length: count }, (_, i) => {
    const sequenceNumber = i + 1;
    const scheduledDate = new Date(issueDate);
    scheduledDate.setMonth(scheduledDate.getMonth() + intervalMonths * sequenceNumber);
    return { certificateId, sequenceNumber, scheduledDate, status: "SCHEDULED" };
  });

  await prisma.surveillance.createMany({ data: rows });
}
