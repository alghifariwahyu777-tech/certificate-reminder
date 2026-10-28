import PDFDocument from "pdfkit";
import { HEALTH_LABEL, formatPercent, formatRupiah, shortDate, type ProjectHealth } from "@/lib/project-monitoring-shared";
import type { WeeklyReportData } from "@/lib/weekly-report";
import { LOGO_ASPECT, logoPngBuffer } from "@/lib/brand-assets";
import { FONT_BOLD_TTF_BASE64, FONT_REGULAR_TTF_BASE64 } from "@/lib/brand-fonts";
import { formatLongDate, isoWeekInfo, jakartaDay } from "@/lib/week";

/**
 * Weekly management report as a formal PDF (A4 portrait):
 *  - letterhead on every page (logo, company, report title, period)
 *  - page 1: title block, numbered sections 1–3 (summary, decisions, certs)
 *  - then the project status table, PAD projection and appendices
 *  - footer with confidentiality note and "Halaman x dari y"
 * Typeface: Plus Jakarta Sans (same as the web app), embedded; latin subset — no arrows/≥ glyphs.
 */

const NAVY = "#123F6B";
const TEAL = "#0EA89B";
const INK = "#1E293B";
const MUTED = "#64748B";
const BLUE = "#1671B8";
const LINE = "#CBD5E1";
const SOFT = "#F1F5F9";
const HEALTH_COLOR: Record<ProjectHealth, string> = { KRITIS: "#B91C1C", WASPADA: "#B45309", ON_TRACK: "#15803D", SELESAI: "#1671B8", BATAL: "#64748B" };

const MARGIN_X = 50;
const MARGIN_TOP = 100; // room for the letterhead
const MARGIN_BOTTOM = 56; // room for the footer

