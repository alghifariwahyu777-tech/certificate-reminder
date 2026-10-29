import { prisma } from "@/lib/prisma";
import { DAY_MS, interpolate, plannedPoints, type MonitoringInput, type MonitoringSummary } from "@/lib/project-monitoring-shared";
import type { MarginAnalysis } from "@/lib/project-margin";
import { ISSUE_CATEGORY_LABEL, riskLevel } from "@/lib/project-monitoring-shared";

type ProjectLike = {
  id: string;
  projectName: string;
  status: string;
  terms: { amount: unknown; status: string; plannedDate: Date | null; dueDate: Date | null; invoiceDate: Date | null; paidDate: Date | null; paidAmount: unknown }[];
  expenses: { amount: unknown; expenseDate: Date; category: string; cause: string }[];
  issues: { type: string; impact: string; likelihood: string; category: string | null; createdAt: Date }[];
};
const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const monthKey = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthStart = (y: number, m: number) => Date.UTC(y, m, 1);

// ---------------------------------------------------------------------------
// Arus kas: realised (paid terms vs costs) for past months, projected ahead
// ---------------------------------------------------------------------------

export type CashflowMonth = { key: string; t: number; inflow: number; outflow: number; net: number; cumulative: number; projected: boolean };

/**
 * Six months back and six ahead. Past months use payments received and costs
 * booked. Coming months expect invoiced terms on their due date (already
 * overdue ones in the current month), planned terms on their planned billing
 * date, and the remaining cost (proyeksi biaya akhir − biaya keluar) spread
 * over the remaining months in proportion to the planned progress.
 */
export function cashflowForecast(
  items: { p: ProjectLike; input: MonitoringInput; summary: MonitoringSummary; margin: MarginAnalysis }[],
  today: number,
  back = 6,
  ahead = 6
): CashflowMonth[] {
  const now = new Date(today);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const months = Array.from({ length: back + ahead + 1 }, (_, i) => {
    const t = monthStart(y, m - back + i);
    return { key: monthKey(t), t, inflow: 0, outflow: 0, net: 0, cumulative: 0, projected: i >= back };
  });
  const idx = new Map(months.map((x, i) => [x.key, i]));
  const add = (t: number, field: "inflow" | "outflow", v: number) => {
    const i = idx.get(monthKey(t));
    if (i !== undefined && v) months[i][field] += v;
  };
  const thisMonth = monthStart(y, m);
  const horizonEnd = monthStart(y, m + ahead + 1);

  for (const { p, input, summary, margin } of items) {
    for (const t of p.terms) {
      if (t.status === "PAID") {
        if (t.paidDate) add(t.paidDate.getTime(), "inflow", n(t.paidAmount) || n(t.amount));
      } else if (p.status === "ONGOING" || t.status === "INVOICED") {
        const open = Math.max(0, n(t.amount) - n(t.paidAmount));
        const due = t.status === "INVOICED" ? (t.dueDate ?? (t.invoiceDate ? new Date(t.invoiceDate.getTime() + 30 * DAY_MS) : null)) : t.plannedDate;
        if (due) add(Math.max(due.getTime(), thisMonth), "inflow", open);
      }
    }
    for (const e of p.expenses) if (e.expenseDate.getTime() < thisMonth) add(e.expenseDate.getTime(), "outflow", n(e.amount));
    // this month's booked costs count as this month's outflow too
    for (const e of p.expenses) if (e.expenseDate.getTime() >= thisMonth) add(e.expenseDate.getTime(), "outflow", n(e.amount));

    if (p.status !== "ONGOING" || !margin.hasBudget) continue;
    const remaining = Math.max(0, margin.eac - margin.actualCost);
    if (!remaining) continue;
    const plan = plannedPoints(input).points;
    const finish = Math.max(today + DAY_MS, summary.forecastEndDate ?? input.targetEndDate);
    const slots = months.filter((x) => x.projected && x.t < finish);
    if (!slots.length) {
      add(thisMonth, "outflow", remaining);
      continue;
    }
    const weights = slots.map((x, i) => {
      const a = Math.max(today, x.t);
      const b = i === slots.length - 1 ? Math.min(finish, horizonEnd) : Math.min(monthStart(new Date(x.t).getUTCFullYear(), new Date(x.t).getUTCMonth() + 1), finish);
      return Math.max(0, interpolate(plan, b) - interpolate(plan, a));
    });
    const total = weights.reduce((s, w) => s + w, 0);
    // the share falling inside the horizon; work planned after it is outside this view
    const inHorizon = finish <= horizonEnd ? 1 : Math.min(1, (horizonEnd - today) / Math.max(1, finish - today));
    slots.forEach((x, i) => {
      const share = total > 0 ? weights[i] / total : 1 / slots.length;
      add(Math.max(x.t, thisMonth), "outflow", remaining * inHorizon * share);
    });
  }
  let cum = 0;
  for (const x of months) {
    x.inflow = Math.round(x.inflow);
    x.outflow = Math.round(x.outflow);
    x.net = x.inflow - x.outflow;
    cum += x.net;
    x.cumulative = cum;
  }
  return months;
}

