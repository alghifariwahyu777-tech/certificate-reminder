import { prisma } from "@/lib/prisma";
import { getProjectPortfolio, type PortfolioRow } from "@/lib/project-monitoring";
import {
  HEALTH_LABEL,
  formatPercent,
  formatRupiah,
  mergePadSchedules,
  type PadBucket,
  type ProjectHealth,
} from "@/lib/project-monitoring-shared";
import { getJakartaToday } from "@/lib/status";
import { formatLongDate, isoWeekInfo, isoWeekKey, jakartaDay } from "@/lib/week";
import { appUrl, brandedEmail, button, esc } from "@/lib/mail-layout";
import type { MarginAnalysis, Signal } from "@/lib/project-margin";

/** The follow-up asked of management for an eroded margin, chosen from its largest cause. */
function marginSuggestion(m: MarginAnalysis): string {
  const worst = m.bridge.filter((b) => b.kind === "delta" && b.amount < 0).sort((a, b) => a.amount - b.amount)[0];
  if (m.unbilledExtraScope > 0 && (!worst || worst.key === "extra"))
    return `Diperlukan keputusan untuk mengajukan addendum nilai kepada klien atas pekerjaan tambahan sebesar ${formatRupiah(m.unbilledExtraScope, true)}.`;
  if (worst?.key === "delay") return "Penyelesaian perlu dipercepat untuk menghentikan biaya akibat keterlambatan; kebutuhan addendum waktu perlu dievaluasi.";
  if (worst?.key === "overrun")
    return `Pengeluaran ${m.overBudgetCategories.length ? `kategori ${m.overBudgetCategories.slice(0, 2).map((c) => c.category).join(" dan ")}` : "project"} perlu ditinjau dan biaya sisa pekerjaan dikendalikan.`;
  if (worst?.key === "rab") return "Revisi RAB perlu ditinjau kesesuaiannya dengan nilai kontrak.";
  return "PIC perlu menyampaikan rencana pengendalian biaya untuk sisa pekerjaan.";
}

/**
 * Weekly management report — the replacement for each PM's own weekly
 * report to their superior. Built for a reader with one minute: headline,
 * four numbers, at most five things that need a decision, urgent
 * personnel/equipment, then a one-line-per-project table. The email body
 * carries the summary; the PDF carries the full detail.
 */

const DAY = 24 * 60 * 60 * 1000;
const SEVERITY: Record<ProjectHealth, number> = { KRITIS: 0, WASPADA: 1, ON_TRACK: 2, SELESAI: 3, BATAL: 4 };

/** `suggestion` = the decision/follow-up being asked of management, so each item is decision-ready. */
export type ActionItem = { tone: "bad" | "warn"; project?: string; projectId?: string; text: string; suggestion: string };
export type UrgentCert = { employee: string; nip: string | null; cert: string; expiryDate: string; days: number; onProjects: string[] };
export type UrgentEquipment = { name: string; assetNumber: string | null; pic: string; nextDate: string; days: number };
export type ReportProjectRow = {
  id: string;
  number: string;
  name: string;
  category: string;
  pic: string;
  client: string;
  contractValue: number;
  actual: number;
  planned: number;
  deviation: number;
  trend: number | null;
  health: ProjectHealth;
  daysRemaining: number;
  targetEndDate: string;
  /** progress data freshness */
  lastUpdate: string | null;
  daysSinceUpdate: number | null;
  stale: boolean;
  outstanding: number;
  pad: number;
  note: string;
  // triple constraint & margin
  spi: number | null;
  cpi: number | null;
  signals: { time: Signal; cost: Signal; scope: Signal; margin: Signal };
  hasCost: boolean;
  hasBudget: boolean;
  /** this project's own target margin — projects have different targets, so they are never averaged */
  targetMarginPct: number | null;
  actualMarginPct: number | null;
  forecastMarginPct: number | null;
  belowTarget: boolean;
  marginCause: string;
};

