/** Client-safe helpers for the portfolio dashboard (no database imports). */
import type { CashflowMonth, ParetoItem } from "@/lib/portfolio-insights";

/** Adds up the cash flow of the given projects month by month (cumulative recomputed). */
export function sumCashflow(series: CashflowMonth[][]): CashflowMonth[] {
  if (!series.length) return [];
  let cum = 0;
  return series[0].map((m, i) => {
    const inflow = series.reduce((s, x) => s + (x[i]?.inflow ?? 0), 0);
    const outflow = series.reduce((s, x) => s + (x[i]?.outflow ?? 0), 0);
    cum += inflow - outflow;
    return { ...m, inflow, outflow, net: inflow - outflow, cumulative: cum };
  });
}

/** Keeps only the given projects in a Pareto and re-sorts it. */
export function filterPareto(items: ParetoItem[], keep: (projectId: string) => boolean): ParetoItem[] {
  return items
    .map((x) => {
      const list = x.items.filter((p) => keep(p.id));
      return { ...x, items: list, projects: list.length, value: list.reduce((s, p) => s + p.value, 0) };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

