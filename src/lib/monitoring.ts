import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUS_LABELS } from "@/lib/application";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MonitoringRow = {
  id: string;
  applicationNumber: string;
  clientName: string;
  serviceName: string;
  status: string;
  statusLabel: string;
  overallState: "BERJALAN" | "SELESAI" | "BERHENTI"; // BERHENTI covers Rejected/Cancelled
  currentStageName: string | null;
  daysInCurrentStage: number | null;
  totalDays: number;
  contractValue: number | null;
  createdAt: string;
  submittedAt: string | null;
  completedAt: string | null;
};

/**
 * One row per Application, with duration figures computed on the fly from
 * existing Phase 6 tracking data (ApplicationStage) rather than a separate
 * stored "days elapsed" counter — so it's always accurate as of "now"
 * without needing a background job to keep it updated.
 */
export async function getMonitoringRows(): Promise<MonitoringRow[]> {
  const applications = await prisma.application.findMany({
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } },
      stages: { include: { workflowStage: true }, orderBy: { workflowStage: { sequence: "asc" } } },
      certificate: { select: { createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();

  return applications.map((a) => {
    const inProgress = a.stages.find((s) => s.status === "IN_PROGRESS");
    const currentStageName = inProgress
      ? inProgress.workflowStage.name
      : a.stages.length === 0
        ? APPLICATION_STATUS_LABELS[a.status] || a.status // no tracking stages yet (pre-approval) — fall back to application status
        : null; // stages exist but none in progress (e.g. all completed already)

    const daysInCurrentStage = inProgress?.startDate
      ? Math.floor((now - inProgress.startDate.getTime()) / DAY_MS)
      : null;

    const startPoint = a.submittedAt || a.createdAt;
    const endPoint = a.certificate?.createdAt || new Date(now);
    const totalDays = Math.max(0, Math.floor((endPoint.getTime() - startPoint.getTime()) / DAY_MS));

    let overallState: MonitoringRow["overallState"] = "BERJALAN";
    if (a.status === "COMPLETED") overallState = "SELESAI";
    else if (["REJECTED", "CANCELLED"].includes(a.status)) overallState = "BERHENTI";

    return {
      id: a.id,
      applicationNumber: a.applicationNumber,
      clientName: a.client.name,
      serviceName: a.service.name,
      status: a.status,
      statusLabel: APPLICATION_STATUS_LABELS[a.status] || a.status,
      overallState,
      currentStageName,
      daysInCurrentStage,
      totalDays,
      contractValue: a.contractValue ? Number(a.contractValue) : null,
      createdAt: a.createdAt.toISOString(),
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      completedAt: a.certificate?.createdAt ? a.certificate.createdAt.toISOString() : null,
    };
  });
}