// ---------------------------------------------------------------------------
// Pareto: what costs the most money, and what causes the most problems
// ---------------------------------------------------------------------------

export type ParetoItem = { label: string; value: number; projects: number };

export function costOverrunPareto(items: { p: ProjectLike; input: MonitoringInput; summary: MonitoringSummary; margin: MarginAnalysis }[]): ParetoItem[] {
  const acc = new Map<string, { value: number; projects: Set<string> }>();
  const bump = (label: string, v: number, id: string) => {
    if (v <= 0) return;
    const r = acc.get(label) ?? { value: 0, projects: new Set<string>() };
    r.value += v;
    r.projects.add(id);
    acc.set(label, r);
  };
  for (const { p, input, summary, margin } of items) {
    if (p.status !== "ONGOING" || !margin.hasBudget) continue;
    bump("Keterlambatan", margin.delayCost, p.id);
    bump("Kerja tambahan tanpa addendum", margin.unbilledExtraScope, p.id);
    // routine costs above the RAB share for the work done, per cost section
    const progress = Math.min(1, summary.actualPercent / 100);
    const budget = new Map<string, number>();
    for (const b of input.budgetItems) budget.set(b.category || "Lainnya", (budget.get(b.category || "Lainnya") ?? 0) + b.amount);
    const actual = new Map<string, number>();
    for (const e of input.expenses) if (!e.cause || e.cause === "NORMAL") actual.set(e.category || "Lainnya", (actual.get(e.category || "Lainnya") ?? 0) + e.amount);
    for (const [cat, a] of actual) bump(`${cat.split(" /")[0]} di atas RAB`, a - (budget.get(cat) ?? 0) * progress, p.id);
  }
  return [...acc.entries()].map(([label, r]) => ({ label, value: Math.round(r.value), projects: r.projects.size })).sort((a, b) => b.value - a.value);
}

/** Issues and risks of the last 12 months by category, weighted by their level (rendah 1 … ekstrem 4). */
export function issueCausePareto(projects: ProjectLike[], today: number): ParetoItem[] {
  const weight = { Rendah: 1, Sedang: 2, Tinggi: 3, Ekstrem: 4 } as const;
  const acc = new Map<string, { value: number; projects: Set<string> }>();
  for (const p of projects) {
    for (const i of p.issues) {
      if (i.createdAt.getTime() < today - 365 * DAY_MS) continue;
      const label = ISSUE_CATEGORY_LABEL[i.category ?? "LAINNYA"] ?? "Lainnya";
      const r = acc.get(label) ?? { value: 0, projects: new Set<string>() };
      r.value += weight[riskLevel(i.type, i.likelihood, i.impact).label];
      r.projects.add(p.id);
      acc.set(label, r);
    }
  }
  return [...acc.entries()].map(([label, r]) => ({ label, value: r.value, projects: r.projects.size })).sort((a, b) => b.value - a.value);
}

// ---------------------------------------------------------------------------
// Kinerja waktu & biaya portofolio per minggu (from the weekly snapshots)
// ---------------------------------------------------------------------------

export type PerformanceWeek = { week: string; date: number; spi: number | null; cpi: number | null };

export function performanceTrend(
  projects: { contractValue: unknown; snapshots: { weekKey: string; snapshotDate: Date; spi: number | null; cpi: number | null }[] }[],
  current: { week: string; date: number; items: { value: number; spi: number | null; cpi: number | null }[] }
): PerformanceWeek[] {
  const weeks = new Map<string, { date: number; s: [number, number]; c: [number, number] }>();
  const bump = (week: string, date: number, w: number, spi: number | null, cpi: number | null) => {
    const r = weeks.get(week) ?? { date, s: [0, 0], c: [0, 0] };
    if (spi !== null) (r.s[0] += spi * w), (r.s[1] += w);
    if (cpi !== null) (r.c[0] += cpi * w), (r.c[1] += w);
    r.date = Math.min(r.date, date);
    weeks.set(week, r);
  };
  for (const p of projects) {
    const w = Math.max(1, n(p.contractValue));
    for (const s of p.snapshots) if (s.weekKey !== current.week) bump(s.weekKey, s.snapshotDate.getTime(), w, s.spi, s.cpi);
  }
  for (const i of current.items) bump(current.week, current.date, Math.max(1, i.value), i.spi, i.cpi);
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return [...weeks.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([week, r]) => ({ week, date: r.date, spi: r.s[1] ? r2(r.s[0] / r.s[1]) : null, cpi: r.c[1] ? r2(r.c[0] / r.c[1]) : null }));
}

