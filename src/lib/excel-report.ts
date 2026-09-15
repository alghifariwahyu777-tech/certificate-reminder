import ExcelJS from "exceljs";
import type { ReportTable } from "@/lib/reports";

export async function generateExcelReport(table: ReportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Certificate Reminder System";
  workbook.created = table.generatedAt;

  const sheet = workbook.addWorksheet(table.title.slice(0, 31)); // Excel sheet name limit

  // Title + generated-at rows above the table.
  sheet.mergeCells(1, 1, 1, table.columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${table.title} — PT Sucofindo (Persero)`;
  titleCell.font = { bold: true, size: 13 };

  sheet.mergeCells(2, 1, 2, table.columns.length);
  const dateCell = sheet.getCell(2, 1);
  dateCell.value = `Dibuat: ${table.generatedAt.toLocaleString("id-ID")}`;
  dateCell.font = { italic: true, size: 9, color: { argb: "FF64748B" } };

  sheet.addRow([]);

  const headerRow = sheet.addRow(table.columns);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  for (const row of table.rows) {
    sheet.addRow(row);
  }

  // Auto-width columns based on content length.
  sheet.columns.forEach((col, i) => {
    const header = table.columns[i]?.length || 10;
    const maxContent = table.rows.reduce((max, row) => {
      const len = String(row[i] ?? "").length;
      return len > max ? len : max;
    }, header);
    col.width = Math.min(45, Math.max(10, maxContent + 2));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
