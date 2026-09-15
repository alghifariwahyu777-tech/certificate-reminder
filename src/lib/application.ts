import { prisma } from "@/lib/prisma";

/** Generates a sequential application number like CERT-APP-2026-000123. */
export async function generateApplicationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CERT-APP-${year}-`;
  const count = await prisma.application.count({ where: { applicationNumber: { startsWith: prefix } } });
  const sequence = (count + 1).toString().padStart(6, "0");
  return `${prefix}${sequence}`;
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  DOCUMENT_REVIEW: "Review Dokumen",
  REVISION_REQUIRED: "Perlu Revisi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  COMPLETED: "Selesai (Sertifikat Terbit)",
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-slate-500 bg-slate-100 border-slate-200",
  SUBMITTED: "text-accent bg-accent/5 border-accent/20",
  DOCUMENT_REVIEW: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
  REVISION_REQUIRED: "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder",
  APPROVED: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
  REJECTED: "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder",
  CANCELLED: "text-slate-500 bg-slate-100 border-slate-200",
  COMPLETED: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
};

// --- Phase 6: Tracking ---

export const STAGE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Belum Dimulai",
  IN_PROGRESS: "Sedang Berjalan",
  COMPLETED: "Selesai",
};

export const STAGE_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-slate-400 bg-slate-100 border-slate-200",
  IN_PROGRESS: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
  COMPLETED: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
};

/**
 * Instantiates one ApplicationStage per WorkflowStage on the application's
 * service, in sequence order — called once, when an Application first
 * transitions to APPROVED. The very first stage is auto-started (so the
 * client immediately sees visible progress) instead of leaving everything
 * PENDING with no signal that anything has begun.
 */
export async function generateApplicationStages(applicationId: string, serviceId: string) {
  const workflowStages = await prisma.workflowStage.findMany({
    where: { serviceId },
    orderBy: { sequence: "asc" },
  });
  if (workflowStages.length === 0) return;

  const existing = await prisma.applicationStage.count({ where: { applicationId } });
  if (existing > 0) return; // already generated — never regenerate/duplicate

  const now = new Date();
  await prisma.$transaction(
    workflowStages.map((stage, index) => {
      const isFirst = index === 0;
      const targetDate =
        isFirst && stage.slaDays ? new Date(now.getTime() + stage.slaDays * 24 * 60 * 60 * 1000) : null;
      return prisma.applicationStage.create({
        data: {
          applicationId,
          workflowStageId: stage.id,
          status: isFirst ? "IN_PROGRESS" : "PENDING",
          startDate: isFirst ? now : null,
          targetDate,
        },
      });
    })
  );
}
