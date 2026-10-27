/**
 * Project Monitoring — realisasi. Pure, dependency-free calculations shared
 * by Server Components, API routes, the reminder job and Client Components
 * (Kurva S chart), so every screen derives the same numbers the same way.
 *
 * Conventions:
 *  - All dates are handled as epoch milliseconds of a UTC-midnight "date
 *    only" value (how `<input type="date">` values are stored), and "today"
 *    is pinned to Jakarta's calendar day by the caller.
 *  - Progress values are cumulative percentages, 0–100.
 *  - Deviasi = realisasi − rencana (negative = behind schedule).
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Labels & option lists
// ---------------------------------------------------------------------------

export const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Belum Mulai",
  IN_PROGRESS: "Berjalan",
  DONE: "Selesai",
};

export const TERM_STATUS_LABEL: Record<string, string> = {
  PLANNED: "Belum Ditagih",
  INVOICED: "Sudah Ditagih",
  PAID: "Dibayar",
};

export const ISSUE_TYPE_LABEL: Record<string, string> = { ISSUE: "Kendala", RISK: "Risiko" };
export const ISSUE_IMPACT_LABEL: Record<string, string> = { LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi" };
export const ISSUE_STATUS_LABEL: Record<string, string> = { OPEN: "Terbuka", CLOSED: "Selesai" };

export const PROJECT_COST_CATEGORIES = [
  "Personel / Tenaga Ahli",
  "Perjalanan Dinas",
  "Peralatan",
  "Material / Bahan",
  "Subkontraktor / Vendor",
  "Laboratorium / Pengujian",
  "Operasional / Administrasi",
  "Lainnya",
] as const;

export type ProjectHealth = "ON_TRACK" | "WASPADA" | "KRITIS" | "SELESAI" | "BATAL";

export const HEALTH_LABEL: Record<ProjectHealth, string> = {
  ON_TRACK: "Sesuai rencana",
  WASPADA: "Waspada",
  KRITIS: "Kritis",
  SELESAI: "Selesai",
  BATAL: "Dibatalkan",
};

/** Tailwind classes for the existing `stamp-badge` look. */
export const HEALTH_BADGE_CLASS: Record<ProjectHealth, string> = {
  ON_TRACK: "bg-signal-activeBg text-signal-active border-signal-activeBorder",
  WASPADA: "bg-signal-soonBg text-signal-soon border-signal-soonBorder",
  KRITIS: "bg-signal-expiredBg text-signal-expired border-signal-expiredBorder",
  SELESAI: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  BATAL: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

export type MonitoringThresholds = {
  deviationWarning: number;
  deviationCritical: number;
  progressStaleDays: number;
  invoiceOverdueDays: number;
  /** margin (aktual/prakiraan) turun ≥ ini poin dari rencana → butir keputusan */
  marginDropAlert: number;
};

export const DEFAULT_THRESHOLDS: MonitoringThresholds = {
  deviationWarning: 5,
  deviationCritical: 10,
  progressStaleDays: 14,
  invoiceOverdueDays: 30,
  marginDropAlert: 10,
};

// ---------------------------------------------------------------------------
// Input shape (plain numbers/ms so it works on both server and client)
// ---------------------------------------------------------------------------

export type MonitoringInput = {
  status: string; // ONGOING | COMPLETED | CANCELLED
  startDate: number | null;
  createdAt: number;
  targetEndDate: number;
  actualEndDate: number | null;
  contractValue: number | null;
  milestones: { weight: number; plannedDate: number | null; actualDate: number | null; status: string }[];
  plans: { periodDate: number; plannedPercent: number }[];
  reports: { reportDate: number; actualPercent: number }[];
  terms: {
    amount: number;
    status: string;
    plannedDate: number | null;
    invoiceDate: number | null;
    dueDate: number | null;
    paidAmount: number | null;
  }[];
  budgetItems: { amount: number; category?: string }[];
  expenses: { amount: number; date?: number; category?: string; cause?: string }[];
  issues: { status: string; impact: string }[];
  /** the locked original plan (triple constraint baseline); null = not locked yet → current plan is used */
  baseline?: { contractValue: number | null; budget: number | null; budgetByCategory: Record<string, number>; endDate: number | null } | null;
  /** target margin (%) set for this project — taken from its RAB; null = fall back to the baseline margin */
  targetMarginPct?: number | null;
};

export type CurvePoint = { t: number; value: number };

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt1 = (v: number) => round1(v).toLocaleString("id-ID");

export function projectStart(input: Pick<MonitoringInput, "startDate" | "createdAt">): number {
  return input.startDate ?? dateOnly(input.createdAt);
}

export function dateOnly(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Where the planned curve comes from — shown in the UI so users know. */
export type PlanSource = "MANUAL" | "MILESTONE" | "LINEAR";

/**
 * Planned S-curve control points, cumulative %, sorted by date.
 * Priority: explicit plan rows → milestone planned dates × weights → a
 * straight line from start to target end.
 */
export function plannedPoints(input: MonitoringInput): { source: PlanSource; points: CurvePoint[] } {
  const start = projectStart(input);
  if (input.plans.length > 0) {
    const pts = [...input.plans]
      .sort((a, b) => a.periodDate - b.periodDate)
      .map((p) => ({ t: p.periodDate, value: clamp(p.plannedPercent) }));
    if (pts[0].t > start && pts[0].value > 0) pts.unshift({ t: start, value: 0 });
    return { source: "MANUAL", points: pts };
  }

  const dated = input.milestones.filter((m) => m.plannedDate !== null && m.weight > 0);
  const totalWeight = input.milestones.reduce((s, m) => s + Math.max(0, m.weight), 0);
  if (dated.length > 0 && totalWeight > 0) {
    const pts: CurvePoint[] = [{ t: start, value: 0 }];
    let cum = 0;
    for (const m of [...dated].sort((a, b) => (a.plannedDate as number) - (b.plannedDate as number))) {
      cum += m.weight;
      const t = Math.max(start, m.plannedDate as number);
      const value = clamp((cum / totalWeight) * 100);
      if (pts[pts.length - 1].t === t) pts[pts.length - 1].value = value;
      else pts.push({ t, value });
    }
    return { source: "MILESTONE", points: pts };
  }

  return {
    source: "LINEAR",
    points: [
      { t: start, value: 0 },
      { t: Math.max(start, input.targetEndDate), value: 100 },
    ],
  };
}

/** Piecewise-linear interpolation of a planned curve at time t. */
export function interpolate(points: CurvePoint[], t: number): number {
  if (points.length === 0) return 0;
  if (t <= points[0].t) return t < points[0].t ? 0 : points[0].value;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.t) {
      if (b.t === a.t) return b.value;
      return a.value + ((b.value - a.value) * (t - a.t)) / (b.t - a.t);
    }
  }
  return points[points.length - 1].value;
}

