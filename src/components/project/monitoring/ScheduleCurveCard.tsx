"use client";

import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { formatPercent } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { SCurveChart } from "./SCurveChart";
import type { ProjectMonitoringDTO } from "./types";

const SOURCE: Record<string, string> = {
  ACTIVITY: "Rencana dihitung dari jadwal kegiatan.",
  MANUAL: "Rencana memakai kurva S resmi kontrak.",
  MILESTONE: "Rencana dihitung dari tanggal dan bobot kegiatan.",
  STANDARD: "Rencana memakai kurva S standar karena kegiatan belum punya tanggal.",
};

/** The project S-curve next to the schedule, so the effect of each activity update is visible right away. */
export function ScheduleCurveCard({ data }: { data: ProjectMonitoringDTO }) {
  const s = data.summary;
  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-1.5">
            Kurva S
            <InfoTip label="Keterangan kurva S" guide="progres">
              Garis putus-putus adalah rencana kumulatif: jumlah rencana harian setiap kegiatan dikali bobotnya. Garis biru adalah realisasi: jumlah realisasi setiap kegiatan
              dikali bobotnya, pada setiap tanggal pengisian.
            </InfoTip>
          </span>
        }
        description={`${SOURCE[s.planSource] ?? ""} Hari ini rencana ${formatPercent(s.plannedPercent)}, realisasi ${formatPercent(s.actualPercent)}.`}
        action={
          <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-bold", s.deviation < -0.05 ? "bg-[#FBEDEC] text-signal-expired" : "bg-[#EAF5EE] text-signal-active")}>
            Deviasi {s.deviation > 0 ? "+" : s.deviation < 0 ? "−" : ""}
            {Math.abs(s.deviation).toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin
          </span>
        }
      />
      <CardContent>
        <SCurveChart input={data.input} today={data.today} height={260} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dashed border-slate-400" />
            Rencana
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-5 rounded bg-accent" />
            Realisasi
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
