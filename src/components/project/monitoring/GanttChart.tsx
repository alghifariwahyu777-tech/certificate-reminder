"use client";

import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { MILESTONE_STATUS_LABEL, formatPercent } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { fmtDate } from "./shared";
import type { ProjectMonitoringDTO } from "./types";

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const t = (d: string | null | undefined) => (d ? Date.parse(d.slice(0, 10)) : null);

/**
 * Gantt chart of the project's milestones: the grey bar is the plan (planned
 * start to planned finish), the coloured bar inside it what actually happened
 * (actual start to finish, or to today while the work is running). A milestone
 * without a planned start starts where the previous one was planned to end.
 */
export function GanttChart({ data }: { data: ProjectMonitoringDTO }) {
  const today = data.today;
  const projStart = t(data.startDate) ?? today;
  const projEnd = t(data.targetEndDate) ?? today;
  const forecastEnd = data.summary.forecastEndDate;
  const ms = [...data.milestones].sort((a, b) => a.sequence - b.sequence);

  let prevEnd = projStart;
  const rows = ms.map((m) => {
    const pEnd = t(m.plannedDate);
    const pStart = t(m.plannedStartDate) ?? (pEnd !== null ? Math.min(prevEnd, pEnd) : null);
    if (pEnd !== null) prevEnd = pEnd;
    const aStart = t(m.actualStartDate) ?? (m.status === "DONE" ? t(m.actualDate) : null);
    const aEnd = m.status === "DONE" ? t(m.actualDate) : aStart !== null ? today : null;
    const late = m.status !== "DONE" && pEnd !== null && pEnd < today;
    const lateFinish = m.status === "DONE" && pEnd !== null && aEnd !== null && aEnd > pEnd + DAY;
    return { m, pStart, pEnd, aStart, aEnd, late, lateFinish };
  });

  const all = [projStart, projEnd, today, forecastEnd, ...rows.flatMap((r) => [r.pStart, r.pEnd, r.aStart, r.aEnd])].filter((v): v is number => typeof v === "number");
  const min = Math.min(...all);
  const max = Math.max(...all) + 7 * DAY;
  const span = Math.max(DAY, max - min);
  const x = (v: number) => `${((v - min) / span) * 100}%`;
  const w = (a: number, b: number) => `${Math.max(0.6, ((b - a) / span) * 100)}%`;

  const ticks: { at: number; label: string }[] = [];
  const d0 = new Date(min);
  const months = Math.max(1, Math.round(span / (30 * DAY)));
  const step = months > 30 ? 6 : months > 14 ? 3 : months > 7 ? 2 : 1;
  for (let i = 0; ; i += step) {
    const at = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1 + i, 1);
    if (at > max) break;
    const dd = new Date(at);
    ticks.push({ at, label: dd.getUTCMonth() === 0 || ticks.length === 0 ? `${MONTHS[dd.getUTCMonth()]} ${String(dd.getUTCFullYear()).slice(2)}` : MONTHS[dd.getUTCMonth()] });
  }

  const s = data.summary;
  const planned = rows.filter((r) => r.pEnd !== null).length;

  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-1.5">
            Gantt chart
            <InfoTip label="Keterangan Gantt chart" guide="gantt">
              Setiap baris satu milestone. Batang abu-abu adalah rencana (rencana mulai sampai rencana selesai). Batang berwarna di dalamnya adalah realisasi: hijau selesai
              tepat waktu, biru sedang berjalan, merah terlambat. Garis tegak biru adalah hari ini, garis putus-putus target selesai project. Tanggal diisi pada daftar
              milestone di bawah.
            </InfoTip>
          </span>
        }
        description={
          ms.length === 0
            ? "Tambahkan milestone beserta rencana mulai dan selesai untuk membentuk Gantt chart."
            : `${ms.length} milestone, ${ms.filter((m) => m.status === "DONE").length} selesai, ${rows.filter((r) => r.late).length} terlambat. Progres ${formatPercent(s.actualPercent)} dari rencana ${formatPercent(s.plannedPercent)}.`
        }
      />
      <CardContent>
        {ms.length === 0 || planned === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {ms.length === 0 ? "Belum ada milestone." : "Milestone belum memiliki tanggal rencana. Ubah milestone dan isi rencana mulai dan selesai."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* month axis */}
              <div className="grid grid-cols-[minmax(11rem,15rem)_1fr] gap-3">
                <div />
                <div className="relative h-6 border-b border-line dark:border-slate-700">
                  {ticks.map((k) => (
                    <span key={k.at} className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10.5px] text-slate-500" style={{ left: x(k.at) }}>
                      {k.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                {/* gridlines and reference lines, behind every row */}
                <div className="pointer-events-none absolute inset-y-0 right-0 grid w-full grid-cols-[minmax(11rem,15rem)_1fr] gap-3">
                  <div />
                  <div className="relative">
                    {ticks.map((k) => (
                      <span key={k.at} className="absolute inset-y-0 border-l border-line/70 dark:border-slate-800" style={{ left: x(k.at) }} />
                    ))}
                    <span className="absolute inset-y-0 border-l-2 border-accent" style={{ left: x(today) }} title="Hari ini" />
                    <span className="absolute inset-y-0 border-l-2 border-dashed border-brand-blueDark dark:border-slate-300" style={{ left: x(projEnd) }} title="Target selesai" />
                    {forecastEnd && Math.abs(forecastEnd - projEnd) > 3 * DAY && (
                      <span className="absolute inset-y-0 border-l-2 border-dotted border-signal-expired" style={{ left: x(forecastEnd) }} title="Proyeksi selesai" />
                    )}
                  </div>
                </div>

                {/* whole project */}
                <div className="relative grid grid-cols-[minmax(11rem,15rem)_1fr] items-center gap-3 border-b border-line py-2 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink dark:text-slate-100">Keseluruhan project</p>
                    <p className="text-[11px] text-slate-500">
                      {fmtDate(data.startDate)} sampai {fmtDate(data.targetEndDate)}
                    </p>
                  </div>
                  <div className="relative h-5">
                    <span className="absolute top-1 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" style={{ left: x(projStart), width: w(projStart, projEnd) }} />
                    <span
                      className="absolute top-1 h-3 rounded-sm bg-brand-blueDark/80 dark:bg-slate-300"
                      style={{ left: x(projStart), width: w(projStart, projStart + ((projEnd - projStart) * Math.min(100, s.actualPercent)) / 100) }}
                      title={`Progres ${formatPercent(s.actualPercent)}`}
                    />
                  </div>
                </div>

                {rows.map(({ m, pStart, pEnd, aStart, aEnd, late, lateFinish }) => (
                  <div key={m.id} className="relative grid grid-cols-[minmax(11rem,15rem)_1fr] items-center gap-3 border-b border-line/60 py-2 last:border-0 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink dark:text-slate-100" title={m.name}>
                        {m.sequence}. {m.name}
                      </p>
                      <p className={cn("text-[11px]", late ? "font-semibold text-signal-expired" : "text-slate-500")}>
                        {late ? "Terlambat" : MILESTONE_STATUS_LABEL[m.status] ?? "Belum mulai"}, bobot {m.weight.toLocaleString("id-ID")}%
                      </p>
                    </div>
                    <div className="relative h-6">
                      {pStart !== null && pEnd !== null && (
                        <span
                          className="absolute top-0.5 h-5 rounded border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
                          style={{ left: x(pStart), width: w(pStart, pEnd) }}
                          title={`Rencana ${fmtDate(new Date(pStart).toISOString())} sampai ${fmtDate(new Date(pEnd).toISOString())}`}
                        />
                      )}
                      {aStart !== null && aEnd !== null && (
                        <span
                          className={cn(
                            "absolute top-[7px] h-2.5 rounded-sm",
                            m.status === "DONE" ? (lateFinish ? "bg-signal-expiredBar" : "bg-signal-activeBar") : late ? "bg-signal-expiredBar" : "bg-accent"
                          )}
                          style={{ left: x(aStart), width: w(aStart, aEnd) }}
                          title={`Realisasi ${fmtDate(new Date(aStart).toISOString())} sampai ${m.status === "DONE" ? fmtDate(new Date(aEnd).toISOString()) : "hari ini"}`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-5 rounded border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800" />
                  Rencana
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-sm bg-signal-activeBar" />
                  Selesai tepat waktu
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-sm bg-accent" />
                  Sedang berjalan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-sm bg-signal-expiredBar" />
                  Terlambat
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 border-l-2 border-accent" />
                  Hari ini
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 border-l-2 border-dashed border-brand-blueDark" />
                  Target selesai
                </span>
                {forecastEnd && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 border-l-2 border-dotted border-signal-expired" />
                    Proyeksi selesai {fmtDate(new Date(forecastEnd).toISOString())}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
