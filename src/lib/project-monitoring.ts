import { projectPoint } from "@/lib/indonesia-provinces";
import { cashflowForecast, costOverrunPareto, issueCausePareto, performanceTrend, type CashflowMonth, type ParetoItem, type PerformanceWeek } from "@/lib/portfolio-insights";
import { summarizeHse, toHseRecord, type HseSummary } from "@/lib/project-hse";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getJakartaToday } from "@/lib/status";
import { isoWeekKey } from "@/lib/week";
import { analyzeMargin, type MarginAnalysis } from "@/lib/project-margin";
import {
  DAY_MS,
  actualAt,
  actualLineAt,
  buildSCurve,
  actualEvents,
  interpolate,
  plannedPoints,
  projectStart,
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
  hseReports: { orderBy: { periodDate: "asc" } },
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
  hse: HseSummary;
  location: { lat: number; lon: number; exact: boolean; province: string | null } | null;
};

export type PortfolioRisk = {
  id: string;
  projectId: string;
  projectName: string;
  projectHealth: string;
  type: string;
  title: string;
  likelihood: string;
  impact: string;
  category: string | null;
  owner: string | null;
  targetDate: number | null;
  createdAt: number;
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
export type PortfolioCurvePoint = { t: number; planned: number; actual: number | null };

/** Portfolio S-curve of the running projects, each weighted by its contract value (equal weights when values are missing). */
export function portfolioSCurve(inputs: MonitoringInput[], today: number): PortfolioCurvePoint[] {
  const list = inputs.filter((i) => i.status === "ONGOING");
  if (!list.length) return [];
  const starts = list.map((i) => projectStart(i));
  const from = Math.min(...starts);
  const to = Math.max(...list.map((i) => i.targetEndDate), today);
  const weights = list.map((i) => (i.contractValue && i.contractValue > 0 ? i.contractValue : 0));
  const useEqual = weights.every((w) => w === 0);
  const totalW = useEqual ? list.length : weights.reduce((a, b) => a + b, 0);
  const plans = list.map((i) => plannedPoints(i).points);
  const events = list.map((i) => actualEvents(i));
  const span = Math.max(1, (to - from) / DAY_MS);
  const step = (span <= 180 ? 7 : span <= 720 ? 14 : 30) * DAY_MS;
  const times: number[] = [];
  for (let t = from; t < to; t += step) times.push(t);
  times.push(to);
  if (today > from && today < to && !times.includes(today)) times.push(today);
  times.sort((a, b) => a - b);
  return times.map((t) => {
    let pl = 0;
    let ac = 0;
    list.forEach((_, k) => {
      const w = useEqual ? 1 : weights[k];
      pl += interpolate(plans[k], t) * w;
      ac += actualLineAt(events[k], starts[k], t) * w;
    });
    return { t, planned: Math.round((pl / totalW) * 10) / 10, actual: t <= today ? Math.round((ac / totalW) * 10) / 10 : null };
  });
}

export type MiniCurvePoint = { t: number; p: number; a: number | null };

/** A compact Kurva S (≤ 40 points) for the small per-project charts on the dashboard. */
export function miniSCurve(input: MonitoringInput, today: number): MiniCurvePoint[] {
  const rows = buildSCurve(input, today);
  const step = Math.max(1, Math.ceil(rows.length / 40));
  const keep = rows.filter((r, i) => i % step === 0 || i === rows.length - 1 || r.t === today || r.report);
  return keep.map((r) => ({ t: r.t, p: r.planned, a: r.actual }));
}

export type HealthTrendRow = { week: string; date: number; KRITIS: number; WASPADA: number; ON_TRACK: number };
export type AgingBucket = { key: string; label: string; amount: number; projects: { id: string; name: string; amount: number }[] };

/** Outstanding invoices of all projects by how long past due they are. */
export function receivableAging(items: { id: string; name: string; input: MonitoringInput }[], today: number): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { key: "current", label: "Belum jatuh tempo", amount: 0, projects: [] },
    { key: "d30", label: "1–30 hari", amount: 0, projects: [] },
    { key: "d60", label: "31–60 hari", amount: 0, projects: [] },
    { key: "d90", label: "61–90 hari", amount: 0, projects: [] },
    { key: "d90p", label: "> 90 hari", amount: 0, projects: [] },
  ];
  for (const { id, name, input } of items) {
    for (const t of input.terms) {
      if (t.status !== "INVOICED") continue;
      const open = Math.max(0, t.amount - (t.paidAmount ?? 0));
      if (open <= 0) continue;
      const due = t.dueDate ?? (t.invoiceDate !== null ? t.invoiceDate + 30 * DAY_MS : today);
      const late = Math.floor((today - due) / DAY_MS);
      const b = late <= 0 ? buckets[0] : late <= 30 ? buckets[1] : late <= 60 ? buckets[2] : late <= 90 ? buckets[3] : buckets[4];
      b.amount += open;
      const row = b.projects.find((x) => x.id === id);
      if (row) row.amount += open;
      else b.projects.push({ id, name, amount: open });
    }
  }
  buckets.forEach((b) => b.projects.sort((x, y) => y.amount - x.amount));
  return buckets;
}

