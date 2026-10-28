/**
 * Triple constraint (waktu · biaya · lingkup) and margin monitoring.
 * Pure functions (no DB) so server pages, the weekly report and client
 * charts all derive the same figures. Built on top of computeMonitoring().
 *
 * Definitions (cost side uses Earned Value Management):
 *  - BAC  = current RAB total (budget at completion)
 *  - AC   = actual cost recorded so far
 *  - EV   = progress% × BAC (budgeted cost of the work actually done)
 *  - CPI  = EV / AC  (≥ 1 = spending less than budgeted for the work done)
 *  - EAC  = AC + (BAC − EV) — "prakiraan biaya akhir jika sisa pekerjaan berjalan
 *           sesuai RAB": what has been spent, plus the RAB for the work not yet done.
 *           Deliberately simple and explainable; it never assumes the remaining
 *           work will be cheaper than planned, and any overrun already incurred
 *           carries straight through to the forecast.
 *
 * Margin, three views:
 *  - planned  = baseline contract − baseline RAB          (the plan when the project started)
 *  - actual   = progress% × contract − AC                  (margin on the work done so far)
 *  - forecast = current contract − EAC                     (expected margin at the end)
 *  - target   = the project's own target margin (from its RAB); every project has
 *               its own target, so portfolio views count projects below target
 *               rather than averaging percentages.
 * Cash position (paid − AC) is shown separately and deliberately NOT called
 * margin: it swings with billing timing, not with project performance.
 */
import { DAY_MS, actualAt, actualEvents, actualLineAt, interpolate, plannedPoints, projectStart, type MonitoringInput, type MonitoringSummary } from "@/lib/project-monitoring-shared";

export type Signal = "good" | "warn" | "bad" | "none";

export type BridgeStep = { key: string; label: string; amount: number; kind: "start" | "delta" | "end" };

/** Short axis labels for the bridge chart (full label is shown in the legend list). */
export const BRIDGE_SHORT: Record<string, string> = {
  planned: "Awal",
  addendum: "Addendum",
  rab: "Revisi RAB",
  delay: "Keterlambatan",
  extra: "Kerja tambahan",
  overrun: "Biaya rutin",
  forecast: "Prakiraan",
};

export type MarginAnalysis = {
  baselineLocked: boolean;
  // data availability
  hasContract: boolean;
  hasBudget: boolean;
  hasCost: boolean;
  /** a forecast needs a RAB (or a finished project) */
  forecastReliable: boolean;

  // money
  contract: number;
  baselineContract: number;
  budget: number; // BAC
  baselineBudget: number;
  actualCost: number; // AC
  earnedValueCost: number; // EV (cost basis)
  earnedRevenue: number; // progress × contract
  eac: number;
  cpi: number | null;

  plannedMargin: number;
  plannedMarginPct: number | null;
  actualMargin: number | null;
  actualMarginPct: number | null;
  forecastMargin: number;
  forecastMarginPct: number | null;
  cashPosition: number;

  /** the project's target margin (%) — own target, else the baseline margin */
  targetMarginPct: number | null;
  targetSource: "project" | "baseline" | null;
  /** forecast margin is below target (by more than the 1-point tolerance) */
  belowTarget: boolean;
  /** Rupiah short of the target margin at completion (0 when on/above target) */
  targetGap: number;

  // time
  spi: number | null;
  delayDays: number | null; // forecast end − baseline end (positive = late)

  // scope
  scopeValueChange: number; // contract − baseline contract (addenda)
  scopeChangePct: number | null;
  extraScopeCost: number; // expenses tagged EXTRA_SCOPE
  delayCost: number; // expenses tagged DELAY
  unbilledExtraScope: number; // extra-scope cost not covered by a contract value increase

  overBudgetCategories: { category: string; budget: number; actual: number; over: number }[];
  bridge: BridgeStep[];
  /** one plain sentence: why the margin moved (empty when on plan) */
  cause: string;

  signals: { time: Signal; cost: Signal; scope: Signal; margin: Signal };
};

const round1 = (v: number) => Math.round(v * 10) / 10;