export type WeeklyReportData = {
  weekKey: string;
  generatedAt: Date;
  headline: string;
  kpi: {
    ongoing: number;
    kritis: number;
    waspada: number;
    onTrack: number;
    actual: number | null;
    planned: number | null;
    /** running projects only: contract = paid + outstandingOngoing + unbilled */
    contract: number;
    invoiced: number;
    paid: number;
    outstandingOngoing: number;
    unbilled: number;
    /** all projects (running + finished-but-unpaid) */
    outstanding: number;
    overdueInvoiceCount: number;
    overdueInvoiceAmount: number;
    pad: number;
    padOngoing: number;
    padCompleted: number;
    completedUnpaid: number;
    stale: number;
    /** running projects whose margin can be judged (RAB + cost data + target) */
    marginTracked: number;
    /** of those, how many are forecast to end below their own target margin */
    belowTarget: number;
    /** total Rupiah short of those projects' target margins */
    belowTargetGap: number;
    noCostData: number;
  };
  actions: ActionItem[];
  allActions: ActionItem[];
  moreActions: number;
  projects: ReportProjectRow[];
  urgentCerts: UrgentCert[];
  urgentEquipment: UrgentEquipment[];
  pad: PadBucket[];
  /** same periods as `pad`, split by project status */
  padSplit: { key: string; label: string; kind: PadBucket["kind"]; ongoing: number; completed: number; total: number }[];
  closeoutPending: { name: string; number: string }[];
};

const MAX_ACTIONS = 5;

function noteFor(r: PortfolioRow, lastSummary: string | null): string {
  const s = r.summary;
  if (s.isOverdue) return `Melewati target ${Math.abs(s.daysRemaining)} hari`;
  if (s.overdueInvoiceCount) return `${s.overdueInvoiceCount} invoice melewati jatuh tempo`;
  if (s.openHighIssues) return `${s.openHighIssues} kendala berdampak tinggi belum terselesaikan`;
  if (lastSummary) return lastSummary.length > 90 ? `${lastSummary.slice(0, 87)}…` : lastSummary;
  return "";
}

