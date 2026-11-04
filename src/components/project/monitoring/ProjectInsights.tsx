"use client";

import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { formatRupiah } from "@/lib/project-monitoring-shared";
import type { ParetoItem } from "@/lib/portfolio-insights";
import { CashflowCard } from "./PortfolioMore";

/** The portfolio cash-flow chart, fed with this one project's months. */
export const ProjectCashflowCard = CashflowCard;

/**
 * Where this project's money went above plan, largest first: the same causes as
 * the portfolio Pareto, so a manager can go from the portfolio view to the
 * project that drives it and see the same numbers.
 */
export function ProjectCostCauseCard({ causes }: { causes: ParetoItem[] }) {
  const total = causes.reduce((s, c) => s + c.value, 0);
  const max = Math.max(1, ...causes.map((c) => c.value));
  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-1.5">
            Penyebab pembengkakan biaya
            <InfoTip label="Keterangan penyebab biaya" guide="pareto">
              Dihitung dari baris realisasi biaya. Biaya yang dicatat dengan penyebab &quot;Akibat keterlambatan&quot; atau &quot;Pekerjaan tambahan&quot; masuk ke kelompok
              itu (pekerjaan tambahan hanya bagian yang belum tertutup addendum). Biaya rutin dihitung per bagian RAB: realisasi dikurangi porsi RAB untuk progres yang
              sudah dicapai (RAB bagian x progres %). Isi kolom Penyebab saat mencatat biaya agar pengelompokan ini akurat.
            </InfoTip>
          </span>
        }
        description={causes.length ? `Total ${formatRupiah(total, true)} di atas rencana untuk pekerjaan yang sudah dikerjakan` : "Belum ada biaya di atas rencana"}
      />
      <CardContent>
        {causes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Biaya masih sesuai atau di bawah RAB untuk progres saat ini.</p>
        ) : (
          <ul className="space-y-2.5">
            {causes.map((c) => (
              <li key={c.label}>
                <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="font-medium text-ink dark:text-slate-100">{c.label}</span>
                  <span className="shrink-0 tabular-nums font-semibold text-signal-expired">
                    {formatRupiah(c.value, true)} <span className="font-normal text-slate-500">({Math.round((c.value / total) * 100)}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-signal-expiredBar" style={{ width: `${(c.value / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