// ---------------------------------------------------------------------------
// Kalender kegiatan
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  date: string; // yyyy-mm-dd
  kind: "TERM" | "INVOICE" | "MILESTONE" | "CERT" | "ISSUE" | "END" | "HSE";
  title: string;
  projectId: string | null;
  projectName: string | null;
  late: boolean;
  href: string | null;
};

/** Dated obligations of the running projects from one month back to four months ahead. */
export async function getPortfolioCalendar(today: number): Promise<CalendarEvent[]> {
  const from = new Date(today - 31 * DAY_MS);
  const to = new Date(today + 125 * DAY_MS);
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "ONGOING" },
    select: {
      id: true,
      projectName: true,
      targetEndDate: true,
      terms: { select: { name: true, status: true, plannedDate: true, dueDate: true, amount: true } },
      milestones: { where: { status: { not: "DONE" } }, select: { name: true, plannedDate: true } },
      issues: { where: { status: "OPEN" }, select: { title: true, targetDate: true } },
      hseReports: { orderBy: { periodDate: "desc" }, take: 1, select: { periodDate: true } },
      assignments: {
        select: {
          endDate: true,
          employee: { select: { name: true, certifications: { where: { deletedAt: null }, select: { certificationName: true, expiryDate: true } } } },
        },
      },
    },
  });
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const inRange = (d: Date | null): d is Date => !!d && d >= from && d <= to;
  const out: CalendarEvent[] = [];
  const seenCert = new Set<string>();
  for (const p of projects) {
    const base = { projectId: p.id, projectName: p.projectName };
    for (const t of p.terms) {
      if (t.status === "PLANNED" && inRange(t.plannedDate)) out.push({ ...base, date: ymd(t.plannedDate), kind: "TERM", title: `Rencana tagih ${t.name}`, late: t.plannedDate.getTime() < today, href: `/projects/${p.id}#keuangan/termin` });
      if (t.status === "INVOICED" && inRange(t.dueDate)) out.push({ ...base, date: ymd(t.dueDate), kind: "INVOICE", title: `Jatuh tempo ${t.name}`, late: t.dueDate.getTime() < today, href: `/projects/${p.id}#keuangan/termin` });
    }
    for (const ms of p.milestones) if (inRange(ms.plannedDate)) out.push({ ...base, date: ymd(ms.plannedDate), kind: "MILESTONE", title: ms.name, late: ms.plannedDate.getTime() < today, href: `/projects/${p.id}#jadwal/milestone` });
    for (const i of p.issues) if (inRange(i.targetDate)) out.push({ ...base, date: ymd(i.targetDate), kind: "ISSUE", title: `Target tindak lanjut: ${i.title}`, late: i.targetDate.getTime() < today, href: `/projects/${p.id}#tim/kendala` });
    if (inRange(p.targetEndDate)) out.push({ ...base, date: ymd(p.targetEndDate), kind: "END", title: "Target selesai project", late: p.targetEndDate.getTime() < today, href: `/projects/${p.id}` });
    // HSE report for last month is due on the 5th
    const now = new Date(today);
    const due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5));
    const lastMonthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0);
    if (!p.hseReports[0] || p.hseReports[0].periodDate.getTime() < lastMonthEnd) out.push({ ...base, date: ymd(due), kind: "HSE", title: "Batas laporan HSE bulan lalu", late: due.getTime() < today, href: `/projects/${p.id}#tim/hse` });
    for (const a of p.assignments) {
      const until = a.endDate ?? p.targetEndDate;
      for (const c of a.employee.certifications) {
        const key = `${a.employee.name}|${c.certificationName}`;
        if (seenCert.has(key) || !inRange(c.expiryDate) || c.expiryDate > until) continue;
        seenCert.add(key);
        out.push({ date: ymd(c.expiryDate), kind: "CERT", title: `Sertifikat ${c.certificationName} (${a.employee.name}) berakhir`, projectId: null, projectName: null, late: c.expiryDate.getTime() < today, href: "/projects/personnel" });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