type Col = { header: string; width: number; align?: "left" | "right" | "center" };
/** A cell is plain text, or stacked lines each with its own colour/weight/size (e.g. realisasi vs rencana). */
type Line = { text: string; color?: string; bold?: boolean; size?: number };
type Cell = string | Line[];
type Row = { cells: Cell[]; color?: (i: number) => string | undefined; bold?: (i: number) => boolean };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
/** "2026-12-21" → "21 Des 2026" */
const longShortDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const REG = "PJS";
const BOLD = "PJS-Bold";
const fmtDev = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}`;

export function generateWeeklyReportPdf(r: WeeklyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_X, right: MARGIN_X },
      bufferPages: true,
      info: { Title: `Laporan Mingguan Monitoring Project ${r.weekKey}`, Author: "PT Sucofindo (Persero) — Reminder System" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont(REG, Buffer.from(FONT_REGULAR_TTF_BASE64, "base64"));
    doc.registerFont(BOLD, Buffer.from(FONT_BOLD_TTF_BASE64, "base64"));

    const logo = logoPngBuffer();
    const wk = isoWeekInfo(r.generatedAt);
    const left = MARGIN_X;
    const width = doc.page.width - MARGIN_X * 2;
    const bottom = () => doc.page.height - MARGIN_BOTTOM;

    // ------------------------------------------------------------ letterhead
    function letterhead() {
      const top = 36;
      const logoH = 38;
      doc.image(logo, left, top, { height: logoH });
      const tx = left + logoH * LOGO_ASPECT + 12;
      doc.font(BOLD).fontSize(11).fillColor(NAVY).text("PT SUCOFINDO (PERSERO)", tx, top + 6, { lineBreak: false });
      doc.font(REG).fontSize(8.5).fillColor(MUTED).text("Laporan Mingguan Monitoring Project", tx, top + 21, { lineBreak: false });
      doc.font(BOLD).fontSize(8.5).fillColor(NAVY).text(`Minggu ke-${wk.week} / ${wk.year}`, left, top + 6, { width, align: "right", lineBreak: false });
      doc.font(REG).fontSize(8.5).fillColor(MUTED).text(wk.label, left, top + 21, { width, align: "right", lineBreak: false });
      const ry = top + logoH + 8;
      doc.rect(left, ry, width, 1.6).fill(NAVY);
      doc.rect(left, ry + 2.6, width, 0.8).fill(TEAL);
      doc.x = left;
      doc.y = MARGIN_TOP;
    }
    letterhead();
    doc.on("pageAdded", letterhead);

    const ensure = (h: number) => {
      if (doc.y + h > bottom()) doc.addPage();
    };

    let sectionNo = 0;
    function section(title: string, minSpace = 60) {
      ensure(minSpace);
      sectionNo += 1;
      doc.moveDown(0.9);
      const y = doc.y;
      doc.font(BOLD).fontSize(10.5).fillColor(NAVY).text(`${sectionNo}.  ${title}`, left, y, { width });
      doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.y += 7;
      doc.x = left;
    }
    function paragraph(text: string, opts: { color?: string; size?: number; bold?: boolean } = {}) {
      doc.font(opts.bold ? BOLD : REG).fontSize(opts.size ?? 9).fillColor(opts.color ?? INK).text(text, left, doc.y, { width, lineGap: 1.5 });
    }

    /** Formal table: light header band, hairline rules, header repeats on page break. */
    function table(cols: Col[], rows: Row[], opts: { fontSize?: number } = {}) {
      const fs = opts.fontSize ?? 8;
      const scale = width / cols.reduce((s, c) => s + c.width, 0);
      const ws = cols.map((c) => c.width * scale);
      const xs = ws.map((_, i) => left + ws.slice(0, i).reduce((a, b) => a + b, 0));
      const pad = 4;
      const header = () => {
        doc.font(BOLD).fontSize(fs);
        const hh = Math.max(...cols.map((c, i) => doc.heightOfString(c.header, { width: ws[i] - pad * 2 }))) + pad * 2;
        const y = doc.y;
        doc.rect(left, y, width, hh).fill("#E8EEF5");
        doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.8).strokeColor(NAVY).stroke();
        doc.moveTo(left, y + hh).lineTo(left + width, y + hh).lineWidth(0.8).strokeColor(NAVY).stroke();
        cols.forEach((c, i) => doc.fillColor(NAVY).font(BOLD).fontSize(fs).text(c.header, xs[i] + pad, y + pad, { width: ws[i] - pad * 2, align: c.align || "left" }));
        doc.y = y + hh;
      };
      ensure(50);
      header();
      rows.forEach((row) => {
        const cellHeight = (t: Cell, i: number) =>
          typeof t === "string"
            ? doc.font(row.bold?.(i) ? BOLD : REG).fontSize(fs).heightOfString(t || "-", { width: ws[i] - pad * 2 })
            : t.reduce((sum, l) => sum + doc.font(l.bold ? BOLD : REG).fontSize(l.size ?? fs).heightOfString(l.text, { width: ws[i] - pad * 2 }), 0);
        const h = Math.max(...row.cells.map(cellHeight)) + pad * 2;
        if (doc.y + h > bottom()) {
          doc.addPage();
          header();
        }
        const y = doc.y;
        row.cells.forEach((t, i) => {
          if (typeof t === "string") {
            doc
              .font(row.bold?.(i) ? BOLD : REG)
              .fontSize(fs)
              .fillColor(row.color?.(i) || INK)
              .text(t || "-", xs[i] + pad, y + pad, { width: ws[i] - pad * 2, align: cols[i].align || "left" });
            return;
          }
          let ly = y + pad;
          for (const l of t) {
            doc.font(l.bold ? BOLD : REG).fontSize(l.size ?? fs).fillColor(l.color || INK);
            doc.text(l.text, xs[i] + pad, ly, { width: ws[i] - pad * 2, align: cols[i].align || "left" });
            ly += doc.heightOfString(l.text, { width: ws[i] - pad * 2 });
          }
        });
        doc.moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(0.4).strokeColor(LINE).stroke();
        doc.y = y + h;
      });
      doc.x = left;
      doc.y += 4;
    }

    // ------------------------------------------------------------ title block
    doc.font(BOLD).fontSize(14).fillColor(INK).text("LAPORAN MINGGUAN MONITORING PROJECT", left, doc.y, { width, align: "center" });
    doc.font(REG).fontSize(9.5).fillColor(MUTED).text(`Periode ${wk.label}`, { width, align: "center" });
    doc.moveDown(0.8);

    const k = r.kpi;
    const dataAs = r.generatedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
    const meta: [string, string][] = [
      ["Tanggal laporan", formatLongDate(jakartaDay(r.generatedAt))],
      ["Data per", `${formatLongDate(jakartaDay(r.generatedAt))}, pukul ${dataAs} WIB`],
      ["Cakupan", `${k.ongoing} project berjalan`],
      ["Sumber data", "Reminder System — Project Monitoring (data dari PIC dan admin project)"],
    ];
    meta.forEach(([a, b]) => {
      const y = doc.y;
      doc.font(REG).fontSize(8.5).fillColor(MUTED).text(a, left, y, { width: 100 });
      doc.font(REG).fontSize(8.5).fillColor(INK).text(`:  ${b}`, left + 100, y, { width: width - 100 });
    });

    // ------------------------------------------------------------ 1. summary
    section("Ringkasan");
    paragraph(r.headline, { bold: true, size: 9.5 });
    doc.moveDown(0.6);

    // 3 x 2 key figures, formal boxed grid
    const figures: [string, string, string, string?][] = [
      ["Project berjalan", String(k.ongoing), `Kritis ${k.kritis}  ·  Waspada ${k.waspada}  ·  Sesuai rencana ${k.onTrack}`, k.kritis ? HEALTH_COLOR.KRITIS : undefined],
      ["Progres portofolio", formatPercent(k.actual), `Dari rencana ${formatPercent(k.planned)} (dibobot nilai kontrak)`],
      ["Nilai kontrak berjalan", formatRupiah(k.contract, true), `Dibayar ${formatRupiah(k.paid, true)}  ·  piutang ${formatRupiah(k.outstandingOngoing, true)}  ·  belum ditagih ${formatRupiah(k.unbilled, true)}`],
      ["Piutang (ditagih, belum dibayar)", formatRupiah(k.outstanding, true), k.overdueInvoiceCount ? `${k.overdueInvoiceCount} invoice melewati jatuh tempo (${formatRupiah(k.overdueInvoiceAmount, true)})` : "Tidak ada invoice yang melewati jatuh tempo", k.overdueInvoiceCount ? HEALTH_COLOR.KRITIS : undefined],
      ["PAD project berjalan", formatRupiah(k.padOngoing, true), `Piutang ${formatRupiah(k.outstandingOngoing, true)} + belum ditagih ${formatRupiah(k.unbilled, true)}`],
      ["PAD project selesai", formatRupiah(k.padCompleted, true), k.completedUnpaid ? `${k.completedUnpaid} project telah selesai, belum lunas` : "Seluruh project yang selesai telah lunas", k.padCompleted ? HEALTH_COLOR.WASPADA : undefined],
      [
        "Di bawah target margin",
        k.marginTracked ? `${k.belowTarget} dari ${k.marginTracked} project` : "-",
        k.marginTracked ? (k.belowTarget ? "Prakiraan margin akhir di bawah target project masing-masing" : "Seluruhnya diprakirakan memenuhi target") : "Belum ada project dengan data RAB dan biaya",
        k.belowTarget ? HEALTH_COLOR.KRITIS : undefined,
      ],
      ["Kekurangan dari target margin", k.belowTarget ? formatRupiah(k.belowTargetGap, true) : "-", k.belowTarget ? "Jumlah selisih terhadap target seluruh project tersebut" : "Tidak ada kekurangan", k.belowTarget ? HEALTH_COLOR.KRITIS : undefined],
      ["Data biaya", k.noCostData ? `${k.noCostData} project` : "Lengkap", k.noCostData ? "Belum memiliki data realisasi biaya" : "Seluruh project berjalan memiliki data biaya", k.noCostData ? HEALTH_COLOR.WASPADA : undefined],
    ];
    const cw = width / 3;
    const ch = 56;
    const gridRows = Math.ceil(figures.length / 3);
    ensure(ch * gridRows + 10);
    const gy = doc.y;
    figures.forEach(([label, value, sub, color], i) => {
      const x = left + (i % 3) * cw;
      const y = gy + Math.floor(i / 3) * ch;
      doc.rect(x, y, cw, ch).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.font(REG).fontSize(7).fillColor(MUTED).text(label, x + 8, y + 7, { width: cw - 16, lineBreak: false });
      doc.font(BOLD).fontSize(13).fillColor(color || NAVY).text(value, x + 8, y + 17, { width: cw - 16, lineBreak: false });
      doc.font(REG).fontSize(7).fillColor(MUTED).text(sub, x + 8, y + 34, { width: cw - 16, height: 18, ellipsis: true, lineGap: 0.5 });
    });
    doc.y = gy + ch * gridRows + 4;
    doc.x = left;
    doc.font(REG).fontSize(7).fillColor(MUTED).text(
      "Setiap project memiliki target margin sendiri (dari RAB), sehingga margin tidak dirata-ratakan antarproject. Prakiraan margin akhir = nilai kontrak dikurangi (biaya yang telah keluar + sisa RAB untuk pekerjaan yang belum selesai). Piutang adalah invoice yang telah dikirim namun belum dibayar klien. PAD (Pendapatan yang Akan Diterima) adalah seluruh nilai kontrak yang belum diterima, yaitu piutang ditambah bagian kontrak yang belum ditagih. Nilai kontrak berjalan = dibayar + piutang + belum ditagih.",
      left,
      doc.y,
      { width }
    );

    // ------------------------------------------------------------ 2. decisions
    section("Hal yang memerlukan keputusan / tindakan");
    doc.font(REG).fontSize(7.5).fillColor(MUTED).text("Diurutkan dari yang paling mendesak. Setiap butir disertai usulan tindak lanjut.", left, doc.y, { width });
    doc.y += 4;
    if (r.allActions.length === 0) {
      paragraph("Tidak terdapat hal yang memerlukan keputusan pada minggu ini.", { color: HEALTH_COLOR.ON_TRACK });
    } else {
      r.allActions.forEach((a, i) => {
        ensure(16);
        const y = doc.y;
        doc.font(BOLD).fontSize(9).fillColor(a.tone === "bad" ? HEALTH_COLOR.KRITIS : HEALTH_COLOR.WASPADA).text(`${i + 1}.`, left, y, { width: 16 });
        doc.font(BOLD).fontSize(9).fillColor(INK).text(a.project ? `${a.project}: ` : "", left + 16, y, { width: width - 16, continued: true, lineGap: 1.5 });
        doc.font(REG).text(a.text, { lineGap: 1.5 });
        doc.font(REG).fontSize(8).fillColor(MUTED).text(`Usulan: ${a.suggestion}`, left + 16, doc.y + 1, { width: width - 16 });
        doc.y += 4;
      });
    }
    if (r.closeoutPending.length) {
      doc.moveDown(0.4);
      paragraph(`Dokumen penutupan (BAPP/BAST/laporan final) belum lengkap untuk project: ${r.closeoutPending.map((c) => c.name).join("; ")}.`, { color: MUTED, size: 8.5 });
    }

    // ------------------------------------------------------------ HSE & risks
    section("HSE dan risiko", 110);
    const hm = r.hse.month;
    table(
      [
        { header: "Indikator", width: 190 },
        { header: r.hse.monthLabel, width: 110, align: "right" },
        { header: "Kumulatif project berjalan", width: 195 },
      ],
      [
        { cells: ["Jam kerja", hm.manHours.toLocaleString("id-ID"), r.hse.total.manHours.toLocaleString("id-ID")] },
        { cells: ["Kecelakaan fatal / hilang hari kerja", `${hm.fatality} / ${hm.lti}`, `${r.hse.total.fatality} / ${r.hse.total.lti}`], color: (i) => (i > 0 && hm.fatality + hm.lti ? HEALTH_COLOR.KRITIS : undefined) },
        { cells: ["Perawatan medis / P3K / nyaris celaka", `${hm.medical} / ${hm.firstAid} / ${hm.nearMiss}`, `${r.hse.total.medical} perawatan medis`] },
        { cells: ["LTIFR / TRIR (per 1 juta jam kerja)", "-", `${(r.hse.total.ltifr ?? 0).toLocaleString("id-ID")} / ${(r.hse.total.trir ?? 0).toLocaleString("id-ID")}`] },
        { cells: ["Project yang sudah melapor", `${hm.reported} dari ${hm.expected}`, r.hse.missing.length ? `Belum: ${r.hse.missing.join(", ")}` : "-"], color: (i) => (i === 2 && r.hse.missing.length ? HEALTH_COLOR.WASPADA : undefined) },
      ],
      { fontSize: 8.5 }
    );
    doc.moveDown(0.4);
    paragraph(`Risiko dan kendala terbuka: ${r.riskCounts.open} (${r.riskCounts.extreme} ekstrem, ${r.riskCounts.high} tinggi, ${r.riskCounts.late} lewat target tindak lanjut).`, { size: 8.5 });
    if (r.topRisks.length) {
      doc.moveDown(0.3);
      table(
        [
          { header: "Tingkat", width: 55 },
          { header: "Risiko / kendala", width: 210 },
          { header: "Project", width: 140 },
          { header: "Penanggung jawab", width: 90 },
        ],
        r.topRisks.map((x) => ({
          cells: [x.level + (x.late ? " (lewat)" : ""), x.title, x.project, x.owner || "-"],
          color: (i) => (i === 0 ? (x.level === "Ekstrem" || x.level === "Tinggi" ? HEALTH_COLOR.KRITIS : HEALTH_COLOR.WASPADA) : undefined),
        })),
        { fontSize: 8 }
      );
    }

    // ------------------------------------------------------------ 3. certs & calibration
    section("Sertifikasi personil & kalibrasi alat (30 hari ke depan)");
    const certExpired = r.urgentCerts.filter((c) => c.days < 0).length;
    const certOnDuty = r.urgentCerts.filter((c) => c.onProjects.length).length;
    const eqExpired = r.urgentEquipment.filter((e) => e.days < 0).length;
    table(
      [
        { header: "Kategori", width: 150 },
        { header: "Jumlah", width: 60, align: "right" },
        { header: "Telah lewat", width: 70, align: "right" },
        { header: "Keterangan", width: 215 },
      ],
      [
        {
          cells: ["Sertifikasi personil", String(r.urgentCerts.length), String(certExpired), certOnDuty ? `${certOnDuty} di antaranya milik personil yang sedang bertugas` : "-"],
          color: (i) => (i === 2 && certExpired ? HEALTH_COLOR.KRITIS : undefined),
        },
        {
          cells: ["Kalibrasi alat", String(r.urgentEquipment.length), String(eqExpired), r.urgentEquipment.length ? "Rincian tersedia pada lampiran" : "-"],
          color: (i) => (i === 2 && eqExpired ? HEALTH_COLOR.KRITIS : undefined),
        },
      ],
      { fontSize: 8.5 }
    );

    // ------------------------------------------------------------ 4. project status
    // Page 1 is the executive summary (the one-minute read); details start on a fresh page.
    doc.addPage();
    section("Status project berjalan", 120);
    if (r.projects.length === 0) {
      paragraph("Tidak terdapat project yang sedang berjalan.");
    } else {
      table(
        [
          { header: "No", width: 20, align: "center" },
          { header: "Project / Klien / PIC", width: 126 },
          { header: "Nilai kontrak", width: 56, align: "right" },
          { header: "Realisasi / rencana", width: 56, align: "right" },
          { header: "Deviasi", width: 38, align: "right" },
          { header: "Tren", width: 32, align: "right" },
          { header: "Target selesai", width: 60 },
          { header: "Status", width: 44 },
          { header: "Catatan", width: 63 },
        ],
        r.projects.map((p, i) => ({
          cells: [
            String(i + 1),
            `${p.name}\n${p.client}\n${p.number}  ·  PIC ${p.pic}`,
            p.contractValue ? formatRupiah(p.contractValue, true) : "-",
            [
              { text: formatPercent(p.actual), bold: true, color: BLUE, size: 9 },
              { text: `/ ${formatPercent(p.planned)}`, color: MUTED, size: 7.5 },
              ...(p.stale ? [{ text: `data ${p.daysSinceUpdate} hari lalu`, color: HEALTH_COLOR.WASPADA, size: 7, bold: true }] : []),
            ],
            fmtDev(p.deviation),
            p.trend === null ? "-" : fmtDev(p.trend),
            `${longShortDate(p.targetEndDate)}\n${p.daysRemaining >= 0 ? `sisa ${p.daysRemaining} hari` : `terlambat ${Math.abs(p.daysRemaining)} hari`}`,
            HEALTH_LABEL[p.health],
            p.note,
          ],
          color: (c) =>
            c === 4 || c === 7 ? HEALTH_COLOR[p.health] : c === 5 && p.trend ? (p.trend > 0 ? HEALTH_COLOR.ON_TRACK : HEALTH_COLOR.KRITIS) : c === 6 && p.daysRemaining < 0 ? HEALTH_COLOR.KRITIS : undefined,
          bold: (c) => c === 7,
        }))
      );
      doc.font(REG).fontSize(7).fillColor(MUTED).text(
        "Kolom realisasi/rencana: angka biru tebal = progres realisasi, angka abu-abu = rencana; keterangan oranye = data progres belum diperbarui melewati batas waktu. Target selesai mengacu pada addendum terakhir. Deviasi = progres realisasi dikurangi rencana (poin %). Tren = perubahan deviasi dibandingkan minggu lalu (nilai positif berarti membaik). Project diurutkan dari kondisi paling kritis.",
        left,
        doc.y,
        { width }
      );
    }

    // ------------------------------------------------------------ 5. triple constraint & margin
    {
      const withCost = r.projects.filter((p) => p.hasCost && p.hasBudget);
      const noCost = r.projects.filter((p) => !p.hasCost || !p.hasBudget);
      if (r.projects.length) {
        section("Kinerja waktu, biaya, lingkup & margin", 110);
        if (withCost.length) {
          const SIG: Record<string, string> = { good: HEALTH_COLOR.ON_TRACK, warn: HEALTH_COLOR.WASPADA, bad: HEALTH_COLOR.KRITIS, none: MUTED };
          const sigText = (v: string) => (v === "good" ? "Baik" : v === "warn" ? "Waspada" : v === "bad" ? "Kritis" : "-");
          table(
            [
              { header: "No", width: 20, align: "center" },
              { header: "Project", width: 100 },
              { header: "Waktu (SPI)", width: 46, align: "center" },
              { header: "Biaya (CPI)", width: 46, align: "center" },
              { header: "Lingkup", width: 46, align: "center" },
              { header: "Margin prakiraan / target", width: 74, align: "right" },
              { header: "Penyebab utama", width: 163 },
            ],
            [...withCost]
              .sort((a, b) => ["bad", "warn", "good", "none"].indexOf(a.signals.margin) - ["bad", "warn", "good", "none"].indexOf(b.signals.margin))
              .map((p, i) => ({
                cells: [
                  String(i + 1),
                  `${p.name}\n${p.client}`,
                  [
                    { text: p.spi === null ? "-" : p.spi.toLocaleString("id-ID"), bold: true, color: SIG[p.signals.time] },
                    { text: sigText(p.signals.time), color: SIG[p.signals.time], size: 7 },
                  ],
                  [
                    { text: p.cpi === null ? "-" : p.cpi.toLocaleString("id-ID"), bold: true, color: SIG[p.signals.cost] },
                    { text: sigText(p.signals.cost), color: SIG[p.signals.cost], size: 7 },
                  ],
                  [{ text: sigText(p.signals.scope), bold: true, color: SIG[p.signals.scope], size: 7.5 }],
                  [
                    { text: formatPercent(p.forecastMarginPct), bold: true, color: SIG[p.signals.margin], size: 9 },
                    { text: `target ${formatPercent(p.targetMarginPct)}`, color: MUTED, size: 7.5 },
                  ],
                  p.forecastMarginPct === null
                    ? "Prakiraan belum dapat dihitung."
                    : p.signals.margin === "good"
                      ? "Sesuai target"
                      : p.marginCause.replace(/^Penyebab utama: /, "").replace(/^./, (c) => c.toUpperCase()) || "-",
                ],
              }))
          );
          doc.font(REG).fontSize(7).fillColor(MUTED).text(
            "SPI = progres realisasi dibagi rencana; CPI = nilai pekerjaan selesai (berdasarkan RAB) dibagi biaya aktual. Nilai 1 atau lebih berarti sesuai/lebih baik dari rencana. Lingkup menilai pekerjaan tambahan yang belum tertutup addendum. Kolom margin: prakiraan margin akhir (tebal) dibandingkan target margin project tersebut.",
            left,
            doc.y,
            { width }
          );
        }
        if (noCost.length) {
          doc.moveDown(0.4);
          const parts = [
            noCost.filter((p) => !p.hasBudget).length ? `belum memiliki RAB: ${noCost.filter((p) => !p.hasBudget).map((p) => p.name).join("; ")}` : "",
            noCost.filter((p) => p.hasBudget && !p.hasCost).length ? `belum memiliki data realisasi biaya: ${noCost.filter((p) => p.hasBudget && !p.hasCost).map((p) => p.name).join("; ")}` : "",
          ].filter(Boolean);
          paragraph(`Margin belum dapat dihitung untuk project yang ${parts.join(", serta ")}.`, { color: MUTED, size: 8 });
        }
      }
    }

    // ------------------------------------------------------------ 6. PAD
    if (r.padSplit.length) {
      section("Proyeksi pendapatan yang akan diterima (PAD)", 90);
      const tot = r.padSplit.reduce((a, b) => ({ on: a.on + b.ongoing, done: a.done + b.completed }), { on: 0, done: 0 });
      table(
        [
          { header: "Periode", width: 110 },
          { header: "Project berjalan", width: 95, align: "right" },
          { header: "Project selesai", width: 95, align: "right" },
          { header: "Total", width: 95, align: "right" },
          { header: "Keterangan", width: 100 },
        ],
        [
          ...r.padSplit.map((b) => ({
            cells: [
              b.label,
              b.ongoing ? formatRupiah(b.ongoing, true) : "-",
              b.completed ? formatRupiah(b.completed, true) : "-",
              formatRupiah(b.total, true),
              b.kind === "OVERDUE" ? "Telah melewati jatuh tempo/rencana penagihan" : b.kind === "UNSCHEDULED" ? "Belum memiliki jadwal penagihan" : "Sesuai jadwal termin",
            ],
            color: (i: number) => (i >= 1 && i <= 3 && b.kind === "OVERDUE" ? HEALTH_COLOR.KRITIS : undefined),
          })),
          { cells: ["Total PAD", formatRupiah(tot.on, true), formatRupiah(tot.done, true), formatRupiah(tot.on + tot.done, true), ""], bold: () => true },
        ]
      );
    }

    // ------------------------------------------------------------ appendices
    if (r.urgentCerts.length) {
      section("Lampiran: sertifikasi personil yang telah/akan berakhir", 90);
      table(
        [
          { header: "No", width: 22, align: "center" },
          { header: "Personil", width: 105 },
          { header: "Sertifikasi", width: 120 },
          { header: "Berlaku s.d.", width: 58 },
          { header: "Keterangan", width: 70 },
          { header: "Bertugas di project", width: 124 },
        ],
        r.urgentCerts.map((c, i) => ({
          cells: [String(i + 1), `${c.employee}${c.nip ? `\nNIP ${c.nip}` : ""}`, c.cert, shortDate(Date.parse(c.expiryDate)), c.days < 0 ? `Berakhir ${Math.abs(c.days)} hari lalu` : `Berakhir dalam ${c.days} hari`, c.onProjects.join(", ") || "-"],
          color: (x) => (x === 4 ? (c.days < 0 ? HEALTH_COLOR.KRITIS : HEALTH_COLOR.WASPADA) : undefined),
        }))
      );
    }
    if (r.urgentEquipment.length) {
      section("Lampiran: jadwal kalibrasi alat yang terlewat/akan jatuh tempo", 90);
      table(
        [
          { header: "No", width: 22, align: "center" },
          { header: "Alat", width: 150 },
          { header: "No. aset", width: 80 },
          { header: "PIC", width: 100 },
          { header: "Jadwal", width: 62 },
          { header: "Keterangan", width: 85 },
        ],
        r.urgentEquipment.map((e, i) => ({
          cells: [String(i + 1), e.name, e.assetNumber || "-", e.pic, shortDate(Date.parse(e.nextDate)), e.days < 0 ? `Terlewat ${Math.abs(e.days)} hari` : `Dalam ${e.days} hari`],
          color: (x) => (x === 5 ? (e.days < 0 ? HEALTH_COLOR.KRITIS : HEALTH_COLOR.WASPADA) : undefined),
        }))
      );
    }

    doc.moveDown(1.2);
    ensure(30);
    doc.font(REG).fontSize(7.5).fillColor(MUTED).text(
      "Laporan ini disusun secara otomatis oleh Reminder System berdasarkan data progres, termin, dan kendala yang dicatat oleh PIC dan admin project. Rincian setiap project tersedia pada Monitoring Project.",
      left,
      doc.y,
      { width }
    );

    // ------------------------------------------------------------ footer on every page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const fy = doc.page.height - MARGIN_BOTTOM + 18;
      // writing below the bottom margin would make PDFKit open a new page — lift the margin while drawing
      doc.page.margins.bottom = 0;
      doc.moveTo(left, fy - 6).lineTo(left + width, fy - 6).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.font(REG).fontSize(7).fillColor(MUTED).text("PT Sucofindo (Persero)  ·  Dokumen internal — tidak untuk disebarluaskan", left, fy, { width: width / 2, lineBreak: false });
      doc.text(`Halaman ${i + 1} dari ${range.count}`, left + width / 2, fy, { width: width / 2, align: "right", lineBreak: false });
      doc.page.margins.bottom = MARGIN_BOTTOM;
    }
    doc.end();
  });
}
