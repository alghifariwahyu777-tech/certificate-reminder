import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getJakartaToday } from "@/lib/status";
import {
  computeMonitoring,
  DEFAULT_THRESHOLDS,
  type MonitoringInput,
  type MonitoringSummary,
  type MonitoringThresholds,
} from "@/lib/project-monitoring-shared";

const num = (v: Prisma.Decimal | number | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: Prisma.Decimal | number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);
const ms = (d: Date | null | undefined): number | null => (d ? d.getTime() : null);

/** Everything computeMonitoring() needs, in one include. */
export const MONITORING_INCLUDE = {
  category: true,
  milestones: { orderBy: [{ sequence: "asc" }, { createdAt: "asc" }] },
  progressPlans: { orderBy: { periodDate: "asc" } },
  progressReports: { orderBy: { reportDate: "desc" } },
  terms: { orderBy: [{ sequence: "asc" }, { createdAt: "asc" }] },
  budgetItems: { orderBy: { createdAt: "asc" } },
  expenses: { orderBy: { expenseDate: "desc" } },
  issues: { orderBy: [{ status: "desc" }, { createdAt: "desc" }] },
} satisfies Prisma.ProjectInclude;

export type ProjectWithMonitoring = Prisma.ProjectGetPayload<{ include: typeof MONITORING_INCLUDE }>;

export async function getMonitoringThresholds(): Promise<MonitoringThresholds> {
  const s = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!s) return DEFAULT_THRESHOLDS;
  return {
    deviationWarning: s.projectDeviationWarning,
    deviationCritical: s.projectDeviationCritical,
    progressStaleDays: s.projectProgressStaleDays,
    invoiceOverdueDays: s.projectInvoiceOverdueDays,
  };
}

export function toMonitoringInput(p: ProjectWithMonitoring): MonitoringInput {
  return {
    status: p.status,
    startDate: ms(p.startDate),
    createdAt: p.createdAt.getTime(),
    targetEndDate: p.targetEndDate.getTime(),
    actualEndDate: ms(p.actualEndDate),
    contractValue: numOrNull(p.contractValue),
    milestones: p.milestones.map((m) => ({
      weight: num(m.weight),
      plannedDate: ms(m.plannedDate),
      actualDate: ms(m.actualDate),
      status: m.status,
    })),
    plans: p.progressPlans.map((x) => ({ periodDate: x.periodDate.getTime(), plannedPercent: num(x.plannedPercent) })),
    reports: p.progressReports.map((r) => ({ reportDate: r.reportDate.getTime(), actualPercent: num(r.actualPercent) })),
    terms: p.terms.map((t) => ({
      amount: num(t.amount),
      status: t.status,
      plannedDate: ms(t.plannedDate),
      invoiceDate: ms(t.invoiceDate),
      dueDate: ms(t.dueDate),
      paidAmount: numOrNull(t.paidAmount),
    })),
    budgetItems: p.budgetItems.map((b) => ({ amount: num(b.amount) })),
    expenses: p.expenses.map((e) => ({ amount: num(e.amount) })),
    issues: p.issues.map((i) => ({ status: i.status, impact: i.impact })),
  };
}

/** Detail-page loader: monitoring data plus addenda (history shown on the contract tab). */
export async function getProjectWithMonitoring(id: string) {
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: { ...MONITORING_INCLUDE, addenda: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return null;
  const thresholds = await getMonitoringThresholds();
  const today = getJakartaToday().getTime();
  const input = toMonitoringInput(project);
  return { project, input, today, thresholds, summary: computeMonitoring(input, today, thresholds) };
}

export type PortfolioRow = {
  id: string;
  projectNumber: string;
  projectName: string;
  categoryId: string;
  categoryName: string;
  clientName: string;
  pic: string;
  status: string;
  startDate: string | null;
  targetEndDate: string;
  summary: MonitoringSummary;
};

/** One computed row per (non-deleted) project — the data behind the portfolio dashboard and export. */
export async function getProjectPortfolio(): Promise<{ rows: PortfolioRow[]; thresholds: MonitoringThresholds; today: number }> {
  const [projects, thresholds] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null }, include: MONITORING_INCLUDE, orderBy: { targetEndDate: "asc" } }),
    getMonitoringThresholds(),
  ]);
  const today = getJakartaToday().getTime();
  const rows = projects.map((p) => ({
    id: p.id,
    projectNumber: p.projectNumber,
    projectName: p.projectName,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    clientName: p.clientName,
    pic: p.pic,
    status: p.status,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    targetEndDate: p.targetEndDate.toISOString(),
    summary: computeMonitoring(toMonitoringInput(p), today, thresholds),
  }));
  return { rows, thresholds, today };
}