export async function getProjectPortfolio(): Promise<{
  rows: PortfolioRow[];
  thresholds: MonitoringThresholds;
  today: number;
  curve: PortfolioCurvePoint[];
  curves: Record<string, MiniCurvePoint[]>;
  healthTrend: HealthTrendRow[];
  aging: AgingBucket[];
  risks: PortfolioRisk[];
  cashflow: CashflowMonth[];
  paretoCost: ParetoItem[];
  paretoIssues: ParetoItem[];
  perfTrend: PerformanceWeek[];
}> {
  const [projects, thresholds] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null }, include: MONITORING_INCLUDE, orderBy: { targetEndDate: "asc" } }),
    getMonitoringThresholds(),
  ]);
  const today = getJakartaToday().getTime();
  const inputs: MonitoringInput[] = [];
  const rows = projects.map((p) => {
    const input = toMonitoringInput(p);
    inputs.push(input);
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
    hse: summarizeHse(p.hseReports.map(toHseRecord)),
    location: (() => {
      const pt = projectPoint({ latitude: p.latitude, longitude: p.longitude, province: p.province });
      return pt ? { ...pt, province: p.province } : null;
    })(),
    margin: analyzeMargin(input, summary, today, thresholds.marginDropAlert),
    };
  });
  const curves: Record<string, MiniCurvePoint[]> = {};
  projects.forEach((p, i) => {
    if (p.status === "ONGOING") curves[p.id] = miniSCurve(inputs[i], today);
  });
  // condition of the running projects per week: recorded weekly snapshots, with this week from today's figures
  const thisWeek = isoWeekKey(new Date(today));
  const weeks = new Map<string, HealthTrendRow>();
  const bump = (week: string, date: number, health: string) => {
    if (health !== "KRITIS" && health !== "WASPADA" && health !== "ON_TRACK") return;
    const w = weeks.get(week) ?? { week, date, KRITIS: 0, WASPADA: 0, ON_TRACK: 0 };
    w[health] += 1;
    w.date = Math.min(w.date, date);
    weeks.set(week, w);
  };
  projects.forEach((p, i) => {
    for (const sn of p.snapshots) if (sn.weekKey !== thisWeek) bump(sn.weekKey, sn.snapshotDate.getTime(), sn.health);
    if (p.status === "ONGOING") bump(thisWeek, today, rows[i].summary.health);
  });
  const healthTrend = [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-12);
  const aging = receivableAging(
    projects.map((p, i) => ({ id: p.id, name: p.projectName, input: inputs[i] })),
    today
  );
  const risks: PortfolioRisk[] = projects.flatMap((p, i) =>
    p.status !== "ONGOING"
      ? []
      : p.issues
          .filter((x) => x.status === "OPEN")
          .map((x) => ({
            id: x.id,
            projectId: p.id,
            projectName: p.projectName,
            projectHealth: rows[i].summary.health,
            type: x.type,
            title: x.title,
            likelihood: x.type === "ISSUE" ? "HIGH" : x.likelihood,
            impact: x.impact,
            category: x.category,
            owner: x.owner,
            targetDate: x.targetDate ? x.targetDate.getTime() : null,
            createdAt: x.createdAt.getTime(),
          }))
  );
  const items = projects.map((p, i) => ({ p, input: inputs[i], summary: rows[i].summary, margin: rows[i].margin }));
  const cashflow = cashflowForecast(items, today);
  const paretoCost = costOverrunPareto(items);
  const ongoingProjects = projects.filter((p) => p.status === "ONGOING");
  const paretoIssues = issueCausePareto(ongoingProjects, today);
  const perfTrend = performanceTrend(ongoingProjects, {
    week: thisWeek,
    date: today,
    items: rows.filter((r) => r.status === "ONGOING").map((r) => ({ value: r.summary.contractValue, spi: r.summary.spi, cpi: r.margin.cpi })),
  });
  return { rows, thresholds, today, curve: portfolioSCurve(inputs, today), curves, healthTrend, aging, risks, cashflow, paretoCost, paretoIssues, perfTrend };
}