/**
 * Actual progress events ("Keduanya" mode): every completed milestone
 * contributes its normalized cumulative weight at its actual date, and every
 * manual progress report states a value at its report date. At any time t,
 * the most recent event on or before t wins — so a manual report corrects
 * the milestone-derived figure until a later milestone completion (or a
 * later report) supersedes it. On the same day, the manual report wins.
 */
export function actualEvents(input: MonitoringInput): CurvePoint[] {
  const totalWeight = input.milestones.reduce((s, m) => s + Math.max(0, m.weight), 0);
  const events: (CurvePoint & { manual: boolean })[] = [];

  if (totalWeight > 0) {
    const done = input.milestones
      .filter((m) => m.status === "DONE" && m.actualDate !== null)
      .sort((a, b) => (a.actualDate as number) - (b.actualDate as number));
    let cum = 0;
    for (const m of done) {
      cum += Math.max(0, m.weight);
      events.push({ t: m.actualDate as number, value: clamp((cum / totalWeight) * 100), manual: false });
    }
  }
  for (const r of input.reports) events.push({ t: r.reportDate, value: clamp(r.actualPercent), manual: true });

  events.sort((a, b) => a.t - b.t || Number(a.manual) - Number(b.manual));
  return events.map(({ t, value }) => ({ t, value }));
}

