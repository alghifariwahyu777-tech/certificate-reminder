import { prisma } from "@/lib/prisma";
import { getProjectWithMonitoring } from "@/lib/project-monitoring";
import { HEALTH_LABEL, MILESTONE_STATUS_LABEL, TERM_STATUS_LABEL, ISSUE_IMPACT_LABEL, ISSUE_TYPE_LABEL, buildSCurve, formatPercent, formatRupiah, shortDate, isInvoiceOverdue } from "@/lib/project-monitoring-shared";
import { certWarnings } from "@/lib/personnel-mapping";
import { formatLongDate, jakartaDay } from "@/lib/week";
import { PDF_COLOR, createReport, type PdfLine } from "@/lib/pdf-kit";
import { buildProfitLoss, marginTimeline } from "@/lib/project-margin";

/**
 * Detailed report of ONE project, for management wanting the full picture of a
 * single project (the weekly report stays the portfolio summary). Same formal
 * style as the weekly report: condition, actions, schedule, money, RAB vs
 * actual cost, margin with its causes, issues and team.
 */

const { BAD, WARN, GOOD, MUTED, BLUE, NAVY } = PDF_COLOR;
const SIG_COLOR: Record<string, string> = { good: GOOD, warn: WARN, bad: BAD, none: MUTED };
const SIG_WORD: Record<string, string> = { good: "Baik", warn: "Waspada", bad: "Kritis", none: "Belum ada data" };
const HEALTH_COLOR: Record<string, string> = { KRITIS: BAD, WASPADA: WARN, ON_TRACK: GOOD, SELESAI: BLUE, BATAL: MUTED };
const STATUS_LABEL: Record<string, string> = { ONGOING: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
const d = (v: Date | null | undefined) => (v ? shortDate(v.getTime()) : "-");

export async function generateProjectReportPdf(projectId: string): Promise<{ pdf: Buffer; fileName: string } | null> {
  const loaded = await getProjectWithMonitoring(projectId);
  if (!loaded) return null;
  const { project: p, summary: s, margin: m, input, today, thresholds } = loaded;
  const ongoing = p.status === "ONGOING";
  const memberIds = p.assignments.map((a) => a.employeeId);
  const certs = await prisma.personnelCertification.findMany({ where: { employeeId: { in: memberIds } }, select: { employeeId: true, certificationName: true, expiryDate: true, deletedAt: true } });
  const now = new Date();

  const r = createReport({
    title: `Laporan Detail Project ${p.projectNumber}`,
    headerLeft: "Laporan Detail Project",
    headerRight: p.projectNumber,
    headerRightSub: `Data per ${formatLongDate(jakartaDay(now))}`,
    footer: "PT Sucofindo (Persero)  ·  Dokumen internal, tidak untuk disebarluaskan",
  });
  const { doc, left, width } = r;

  // ------------------------------------------------------------ title & identity
  doc.font("PJS-Bold").fontSize(14).fillColor(PDF_COLOR.INK).text("LAPORAN DETAIL PROJECT", left, doc.y, { width, align: "center" });
  doc.font("PJS").fontSize(10).fillColor(MUTED).text(p.projectName, left, doc.y + 2, { width, align: "center" });
  doc.moveDown(1);
  r.keyValues([
    ["Nomor project", p.projectNumber],
    ["Klien", p.clientName],
    ["Kategori", p.category.name],
    ["PIC", p.pic],
    ["Nilai kontrak", formatRupiah(s.contractValue || null)],
    ["Status", `${STATUS_LABEL[p.status] ?? p.status} — ${HEALTH_LABEL[s.health]}`],
    ["Tanggal mulai", d(p.startDate)],
    ["Target selesai", `${d(p.targetEndDate)}${ongoing ? (s.daysRemaining >= 0 ? ` (sisa ${s.daysRemaining} hari)` : ` (terlambat ${Math.abs(s.daysRemaining)} hari)`) : ""}`],
  ]);

  // ------------------------------------------------------------ 1. condition
  r.section("Ringkasan kondisi");
  const parts = [s.healthReason.replace(/\.$/, "")];
  if (m.hasBudget && m.hasCost && m.forecastMarginPct !== null && m.targetMarginPct !== null)
    parts.push(`prakiraan margin akhir ${formatPercent(m.forecastMarginPct)} ${m.belowTarget ? "di bawah" : "sesuai"} target project ${formatPercent(m.targetMarginPct)}`);
  else if (!m.hasBudget) parts.push("RAB belum diunggah sehingga margin belum dapat dipantau");
  r.paragraph(parts.join("; ") + "." + (m.belowTarget && m.cause ? ` ${m.cause}` : ""), { bold: true, size: 9.5 });
  doc.moveDown(0.5);
  const cell = (main: string, sub: string, color: string): PdfLine[] => [
    { text: main, bold: true, color, size: 9 },
    { text: sub, color: MUTED, size: 7.5 },
  ];
  r.table(
    [
      { header: "Aspek", width: 70 },
      { header: "Kondisi", width: 70 },
      { header: "Angka utama", width: 120 },
      { header: "Keterangan", width: 240 },
    ],
    [
      {
        cells: [
          "Waktu",
          [{ text: SIG_WORD[m.signals.time], bold: true, color: SIG_COLOR[m.signals.time] }],
          cell(`${formatPercent(s.actualPercent)} / ${formatPercent(s.plannedPercent)}`, "realisasi / rencana", PDF_COLOR.INK),
          `Deviasi ${s.deviation > 0 ? "+" : ""}${s.deviation.toLocaleString("id-ID")} poin. ${s.forecastEndDate ? `Prakiraan selesai ${shortDate(s.forecastEndDate)}.` : ""} ${s.lastProgressUpdate ? `Update progres terakhir ${shortDate(s.lastProgressUpdate)}.` : "Belum ada laporan progres."}`,
        ],
      },
      {
        cells: [
          "Biaya",
          [{ text: m.hasBudget ? SIG_WORD[m.signals.cost] : "Belum ada data", bold: true, color: SIG_COLOR[m.hasBudget ? m.signals.cost : "none"] }],
          cell(formatRupiah(m.actualCost, true), m.hasBudget ? `dari RAB ${formatRupiah(m.budget, true)}` : "RAB belum ada", PDF_COLOR.INK),
          m.hasBudget ? `Terpakai ${formatPercent(s.budgetUsedPercent ?? 0)} dari RAB, sementara pekerjaan selesai ${formatPercent(s.actualPercent)}.` : "Unggah RAB untuk membandingkan biaya.",
        ],
      },
      {
        cells: [
          "Lingkup",
          [{ text: SIG_WORD[m.signals.scope], bold: true, color: SIG_COLOR[m.signals.scope] }],
          cell(s.milestoneTotal ? `${s.milestoneDone} / ${s.milestoneTotal}` : "-", "milestone selesai", PDF_COLOR.INK),
          `${m.scopeValueChange ? `Nilai kontrak berubah ${formatRupiah(m.scopeValueChange, true)} melalui addendum.` : "Tidak ada addendum nilai."}${m.unbilledExtraScope > 0 ? ` Pekerjaan tambahan ${formatRupiah(m.unbilledExtraScope, true)} belum tertutup addendum.` : ""}`,
        ],
      },
      {
        cells: [
          "Margin",
          [{ text: SIG_WORD[m.signals.margin], bold: true, color: SIG_COLOR[m.signals.margin] }],
          cell(m.hasBudget ? `${formatPercent(m.forecastMarginPct)} / ${formatPercent(m.targetMarginPct)}` : "-", "prakiraan akhir / target", PDF_COLOR.INK),
          m.belowTarget ? `Kurang ${formatRupiah(m.targetGap, true)} dari target margin.` : m.hasBudget && m.hasCost ? "Diprakirakan memenuhi target margin." : "Data biaya belum lengkap.",
        ],
      },
    ],
    { fontSize: 8 }
  );

  // ------------------------------------------------------------ 2. actions
  const actions: { tone: "bad" | "warn"; text: string }[] = [];
  if (ongoing && s.isOverdue) actions.push({ tone: "bad", text: `Project melewati target selesai ${Math.abs(s.daysRemaining)} hari.` });
  if (s.overdueInvoiceCount) actions.push({ tone: "bad", text: `${s.overdueInvoiceCount} invoice lewat jatuh tempo senilai ${formatRupiah(s.overdueInvoiceAmount, true)}; penagihan perlu dieskalasi.` });
  if (s.openHighIssues) actions.push({ tone: "bad", text: `${s.openHighIssues} kendala berdampak tinggi belum terselesaikan.` });
  if (m.signals.margin === "bad") actions.push({ tone: "bad", text: `Prakiraan margin jauh di bawah target. ${m.cause}` });
  if (ongoing && s.isStale) actions.push({ tone: "warn", text: `Data progres belum diperbarui selama ${s.daysSinceUpdate} hari.` });
  if (s.dueUnbilledCount) actions.push({ tone: "warn", text: `${s.dueUnbilledCount} termin sudah melewati rencana tagih tetapi belum ditagih.` });
  const teamWarn = p.assignments.flatMap((a) => certWarnings(certs.filter((c) => c.employeeId === a.employeeId), a.endDate ?? p.targetEndDate, jakartaDay(now)).map((w) => ({ person: a.employee.name, cert: w.name, expiryDate: w.expiryDate, expired: w.expired })));
  if (teamWarn.some((w) => w.expired)) actions.push({ tone: "bad", text: `Ada personil tim dengan sertifikasi yang sudah berakhir: ${[...new Set(teamWarn.filter((w) => w.expired).map((w) => w.person))].join(", ")}.` });
  r.section("Hal yang perlu ditindaklanjuti", 50);
  if (!actions.length) r.paragraph("Tidak ada hal yang perlu ditindaklanjuti saat ini.", { color: GOOD });
  actions.forEach((a, i) => {
    r.ensure(20);
    const y = doc.y;
    doc.font("PJS-Bold").fontSize(9).fillColor(a.tone === "bad" ? BAD : WARN).text(`${i + 1}.`, left, y, { width: 16 });
    doc.font("PJS").fontSize(9).fillColor(PDF_COLOR.INK).text(a.text, left + 16, y, { width: width - 16 });
    doc.moveDown(0.25);
  });

  // ------------------------------------------------------------ 3. schedule
  r.section("Jadwal dan progres", 230);
  const curve = buildSCurve(input, today);
  const ticks = curve.filter((_, i) => i % Math.max(1, Math.ceil(curve.length / 6)) === 0).map((c) => ({ x: c.t, text: shortDate(c.t) }));
  r.lineChart(
    [
      { points: curve.map((c) => ({ x: c.t, y: c.planned })), color: "#94A3B8", dash: true, label: "Rencana" },
      { points: curve.map((c) => ({ x: c.t, y: c.actual })), color: BLUE, label: "Realisasi" },
    ],
    { xLabels: ticks, marker: ongoing ? { x: today, text: "Hari ini" } : undefined }
  );
  if (p.milestones.length) {
    doc.moveDown(0.3);
    r.table(
      [
        { header: "No", width: 24, align: "center" },
        { header: "Milestone", width: 210 },
        { header: "Bobot", width: 45, align: "right" },
        { header: "Rencana", width: 70 },
        { header: "Aktual", width: 70 },
        { header: "Status", width: 75 },
      ],
      p.milestones.map((ms, i) => {
        const late = ms.status !== "DONE" && ms.plannedDate && ms.plannedDate.getTime() < today;
        return {
          cells: [String(i + 1), ms.name, `${Number(ms.weight).toLocaleString("id-ID")}%`, d(ms.plannedDate), d(ms.actualDate), late ? "Terlambat" : MILESTONE_STATUS_LABEL[ms.status] ?? ms.status],
          color: (c) => (c === 5 ? (late ? BAD : ms.status === "DONE" ? GOOD : undefined) : undefined),
        };
      })
    );
  }
  const reports = p.progressReports.slice(0, 5);
  if (reports.length) {
    doc.moveDown(0.3);
    r.table(
      [
        { header: "Tanggal", width: 70 },
        { header: "Progres", width: 55, align: "right" },
        { header: "Uraian", width: 270 },
        { header: "Dilaporkan oleh", width: 100 },
      ],
      reports.map((x) => ({ cells: [d(x.reportDate), formatPercent(Number(x.actualPercent)), x.summary || "-", x.createdBy || "-"] }))
    );
  }

  // ------------------------------------------------------------ 4. billing
  r.section("Penagihan dan pembayaran", 140);
  r.figures([
    { label: "Nilai kontrak", value: formatRupiah(s.contractValue || null, true) },
    { label: "Sudah dibayar", value: formatRupiah(s.paid, true), color: GOOD },
    { label: "Piutang", value: formatRupiah(s.outstanding, true), sub: s.overdueInvoiceCount ? `${s.overdueInvoiceCount} lewat jatuh tempo` : "Ditagih, belum dibayar", color: s.overdueInvoiceCount ? BAD : NAVY },
    { label: "PAD", value: formatRupiah(s.pad, true), sub: `Belum ditagih ${formatRupiah(s.padUnbilled, true)}` },
  ], 4);
  if (p.terms.length)
    r.table(
      [
        { header: "Termin", width: 140 },
        { header: "Nominal", width: 85, align: "right" },
        { header: "Status", width: 75 },
        { header: "Tanggal", width: 110 },
        { header: "Keterangan", width: 100 },
      ],
      p.terms.map((t) => {
        const overdue = isInvoiceOverdue({ status: t.status, invoiceDate: t.invoiceDate?.getTime() ?? null, dueDate: t.dueDate?.getTime() ?? null }, today, thresholds);
        return {
          cells: [
            t.name,
            formatRupiah(Number(t.amount), true),
            TERM_STATUS_LABEL[t.status] ?? t.status,
            t.status === "PAID" ? `Dibayar ${d(t.paidDate)}` : t.status === "INVOICED" ? `Jatuh tempo ${d(t.dueDate)}` : `Rencana tagih ${d(t.plannedDate)}`,
            overdue ? "Lewat jatuh tempo" : t.invoiceNumber || t.requirement || "-",
          ],
          color: (c) => (c === 4 && overdue ? BAD : undefined),
        };
      })
    );
  else r.paragraph("Termin pembayaran belum diisi.", { color: MUTED });

  // ------------------------------------------------------------ 5. RAB vs actual
  r.section("RAB, pendapatan, dan biaya", 150);
  if (!m.hasBudget) r.paragraph("RAB belum diunggah.", { color: MUTED });
  else {
    const rev = p.rabRevisions[0] ? await prisma.projectRabRevision.findUnique({ where: { id: p.rabRevisions[0].id }, select: { dataJson: true } }) : null;
    let years: { label: string; revenue: number; cost: number }[] = [];
    try {
      years = rev ? (JSON.parse(rev.dataJson).years ?? []) : [];
    } catch {
      years = [];
    }
    const pl = buildProfitLoss(input, s, m, today, years);
    const rp = (v: number | null) => (v === null ? "-" : formatRupiah(v, true));
    r.table(
      [
        { header: "", width: 110 },
        { header: "RAB", width: 110, align: "right" },
        { header: "Realisasi s.d. saat ini", width: 140, align: "right" },
        { header: "Prakiraan akhir", width: 110, align: "right" },
      ],
      [
        { cells: ["Pendapatan", rp(pl.revenue.plan), [{ text: rp(pl.revenue.actual), bold: true }, { text: `ditagih ${rp(pl.revenue.invoiced)}, diterima ${rp(pl.revenue.paid)}`, color: MUTED, size: 7 }], rp(pl.revenue.forecast)] },
        { cells: ["Biaya", rp(pl.cost.plan), rp(pl.cost.actual), rp(pl.cost.forecast)], color: (c) => (c === 3 && (pl.cost.forecast ?? 0) > (pl.cost.plan ?? Infinity) + 1 ? BAD : undefined) },
        { cells: ["Laba", rp(pl.profit.plan), rp(pl.profit.actual), rp(pl.profit.forecast)], bold: () => true },
        { cells: ["Margin", formatPercent(pl.marginPct.plan), formatPercent(pl.marginPct.actual), formatPercent(pl.marginPct.forecast)], bold: () => true, color: (c) => (c === 3 ? SIG_COLOR[m.signals.margin] : undefined) },
      ]
    );
    r.note("Pendapatan diakui sesuai progres pekerjaan (progress basis); ditagih dan diterima mengikuti termin. Laba operasi belum dikurangi overhead.");
    if (pl.years.length > 1) {
      doc.moveDown(0.4);
      r.table(
        [
          { header: "Per tahun", width: 90 },
          { header: "Pendapatan RAB", width: 80, align: "right" },
          { header: "Pendapatan realisasi", width: 80, align: "right" },
          { header: "Biaya RAB", width: 80, align: "right" },
          { header: "Biaya realisasi", width: 80, align: "right" },
          { header: "Margin RAB / realisasi", width: 90, align: "right" },
        ],
        pl.years.map((y) => ({
          cells: [`${y.label} (${y.year})`, rp(y.revenuePlan), y.past || y.current ? rp(y.revenueActual) : "-", rp(y.costPlan), y.past || y.current ? rp(y.costActual) : "-", `${formatPercent(y.marginPlan)} / ${formatPercent(y.marginActual)}`],
          color: (c) => (c === 4 && y.costActual > y.costPlan ? BAD : undefined),
        }))
      );
    }
    doc.moveDown(0.4);
    const byCat = new Map<string, { budget: number; actual: number }>();
    for (const b of p.budgetItems) byCat.set(b.category, { budget: (byCat.get(b.category)?.budget ?? 0) + Number(b.amount), actual: 0 });
    for (const e of p.expenses) {
      const x = byCat.get(e.category) ?? { budget: 0, actual: 0 };
      x.actual += Number(e.amount);
      byCat.set(e.category, x);
    }
    const rows = [...byCat.entries()].sort((a, b) => b[1].budget - a[1].budget);
    r.table(
      [
        { header: "Bagian biaya", width: 170 },
        { header: "RAB", width: 85, align: "right" },
        { header: "Realisasi", width: 85, align: "right" },
        { header: "Terpakai", width: 60, align: "right" },
        { header: "Catatan", width: 100 },
      ],
      [
        ...rows.map(([cat, v]) => {
          const pct = v.budget ? (v.actual / v.budget) * 100 : null;
          const over = pct !== null && pct > 100;
          const high = pct !== null && pct > s.actualPercent + 10;
          return {
            cells: [cat, v.budget ? formatRupiah(v.budget, true) : "-", formatRupiah(v.actual, true), pct === null ? "-" : formatPercent(pct, 0), !v.budget ? "Di luar RAB" : over ? "Melebihi RAB" : high ? "Di atas progres" : ""],
            color: (c: number) => (c === 4 ? (over || !v.budget ? BAD : high ? WARN : undefined) : undefined),
          };
        }),
        { cells: ["Total", formatRupiah(m.budget, true), formatRupiah(m.actualCost, true), formatPercent(s.budgetUsedPercent ?? 0, 0), `Progres ${formatPercent(s.actualPercent, 0)}`], bold: () => true },
      ]
    );
    r.note(`Kolom "Terpakai" dibandingkan dengan progres pekerjaan ${formatPercent(s.actualPercent)}: pemakaian yang jauh di atas progres menandakan biaya bagian tersebut berisiko melebihi RAB.`);
  }

  // ------------------------------------------------------------ 6. margin
  r.section("Margin", 160);
  if (!m.hasBudget || !m.hasContract) r.paragraph("Margin belum dapat dihitung karena nilai kontrak atau RAB belum tersedia.", { color: MUTED });
  else {
    r.figures([
      { label: "Target margin", value: formatPercent(m.targetMarginPct), sub: m.targetSource === "project" ? "Dari RAB project" : "Dari baseline" },
      { label: "Prakiraan margin akhir", value: formatPercent(m.forecastMarginPct), sub: formatRupiah(m.forecastMargin, true), color: SIG_COLOR[m.signals.margin] },
      { label: "Margin pekerjaan selesai", value: formatPercent(m.actualMarginPct), sub: m.actualMargin !== null ? formatRupiah(m.actualMargin, true) : undefined },
    ]);
    r.paragraph(
      `Cara menghitung: nilai kontrak ${formatRupiah(m.contract, true)} dikurangi (biaya yang sudah keluar ${formatRupiah(m.actualCost, true)} + sisa RAB untuk pekerjaan yang belum selesai ${formatRupiah(Math.max(0, m.eac - m.actualCost), true)}) = ${formatRupiah(m.forecastMargin, true)}.`,
      { size: 8.5 }
    );
    doc.moveDown(0.4);
    r.table(
      [
        { header: "Jembatan margin (dari rencana awal ke prakiraan)", width: 330 },
        { header: "Nilai", width: 120, align: "right" },
      ],
      m.bridge.map((b) => ({
        cells: [b.label, `${b.kind === "delta" ? (b.amount >= 0 ? "+" : "-") : ""}${formatRupiah(Math.abs(b.amount), true)}`],
        color: (c) => (c === 1 && b.kind === "delta" ? (b.amount < 0 ? BAD : GOOD) : undefined),
        bold: () => b.kind !== "delta",
      }))
    );
    if (m.cause) r.paragraph(m.cause, { size: 8.5 });
    const tl = marginTimeline(input, today);
    if (tl.length >= 2) {
      doc.moveDown(0.4);
      r.note("Perjalanan prakiraan margin akhir sejak project dimulai (dihitung ulang dengan biaya dan progres pada setiap tanggal).");
      const vals = tl.flatMap((x) => [x.forecastMarginPct, x.actualMarginPct]).filter((v): v is number => v !== null).concat(m.targetMarginPct ?? 0, 0);
      const stepY = 10;
      const lo = Math.floor(Math.min(...vals) / stepY) * stepY;
      const hi = Math.ceil(Math.max(...vals) / stepY) * stepY || stepY;
      const yTicks: number[] = [];
      for (let v = lo; v <= hi; v += Math.max(stepY, Math.ceil((hi - lo) / 5 / stepY) * stepY)) yTicks.push(v);
      if (yTicks[yTicks.length - 1] < hi) yTicks.push(hi);
      r.lineChart(
        [
          { points: tl.map((x) => ({ x: x.t, y: x.forecastMarginPct })), color: BLUE, label: "Prakiraan margin akhir" },
          { points: tl.map((x) => ({ x: x.t, y: x.actualMarginPct })), color: "#94A3B8", label: "Margin pekerjaan selesai" },
        ],
        {
          height: 110,
          yTicks,
          xLabels: tl.filter((_, i) => i % Math.max(1, Math.ceil(tl.length / 6)) === 0).map((x) => ({ x: x.t, text: shortDate(x.t) })),
          hLines: m.targetMarginPct !== null ? [{ y: m.targetMarginPct, color: "#123F6B", text: `Target ${formatPercent(m.targetMarginPct)}` }] : undefined,
        }
      );
    }
  }

  // ------------------------------------------------------------ 7. issues
  const open = p.issues.filter((i) => i.status === "OPEN");
  r.section("Kendala dan risiko terbuka", 60);
  if (!open.length) r.paragraph("Tidak ada kendala atau risiko yang terbuka.", { color: GOOD });
  else
    r.table(
      [
        { header: "Jenis", width: 55 },
        { header: "Uraian", width: 240 },
        { header: "Dampak", width: 55 },
        { header: "Penanggung jawab", width: 90 },
        { header: "Target", width: 60 },
      ],
      open.map((i) => ({
        cells: [ISSUE_TYPE_LABEL[i.type] ?? i.type, i.title, ISSUE_IMPACT_LABEL[i.impact] ?? i.impact, i.owner || "-", d(i.targetDate)],
        color: (c) => (c === 2 && i.impact === "HIGH" ? BAD : undefined),
      }))
    );

  // ------------------------------------------------------------ 8. team
  r.section("Tim project", 60);
  if (!p.assignments.length) r.paragraph("Belum ada personil yang ditugaskan.", { color: MUTED });
  else
    r.table(
      [
        { header: "Nama", width: 130 },
        { header: "Peran", width: 110 },
        { header: "Sertifikasi", width: 220 },
      ],
      p.assignments.map((a) => {
        const w = teamWarn.filter((x) => x.person === a.employee.name);
        return {
          cells: [a.employee.name, a.role, w.length ? w.map((x) => `${x.cert} ${x.expired ? "sudah berakhir" : "berakhir"} ${shortDate(Date.parse(x.expiryDate))}`).join("; ") : "Aman"],
          color: (c) => (c === 2 && w.length ? (w.some((x) => x.expired) ? BAD : WARN) : c === 2 ? GOOD : undefined),
        };
      })
    );

  doc.moveDown(1);
  r.note("Laporan ini disusun otomatis oleh Reminder System berdasarkan data progres, termin, biaya, dan kendala yang dicatat oleh PIC dan admin project.");

  const pdf = await r.finish();
  return { pdf, fileName: `laporan-project-${p.projectNumber.replace(/[^A-Za-z0-9-]+/g, "_")}.pdf` };
}

