"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { CheckCircle2, Receipt, Wallet } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent, formatRupiah, projectStart, shortDate } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { SCurveChart } from "./SCurveChart";
import { ConstraintTile, Stat, type Tone } from "./shared";
import type { ProjectMonitoringDTO } from "./types";
import { Notice } from "@/components/ui/Notice";

const PLAN_SOURCE_LABEL = { MANUAL: "jadwal rencana project", MILESTONE: "tanggal dan bobot milestone", STANDARD: "kurva S standar" };

/** The one sentence a manager reads first: schedule condition, margin against target, and the main cause. */
function verdict(data: ProjectMonitoringDTO): string {
  const s = data.summary;
  const m = data.margin;
  const parts: string[] = [s.healthReason.replace(/\.$/, "")];
  if (m.hasBudget && m.hasCost && m.forecastMarginPct !== null && m.targetMarginPct !== null) {
    parts.push(
      m.belowTarget
        ? `proyeksi margin akhir ${formatPercent(m.forecastMarginPct)}, di bawah target project ${formatPercent(m.targetMarginPct)}`
        : `proyeksi margin akhir ${formatPercent(m.forecastMarginPct)}, sesuai target project ${formatPercent(m.targetMarginPct)}`
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

  const alerts: { tone: "bad" | "warn" | "info"; text: string; href?: string; action?: string }[] = [];
  if (ongoing && s.isOverdue) alerts.push({ tone: "bad", text: `Project melewati target selesai ${Math.abs(s.daysRemaining)} hari.`, href: "#jadwal/progres", action: "Lihat progres" });
  if (s.overdueInvoiceCount > 0) alerts.push({ tone: "bad", text: `${s.overdueInvoiceCount} invoice lewat jatuh tempo (${formatRupiah(s.overdueInvoiceAmount, true)}).`, href: "#keuangan/termin", action: "Lihat termin" });
  if (s.openHighIssues > 0) alerts.push({ tone: "bad", text: `${s.openHighIssues} kendala atau risiko berdampak tinggi masih terbuka.`, href: "#tim/kendala", action: "Lihat kendala" });
  const hse = data.hse.summary;
  if (hse.fatality + hse.lostTimeInjury > 0)
    alerts.push({ tone: "bad", text: `Tercatat ${hse.fatality + hse.lostTimeInjury} kecelakaan kerja dengan hilang hari kerja/fatal (LTIFR ${hse.ltifr?.toLocaleString("id-ID")}).`, href: "#tim/hse", action: "Lihat HSE" });
  if (ongoing && data.input.startDate !== null && data.today - (data.input.startDate ?? data.today) > 45 * 86400000) {
    const lastMonthEnd = Date.UTC(new Date(data.today).getUTCFullYear(), new Date(data.today).getUTCMonth(), 0);
    if (!hse.lastPeriod || hse.lastPeriod < lastMonthEnd)
      alerts.push({ tone: "warn", text: "Laporan HSE bulan lalu belum diisi.", href: data.canManage ? "#tim/hse/baru" : "#tim/hse", action: data.canManage ? "Isi laporan" : "Lihat HSE" });
  }
  if (data.team.some((x) => x.warnings.some((w) => w.expired))) alerts.push({ tone: "bad", text: "Ada personil tim dengan sertifikasi yang sudah berakhir.", href: "#tim/personil", action: "Lihat tim" });
  else if (data.team.some((x) => x.warnings.length)) alerts.push({ tone: "warn", text: "Ada sertifikasi personil tim yang berakhir sebelum penugasan selesai.", href: "#tim/personil", action: "Lihat tim" });
  if (m.belowTarget) alerts.push({ tone: m.signals.margin === "bad" ? "bad" : "warn", text: `Proyeksi margin kurang ${formatRupiah(m.targetGap, true)} dari target project.`, href: "#keuangan/margin", action: "Lihat margin" });
  if (s.budgetUsedPercent !== null && s.budgetUsedPercent > 100) alerts.push({ tone: "bad", text: `Realisasi biaya melebihi RAB (${formatPercent(s.budgetUsedPercent)}).`, href: "#keuangan/biaya", action: "Lihat biaya" });
  if (ongoing && s.isStale)
    alerts.push({
      tone: "warn",
      text: s.lastProgressUpdate ? `Data progres belum diperbarui selama ${s.daysSinceUpdate} hari.` : `Belum ada laporan progres sejak project dimulai (${s.daysSinceUpdate} hari).`,
      href: data.canManage ? "#jadwal/progres/baru" : "#jadwal/progres",
      action: data.canManage ? "Perbarui progres" : "Lihat progres",
    });
  if (s.dueUnbilledCount > 0) alerts.push({ tone: "warn", text: `${s.dueUnbilledCount} termin melewati rencana tagih tetapi belum ditagih.`, href: "#keuangan/termin", action: "Lihat termin" });
  if (data.status === "COMPLETED") {
    const c = data.closeout;
    const missing = [!c?.bappDate && "BAPP", !c?.bastDate && "BAST", !c?.finalReportDate && "laporan final"].filter(Boolean);
    if (missing.length) alerts.push({ tone: "warn", text: `Penutupan belum lengkap: ${missing.join(", ")} belum dicatat.`, href: "#dokumen/penutupan", action: "Lengkapi" });
  }
  if (ongoing && s.unbilledEarned > 0 && s.contractValue > 0) alerts.push({ tone: "info", text: `Nilai pekerjaan selesai yang belum ditagih sekitar ${formatRupiah(s.unbilledEarned, true)}.`, href: "#keuangan/termin", action: "Lihat termin" });
  if (s.milestoneTotal > 0 && Math.abs(s.milestoneWeightTotal - 100) > 0.05)
    alerts.push({ tone: "info", text: `Total bobot milestone ${s.milestoneWeightTotal}% (idealnya 100%); progres tetap dinormalisasi ke 100%.`, href: "#jadwal/milestone", action: "Lihat milestone" });

  const timeTone: Tone = m.signals.time;
  const costTone: Tone = m.signals.cost;
  const scopeTone: Tone = m.signals.scope;
  const marginTone: Tone = m.signals.margin;
  const verdictBorder = { KRITIS: "border-l-signal-expiredBar", WASPADA: "border-l-signal-soonBar", ON_TRACK: "border-l-signal-activeBar", SELESAI: "border-l-accent", BATAL: "border-l-slate-300" }[s.health];

  return (
    <div className="space-y-4">
      {ongoing && <SetupChecklist data={data} />}
      <div className={cn("flex flex-col gap-3 rounded-lg border border-line border-l-4 bg-white px-5 py-4 sm:flex-row sm:items-start dark:border-slate-700 dark:bg-slate-900", verdictBorder)}>
        <span className={cn("stamp-badge shrink-0 self-start", HEALTH_BADGE_CLASS[s.health])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {HEALTH_LABEL[s.health]}
        </span>
        <p className="max-w-[75ch] text-[15px] leading-relaxed text-ink dark:text-slate-100">{verdict(data)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ConstraintTile
          href="#jadwal/progres"
          label="Waktu"
          tone={timeTone}
          value={
            <>
              {formatPercent(s.actualPercent)} <span className="text-sm font-medium text-slate-500">/ {formatPercent(s.plannedPercent)}</span>
            </>
          }
          sub={
            <>
              Progres realisasi / rencana.{" "}
              {ongoing ? (s.daysRemaining >= 0 ? `Sisa ${s.daysRemaining} hari` : `Terlambat ${Math.abs(s.daysRemaining)} hari`) : `Target ${shortDate(new Date(data.targetEndDate).getTime())}`}
              {data.trend ? `, ${data.trend > 0 ? "membaik" : "memburuk"} ${Math.abs(data.trend).toLocaleString("id-ID")} poin dari minggu lalu` : ""}
            </>
          }
        />
        <ConstraintTile
          href="#keuangan/biaya"
          label="Biaya"
          tone={m.hasBudget ? costTone : "none"}
          value={m.hasCost ? formatRupiah(m.actualCost, true) : "-"}
          sub={
            !m.hasBudget
              ? "RAB belum diunggah."
              : `Terpakai ${formatPercent(s.budgetUsedPercent ?? 0)} dari RAB ${formatRupiah(m.budget, true)}, sementara pekerjaan selesai ${formatPercent(s.actualPercent)}.`
          }
        />
        <ConstraintTile
          href="#jadwal/milestone"
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
          href="#keuangan/margin"
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
          sub={m.hasBudget ? (m.hasCost ? "Proyeksi margin akhir / target project." : "Catat realisasi biaya untuk melihat proyeksi.") : "Unggah RAB untuk memantau margin."}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 pt-4">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                Kurva S
                <InfoTip label="Keterangan kurva S">
                  Garis putus-putus adalah <strong>rencana</strong> progres kumulatif, garis biru adalah <strong>realisasi</strong>. Titik biru menandai tanggal laporan
                  progres atau milestone selesai. Rencana saat ini dibentuk dari {PLAN_SOURCE_LABEL[s.planSource]}
                  {s.planSource === "STANDARD" ? " (mulai pelan, tercepat di tengah, melambat di akhir) karena jadwal rencana belum diisi" : ""}.
                </InfoTip>
              </CardTitle>
              <p className="mt-0.5 text-[12.5px] text-slate-500">
                {shortDate(projectStart(data.input))} sampai {shortDate(new Date(data.targetEndDate).getTime())}, rencana dari {PLAN_SOURCE_LABEL[s.planSource]}.
                {data.canManage && (
                  <>
                    {" "}
                    <a href="#jadwal/progres/rencana" className="font-semibold text-accent hover:underline">
                      Atur rencana
                    </a>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-5 border-t-2 border-dashed border-slate-400" />
                Rencana
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-[3px] w-5 rounded bg-accent" />
                Realisasi
              </span>
            </div>
          </div>
          <CardContent>
            <SCurveChart input={data.input} today={data.today} />
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[12.5px] sm:grid-cols-4 dark:border-slate-800">
              <div>
                <dt className="text-slate-500">Realisasi</dt>
                <dd className="text-[15px] font-bold text-accent">{formatPercent(s.actualPercent)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Rencana s.d. hari ini</dt>
                <dd className="text-[15px] font-bold text-ink dark:text-slate-100">{formatPercent(s.plannedPercent)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Deviasi</dt>
                <dd className={cn("text-[15px] font-bold", s.deviation < -0.05 ? "text-signal-expired" : "text-signal-active")}>
                  {s.deviation > 0 ? "+" : ""}
                  {s.deviation.toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Laporan terakhir</dt>
                <dd className="text-[15px] font-bold text-ink dark:text-slate-100">{s.lastProgressUpdate ? shortDate(s.lastProgressUpdate) : "Belum ada"}</dd>
              </div>
            </dl>
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
                    <span className="flex-1">{a.text}</span>
                    {a.href && (
                      <a href={a.href} className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-accent hover:underline">
                        {a.action}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-baseline justify-between gap-3 pt-1">
        <p className="text-[13px] font-semibold text-ink dark:text-slate-100">Penagihan dan pembayaran</p>
        <a href="#keuangan/termin" className="text-[12.5px] font-semibold text-accent hover:underline">
          Lihat termin
        </a>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={CheckCircle2} label="Sudah dibayar" value={formatRupiah(s.paid, true)} hint={s.contractValue ? `dari nilai kontrak ${formatRupiah(s.contractValue, true)}` : undefined} />
        <Stat
          icon={Receipt}
          label="Piutang"
          tone={s.overdueInvoiceCount > 0 ? "bad" : "default"}
          value={formatRupiah(s.outstanding, true)}
          hint={s.overdueInvoiceCount > 0 ? `${s.overdueInvoiceCount} invoice lewat jatuh tempo` : "Sudah ditagih, belum dibayar"}
        />
        <Stat icon={Wallet} label="PAD" value={formatRupiah(s.pad, true)} hint={`Pendapatan yang akan diterima; belum ditagih ${formatRupiah(s.padUnbilled, true)}`} />
      </div>
    </div>
  );
}

/** First-run guide: what is still missing for this project to be monitored properly, each with a button straight to the place to fill it in. */
function SetupChecklist({ data }: { data: ProjectMonitoringDTO }) {
  const steps = [
    { done: data.rab.revisions.length > 0 || data.budgetItems.length > 0, label: "RAB", hint: "Dasar perhitungan biaya dan target margin.", href: "#keuangan/biaya/baru", action: "Unggah RAB" },
    { done: data.summary.planSource !== "STANDARD", label: "Jadwal rencana (kurva S)", hint: "Saat ini dipakai kurva S standar. Isi jadwal rencana atau milestone bertanggal agar lebih akurat.", href: "#jadwal/progres/rencana", action: "Atur rencana" },
    { done: data.terms.length > 0, label: "Termin pembayaran", hint: "Dasar penagihan dan PAD.", href: "#keuangan/termin/baru", action: "Isi termin" },
    { done: data.team.length > 0, label: "Tim project", hint: "Dasar penugasan personil dan pemantauan sertifikasi.", href: "#tim/personil/baru", action: "Tugaskan tim" },
    { done: data.reports.length > 0, label: "Laporan progres", hint: "Progres realisasi terbaru dari PIC.", href: "#jadwal/progres/baru", action: "Perbarui progres" },
  ];
  const left = steps.filter((x) => !x.done);
  if (!left.length) return null;
  return (
    <Notice tone="info">
      <p className="text-[14px] font-bold text-ink dark:text-slate-100">
        Lengkapi data project ({steps.length - left.length} dari {steps.length} sudah terisi)
      </p>
      <p className="mt-0.5 text-[12.5px] text-slate-600 dark:text-slate-300">Data berikut diperlukan agar kondisi project dapat dipantau dengan akurat.</p>
      <ul className="mt-3 divide-y divide-accent/10">
        {left.map((x) => (
          <li key={x.label} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13.5px] font-semibold text-ink dark:text-slate-100">{x.label}</p>
              <p className="text-[12.5px] text-slate-500">{x.hint}</p>
            </div>
            {data.canManage && (
              <a href={x.href} className="inline-flex shrink-0 items-center justify-center rounded-md border border-accent/40 bg-white px-3 py-1.5 text-[13px] font-semibold text-accent hover:bg-accent/5 dark:bg-slate-900">
                {x.action}
              </a>
            )}
          </li>
        ))}
      </ul>
    </Notice>
  );
}
