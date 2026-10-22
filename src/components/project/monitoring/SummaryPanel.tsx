"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  HEALTH_BADGE_CLASS,
  HEALTH_LABEL,
  formatPercent,
  formatRupiah,
  shortDate,
} from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { SCurveChart } from "./SCurveChart";
import { ProgressBar, Stat } from "./shared";
import type { ProjectMonitoringDTO } from "./types";

const PLAN_SOURCE_TEXT = {
  MANUAL: "Rencana dari tabel rencana progres.",
  MILESTONE: "Rencana dihitung dari tanggal rencana × bobot milestone.",
  LINEAR: "Belum ada rencana — dipakai garis lurus dari tanggal mulai ke target selesai.",
};

export function SummaryPanel({ data }: { data: ProjectMonitoringDTO }) {
  const s = data.summary;
  const ongoing = data.status === "ONGOING";
  const t = data.thresholds;
  const devTone = !ongoing ? "default" : -s.deviation >= t.deviationCritical ? "bad" : -s.deviation >= t.deviationWarning ? "warn" : "good";

  const alerts: { tone: "bad" | "warn" | "info"; text: string }[] = [];
  if (ongoing && s.isOverdue) alerts.push({ tone: "bad", text: `Project melewati target selesai ${Math.abs(s.daysRemaining)} hari.` });
  if (ongoing && s.isStale)
    alerts.push({
      tone: "warn",
      text: s.lastProgressUpdate
        ? `Progres belum diperbarui sejak ${shortDate(s.lastProgressUpdate)} (${s.daysSinceUpdate} hari).`
        : `Belum ada laporan progres sejak project dimulai (${s.daysSinceUpdate} hari).`,
    });
  if (s.overdueInvoiceCount > 0)
    alerts.push({ tone: "bad", text: `${s.overdueInvoiceCount} invoice lewat jatuh tempo (${formatRupiah(s.overdueInvoiceAmount)}).` });
  if (s.dueUnbilledCount > 0) alerts.push({ tone: "warn", text: `${s.dueUnbilledCount} termin sudah melewati rencana tagih tetapi belum ditagih.` });
  if (ongoing && s.unbilledEarned > 0 && s.contractValue > 0)
    alerts.push({ tone: "info", text: `Nilai pekerjaan selesai yang belum ditagih ± ${formatRupiah(s.unbilledEarned)}.` });
  if (s.openHighIssues > 0) alerts.push({ tone: "bad", text: `${s.openHighIssues} kendala/risiko berdampak tinggi masih terbuka.` });
  if (s.milestoneTotal > 0 && Math.abs(s.milestoneWeightTotal - 100) > 0.05)
    alerts.push({ tone: "info", text: `Total bobot milestone ${s.milestoneWeightTotal}% (idealnya 100%) — progres tetap dinormalisasi ke 100%.` });
  if (s.budgetUsedPercent !== null && s.budgetUsedPercent > 100)
    alerts.push({ tone: "bad", text: `Realisasi biaya melebihi anggaran (${formatPercent(s.budgetUsedPercent)}).` });

  return (
    <div className="space-y-5">
      <div className={cn("rounded-md border px-4 py-3 flex items-start gap-3", HEALTH_BADGE_CLASS[s.health])}>
        {s.health === "ON_TRACK" || s.health === "SELESAI" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-semibold text-sm">Status: {HEALTH_LABEL[s.health]}</p>
          <p className="text-sm opacity-90">{s.healthReason}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Progres fisik</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-2xl font-semibold tabular-nums text-ink dark:text-slate-100">{formatPercent(s.actualPercent)}</span>
            <span className="text-sm text-slate-500">realisasi · rencana {formatPercent(s.plannedPercent)}</span>
          </div>
          <ProgressBar value={s.actualPercent} marker={s.plannedPercent} className="mt-3" />
          <p className="mt-2 text-xs text-slate-500">
            {s.milestoneTotal > 0 ? `${s.milestoneDone}/${s.milestoneTotal} milestone selesai · ` : ""}
            Waktu terpakai {formatPercent(s.timeElapsedPercent)}
          </p>
        </div>
        <Stat
          label="Deviasi"
          tone={devTone}
          value={`${s.deviation > 0 ? "+" : ""}${s.deviation.toLocaleString("id-ID")} poin`}
          hint={s.deviation < 0 ? "di belakang rencana" : "sesuai/di depan rencana"}
        />
        <Stat
          label="SPI"
          tone={s.spi === null ? "default" : s.spi >= 1 ? "good" : s.spi >= 0.9 ? "warn" : "bad"}
          value={s.spi === null ? "-" : s.spi.toLocaleString("id-ID")}
          hint="realisasi ÷ rencana (≥ 1 = tepat waktu)"
        />
        <Stat
          label={ongoing ? (s.daysRemaining >= 0 ? "Sisa waktu" : "Terlambat") : "Target selesai"}
          tone={ongoing && s.daysRemaining < 0 ? "bad" : "default"}
          value={ongoing ? `${Math.abs(s.daysRemaining)} hari` : shortDate(new Date(data.targetEndDate).getTime())}
          hint={s.forecastEndDate ? `Prakiraan selesai ${shortDate(s.forecastEndDate)}` : undefined}
        />
        <Stat
          label="Tertagih / Terbayar"
          value={formatRupiah(s.invoiced, true)}
          hint={`Dibayar ${formatRupiah(s.paid, true)}${s.contractValue ? ` dari kontrak ${formatRupiah(s.contractValue, true)}` : ""}`}
        />
        <Stat
          label="Piutang"
          tone={s.overdueInvoiceCount > 0 ? "bad" : s.outstanding > 0 ? "warn" : "default"}
          value={formatRupiah(s.outstanding, true)}
          hint={s.overdueInvoiceCount > 0 ? `${s.overdueInvoiceCount} lewat jatuh tempo` : "invoice belum dibayar"}
        />
        <Stat
          label="Realisasi biaya"
          tone={s.budgetUsedPercent !== null && s.budgetUsedPercent > 100 ? "bad" : "default"}
          value={formatRupiah(s.costActual, true)}
          hint={
            s.budgetTotal > 0
              ? `${formatPercent(s.budgetUsedPercent)} dari anggaran${s.cpi !== null ? ` · CPI ${s.cpi.toLocaleString("id-ID")}` : ""}`
              : "anggaran belum diisi"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kurva S — Rencana vs Realisasi</CardTitle>
          <p className="text-xs text-slate-500 mt-1">{PLAN_SOURCE_TEXT[s.planSource]}</p>
        </CardHeader>
        <CardContent>
          <SCurveChart input={data.input} today={data.today} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perlu Perhatian</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-signal-active" /> Tidak ada hal yang perlu ditindaklanjuti.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  {a.tone === "info" ? (
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                  ) : (
                    <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", a.tone === "bad" ? "text-signal-expired" : "text-signal-soon")} />
                  )}
                  {a.text}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