export function analyzeMargin(input: MonitoringInput, summary: MonitoringSummary, today: number, marginAlert = 10): MarginAnalysis {
  const contract = input.contractValue ?? 0;
  const budget = input.budgetItems.reduce((s, b) => s + b.amount, 0);
  const actualCost = input.expenses.reduce((s, e) => s + e.amount, 0);
  const bl = input.baseline ?? null;
  const baselineContract = bl?.contractValue ?? contract;
  const baselineBudget = bl?.budget ?? budget;
  const completed = input.status === "COMPLETED";
  const progress = completed ? 1 : Math.min(1, Math.max(0, summary.actualPercent / 100));

  const delayCost = input.expenses.filter((e) => e.cause === "DELAY").reduce((s, e) => s + e.amount, 0);
  const extraScopeCost = input.expenses.filter((e) => e.cause === "EXTRA_SCOPE").reduce((s, e) => s + e.amount, 0);
  const normalCost = actualCost - delayCost - extraScopeCost;
  const earnedValueCost = progress * budget;
  const earnedRevenue = progress * contract;
  const cpi = actualCost > 0 && earnedValueCost > 0 ? earnedValueCost / actualCost : null;
  const forecastReliable = completed || budget > 0;

  // spent so far + RAB for the remaining work
  const eac = completed || progress >= 1 ? actualCost : actualCost + Math.max(0, budget - earnedValueCost);
  void normalCost;

  const plannedMargin = baselineContract - baselineBudget;
  const forecastMargin = contract - eac;
  const actualMargin = actualCost > 0 && earnedRevenue > 0 ? earnedRevenue - actualCost : null;

  const scopeValueChange = contract - baselineContract;
  const unbilledExtraScope = Math.max(0, extraScopeCost - Math.max(0, scopeValueChange));

  // categories: actual vs current RAB
  const byCat = new Map<string, { budget: number; actual: number }>();
  for (const b of input.budgetItems) {
    const k = b.category || "Lainnya";
    const r = byCat.get(k) || { budget: 0, actual: 0 };
    r.budget += b.amount;
    byCat.set(k, r);
  }
  for (const e of input.expenses) {
    const k = e.category || "Lainnya";
    const r = byCat.get(k) || { budget: 0, actual: 0 };
    r.actual += e.amount;
    byCat.set(k, r);
  }
  const overBudgetCategories = [...byCat.entries()]
    .map(([category, v]) => ({ category, budget: v.budget, actual: v.actual, over: v.actual - v.budget }))
    .filter((c) => c.over > 0)
    .sort((a, b) => b.over - a.over);

  // margin bridge: planned → forecast, every step sums exactly
  const otherOverrun = eac - budget - delayCost - extraScopeCost;
  const bridge: BridgeStep[] = [{ key: "planned", label: "Margin awal (baseline)", amount: plannedMargin, kind: "start" }];
  if (Math.round(scopeValueChange)) bridge.push({ key: "addendum", label: "Perubahan nilai kontrak (addendum)", amount: scopeValueChange, kind: "delta" });
  if (Math.round(budget - baselineBudget)) bridge.push({ key: "rab", label: budget > baselineBudget ? "Revisi RAB (naik)" : "Revisi RAB (turun)", amount: -(budget - baselineBudget), kind: "delta" });
  if (Math.round(delayCost)) bridge.push({ key: "delay", label: "Biaya akibat keterlambatan", amount: -delayCost, kind: "delta" });
  if (Math.round(extraScopeCost)) bridge.push({ key: "extra", label: "Biaya pekerjaan tambahan", amount: -extraScopeCost, kind: "delta" });
  if (Math.round(otherOverrun))
    bridge.push({
      key: "overrun",
      label:
        otherOverrun > 0
          ? completed
            ? "Biaya rutin melebihi RAB"
            : "Biaya rutin melebihi RAB s.d. saat ini"
          : completed
            ? "Biaya rutin di bawah RAB"
            : "Biaya rutin di bawah RAB s.d. saat ini",
      amount: -otherOverrun,
      kind: "delta",
    });
  bridge.push({ key: "forecast", label: completed ? "Margin akhir" : "Prakiraan margin akhir", amount: forecastMargin, kind: "end" });

  // time
  const baselineEnd = bl?.endDate ?? input.targetEndDate;
  const endRef = completed ? input.actualEndDate : summary.forecastEndDate;
  const delayDays = endRef ? Math.round((endRef - baselineEnd) / DAY_MS) : summary.isOverdue ? Math.round((today - baselineEnd) / DAY_MS) : null;

  // without a RAB there is no plan to compare against and nothing to project the remaining cost from
  const plannedMarginPct = baselineContract > 0 && baselineBudget > 0 ? round1((plannedMargin / baselineContract) * 100) : null;
  const forecastMarginPct = contract > 0 && (budget > 0 || completed) ? round1((forecastMargin / contract) * 100) : null;
  const actualMarginPct = actualMargin !== null && earnedRevenue > 0 ? round1((actualMargin / earnedRevenue) * 100) : null;

  // signals
  const sig = (v: number | null, good: number, warn: number): Signal => (v === null ? "none" : v >= good ? "good" : v >= warn ? "warn" : "bad");
  const time: Signal = input.status !== "ONGOING" ? "none" : summary.isOverdue ? "bad" : sig(summary.spi, 0.95, 0.85);
  const cost: Signal = cpi === null ? "none" : sig(cpi, 0.95, 0.85);
  const scopeShare = contract > 0 ? unbilledExtraScope / contract : 0;
  const scope: Signal = !input.expenses.length && !Math.round(scopeValueChange) ? "none" : scopeShare > 0.05 ? "bad" : unbilledExtraScope > 0 ? "warn" : "good";
  // margin is judged against this project's own target, using the forecast at completion
  const ownTarget = input.targetMarginPct ?? null;
  const targetMarginPct = ownTarget ?? plannedMarginPct;
  const targetSource: MarginAnalysis["targetSource"] = ownTarget !== null ? "project" : plannedMarginPct !== null ? "baseline" : null;
  const gapPts = targetMarginPct !== null && forecastMarginPct !== null ? targetMarginPct - forecastMarginPct : null;
  const margin: Signal =
    gapPts === null || !actualCost
      ? "none"
      : forecastMarginPct !== null && forecastMarginPct < 0
        ? "bad"
        : gapPts >= marginAlert / 2
          ? "bad"
          : gapPts > 1
            ? "warn"
            : "good";
  const belowTarget = gapPts !== null && gapPts > 1 && !!actualCost;
  const targetGap = targetMarginPct !== null && contract > 0 ? Math.max(0, (targetMarginPct / 100) * contract - forecastMargin) : 0;

  return {
    baselineLocked: !!bl,
    hasContract: contract > 0,
    hasBudget: budget > 0,
    hasCost: actualCost > 0,
    forecastReliable,
    contract,
    baselineContract,
    budget,
    baselineBudget,
    actualCost,
    earnedValueCost,
    earnedRevenue,
    eac,
    cpi: cpi === null ? null : Math.round(cpi * 100) / 100,
    plannedMargin,
    plannedMarginPct,
    actualMargin,
    actualMarginPct,
    forecastMargin,
    forecastMarginPct,
    cashPosition: summary.paid - actualCost,
    targetMarginPct,
    targetSource,
    belowTarget,
    targetGap: belowTarget ? targetGap : 0,
    spi: summary.spi,
    delayDays,
    scopeValueChange,
    scopeChangePct: baselineContract > 0 ? round1((scopeValueChange / baselineContract) * 100) : null,
    extraScopeCost,
    delayCost,
    unbilledExtraScope,
    overBudgetCategories,
    bridge,
    cause: describeCause(bridge, overBudgetCategories, unbilledExtraScope),
    signals: { time, cost, scope, margin },
  };
}