export async function buildWeeklyReport(): Promise<WeeklyReportData> {
  const { rows } = await getProjectPortfolio();
  const today = getJakartaToday();
  const todayMs = today.getTime();
  const ongoing = rows.filter((r) => r.status === "ONGOING");
  const completed = rows.filter((r) => r.status === "COMPLETED");

  // latest PIC narrative per project, for the one-line note
  const lastReports = await prisma.projectProgressReport.findMany({
    where: { projectId: { in: ongoing.map((r) => r.id) } },
    orderBy: { reportDate: "desc" },
    distinct: ["projectId"],
    select: { projectId: true, summary: true },
  });
  const lastById = new Map(lastReports.map((r) => [r.projectId, r.summary]));

  const sum = (f: (r: PortfolioRow) => number, list = rows) => list.reduce((s, r) => s + f(r), 0);
  const ongoingContract = sum((r) => r.summary.contractValue, ongoing);
  const weighted = (k: "actualPercent" | "plannedPercent") =>
    ongoing.length === 0
      ? null
      : ongoingContract > 0
        ? ongoing.reduce((s, r) => s + r.summary[k] * r.summary.contractValue, 0) / ongoingContract
        : ongoing.reduce((s, r) => s + r.summary[k], 0) / ongoing.length;

  const kpi = {
    ongoing: ongoing.length,
    kritis: ongoing.filter((r) => r.summary.health === "KRITIS").length,
    waspada: ongoing.filter((r) => r.summary.health === "WASPADA").length,
    onTrack: ongoing.filter((r) => r.summary.health === "ON_TRACK").length,
    actual: weighted("actualPercent"),
    planned: weighted("plannedPercent"),
    contract: ongoingContract,
    invoiced: sum((r) => r.summary.invoiced, ongoing),
    paid: sum((r) => r.summary.paid, ongoing),
    outstandingOngoing: sum((r) => r.summary.outstanding, ongoing),
    unbilled: sum((r) => r.summary.padUnbilled, ongoing),
    outstanding: sum((r) => r.summary.outstanding),
    overdueInvoiceCount: sum((r) => r.summary.overdueInvoiceCount),
    overdueInvoiceAmount: sum((r) => r.summary.overdueInvoiceAmount),
    pad: sum((r) => r.summary.pad),
    padOngoing: sum((r) => r.summary.pad, ongoing),
    padCompleted: sum((r) => r.summary.pad, completed),
    completedUnpaid: completed.filter((r) => r.summary.pad > 0).length,
    stale: ongoing.filter((r) => r.summary.isStale).length,
    ...(() => {
      const below = ongoing.filter((r) => r.margin.belowTarget);
      return {
        marginTracked: ongoing.filter((r) => r.margin.signals.margin !== "none").length,
        belowTarget: below.length,
        belowTargetGap: below.reduce((a, r) => a + r.margin.targetGap, 0),
        noCostData: ongoing.filter((r) => !r.margin.hasCost).length,
      };
    })(),
  };

  // --- urgent personnel certifications (≤ 30 days or already expired) ---
  const horizon = new Date(todayMs + 30 * DAY);
  const certs = await prisma.personnelCertification.findMany({
    where: { deletedAt: null, employee: { isActive: true } },
    select: {
      certificationName: true,
      expiryDate: true,
      employee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          assignments: { where: { project: { deletedAt: null, status: "ONGOING" } }, select: { project: { select: { projectName: true } } } },
        },
      },
    },
  });
  const latestCert = new Map<string, (typeof certs)[number]>();
  for (const c of certs) {
    const key = `${c.employee.id}|${c.certificationName.trim().toLowerCase()}`;
    const cur = latestCert.get(key);
    if (!cur || c.expiryDate > cur.expiryDate) latestCert.set(key, c);
  }
  const urgentCerts: UrgentCert[] = [...latestCert.values()]
    .filter((c) => c.expiryDate <= horizon)
    .map((c) => ({
      employee: c.employee.name,
      nip: c.employee.employeeId,
      cert: c.certificationName,
      expiryDate: c.expiryDate.toISOString().slice(0, 10),
      days: Math.round((c.expiryDate.getTime() - todayMs) / DAY),
      onProjects: c.employee.assignments.map((a) => a.project.projectName),
    }))
    // people currently on a running project first, then soonest expiry
    .sort((a, b) => Number(b.onProjects.length > 0) - Number(a.onProjects.length > 0) || a.days - b.days);

  // --- urgent equipment calibration ---
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, nextCalibrationDate: { lte: horizon } },
    select: { name: true, assetNumber: true, nextCalibrationDate: true, pic: { select: { name: true } } },
    orderBy: { nextCalibrationDate: "asc" },
  });
  const urgentEquipment: UrgentEquipment[] = equipment.map((e) => ({
    name: e.name,
    assetNumber: e.assetNumber,
    pic: e.pic.name,
    nextDate: e.nextCalibrationDate.toISOString().slice(0, 10),
    days: Math.round((e.nextCalibrationDate.getTime() - todayMs) / DAY),
  }));

  // --- things that need a decision/action, most severe first ---
  const actions: ActionItem[] = [];
  for (const r of [...ongoing].sort((a, b) => a.summary.deviation - b.summary.deviation)) {
    const s = r.summary;
    if (s.isOverdue) actions.push({ tone: "bad", project: r.projectName, projectId: r.id, text: `telah melewati target selesai ${Math.abs(s.daysRemaining)} hari dengan progres ${formatPercent(s.actualPercent)}.`, suggestion: "Diperlukan keputusan: pengajuan addendum waktu kepada klien atau percepatan pekerjaan (penambahan personil/lembur)." });
    else if (s.health === "KRITIS") actions.push({ tone: "bad", project: r.projectName, projectId: r.id, text: `berstatus kritis; ${s.healthReason.charAt(0).toLowerCase()}${s.healthReason.slice(1)}`, suggestion: s.openHighIssues ? "Diperlukan dukungan untuk menyelesaikan kendala yang menghambat, dilanjutkan dengan penetapan rencana pemulihan jadwal bersama PIC." : "PIC perlu menyampaikan rencana pemulihan jadwal; penambahan personil dapat dipertimbangkan." });
  }
  // forecast margin well below the project's own target (or negative)
  for (const r of ongoing.filter((x) => x.margin.signals.margin === "bad").sort((a, b) => b.margin.targetGap - a.margin.targetGap)) {
    const m = r.margin;
    actions.push({
      tone: "bad",
      project: r.projectName,
      projectId: r.id,
      text: `prakiraan margin akhir ${formatPercent(m.forecastMarginPct)}, di bawah target project ${formatPercent(m.targetMarginPct)} (kurang ${formatRupiah(m.targetGap, true)} dari target). ${m.cause}`.trim(),
      suggestion: marginSuggestion(m),
    });
  }
  for (const r of rows.filter((x) => x.summary.overdueInvoiceCount > 0))
    actions.push({ tone: "bad", project: r.projectName, projectId: r.id, text: `${r.summary.overdueInvoiceCount} invoice telah melewati jatuh tempo dengan nilai ${formatRupiah(r.summary.overdueInvoiceAmount, true)} yang belum dibayarkan.`, suggestion: "Penagihan perlu dieskalasi kepada pimpinan atau bagian keuangan klien." });
  for (const r of ongoing.filter((x) => x.summary.openHighIssues > 0))
    actions.push({ tone: "bad", project: r.projectName, projectId: r.id, text: `terdapat ${r.summary.openHighIssues} kendala berdampak tinggi yang belum terselesaikan.`, suggestion: "Diperlukan keputusan atau dukungan manajemen untuk penyelesaiannya (rincian pada Monitoring Project)." });
  const expiredOnDuty = urgentCerts.filter((c) => c.days < 0 && c.onProjects.length > 0);
  if (expiredOnDuty.length)
    actions.push({ tone: "bad", text: `Terdapat ${expiredOnDuty.length} personil yang masih bertugas dengan sertifikasi yang telah habis masa berlakunya (${expiredOnDuty.slice(0, 3).map((c) => c.employee).join(", ")}${expiredOnDuty.length > 3 ? ", …" : ""}).`, suggestion: "Personil perlu diganti atau sertifikasinya segera diperpanjang sebelum pekerjaan dilanjutkan." });
  for (const r of ongoing.filter((x) => x.trend !== null && x.trend <= -5 && x.summary.health !== "KRITIS"))
    actions.push({ tone: "warn", project: r.projectName, projectId: r.id, text: `deviasi memburuk ${Math.abs(r.trend as number)} poin dalam satu minggu terakhir.`, suggestion: "Penyebabnya perlu dikonfirmasi kepada PIC sebelum project menjadi kritis." });
  const overdueEq = urgentEquipment.filter((e) => e.days < 0).length;
  if (overdueEq) actions.push({ tone: "warn", text: `Terdapat ${overdueEq} alat yang telah melewati jadwal kalibrasi.`, suggestion: "Alat tersebut sebaiknya tidak digunakan untuk pekerjaan klien hingga kalibrasi dilakukan." });
  // Progress data not refreshed: one item per project (or one combined item when many), stating how old the data is.
  const staleRows = ongoing.filter((x) => x.summary.isStale).sort((a, b) => (b.summary.daysSinceUpdate ?? 0) - (a.summary.daysSinceUpdate ?? 0));
  const staleDays = (x: PortfolioRow) => x.summary.daysSinceUpdate ?? 0;
  if (staleRows.length > 0 && staleRows.length <= 3) {
    for (const x of staleRows)
      actions.push({
        tone: "warn",
        project: x.projectName,
        projectId: x.id,
        text: `data progres yang tersaji saat ini belum diperbarui selama ${staleDays(x)} hari.`,
        suggestion: "PIC perlu segera memperbarui progres agar laporan mencerminkan kondisi terkini.",
      });
  } else if (staleRows.length > 3) {
    actions.push({
      tone: "warn",
      text: `Data progres yang tersaji pada ${staleRows.length} project belum diperbarui selama ${staleDays(staleRows[staleRows.length - 1])}–${staleDays(staleRows[0])} hari (${staleRows.slice(0, 3).map((x) => x.projectName).join(", ")}, dan lainnya).`,
      suggestion: "Para PIC perlu segera memperbarui progres agar laporan mencerminkan kondisi terkini.",
    });
  }

  const projects: ReportProjectRow[] = ongoing
    .map((r) => ({
      id: r.id,
      number: r.projectNumber,
      name: r.projectName,
      category: r.categoryName,
      pic: r.pic,
      client: r.clientName,
      contractValue: r.summary.contractValue,
      actual: r.summary.actualPercent,
      planned: r.summary.plannedPercent,
      deviation: r.summary.deviation,
      trend: r.trend,
      health: r.summary.health,
      daysRemaining: r.summary.daysRemaining,
      targetEndDate: r.targetEndDate.slice(0, 10),
      lastUpdate: r.summary.lastProgressUpdate ? new Date(r.summary.lastProgressUpdate).toISOString().slice(0, 10) : null,
      daysSinceUpdate: r.summary.daysSinceUpdate,
      stale: r.summary.isStale,
      outstanding: r.summary.outstanding,
      pad: r.summary.pad,
      note: noteFor(r, lastById.get(r.id) ?? null),
      spi: r.summary.spi,
      cpi: r.margin.cpi,
      signals: r.margin.signals,
      hasCost: r.margin.hasCost,
      hasBudget: r.margin.hasBudget,
      targetMarginPct: r.margin.targetMarginPct,
      actualMarginPct: r.margin.actualMarginPct,
      forecastMarginPct: r.margin.hasCost && r.margin.hasBudget ? r.margin.forecastMarginPct : null,
      belowTarget: r.margin.belowTarget,
      marginCause: r.margin.cause,
    }))
    .sort((a, b) => SEVERITY[a.health] - SEVERITY[b.health] || a.deviation - b.deviation);

  const headline =
    kpi.ongoing === 0
      ? "Tidak terdapat project yang sedang berjalan pada minggu ini."
      : `Terdapat ${kpi.ongoing} project berjalan: ${kpi.kritis} kritis, ${kpi.waspada} waspada, dan ${kpi.onTrack} sesuai rencana. ` +
        `Progres portofolio mencapai ${formatPercent(kpi.actual)} dari rencana ${formatPercent(kpi.planned)}.`;

  return {
    weekKey: isoWeekKey(),
    generatedAt: new Date(),
    headline,
    kpi,
    actions: actions.slice(0, MAX_ACTIONS),
    allActions: actions,
    moreActions: Math.max(0, actions.length - MAX_ACTIONS),
    projects,
    urgentCerts,
    urgentEquipment,
    pad: mergePadSchedules(rows.map((r) => r.padSchedule)),
    padSplit: (() => {
      const on = mergePadSchedules(ongoing.map((r) => r.padSchedule));
      const done = mergePadSchedules(completed.map((r) => r.padSchedule));
      return mergePadSchedules([on, done]).map((b) => {
        const a = on.find((x) => x.key === b.key)?.amount ?? 0;
        const c = done.find((x) => x.key === b.key)?.amount ?? 0;
        return { key: b.key, label: b.label, kind: b.kind, ongoing: a, completed: c, total: a + c };
      });
    })(),
    closeoutPending: rows.filter((r) => r.closeoutComplete === false).map((r) => ({ name: r.projectName, number: r.projectNumber })),
  };
}

