import PDFDocument from "pdfkit";
import type { ReportTable } from "@/lib/reports";

const MIN_COL_WIDTH = 42;
const MAX_COL_WIDTH = 160;
const CELL_PADDING = 5;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 22;

/**
 * Distributes the printable width across columns proportionally to how much
 * content each one actually holds (header + longest cell), instead of an
 * even split — this is what keeps narrow columns like "No" from wasting
 * space while "Nama Sertifikat" gets crushed.
 */
function computeColumnWidths(table: ReportTable, pageWidth: number): number[] {
  const weights = table.columns.map((col, i) => {
    const headerLen = col.length;
    const maxCellLen = table.rows.reduce((max, row) => {
      const len = String(row[i] ?? "").length;
      return len > max ? len : max;
    }, 0);
    return Math.max(headerLen, maxCellLen, 3);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let widths = weights.map((w) => Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, (w / totalWeight) * pageWidth)));

  // Clamping to min/max above can push the total over or under pageWidth —
  // rescale once so columns always exactly fill the printable area.
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = pageWidth / total;
  widths = widths.map((w) => w * scale);

  return widths;
}

/**
 * Renders a ReportTable as a landscape PDF: title, generated timestamp, then
 * a bordered table (proportional column widths, alternating row shading,
 * repeating header) that paginates automatically for long reports.
 */
export function generatePdfReport(table: ReportTable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageLeft = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidths = computeColumnWidths(table, pageWidth);
    const colOffsets = colWidths.reduce<number[]>((acc, w, i) => {
      acc.push(i === 0 ? pageLeft : acc[i - 1] + colWidths[i - 1]);
      return acc;
    }, []);

    /** Draws the vertical grid lines + bottom border for one row block (header or data row). */
    function drawRowBorders(top: number, height: number) {
      doc.strokeColor("#CBD5E1").lineWidth(0.5);
      let x = pageLeft;
      for (let i = 0; i <= colWidths.length; i++) {
        doc
          .moveTo(x, top)
          .lineTo(x, top + height)
          .stroke();
        if (i < colWidths.length) x += colWidths[i];
      }
      doc
        .moveTo(pageLeft, top + height)
        .lineTo(pageLeft + pageWidth, top + height)
        .stroke();
    }

    function drawHeader() {
      doc.font("Helvetica-Bold").fontSize(8.5);
      const y = doc.y;
      doc.rect(pageLeft, y, pageWidth, HEADER_HEIGHT).fill("#0F172A");
      doc.fillColor("#FFFFFF");
      table.columns.forEach((col, i) => {
        doc.text(col, colOffsets[i] + CELL_PADDING, y + 7, {
          width: colWidths[i] - CELL_PADDING * 2,
          ellipsis: true,
          lineBreak: false,
        });
      });
      doc.strokeColor("#0F172A").lineWidth(0.5);
      let x = pageLeft;
      for (let i = 0; i <= colWidths.length; i++) {
        doc
          .moveTo(x, y)
          .lineTo(x, y + HEADER_HEIGHT)
          .stroke();
        if (i < colWidths.length) x += colWidths[i];
      }
      doc.fillColor("#000000");
      doc.y = y + HEADER_HEIGHT;
    }

    function ensureSpace(needed: number) {
      const bottom = doc.page.height - doc.page.margins.bottom;
      if (doc.y + needed > bottom) {
        doc.addPage();
        doc.y = doc.page.margins.top;
        drawHeader();
      }
    }

    // --- Title block ---
    doc.font("Helvetica-Bold").fontSize(15).text(`${table.title} \u2014 PT Sucofindo (Persero)`, {
      align: "left",
    });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748B")
      .text(`Dibuat: ${table.generatedAt.toLocaleString("id-ID")} \u00b7 ${table.rows.length} baris data`);
    doc.fillColor("#000000");
    doc.moveDown(0.8);

    drawHeader();

    // --- Rows ---
    doc.font("Helvetica").fontSize(8);
    table.rows.forEach((row, rowIndex) => {
      ensureSpace(ROW_HEIGHT);
      const y = doc.y;

      if (rowIndex % 2 === 1) {
        doc.rect(pageLeft, y, pageWidth, ROW_HEIGHT).fill("#F1F5F9");
      }
      doc.fillColor("#0F172A");

      row.forEach((cell, i) => {
        doc.text(String(cell ?? ""), colOffsets[i] + CELL_PADDING, y + 6, {
          width: colWidths[i] - CELL_PADDING * 2,
          height: ROW_HEIGHT - 4,
          ellipsis: true,
          lineBreak: false,
        });
      });

      drawRowBorders(y, ROW_HEIGHT);
      doc.y = y + ROW_HEIGHT;
    });

    if (table.rows.length === 0) {
      ensureSpace(ROW_HEIGHT);
      doc.font("Helvetica-Oblique").fontSize(9).fillColor("#94A3B8");
      doc.text("Tidak ada data untuk laporan ini.", pageLeft, doc.y + 6);
      doc.fillColor("#000000");
    }

    doc.end();
  });
}
