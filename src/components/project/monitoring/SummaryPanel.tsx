"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent, formatRupiah, shortDate } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { SCurveChart } from "./SCurveChart";
import { ConstraintTile, Stat, type Tone } from "./shared";
import type { ProjectMonitoringDTO } from "./types";

const PLAN_SOURCE_TEXT = {
  MANUAL: "Rencana dari tabel rencana progres.",
  MILESTONE: "Rencana dihitung dari tanggal rencana dan bobot milestone.",
  LINEAR: "Belum ada rencana progres; dipakai garis lurus dari tanggal mulai ke target selesai.",
};

/** The one sentence a manager reads first: schedule condition, margin against target, and the main cause. */
function verdict(data: ProjectMonitoringDTO): string {
  const s = data.summary;
  const m = data.margin;
  const parts: string[] = [s.healthReason.replace(/\.$/, "")];
  if (m.hasBudget && m.hasCost && m.forecastMarginPct !== null && m.targetMarginPct !== null) {
    parts.push(
      m.belowTarget
        ? `prakiraan margin akhir ${formatPercent(m.forecastMarginPct)}, di bawah target project ${formatPercent(m.targetMarginPct)}`
        : `prakiraan margin akhir ${formatPercent(m.forecastMarginPct)}, sesuai target project ${formatPercent(m.targetMarginPct)}`
    );
  } else if (!m.hasBudget) parts.push("RAB belum diunggah sehingga margin belum dapat dipantau");
  else if (!m.hasCost) parts.push("realisasi biaya belum dicatat");
  let text = parts.join("; ") + ".";
  if (m.belowTarget && m.cause) text += ` ${m.cause}`;
  return text;
}

