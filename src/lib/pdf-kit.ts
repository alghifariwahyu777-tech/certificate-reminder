import PDFDocument from "pdfkit";
import { LOGO_ASPECT, logoPngBuffer } from "@/lib/brand-assets";
import { FONT_BOLD_TTF_BASE64, FONT_REGULAR_TTF_BASE64 } from "@/lib/brand-fonts";

/**
 * Building blocks for formal Sucofindo reports (A4 portrait): letterhead on
 * every page, numbered sections, boxed key figures, tables whose header repeats
 * after a page break, and a footer with "Halaman x dari y".
 * Typeface: Plus Jakarta Sans (embedded, latin subset — avoid arrows/≥ glyphs).
 */

export const PDF_COLOR = {
  NAVY: "#123F6B",
  TEAL: "#0EA89B",
  INK: "#1E293B",
  MUTED: "#64748B",
  BLUE: "#1671B8",
  LINE: "#CBD5E1",
  BAD: "#B91C1C",
  WARN: "#B45309",
  GOOD: "#15803D",
};
const { NAVY, TEAL, INK, MUTED, LINE } = PDF_COLOR;
export const REG = "PJS";
export const BOLD = "PJS-Bold";

const MARGIN_X = 50;
const MARGIN_TOP = 100;
const MARGIN_BOTTOM = 56;

export type PdfCol = { header: string; width: number; align?: "left" | "right" | "center" };
export type PdfLine = { text: string; color?: string; bold?: boolean; size?: number };
export type PdfCell = string | PdfLine[];
export type PdfRow = { cells: PdfCell[]; color?: (i: number) => string | undefined; bold?: (i: number) => boolean };