// ---------------------------------------------------------------------------
// Email body (the one-minute read)
// ---------------------------------------------------------------------------

const SIGNAL_COLOR: Record<Signal, string> = { good: "#15803D", warn: "#B45309", bad: "#B91C1C", none: "#64748B" };
const HEALTH_COLOR: Record<ProjectHealth, string> = { KRITIS: "#B91C1C", WASPADA: "#B45309", ON_TRACK: "#15803D", SELESAI: "#1671B8", BATAL: "#64748B" };

function kpiCell(label: string, value: string, sub: string, color = "#0F172A") {
  return `<td width="25%" valign="top" style="padding:10px;border:1px solid #E2E8F0;border-radius:6px;">
<div style="font-size:12px;color:#5B6B7F;">${esc(label)}</div>
<div style="font-size:19px;font-weight:bold;color:${color};margin-top:2px;">${esc(value)}</div>
<div style="font-size:11px;color:#64748B;margin-top:2px;">${esc(sub)}</div></td>`;
}

/** `logoSrc`: omit when sending (inline CID attachment); pass a data URI for in-app previews. */
export function renderWeeklyReportEmail(r: WeeklyReportData, opts: { logoSrc?: string } = {}): string {
  const wk = isoWeekInfo(r.generatedAt);
  const h3 = (n: number, t: string) =>
    `<h3 style="font-size:15px;color:#123F6B;margin:22px 0 6px;padding-bottom:4px;border-bottom:1px solid #E3E8EF;">${n}. ${esc(t)}</h3>`;
  const k = r.kpi;
  const kpis = `<table width="100%" cellpadding="0" cellspacing="6" style="margin:8px -6px 4px;"><tr>
${kpiCell("Project berjalan", String(k.ongoing), `${k.kritis} kritis · ${k.waspada} waspada · ${k.onTrack} sesuai rencana`, k.kritis ? "#B91C1C" : "#0F172A")}
${kpiCell("Progres", formatPercent(k.actual), `dari rencana ${formatPercent(k.planned)}`)}
${kpiCell("Piutang", formatRupiah(k.outstanding, true), `sudah ditagih, belum dibayar${k.overdueInvoiceCount ? ` · ${k.overdueInvoiceCount} invoice melewati jatuh tempo` : ""}`, k.overdueInvoiceCount ? "#B91C1C" : "#0F172A")}
${kpiCell("PAD", formatRupiah(k.pad, true), `project berjalan ${formatRupiah(k.padOngoing, true)} · project selesai ${formatRupiah(k.padCompleted, true)}`)}
</tr></table>`;

  // numbered list; the number's colour carries the urgency (red = segera, amber = perlu dipantau) — no extra bullet
  const actions = r.actions.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0;font-size:14px;">${r.actions
        .map(
          (a, i) =>
            `<tr><td valign="top" width="24" style="padding:5px 0;font-weight:bold;color:${a.tone === "bad" ? "#C2362F" : "#B7791F"};">${i + 1}.</td><td valign="top" style="padding:5px 0;color:#15202E;">${a.project ? `<strong>${esc(a.project)}</strong>: ` : ""}${esc(a.text)}<br/><span style="font-size:12px;color:#475569;">Usulan: ${esc(a.suggestion)}</span></td></tr>`
        )
        .join("")}</table>${r.moreActions ? `<p style="font-size:12px;color:#64748B;margin:4px 0 0;">Terdapat ${r.moreActions} butir lainnya pada lampiran PDF.</p>` : ""}`
    : `<p style="margin:6px 0 0;color:#15803D;">Tidak terdapat hal yang memerlukan keputusan pada minggu ini.</p>`;

  const certExpired = r.urgentCerts.filter((c) => c.days < 0).length;
  const eqExpired = r.urgentEquipment.filter((e) => e.days < 0).length;
  const urgentList = (items: string[]) => (items.length ? `<ul style="margin:4px 0 0;padding-left:18px;font-size:13px;">${items.join("")}</ul>` : "");
  const urgent =
    r.urgentCerts.length || r.urgentEquipment.length
      ? `${h3(3, "Sertifikasi personil & kalibrasi alat")}