export function SummaryPanel({ data }: { data: ProjectMonitoringDTO }) {
  const s = data.summary;
  const m = data.margin;
  const ongoing = data.status === "ONGOING";

  const alerts: { tone: "bad" | "warn" | "info"; text: string }[] = [];
  if (ongoing && s.isOverdue) alerts.push({ tone: "bad", text: `Project melewati target selesai ${Math.abs(s.daysRemaining)} hari.` });
  if (s.overdueInvoiceCount > 0) alerts.push({ tone: "bad", text: `${s.overdueInvoiceCount} invoice lewat jatuh tempo (${formatRupiah(s.overdueInvoiceAmount, true)}).` });
  if (s.openHighIssues > 0) alerts.push({ tone: "bad", text: `${s.openHighIssues} kendala atau risiko berdampak tinggi masih terbuka.` });
  if (data.team.some((x) => x.warnings.some((w) => w.expired))) alerts.push({ tone: "bad", text: "Ada personil tim dengan sertifikasi yang sudah berakhir." });
  else if (data.team.some((x) => x.warnings.length)) alerts.push({ tone: "warn", text: "Ada sertifikasi personil tim yang berakhir sebelum penugasan selesai." });
  if (m.belowTarget) alerts.push({ tone: m.signals.margin === "bad" ? "bad" : "warn", text: `Prakiraan margin kurang ${formatRupiah(m.targetGap, true)} dari target project.` });
  if (s.budgetUsedPercent !== null && s.budgetUsedPercent > 100) alerts.push({ tone: "bad", text: `Realisasi biaya melebihi RAB (${formatPercent(s.budgetUsedPercent)}).` });
  if (ongoing && s.isStale)
    alerts.push({
      tone: "warn",
      text: s.lastProgressUpdate ? `Data progres belum diperbarui selama ${s.daysSinceUpdate} hari.` : `Belum ada laporan progres sejak project dimulai (${s.daysSinceUpdate} hari).`,
    });
  if (s.dueUnbilledCount > 0) alerts.push({ tone: "warn", text: `${s.dueUnbilledCount} termin melewati rencana tagih tetapi belum ditagih.` });
  if (data.status === "COMPLETED") {
    const c = data.closeout;
    const missing = [!c?.bappDate && "BAPP", !c?.bastDate && "BAST", !c?.finalReportDate && "laporan final"].filter(Boolean);
    if (missing.length) alerts.push({ tone: "warn", text: `Penutupan belum lengkap: ${missing.join(", ")} belum dicatat.` });
  }
  if (ongoing && s.unbilledEarned > 0 && s.contractValue > 0) alerts.push({ tone: "info", text: `Nilai pekerjaan selesai yang belum ditagih sekitar ${formatRupiah(s.unbilledEarned, true)}.` });
  if (s.milestoneTotal > 0 && Math.abs(s.milestoneWeightTotal - 100) > 0.05)
    alerts.push({ tone: "info", text: `Total bobot milestone ${s.milestoneWeightTotal}% (idealnya 100%); progres tetap dinormalisasi ke 100%.` });

  const timeTone: Tone = m.signals.time;
  const costTone: Tone = m.signals.cost;
  const scopeTone: Tone = m.signals.scope;
  const marginTone: Tone = m.signals.margin;
  const verdictBorder = { KRITIS: "border-l-signal-expiredBar", WASPADA: "border-l-signal-soonBar", ON_TRACK: "border-l-signal-activeBar", SELESAI: "border-l-accent", BATAL: "border-l-slate-300" }[s.health];

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-col gap-3 rounded-lg border border-line border-l-4 bg-white px-5 py-4 sm:flex-row sm:items-start dark:border-slate-700 dark:bg-slate-900", verdictBorder)}>
        <span className={cn("stamp-badge shrink-0 self-start", HEALTH_BADGE_CLASS[s.health])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {HEALTH_LABEL[s.health]}
        </span>
        <p className="max-w-[75ch] text-[15px] leading-relaxed text-ink dark:text-slate-100">{verdict(data)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ConstraintTile
          label="Waktu"
          tone={timeTone}
          value={
            <>
              {formatPercent(s.actualPercent)} <span className="text-sm font-medium text-slate-500">/ {formatPercent(s.plannedPercent)}</span>
            </>
          }
          sub={
            <>
              Realisasi / rencana{s.spi !== null ? `, SPI ${s.spi.toLocaleString("id-ID")}` : ""}.{" "}
              {ongoing ? (s.daysRemaining >= 0 ? `Sisa ${s.daysRemaining} hari` : `Terlambat ${Math.abs(s.daysRemaining)} hari`) : `Target ${shortDate(new Date(data.targetEndDate).getTime())}`}
              {data.trend ? ` · ${data.trend > 0 ? "membaik" : "memburuk"} ${Math.abs(data.trend).toLocaleString("id-ID")} poin dari minggu lalu` : ""}
            </>
          }
        />
        <ConstraintTile
          label="Biaya"
          tone={m.hasBudget ? costTone : "none"}
          value={m.hasCost ? formatRupiah(m.actualCost, true) : "-"}
          sub={
            !m.hasBudget
              ? "RAB belum diunggah."
              : `Terpakai ${formatPercent(s.budgetUsedPercent ?? 0)} dari RAB ${formatRupiah(m.budget, true)}${m.cpi !== null ? `, CPI ${m.cpi.toLocaleString("id-ID")}` : ""}.`
          }
        />
        <ConstraintTile
          label="Lingkup"
          tone={scopeTone}
          value={s.milestoneTotal ? `${s.milestoneDone} / ${s.milestoneTotal}` : "-"}
          sub={
            <>
              {s.milestoneTotal ? "Milestone selesai" : "Belum ada milestone"}
              {m.scopeValueChange ? `, kontrak berubah ${formatRupiah(m.scopeValueChange, true)}` : ", tanpa addendum nilai"}
              {m.unbilledExtraScope > 0 ? `. Pekerjaan tambahan ${formatRupiah(m.unbilledExtraScope, true)} belum tertutup addendum.` : "."}
            </>
          }
        />
        <ConstraintTile
          label="Margin"
          tone={marginTone}
          value={
            m.forecastMarginPct !== null && m.hasBudget ? (
              <>
                {formatPercent(m.forecastMarginPct)} <span className="text-sm font-medium text-slate-500">/ {formatPercent(m.targetMarginPct)}</span>
              </>
            ) : (
              "-"
            )
          }
          sub={m.hasBudget ? "Prakiraan akhir / target project." : "Unggah RAB untuk memantau margin."}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="px-5 pt-4">
            <CardTitle>Kurva S</CardTitle>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{PLAN_SOURCE_TEXT[s.planSource]}</p>
          </div>
          <CardContent>
            <SCurveChart input={data.input} today={data.today} />
          </CardContent>
        </Card>
        <Card>
          <div className="px-5 pt-4">
            <CardTitle>Perlu tindakan</CardTitle>
          </div>
          <CardContent className="pt-1">
            {alerts.length === 0 ? (
              <p className="flex items-center gap-2 py-2 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-signal-active" /> Tidak ada hal yang perlu ditindaklanjuti.
              </p>
            ) : (
              <ul className="divide-y divide-line dark:divide-slate-800">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 py-2.5 text-[13.5px] text-slate-700 dark:text-slate-300">
                    <span className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", a.tone === "bad" ? "bg-signal-expiredBar" : a.tone === "warn" ? "bg-signal-soonBar" : "bg-accent")} />
                    {a.text}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Sudah dibayar" value={formatRupiah(s.paid, true)} hint={s.contractValue ? `dari nilai kontrak ${formatRupiah(s.contractValue, true)}` : undefined} />
        <Stat
          label="Piutang"
          tone={s.overdueInvoiceCount > 0 ? "bad" : "default"}
          value={formatRupiah(s.outstanding, true)}
          hint={s.overdueInvoiceCount > 0 ? `${s.overdueInvoiceCount} invoice lewat jatuh tempo` : "Sudah ditagih, belum dibayar"}
        />
        <Stat label="PAD" value={formatRupiah(s.pad, true)} hint={`Pendapatan yang akan diterima; belum ditagih ${formatRupiah(s.padUnbilled, true)}`} />
      </div>
    </div>
  );
}