export function createReport(opts: { title: string; headerLeft: string; headerRight: string; headerRightSub: string; footer: string }) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_X, right: MARGIN_X },
    bufferPages: true,
    info: { Title: opts.title, Author: "PT Sucofindo (Persero), Reminder System" },
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont(REG, Buffer.from(FONT_REGULAR_TTF_BASE64, "base64"));
  doc.registerFont(BOLD, Buffer.from(FONT_BOLD_TTF_BASE64, "base64"));

  const logo = logoPngBuffer();
  const left = MARGIN_X;
  const width = doc.page.width - MARGIN_X * 2;
  const bottom = () => doc.page.height - MARGIN_BOTTOM;

  function letterhead() {
    const top = 36;
    const logoH = 38;
    doc.image(logo, left, top, { height: logoH });
    const tx = left + logoH * LOGO_ASPECT + 12;
    doc.font(BOLD).fontSize(11).fillColor(NAVY).text("PT SUCOFINDO (PERSERO)", tx, top + 6, { lineBreak: false });
    doc.font(REG).fontSize(8.5).fillColor(MUTED).text(opts.headerLeft, tx, top + 21, { lineBreak: false });
    doc.font(BOLD).fontSize(8.5).fillColor(NAVY).text(opts.headerRight, left, top + 6, { width, align: "right", lineBreak: false });
    doc.font(REG).fontSize(8.5).fillColor(MUTED).text(opts.headerRightSub, left, top + 21, { width, align: "right", lineBreak: false });
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
  function section(title: string, minSpace = 70) {
    ensure(minSpace);
    sectionNo += 1;
    doc.moveDown(0.9);
    const y = doc.y;
    doc.font(BOLD).fontSize(10.5).fillColor(NAVY).text(`${sectionNo}.  ${title}`, left, y, { width });
    doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.y += 7;
    doc.x = left;
  }

  function paragraph(text: string, o: { color?: string; size?: number; bold?: boolean } = {}) {
    doc.font(o.bold ? BOLD : REG).fontSize(o.size ?? 9).fillColor(o.color ?? INK).text(text, left, doc.y, { width, lineGap: 1.5 });
  }

  function note(text: string) {
    doc.font(REG).fontSize(7).fillColor(MUTED).text(text, left, doc.y, { width });
  }

  /** Label/value list in two columns, e.g. project identity. */
  function keyValues(pairs: [string, string][], labelWidth = 110) {
    const colW = width / 2;
    for (let i = 0; i < pairs.length; i += 2) {
      ensure(16);
      const y = doc.y;
      let h = 0;
      [pairs[i], pairs[i + 1]].forEach((p, j) => {
        if (!p) return;
        const x = left + j * colW;
        doc.font(REG).fontSize(8.5).fillColor(MUTED).text(p[0], x, y, { width: labelWidth });
        doc.font(BOLD).fontSize(8.5).fillColor(INK).text(p[1] || "-", x + labelWidth, y, { width: colW - labelWidth - 8 });
        h = Math.max(h, doc.y - y);
      });
      doc.y = y + h + 3;
    }
    doc.x = left;
  }

  /** Boxed key figures, `perRow` per line: label, value, one line of context. */
  function figures(items: { label: string; value: string; sub?: string; color?: string }[], perRow = 3) {
    const cw = width / perRow;
    const ch = 54;
    const rows = Math.ceil(items.length / perRow);
    ensure(ch * rows + 6);
    const gy = doc.y;
    items.forEach((f, i) => {
      const x = left + (i % perRow) * cw;
      const y = gy + Math.floor(i / perRow) * ch;
      doc.rect(x, y, cw, ch).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.font(REG).fontSize(7.5).fillColor(MUTED).text(f.label, x + 8, y + 7, { width: cw - 16, lineBreak: false });
      doc.font(BOLD).fontSize(13).fillColor(f.color || NAVY).text(f.value, x + 8, y + 18, { width: cw - 16, lineBreak: false });
      if (f.sub) doc.font(REG).fontSize(7).fillColor(MUTED).text(f.sub, x + 8, y + 36, { width: cw - 16, height: 16, ellipsis: true });
    });
    doc.y = gy + ch * rows + 6;
    doc.x = left;
  }

  function table(cols: PdfCol[], rows: PdfRow[], o: { fontSize?: number } = {}) {
    const fs = o.fontSize ?? 8;
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
    ensure(Math.min(260, 34 + rows.length * 18)); // keep short tables on one page
    header();
    rows.forEach((row) => {
      const cellHeight = (t: PdfCell, i: number) =>
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

  /** Simple line chart (two series, 0–100 %), e.g. the S-curve. */
  function lineChart(series: { points: { x: number; y: number | null }[]; color: string; dash?: boolean; label: string }[], o: { height?: number; xLabels?: { x: number; text: string }[]; marker?: { x: number; text: string }; yTicks?: number[]; ySuffix?: string; hLines?: { y: number; color: string; text: string }[] } = {}) {
    const h = o.height ?? 150;
    ensure(h + 34);
    const x0 = left + 26;
    const y0 = doc.y + 4;
    const w = width - 30;
    const xs = series.flatMap((s) => s.points.map((p) => p.x));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const px = (x: number) => x0 + ((x - minX) / Math.max(1, maxX - minX)) * w;
    const yt = o.yTicks ?? [0, 25, 50, 75, 100];
    const yMin = Math.min(...yt);
    const yMax = Math.max(...yt);
    const py = (y: number) => y0 + h - ((Math.min(yMax, Math.max(yMin, y)) - yMin) / Math.max(1e-9, yMax - yMin)) * h;
    yt.forEach((g) => {
      doc.moveTo(x0, py(g)).lineTo(x0 + w, py(g)).lineWidth(0.4).strokeColor("#E2E8F0").stroke();
      doc.font(REG).fontSize(6.5).fillColor(MUTED).text(`${g.toLocaleString("id-ID")}${o.ySuffix ?? "%"}`, left - 4, py(g) - 3, { width: 26, align: "right", lineBreak: false });
    });
    (o.hLines ?? []).forEach((l) => {
      doc.moveTo(x0, py(l.y)).lineTo(x0 + w, py(l.y)).lineWidth(0.8).dash(3, { space: 2 }).strokeColor(l.color).stroke().undash();
      doc.font(REG).fontSize(6.5).fillColor(l.color).text(l.text, x0 + 3, py(l.y) - 9, { lineBreak: false });
    });
    if (o.marker && o.marker.x >= minX && o.marker.x <= maxX) {
      doc.moveTo(px(o.marker.x), y0).lineTo(px(o.marker.x), y0 + h).lineWidth(0.6).dash(2, { space: 2 }).strokeColor(MUTED).stroke().undash();
      doc.font(REG).fontSize(6.5).fillColor(MUTED).text(o.marker.text, px(o.marker.x) + 3, y0, { lineBreak: false });
    }
    for (const s of series) {
      const pts = s.points.filter((p) => p.y !== null) as { x: number; y: number }[];
      if (pts.length < 2) continue;
      doc.moveTo(px(pts[0].x), py(pts[0].y));
      pts.slice(1).forEach((p) => doc.lineTo(px(p.x), py(p.y)));
      doc.lineWidth(s.dash ? 1.2 : 1.8).strokeColor(s.color);
      if (s.dash) doc.dash(4, { space: 3 });
      doc.stroke();
      doc.undash();
    }
    (o.xLabels ?? []).forEach((l) => doc.font(REG).fontSize(6.5).fillColor(MUTED).text(l.text, px(l.x) - 25, y0 + h + 4, { width: 50, align: "center", lineBreak: false }));
    // legend
    let lx = x0;
    const ly = y0 + h + 16;
    for (const s of series) {
      doc.moveTo(lx, ly + 3).lineTo(lx + 14, ly + 3).lineWidth(1.8).strokeColor(s.color);
      if (s.dash) doc.dash(3, { space: 2 });
      doc.stroke();
      doc.undash();
      doc.font(REG).fontSize(7).fillColor(INK).text(s.label, lx + 18, ly, { lineBreak: false });
      lx += 28 + doc.widthOfString(s.label);
    }
    doc.y = ly + 14;
    doc.x = left;
  }

  async function finish(): Promise<Buffer> {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const saved = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const fy = doc.page.height - MARGIN_BOTTOM + 18;
      doc.moveTo(left, fy - 6).lineTo(left + width, fy - 6).lineWidth(0.4).strokeColor(LINE).stroke();
      doc.font(REG).fontSize(7).fillColor(MUTED).text(opts.footer, left, fy, { width: width / 2, lineBreak: false });
      doc.text(`Halaman ${i - range.start + 1} dari ${range.count}`, left, fy, { width, align: "right", lineBreak: false });
      doc.page.margins.bottom = saved;
    }
    doc.end();
    return done;
  }

  return { doc, left, width, ensure, section, paragraph, note, keyValues, figures, table, lineChart, finish };
}