export function actualAt(events: CurvePoint[], t: number): number {
  let v = 0;
  for (const e of events) {
    if (e.t <= t) v = e.value;
    else break;
  }
  return v;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export type MonitoringSummary = {
  planSource: PlanSource;
  plannedPercent: number;
  actualPercent: number;
  deviation: number; // actual − planned
  spi: number | null;
  health: ProjectHealth;
  healthReason: string;
  timeElapsedPercent: number;
  daysRemaining: number;
  isOverdue: boolean;
  forecastEndDate: number | null;
  lastProgressUpdate: number | null;
  daysSinceUpdate: number | null;
  isStale: boolean;
  milestoneTotal: number;
  milestoneDone: number;
  milestoneWeightTotal: number;
  // keuangan (pendapatan)
  contractValue: number;
  termTotal: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  overdueInvoiceCount: number;
  overdueInvoiceAmount: number;
  dueUnbilledCount: number; // termin yang rencana tagihnya sudah lewat tapi belum ditagih
  earnedValue: number; // actual% × contract
  unbilledEarned: number; // nilai pekerjaan selesai yang belum ditagih
  // PAD — Pendapatan yang Akan Diterima = nilai kontrak yang belum diterima
  pad: number; // piutang + belum ditagih
  padUnbilled: number; // bagian PAD yang belum ditagih
  // biaya
  budgetTotal: number;
  costActual: number;
  budgetUsedPercent: number | null;
  cpi: number | null;
  plannedMargin: number | null; // contract − budget
  // isu
  openIssues: number;
  openHighIssues: number;
};

export function computeMonitoring(
  input: MonitoringInput,
  today: number,
  thresholds: MonitoringThresholds = DEFAULT_THRESHOLDS
): MonitoringSummary {
  const start = projectStart(input);
  const end = input.targetEndDate;
  const plan = plannedPoints(input);
  const events = actualEvents(input);

  let actualPercent = actualAt(events, today);
  if (input.status === "COMPLETED" && events.length === 0) actualPercent = 100;
  const plannedPercent = interpolate(plan.points, today);
  const deviation = actualPercent - plannedPercent;
  const spi = plannedPercent > 0 ? actualPercent / plannedPercent : null;

  const span = Math.max(1, end - start);
  const timeElapsedPercent = clamp(((today - start) / span) * 100);
  const daysRemaining = Math.round((end - today) / DAY_MS);
  const isOverdue = input.status === "ONGOING" && today > end && actualPercent < 100;

  let forecastEndDate: number | null = null;
  const elapsedDays = (today - start) / DAY_MS;
  if (input.status === "ONGOING" && actualPercent > 0 && actualPercent < 100 && elapsedDays > 0) {
    const ratePerDay = actualPercent / elapsedDays;
    forecastEndDate = dateOnly(today + ((100 - actualPercent) / ratePerDay) * DAY_MS);
  }

  const lastProgressUpdate = events.length ? events[events.length - 1].t : null;
  const referenceForStale = lastProgressUpdate ?? start;
  const daysSinceUpdate = input.status === "ONGOING" ? Math.max(0, Math.round((today - referenceForStale) / DAY_MS)) : null;
  const isStale =
    input.status === "ONGOING" && today >= start && daysSinceUpdate !== null && daysSinceUpdate >= thresholds.progressStaleDays;

  // health
  let health: ProjectHealth;
  let healthReason: string;
  const behind = plannedPercent - actualPercent;
  if (input.status === "COMPLETED") {
    health = "SELESAI";
    healthReason = "Project telah selesai.";
  } else if (input.status === "CANCELLED") {
    health = "BATAL";
    healthReason = "Project dibatalkan.";
  } else if (isOverdue) {
    health = "KRITIS";
    healthReason = `Telah melewati target selesai ${Math.abs(daysRemaining)} hari dengan progres ${fmt1(actualPercent)}%.`;
  } else if (behind >= thresholds.deviationCritical) {
    health = "KRITIS";
    healthReason = `Progres tertinggal ${fmt1(behind)} poin dari rencana.`;
  } else if (behind >= thresholds.deviationWarning) {
    health = "WASPADA";
    healthReason = `Progres tertinggal ${fmt1(behind)} poin dari rencana.`;
  } else {
    health = "ON_TRACK";
    healthReason = behind > 0 ? `Progres tertinggal ${fmt1(behind)} poin, masih dalam batas toleransi.` : "Progres sesuai atau melampaui rencana.";
  }

  // keuangan
  const contractValue = input.contractValue ?? 0;
  const termTotal = input.terms.reduce((s, t) => s + t.amount, 0);
  const billed = input.terms.filter((t) => t.status === "INVOICED" || t.status === "PAID");
  const invoiced = billed.reduce((s, t) => s + t.amount, 0);
  const paidTerms = input.terms.filter((t) => t.status === "PAID");
  const paid = paidTerms.reduce((s, t) => s + (t.paidAmount ?? t.amount), 0);
  const overdue = input.terms.filter((t) => t.status === "INVOICED" && isInvoiceOverdue(t, today, thresholds));
  const dueUnbilled = input.terms.filter((t) => t.status === "PLANNED" && t.plannedDate !== null && t.plannedDate <= today);
  const earnedValue = (actualPercent / 100) * contractValue;

  // biaya
  const budgetTotal = input.budgetItems.reduce((s, b) => s + b.amount, 0);
  const costActual = input.expenses.reduce((s, e) => s + e.amount, 0);
  const earnedCost = (actualPercent / 100) * budgetTotal;

  const milestoneDone = input.milestones.filter((m) => m.status === "DONE").length;

  return {
    planSource: plan.source,
    plannedPercent: round1(plannedPercent),
    actualPercent: round1(actualPercent),
    deviation: round1(deviation),
    spi: spi === null ? null : Math.round(spi * 100) / 100,
    health,
    healthReason,
    timeElapsedPercent: round1(timeElapsedPercent),
    daysRemaining,
    isOverdue,
    forecastEndDate,
    lastProgressUpdate,
    daysSinceUpdate,
    isStale,
    milestoneTotal: input.milestones.length,
    milestoneDone,
    milestoneWeightTotal: round1(input.milestones.reduce((s, m) => s + m.weight, 0)),
    contractValue,
    termTotal,
    invoiced,
    paid,
    outstanding: invoiced - paid,
    pad: input.status === "CANCELLED" ? 0 : Math.max(0, Math.max(contractValue, termTotal) - paid),
    padUnbilled: input.status === "CANCELLED" ? 0 : Math.max(0, Math.max(contractValue, termTotal) - invoiced),
    overdueInvoiceCount: overdue.length,
    overdueInvoiceAmount: overdue.reduce((s, t) => s + t.amount, 0),
    dueUnbilledCount: dueUnbilled.length,
    earnedValue,
    unbilledEarned: Math.max(0, earnedValue - invoiced),
    budgetTotal,
    costActual,
    budgetUsedPercent: budgetTotal > 0 ? round1((costActual / budgetTotal) * 100) : null,
    cpi: budgetTotal > 0 && costActual > 0 ? Math.round((earnedCost / costActual) * 100) / 100 : null,
    plannedMargin: contractValue > 0 && budgetTotal > 0 ? contractValue - budgetTotal : null,
    openIssues: input.issues.filter((i) => i.status === "OPEN").length,
    openHighIssues: input.issues.filter((i) => i.status === "OPEN" && i.impact === "HIGH").length,
  };
}

/**
 * An invoice is overdue when its due date has passed, or — when no due date
 * was recorded — when `invoiceOverdueDays` have passed since the invoice date.
 */
export function isInvoiceOverdue(
  term: { status: string; invoiceDate: number | null; dueDate: number | null },
  today: number,
  thresholds: MonitoringThresholds
): boolean {
  if (term.status !== "INVOICED") return false;
  if (term.dueDate !== null) return today > term.dueDate;
  if (term.invoiceDate !== null) return today - term.invoiceDate > thresholds.invoiceOverdueDays * DAY_MS;
  return false;
}

// ---------------------------------------------------------------------------
// Kurva S series (for charts)
// ---------------------------------------------------------------------------

export type SCurveRow = { t: number; label: string; planned: number; actual: number | null };

/**
 * Samples planned & actual curves on an adaptive grid (weekly for short
 * projects, monthly for long ones), plus every exact event date, so steps
 * in the actual line land where they really happened.
 */
export function buildSCurve(input: MonitoringInput, today: number): SCurveRow[] {
  const start = projectStart(input);
  const plan = plannedPoints(input);
  const events = actualEvents(input);
  const lastEvent = events.length ? events[events.length - 1].t : start;
  const lastPlan = plan.points[plan.points.length - 1]?.t ?? start;
  const end = Math.max(input.targetEndDate, lastPlan, lastEvent, Math.min(today, input.actualEndDate ?? today));
  const spanDays = Math.max(1, (end - start) / DAY_MS);
  const stepDays = spanDays <= 120 ? 7 : spanDays <= 540 ? 14 : 30;

  const times = new Set<number>();
  for (let t = start; t < end; t += stepDays * DAY_MS) times.add(t);
  times.add(end);
  plan.points.forEach((p) => times.add(p.t));
  events.forEach((e) => times.add(e.t));
  if (today > start && today < end) times.add(today);

  const actualCutoff = input.status === "ONGOING" ? today : Math.max(lastEvent, input.actualEndDate ?? lastEvent);
  return [...times]
    .filter((t) => t >= start)
    .sort((a, b) => a - b)
    .map((t) => ({
      t,
      label: shortDate(t),
      planned: round1(interpolate(plan.points, t)),
      actual: t <= actualCutoff ? round1(actualAt(events, t)) : null,
    }));
}

/** Evenly spaced plan rows (weekly/monthly) derived from the current plan — used by "Isi otomatis". */
export function suggestPlanRows(input: MonitoringInput, interval: "WEEKLY" | "MONTHLY"): { periodDate: number; plannedPercent: number }[] {
  const start = projectStart(input);
  const end = Math.max(start, input.targetEndDate);
  const base = plannedPoints({ ...input, plans: [] }).points;
  const rows: { periodDate: number; plannedPercent: number }[] = [];
  if (interval === "WEEKLY") {
    for (let t = start + 7 * DAY_MS; t < end; t += 7 * DAY_MS) rows.push({ periodDate: t, plannedPercent: round1(interpolate(base, t)) });
  } else {
    const d = new Date(start);
    let y = d.getUTCFullYear();
    let m = d.getUTCMonth();
    for (;;) {
      m += 1;
      if (m > 11) { m = 0; y += 1; }
      const t = Date.UTC(y, m + 1, 0); // last day of month
      if (t >= end) break;
      rows.push({ periodDate: t, plannedPercent: round1(interpolate(base, t)) });
    }
    // include the first (partial) month end too
    const firstEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
    if (firstEnd > start && firstEnd < end && !rows.some((r) => r.periodDate === firstEnd))
      rows.unshift({ periodDate: firstEnd, plannedPercent: round1(interpolate(base, firstEnd)) });
  }
  rows.push({ periodDate: end, plannedPercent: 100 });
  return rows;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
}

export function formatRupiah(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 1e12) return `Rp ${(value / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
    if (abs >= 1e9) return `Rp ${(value / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
    if (abs >= 1e6) return `Rp ${(value / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;
}

// ---------------------------------------------------------------------------
// PAD (Pendapatan yang Akan Diterima) — projection by month
// ---------------------------------------------------------------------------

export type PadBucket = { key: string; label: string; amount: number; kind: "OVERDUE" | "MONTH" | "UNSCHEDULED" };

const monthKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/**
 * When is each rupiah of PAD expected? Unpaid terms land in the month they're
 * expected to be paid: an invoiced term on its due date (or invoice date +
 * overdue threshold), a planned term on its planned billing date. Anything
 * already past that date is "Tertunggak"; terms without a date, and contract
 * value not yet split into terms, are "Belum terjadwal".
 */
export function padSchedule(input: MonitoringInput, today: number, thresholds: MonitoringThresholds = DEFAULT_THRESHOLDS): PadBucket[] {
  if (input.status === "CANCELLED") return [];
  const out = new Map<string, PadBucket>();
  const add = (key: string, label: string, kind: PadBucket["kind"], amount: number) => {
    if (amount <= 0) return;
    const b = out.get(key) || { key, label, kind, amount: 0 };
    b.amount += amount;
    out.set(key, b);
  };
  for (const t of input.terms) {
    if (t.status === "PAID") {
      const short = t.amount - (t.paidAmount ?? t.amount);
      if (short > 0) add("UNSCHEDULED", "Belum terjadwal", "UNSCHEDULED", short);
      continue;
    }
    const expected =
      t.status === "INVOICED"
        ? t.dueDate ?? (t.invoiceDate !== null ? t.invoiceDate + thresholds.invoiceOverdueDays * DAY_MS : null)
        : t.plannedDate;
    if (expected === null) add("UNSCHEDULED", "Belum terjadwal", "UNSCHEDULED", t.amount);
    else if (expected < today) add("OVERDUE", "Tertunggak", "OVERDUE", t.amount);
    else add(monthKey(expected), monthLabel(monthKey(expected)), "MONTH", t.amount);
  }
  const termTotal = input.terms.reduce((s, t) => s + t.amount, 0);
  const uncovered = (input.contractValue ?? 0) - termTotal;
  if (uncovered > 0) add("UNSCHEDULED", "Belum terjadwal", "UNSCHEDULED", uncovered);

  const order = (b: PadBucket) => (b.kind === "OVERDUE" ? "0" : b.kind === "MONTH" ? `1${b.key}` : "2");
  return [...out.values()].sort((a, b) => order(a).localeCompare(order(b)));
}

/** Sum several projects' PAD schedules into one. */
export function mergePadSchedules(list: PadBucket[][]): PadBucket[] {
  const out = new Map<string, PadBucket>();
  for (const sched of list)
    for (const b of sched) {
      const e = out.get(b.key) || { ...b, amount: 0 };
      e.amount += b.amount;
      out.set(b.key, e);
    }
  const order = (b: PadBucket) => (b.kind === "OVERDUE" ? "0" : b.kind === "MONTH" ? `1${b.key}` : "2");
  return [...out.values()].sort((a, b) => order(a).localeCompare(order(b)));
}
