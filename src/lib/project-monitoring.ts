import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getJakartaToday } from "@/lib/status";
import { isoWeekKey } from "@/lib/week";
import { analyzeMargin, type MarginAnalysis } from "@/lib/project-margin";
import {
  computeMonitoring,
  padSchedule,
  DEFAULT_THRESHOLDS,
  type PadBucket,
  type MonitoringInput,
  type MonitoringSummary,
  type MonitoringThresholds,
} from "@/lib/project-monitoring-shared";

const num = (v: Prisma.Decimal | number | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: Prisma.Decimal | number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);
const ms = (d: Date | null | undefined): number | null => (d ? d.getTime() : null);
function parseBudgetJson(v: string | null): Record<string, number> {
  if (!v) return {};
  try {
    const o = JSON.parse(v);
    return o && typeof o === "object" ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}

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
  snapshots: { orderBy: { weekKey: "desc" }, take: 26 },
  closeout: true,
  rabRevisions: { orderBy: { version: "desc" }, select: { id: true, version: true, reason: true, fileName: true, contractValue: true, totalCost: true, operatingProfit: true, marginPct: true, createdBy: true, createdAt: true } },
  assignments: { include: { employee: { select: { id: true, name: true, employeeId: true, position: true, isActive: true } } }, orderBy: { createdAt: "asc" } },
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
    marginDropAlert: s.projectMarginDropAlert,
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
    budgetItems: p.budgetItems.map((b) => ({ amount: num(b.amount), category: b.category })),
    expenses: p.expenses.map((e) => ({ amount: num(e.amount), date: e.expenseDate.getTime(), category: e.category, cause: e.cause })),
    issues: p.issues.map((i) => ({ status: i.status, impact: i.impact })),
    baseline: p.baselineLockedAt
      ? {
          contractValue: numOrNull(p.baselineContractValue),
          budget: numOrNull(p.baselineBudget),
          budgetByCategory: parseBudgetJson(p.baselineBudgetJson),
          endDate: ms(p.baselineEndDate),
        }
      : null,
    targetMarginPct: p.targetMarginPct ?? null,
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
  const summary = computeMonitoring(input, today, thresholds);
  return { project, input, today, thresholds, summary, margin: analyzeMargin(input, summary, today, thresholds.marginDropAlert) };
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
  /** Change in deviation vs last week's snapshot (points; + = improving), null when no history yet. */
  trend: number | null;
  padSchedule: PadBucket[];
  /** For COMPLETED projects: whether BAPP, BAST and final report are all recorded. */
  closeoutComplete: boolean | null;
  teamSize: number;
  margin: MarginAnalysis;
};

/** Deviation now vs the most recent snapshot from an earlier week. */
export function deviationTrend(p: Pick<ProjectWithMonitoring, "snapshots">, currentDeviation: number): number | null {
  const thisWeek = isoWeekKey();
  const prev = p.snapshots.find((s) => s.weekKey < thisWeek);
  return prev ? Math.round((currentDeviation - prev.deviation) * 10) / 10 : null;
}

export function isCloseoutComplete(c: ProjectWithMonitoring["closeout"]): boolean {
  return !!c && !!c.bappDate && !!c.bastDate && !!c.finalReportDate;
}

/** One computed row per (non-deleted) project — the data behind the portfolio dashboard and export. */
export async function getProjectPortfolio(): Promise<{ rows: PortfolioRow[]; thresholds: MonitoringThresholds; today: number }> {
  const [projects, thresholds] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null }, include: MONITORING_INCLUDE, orderBy: { targetEndDate: "asc" } }),
    getMonitoringThresholds(),
  ]);
  const today = getJakartaToday().getTime();
  const rows = projects.map((p) => {
    const input = toMonitoringInput(p);
    const summary = computeMonitoring(input, today, thresholds);
    return {
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
    summary,
    trend: p.status === "ONGOING" ? deviationTrend(p, summary.deviation) : null,
    padSchedule: padSchedule(input, today, thresholds),
    closeoutComplete: p.status === "COMPLETED" ? isCloseoutComplete(p.closeout) : null,
    teamSize: p.assignments.length,
    margin: analyzeMargin(input, summary, today, thresholds.marginDropAlert),
    };
  });
  return { rows, thresholds, today };
}