<p style="margin:0;font-size:13px;">Dalam 30 hari ke depan: <strong>${r.urgentCerts.length}</strong> sertifikasi personil (${certExpired} telah berakhir) dan <strong>${r.urgentEquipment.length}</strong> jadwal kalibrasi alat (${eqExpired} terlewat).</p>
${urgentList(
  r.urgentCerts.slice(0, 5).map(
    (c) =>
      `<li>${esc(c.employee)} — ${esc(c.cert)}: <span style="color:${c.days < 0 ? "#B91C1C" : "#B45309"};">${c.days < 0 ? `telah berakhir ${Math.abs(c.days)} hari lalu` : `berakhir dalam ${c.days} hari`}</span>${c.onProjects.length ? ` <span style="color:#64748B;">(sedang bertugas di ${c.onProjects.length} project)</span>` : ""}</li>`
  )
)}
${urgentList(
  r.urgentEquipment.slice(0, 5).map(
    (e) =>
      `<li>${esc(e.name)}${e.assetNumber ? ` (${esc(e.assetNumber)})` : ""}: <span style="color:${e.days < 0 ? "#B91C1C" : "#B45309"};">${e.days < 0 ? `jadwal kalibrasi terlewat ${Math.abs(e.days)} hari` : `jadwal kalibrasi dalam ${e.days} hari`}</span></li>`
  )
)}`
      : "";

  const critical = r.projects.filter((p) => p.health === "KRITIS" || p.health === "WASPADA" || p.belowTarget);
  const shown = critical.length ? critical : r.projects.slice(0, 5);
  const rest = r.projects.length - shown.length;
  const table = r.projects.length
    ? `${h3(r.urgentCerts.length || r.urgentEquipment.length ? 4 : 3, critical.length ? "Project yang memerlukan perhatian" : "Project berjalan")}
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;border-collapse:collapse;">
<tr style="color:#64748B;text-align:left;"><th style="padding:6px 4px;border-bottom:1px solid #E2E8F0;">Project</th><th style="padding:6px 4px;border-bottom:1px solid #E2E8F0;text-align:right;">Nilai</th><th style="padding:6px 4px;border-bottom:1px solid #E2E8F0;text-align:right;">Progres <span style="font-weight:normal;">(<span style="color:#1671B8;">realisasi</span> / rencana)</span></th><th style="padding:6px 4px;border-bottom:1px solid #E2E8F0;text-align:right;">Target selesai</th><th style="padding:6px 4px;border-bottom:1px solid #E2E8F0;text-align:right;">Dev.</th><th style="padding:6px 4px;border-bottom:1px solid #E2E8F0;text-align:right;">Margin <span style="font-weight:normal;">(prakiraan / target)</span></th><th style="padding:6px 4px;border-bottom:1px solid #E2E8F0;">Status</th></tr>
${shown
  .map(
    (p) => `<tr><td style="padding:6px 4px;border-bottom:1px solid #F1F5F9;"><a href="${esc(appUrl(`/projects/${p.id}`))}" style="color:#0F172A;text-decoration:none;font-weight:bold;">${esc(p.name)}</a><br/><span style="color:#334155;">${esc(p.client)}</span><br/><span style="color:#64748B;">PIC ${esc(p.pic)}${p.note ? ` · ${esc(p.note)}` : ""}</span></td>
<td style="padding:6px 4px;border-bottom:1px solid #F1F5F9;text-align:right;white-space:nowrap;">${p.contractValue ? esc(formatRupiah(p.contractValue, true)) : "-"}</td>
<td style="padding:6px 4px;border-bottom:1px solid #F1F5F9;text-align:right;white-space:nowrap;"><strong style="color:#1671B8;">${formatPercent(p.actual)}</strong><br/><span style="color:#94A3B8;font-size:11px;">rencana ${formatPercent(p.planned)}</span>${
      p.stale ? `<br/><span style="color:#B45309;font-size:11px;">data ${p.daysSinceUpdate} hari lalu</span>` : ""
    }</td>
<td style="padding:6px 4px;border-bottom:1px solid #F1F5F9;text-align:right;white-space:nowrap;">${esc(formatLongDate(new Date(p.targetEndDate)))}<br/><span style="color:${p.daysRemaining < 0 ? "#B91C1C" : "#94A3B8"};">${p.daysRemaining >= 0 ? `sisa ${p.daysRemaining} hari` : `terlambat ${Math.abs(p.daysRemaining)} hari`}</span></td>
<td style="padding:6px 4px;border-bottom:1px solid #F1F5F9;text-align:right;white-space:nowrap;color:${HEALTH_COLOR[p.health]};">${p.deviation > 0 ? "+" : ""}${p.deviation.toLocaleString("id-ID")}${
      p.trend ? `<br/><span style="color:${p.trend > 0 ? "#15803D" : "#B91C1C"};">${p.trend > 0 ? "▲" : "▼"}${Math.abs(p.trend).toLocaleString("id-ID")}</span>` : ""
    }</td>
<td style="padding:6px 4px;border-bottom:1px solid #F1F5F9;text-align:right;white-space:nowrap;">${
      p.forecastMarginPct === null
        ? `<span style="color:#94A3B8;">-</span>`
        : `<strong style="color:${SIGNAL_COLOR[p.signals.margin]};">${formatPercent(p.forecastMarginPct)}</strong><br/><span style="color:#94A3B8;font-size:11px;">target ${formatPercent(p.targetMarginPct)}</span>`
    }</td>
<td style="padding:6px 4px;border-bottom:1px solid #F1F5F9;color:${HEALTH_COLOR[p.health]};font-weight:bold;">${HEALTH_LABEL[p.health]}</td></tr>`
  )
  .join("")}
</table>${rest > 0 ? `<p style="font-size:12px;color:#64748B;margin:6px 0 0;">Terdapat ${rest} project lainnya${critical.length ? " dengan status sesuai rencana" : ""}; rincian tersedia pada lampiran PDF.</p>` : ""}`
    : "";

  const body = `<p style="margin:0;font-size:17px;font-weight:bold;color:#0F172A;letter-spacing:0.02em;">LAPORAN MINGGUAN MONITORING PROJECT</p>
<p style="margin:2px 0 14px;font-size:12px;color:#64748B;">Periode ${esc(wk.label)} · data per ${esc(formatLongDate(jakartaDay(r.generatedAt)))}</p>
${h3(1, "Ringkasan")}
<p style="margin:0 0 6px;font-size:14px;color:#0F172A;"><strong>${esc(r.headline)}</strong></p>
${kpis}
${
  k.marginTracked > 0
    ? `<p style="margin:4px 0 0;font-size:13px;color:#334155;">${
        k.belowTarget
          ? `<strong style="color:#B91C1C;">${k.belowTarget} dari ${k.marginTracked} project</strong> diprakirakan berakhir di bawah target marginnya masing-masing, dengan total kekurangan ${esc(formatRupiah(k.belowTargetGap, true))} dari target.`
          : `Seluruh ${k.marginTracked} project yang memiliki data biaya diprakirakan memenuhi target marginnya masing-masing.`
      }${k.noCostData ? ` ${k.noCostData} project belum memiliki data biaya.` : ""}</p>`
    : ""
}
${h3(2, "Hal yang memerlukan keputusan")}
${actions}
${urgent}
${table}
<p style="margin-top:20px;">${button(appUrl("/projects/dashboard"), "Buka Monitoring Project")}</p>
<p style="font-size:12px;color:#64748B;">Rincian lengkap (seluruh project, proyeksi PAD per bulan, serta daftar sertifikasi dan kalibrasi) tersedia pada lampiran PDF.</p>`;

  return brandedEmail({
    kicker: "Laporan Mingguan Monitoring Project",
    subtitle: `<strong style="color:#123F6B;">Minggu ke-${wk.week} / ${wk.year}</strong><br/>${esc(wk.label)}`,
    body,
    width: 680,
    logoSrc: opts.logoSrc,
  });
}