function rp(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `Rp ${(a / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (a >= 1e6) return `Rp ${(a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return `Rp ${Math.round(a).toLocaleString("id-ID")}`;
}

/** "Penyebab utama: biaya akibat keterlambatan Rp 70 jt; biaya pekerjaan tambahan Rp 60 jt (Rp 40 jt belum tertutup addendum); …" */
function describeCause(bridge: BridgeStep[], over: MarginAnalysis["overBudgetCategories"], unbilledExtra: number): string {
  const negatives = bridge.filter((b) => b.kind === "delta" && b.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 3);
  if (!negatives.length) return "";
  const parts = negatives.map((b) => {
    let t = `${b.label.charAt(0).toLowerCase()}${b.label.slice(1)} ${rp(b.amount)}`;
    if (b.key === "overrun" && over.length) t += ` (terutama ${over.slice(0, 2).map((c) => c.category).join(" dan ")})`;
    if (b.key === "extra" && unbilledExtra > 0) t += ` (${rp(unbilledExtra)} belum tertutup addendum)`;
    return t;
  });
  return `Penyebab utama: ${parts.join("; ")}.`;
}

// ---------------------------------------------------------------------------
// Cost curve (Earned Value chart)
// ---------------------------------------------------------------------------

export type CostCurveRow = { t: number; pv: number; ev: number | null; ac: number | null; eac: number | null };

/** Weekly/biweekly points of planned value, earned value and actual cost (Rp), plus the EAC projection to the forecast end. */
export function buildCostCurve(input: MonitoringInput, summary: MonitoringSummary, m: MarginAnalysis, today: number): CostCurveRow[] {
  const start = projectStart(input);
  const plan = plannedPoints(input).points;
  const events = actualEvents(input);
  const costs = [...input.expenses].filter((e) => e.date !== undefined).sort((a, b) => (a.date as number) - (b.date as number));
  const lastData = Math.max(today, ...costs.map((c) => c.date as number));
  const forecastEnd = Math.max(input.targetEndDate, summary.forecastEndDate ?? input.targetEndDate);
  const end = input.status === "ONGOING" ? Math.max(forecastEnd, lastData) : Math.max(input.actualEndDate ?? lastData, lastData);
  const span = Math.max(1, (end - start) / DAY_MS);
  const step = (span <= 120 ? 7 : span <= 540 ? 14 : 30) * DAY_MS;

  const times = new Set<number>();
  for (let t = start; t < end; t += step) times.add(t);
  times.add(end);
  if (today > start && today < end) times.add(today);
  const cutoff = input.status === "ONGOING" ? today : end;

  const acAt = (t: number) => costs.reduce((s, c) => ((c.date as number) <= t ? s + c.amount : s), 0);
  return [...times]
    .sort((a, b) => a - b)
    .map((t) => {
      const past = t <= cutoff;
      const projecting = input.status === "ONGOING" && t >= today;
      const eacVal = projecting ? m.actualCost + ((m.eac - m.actualCost) * (t - today)) / Math.max(1, forecastEnd - today) : null;
      return {
        t,
        pv: Math.round((interpolate(plan, t) / 100) * m.budget),
        ev: past ? Math.round((actualLineAt(events, start, t) / 100) * m.budget) : null,
        ac: past ? Math.round(acAt(t)) : null,
        eac: projecting ? Math.round(Math.min(m.eac, eacVal as number)) : null,
      };
    });
}

export type MarginTimelineRow = { t: number; forecastMarginPct: number | null; actualMarginPct: number | null; actualCost: number; progress: number };

/**
 * The margin forecast replayed from the project start to today: at each date,
 * the same formula as today (cost spent so far + RAB for the work not yet done)
 * is applied to the costs and progress known on that date. Contract value and
 * RAB are today's figures, so the line shows how cost and progress moved the
 * forecast, not how the RAB was revised.
 */
export function marginTimeline(input: MonitoringInput, today: number): MarginTimelineRow[] {
  const contract = input.contractValue ?? 0;
  const budget = input.budgetItems.reduce((s, b) => s + b.amount, 0);
  if (contract <= 0 || budget <= 0) return [];
  const start = projectStart(input);
  const end = input.status === "ONGOING" ? today : Math.max(start, Math.min(today, input.actualEndDate ?? today));
  if (end <= start) return [];
  const events = actualEvents(input);
  const costs = input.expenses.map((c) => ({ amount: c.amount, date: c.date ?? start }));
  const span = (end - start) / DAY_MS;
  const step = (span <= 120 ? 7 : span <= 540 ? 14 : 30) * DAY_MS;
  const times = new Set<number>();
  for (let t = start; t < end; t += step) times.add(t);
  times.add(end);
  return [...times]
    .sort((a, b) => a - b)
    .map((t) => {
      const ac = costs.reduce((s, c) => (c.date <= t ? s + c.amount : s), 0);
      const progress = Math.min(1, actualLineAt(events, start, t) / 100);
      const eac = progress >= 1 ? ac : ac + Math.max(0, budget - progress * budget);
      const earned = progress * contract;
      return {
        t,
        forecastMarginPct: round1(((contract - eac) / contract) * 100),
        // too early, the ratio swings wildly on tiny figures, so it starts once 10% of the work is done
        actualMarginPct: ac > 0 && progress >= 0.1 ? round1(((earned - ac) / earned) * 100) : null,
        actualCost: Math.round(ac),
        progress: round1(progress * 100),
      };
    });
}

export const SIGNAL_LABEL: Record<Signal, string> = { good: "Baik", warn: "Waspada", bad: "Kritis", none: "Belum ada data" };
export const CAUSE_LABEL: Record<string, string> = { NORMAL: "Normal", DELAY: "Akibat keterlambatan", EXTRA_SCOPE: "Pekerjaan tambahan" };

// ---------------------------------------------------------------------------
// Pendapatan, biaya, laba: RAB vs realisasi vs prakiraan (the finance view)
// ---------------------------------------------------------------------------

export type PnlLine = { plan: number | null; actual: number; forecast: number | null };
export type ProfitLoss = {
  revenue: PnlLine & { invoiced: number; paid: number };
  cost: PnlLine;
  profit: PnlLine;
  marginPct: { plan: number | null; actual: number | null; forecast: number | null };
  /** per RAB year (calendar year of the project start = "Tahun 1"), when the RAB has a yearly split */
  years: { label: string; year: number; revenuePlan: number; revenueActual: number; costPlan: number; costActual: number; marginPlan: number | null; marginActual: number | null; current: boolean; past: boolean }[];
};

/**
 * Revenue is recognised by progress ("progress basis", as in the RAB template):
 * realised revenue = progress × contract value. Billing and cash received are
 * shown alongside, since they move with the payment terms rather than the work.
 */
export function buildProfitLoss(
  input: MonitoringInput,
  summary: MonitoringSummary,
  m: MarginAnalysis,
  today: number,
  rabYears: { label: string; revenue: number; cost: number }[] = []
): ProfitLoss {
  const pct = (a: number, b: number) => (b > 0 ? round1((a / b) * 100) : null);
  const revenueActual = m.earnedRevenue;
  const profitActual = revenueActual - m.actualCost;
  const startYear = new Date(projectStart(input)).getUTCFullYear();
  const events = actualEvents(input);
  const thisYear = new Date(today).getUTCFullYear();
  const years = rabYears.map((y, i) => {
    const year = startYear + i;
    const from = Date.UTC(year, 0, 1);
    const to = Math.min(Date.UTC(year + 1, 0, 1) - 1, today);
    const earnedBy = (t: number) => (actualAt(events, t) / 100) * m.contract;
    const earned = to < from ? 0 : earnedBy(to) - earnedBy(from - 1);
    const cost = input.expenses.filter((e) => e.date !== undefined && e.date >= from && e.date <= to).reduce((a, e) => a + e.amount, 0);
    return {
      label: y.label,
      year,
      revenuePlan: y.revenue,
      revenueActual: Math.max(0, earned),
      costPlan: y.cost,
      costActual: cost,
      marginPlan: pct(y.revenue - y.cost, y.revenue),
      marginActual: earned > 0 ? pct(earned - cost, earned) : null,
      current: year === thisYear,
      past: year < thisYear,
    };
  });
  return {
    revenue: { plan: m.hasContract ? m.baselineContract : null, actual: revenueActual, forecast: m.hasContract ? m.contract : null, invoiced: summary.invoiced, paid: summary.paid },
    cost: { plan: m.hasBudget ? m.baselineBudget : null, actual: m.actualCost, forecast: m.hasBudget ? m.eac : null },
    profit: {
      plan: m.hasBudget && m.hasContract ? m.plannedMargin : null,
      actual: profitActual,
      forecast: m.hasBudget && m.hasContract ? m.forecastMargin : null,
    },
    marginPct: { plan: m.plannedMarginPct, actual: m.actualMarginPct, forecast: m.hasBudget ? m.forecastMarginPct : null },
    years,
  };
}
