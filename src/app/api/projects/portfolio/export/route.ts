import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getProjectPortfolio } from "@/lib/project-monitoring";
import { HEALTH_LABEL, TERM_STATUS_LABEL, isInvoiceOverdue } from "@/lib/project-monitoring-shared";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = { ONGOING: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
const RUPIAH = '"Rp"#,##0';
const PCT = '0.0"%"';

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 30;
}

/** Excel export of the portfolio dashboard, honoring the same filters as the page. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") || "";
  const categoryId = sp.get("categoryId") || "";
  const pic = sp.get("pic") || "";
  const health = sp.get("health") || "";
  const q = (sp.get("q") || "").trim().toLowerCase();

  const { rows, thresholds, today } = await getProjectPortfolio();
  const filtered = rows.filter(
    (r) =>
      (!status || r.status === status) &&
      (!categoryId || r.categoryId === categoryId) &&
      (!pic || r.pic === pic) &&
      (!health || r.summary.health === health) &&
      (!q || [r.projectName, r.projectNumber, r.clientName, r.pic].some((v) => v.toLowerCase().includes(q)))
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "Reminder System";
  wb.created = new Date();

  // --- Sheet 1: one row per project -----------------------------------------
  const ws = wb.addWorksheet("Monitoring Project", { views: [{ state: "frozen", ySplit: 4, xSplit: 2 }] });
  ws.getCell(1, 1).value = "Monitoring Realisasi Project, PT Sucofindo (Persero)";
  ws.getCell(1, 1).font = { bold: true, size: 13 };
  ws.getCell(2, 1).value = `Dibuat: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}, ${filtered.length} project`;
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: "FF64748B" } };
  ws.addRow([]);

  const columns: { header: string; width: number; fmt?: string }[] = [
    { header: "No. Project", width: 18 },
    { header: "Nama Project", width: 40 },
    { header: "Kategori", width: 14 },
    { header: "Klien / Pemberi Kerja", width: 28 },
    { header: "PIC", width: 20 },
    { header: "Status", width: 12 },
    { header: "Kondisi", width: 12 },
    { header: "Keterangan Kondisi", width: 40 },
    { header: "Tgl Mulai", width: 12, fmt: "dd/mm/yyyy" },
    { header: "Target Selesai", width: 12, fmt: "dd/mm/yyyy" },
    { header: "Sisa Hari", width: 10 },
    { header: "Progres Rencana", width: 11, fmt: PCT },
    { header: "Progres Realisasi", width: 11, fmt: PCT },
    { header: "Deviasi (poin)", width: 10, fmt: "0.0" },
    { header: "Tren vs Minggu Lalu", width: 10, fmt: "+0.0;-0.0;0" },
    { header: "SPI", width: 8, fmt: "0.00" },
    { header: "Update Progres Terakhir", width: 13, fmt: "dd/mm/yyyy" },
    { header: "Milestone Selesai", width: 11 },
    { header: "Nilai Kontrak", width: 18, fmt: RUPIAH },
    { header: "Ditagih", width: 18, fmt: RUPIAH },
    { header: "Dibayar", width: 18, fmt: RUPIAH },
    { header: "Piutang", width: 18, fmt: RUPIAH },
    { header: "Invoice Lewat JT", width: 10 },
    { header: "PAD", width: 18, fmt: RUPIAH },
    { header: "Pekerjaan Belum Ditagih", width: 18, fmt: RUPIAH },
    { header: "Anggaran Biaya", width: 18, fmt: RUPIAH },
    { header: "Realisasi Biaya", width: 18, fmt: RUPIAH },
    { header: "CPI", width: 8, fmt: "0.00" },
    { header: "Kendala Terbuka", width: 10 },
    { header: "Margin Rencana (%)", width: 11, fmt: PCT },
    { header: "Margin Aktual (%)", width: 11, fmt: PCT },
    { header: "Proyeksi Margin Akhir (%)", width: 12, fmt: PCT },
    { header: "Proyeksi Biaya Akhir", width: 18, fmt: RUPIAH },
    { header: "Biaya Akibat Keterlambatan", width: 18, fmt: RUPIAH },
    { header: "Biaya Pekerjaan Tambahan", width: 18, fmt: RUPIAH },
    { header: "Penyebab Margin Tergerus", width: 60 },
  ];
  styleHeader(ws.addRow(columns.map((c) => c.header)));
  columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
    if (c.fmt) ws.getColumn(i + 1).numFmt = c.fmt;
  });

  for (const r of filtered) {
    const s = r.summary;
    const ongoing = r.status === "ONGOING";
    const row = ws.addRow([
      r.projectNumber,
      r.projectName,
      r.categoryName,
      r.clientName,
      r.pic,
      STATUS_LABEL[r.status] || r.status,
      HEALTH_LABEL[s.health],
      s.healthReason,
      r.startDate ? new Date(r.startDate) : null,
      new Date(r.targetEndDate),
      ongoing ? s.daysRemaining : null,
      s.plannedPercent,
      s.actualPercent,
      ongoing ? s.deviation : null,
      r.trend,
      ongoing ? s.spi : null,
      s.lastProgressUpdate ? new Date(s.lastProgressUpdate) : null,
      s.milestoneTotal ? `${s.milestoneDone}/${s.milestoneTotal}` : "-",
      s.contractValue || null,
      s.invoiced,
      s.paid,
      s.outstanding,
      s.overdueInvoiceCount,
      s.pad,
      ongoing ? s.unbilledEarned : null,
      s.budgetTotal || null,
      s.costActual || null,
      s.cpi,
      s.openIssues,
      r.margin.plannedMarginPct,
      r.margin.actualMarginPct,
      r.margin.hasCost ? r.margin.forecastMarginPct : null,
      r.margin.hasBudget ? Math.round(r.margin.eac) : null,
      r.margin.delayCost || null,
      r.margin.extraScopeCost || null,
      r.margin.signals.margin === "bad" || r.margin.signals.margin === "warn" ? r.margin.cause : "",
    ]);
    const color = { KRITIS: "FFFEE2E2", WASPADA: "FFFEF3C7", ON_TRACK: "FFDCFCE7", SELESAI: "FFDBEAFE", BATAL: "FFF1F5F9" }[s.health];
    row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  }

  const first = 5;
  const last = ws.rowCount;
  if (filtered.length > 0) {
    const total = ws.addRow(["", "TOTAL"]);
    total.font = { bold: true };
    for (const col of columns.flatMap((c, i) => (c.fmt === RUPIAH ? [i + 1] : []))) {
      const letter = ws.getColumn(col).letter;
      total.getCell(col).value = { formula: `SUM(${letter}${first}:${letter}${last})` };
    }
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: last, column: columns.length } };
  }

  // --- Sheet 2: payment terms (termin) ----------------------------------------
  const terms = await prisma.projectTerm.findMany({
    where: { projectId: { in: filtered.map((r) => r.id) } },
    include: { project: { select: { projectNumber: true, projectName: true } } },
    orderBy: [{ project: { projectNumber: "asc" } }, { sequence: "asc" }],
  });
  const ts = wb.addWorksheet("Termin & Penagihan", { views: [{ state: "frozen", ySplit: 1 }] });
  const tcols: { header: string; width: number; fmt?: string }[] = [
    { header: "No. Project", width: 18 },
    { header: "Nama Project", width: 36 },
    { header: "Termin", width: 18 },
    { header: "Syarat Penagihan", width: 30 },
    { header: "Nominal", width: 18, fmt: RUPIAH },
    { header: "Rencana Tagih", width: 12, fmt: "dd/mm/yyyy" },
    { header: "Status", width: 14 },
    { header: "No. Invoice", width: 18 },
    { header: "Tgl Invoice", width: 12, fmt: "dd/mm/yyyy" },
    { header: "Jatuh Tempo", width: 12, fmt: "dd/mm/yyyy" },
    { header: "Tgl Bayar", width: 12, fmt: "dd/mm/yyyy" },
    { header: "Nominal Dibayar", width: 18, fmt: RUPIAH },
    { header: "Lewat jatuh tempo", width: 10 },
  ];
  styleHeader(ts.addRow(tcols.map((c) => c.header)));
  tcols.forEach((c, i) => {
    ts.getColumn(i + 1).width = c.width;
    if (c.fmt) ts.getColumn(i + 1).numFmt = c.fmt;
  });
  for (const t of terms) {
    const overdue = isInvoiceOverdue(
      { status: t.status, invoiceDate: t.invoiceDate?.getTime() ?? null, dueDate: t.dueDate?.getTime() ?? null },
      today,
      thresholds
    );
    ts.addRow([
      t.project.projectNumber,
      t.project.projectName,
      t.name,
      t.requirement || "",
      Number(t.amount),
      t.plannedDate,
      TERM_STATUS_LABEL[t.status] || t.status,
      t.invoiceNumber || "",
      t.invoiceDate,
      t.dueDate,
      t.paidDate,
      t.paidAmount !== null ? Number(t.paidAmount) : null,
      overdue ? "Ya" : "",
    ]);
  }

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "ProjectMonitoring",
    description: `Mengekspor monitoring realisasi project (Excel), ${filtered.length} project.`,
  });

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date(today).toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="monitoring-project-${stamp}.xlsx"`,
    },
  });
}
