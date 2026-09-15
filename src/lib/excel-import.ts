import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export const IMPORT_COLUMNS = [
  { header: "Certificate Number", key: "certificateNumber", required: true },
  { header: "Certificate Name", key: "certificateName", required: true },
  { header: "Category", key: "category", required: true },
  { header: "Client", key: "client", required: true },
  { header: "Department", key: "department", required: false },
  { header: "Issuing Body", key: "issuingBody", required: false },
  { header: "Issue Date", key: "issueDate", required: true },
  { header: "Valid From", key: "validFrom", required: false },
  { header: "Expiry Date", key: "expiryDate", required: true },
  { header: "Storage Location", key: "storageLocation", required: false },
  { header: "PIC", key: "pic", required: true },
  { header: "PIC Email", key: "picEmail", required: false },
  { header: "CC Email", key: "ccEmail", required: false },
  { header: "Description", key: "description", required: false },
  { header: "Notes", key: "notes", required: false },
] as const;

export type ImportRowResult = {
  row: number;
  certificateNumber: string;
  status: "CREATED" | "SKIPPED" | "ERROR";
  message?: string;
};

export type ImportSummary = {
  totalRows: number;
  created: number;
  skipped: number;
  errors: number;
  results: ImportRowResult[];
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as object)) {
    // Rich text cell
    return (value as { text: string }).text.trim();
  }
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function cellToDate(value: ExcelJS.CellValue): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const str = cellToString(value);
  if (!str) return null;
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** Generates a blank template workbook with the expected headers and one example row. */
export async function generateImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Certificates");

  sheet.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  sheet.addRow({
    certificateNumber: "CERT-2026-001",
    certificateName: "Contoh Sertifikat ISO 9001",
    category: "ISO",
    client: "PT Contoh Klien Indonesia",
    department: "Sertifikasi Sistem Manajemen",
    issuingBody: "Sucofindo International Certification Services",
    issueDate: "2026-01-15",
    validFrom: "2026-01-15",
    expiryDate: "2029-01-15",
    storageLocation: "Arsip Digital - Folder ISO/2026",
    pic: "Nama PIC",
    picEmail: "pic@sucofindo.co.id",
    ccEmail: "",
    description: "",
    notes: "",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Parses an uploaded workbook and creates one Certificate per valid row.
 * Category/Client/Department are matched by name (case-insensitive) and
 * auto-created if they don't exist yet, since spreadsheet input naturally
 * refers to them by name rather than internal ID.
 */
export async function importCertificatesFromExcel(buffer: Buffer): Promise<ImportSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return { totalRows: 0, created: 0, skipped: 0, errors: 0, results: [] };
  }

  // Map header text (row 1) -> column index, so column order in the
  // uploaded file doesn't have to exactly match the template.
  const headerRow = sheet.getRow(1);
  const columnIndexByKey = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const headerText = cellToString(cell.value).toLowerCase();
    const match = IMPORT_COLUMNS.find((c) => c.header.toLowerCase() === headerText);
    if (match) columnIndexByKey.set(match.key, colNumber);
  });

  const missingRequired = IMPORT_COLUMNS.filter((c) => c.required && !columnIndexByKey.has(c.key));
  if (missingRequired.length > 0) {
    return {
      totalRows: 0,
      created: 0,
      skipped: 0,
      errors: 1,
      results: [
        {
          row: 1,
          certificateNumber: "-",
          status: "ERROR",
          message: `Kolom wajib tidak ditemukan di header: ${missingRequired.map((c) => c.header).join(", ")}. Gunakan template yang disediakan.`,
        },
      ],
    };
  }

  const results: ImportRowResult[] = [];
  const categoryCache = new Map<string, string>();
  const clientCache = new Map<string, string>();
  const departmentCache = new Map<string, string>();

  async function getOrCreateCategory(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key)!;
    const existing = await prisma.category.findFirst({ where: { name: { equals: name } } });
    const record = existing ?? (await prisma.category.create({ data: { name } }));
    categoryCache.set(key, record.id);
    return record.id;
  }

  async function getOrCreateClient(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (clientCache.has(key)) return clientCache.get(key)!;
    const existing = await prisma.client.findFirst({ where: { name: { equals: name } } });
    const record = existing ?? (await prisma.client.create({ data: { name } }));
    clientCache.set(key, record.id);
    return record.id;
  }

  async function getOrCreateDepartment(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (departmentCache.has(key)) return departmentCache.get(key)!;
    const existing = await prisma.department.findFirst({ where: { name: { equals: name } } });
    const record = existing ?? (await prisma.department.create({ data: { name } }));
    departmentCache.set(key, record.id);
    return record.id;
  }

  const lastRow = sheet.rowCount;

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0 || row.values === undefined) continue;

    const get = (key: string) => {
      const idx = columnIndexByKey.get(key);
      return idx ? row.getCell(idx).value : null;
    };

    const certificateNumber = cellToString(get("certificateNumber"));
    if (!certificateNumber) continue; // blank row — skip silently, not an error

    try {
      const certificateName = cellToString(get("certificateName"));
      const categoryName = cellToString(get("category"));
      const clientName = cellToString(get("client"));
      const departmentName = cellToString(get("department"));
      const pic = cellToString(get("pic"));
      const issueDate = cellToDate(get("issueDate"));
      const expiryDate = cellToDate(get("expiryDate"));
      const validFrom = cellToDate(get("validFrom"));

      const missing: string[] = [];
      if (!certificateName) missing.push("Certificate Name");
      if (!categoryName) missing.push("Category");
      if (!clientName) missing.push("Client");
      if (!pic) missing.push("PIC");
      if (!issueDate) missing.push("Issue Date");
      if (!expiryDate) missing.push("Expiry Date");

      if (missing.length > 0) {
        results.push({
          row: rowNumber,
          certificateNumber,
          status: "ERROR",
          message: `Field wajib kosong/tidak valid: ${missing.join(", ")}.`,
        });
        continue;
      }

      if (expiryDate! <= issueDate!) {
        results.push({
          row: rowNumber,
          certificateNumber,
          status: "ERROR",
          message: "Expiry Date harus lebih besar dari Issue Date.",
        });
        continue;
      }

      const existing = await prisma.certificate.findUnique({ where: { certificateNumber } });
      if (existing) {
        results.push({
          row: rowNumber,
          certificateNumber,
          status: "SKIPPED",
          message: existing.deletedAt
            ? "Nomor sertifikat sudah dipakai oleh sertifikat di Trash."
            : "Nomor sertifikat sudah ada — dilewati.",
        });
        continue;
      }

      const [categoryId, clientId, departmentId] = await Promise.all([
        getOrCreateCategory(categoryName),
        getOrCreateClient(clientName),
        departmentName ? getOrCreateDepartment(departmentName) : Promise.resolve(null),
      ]);

      await prisma.certificate.create({
        data: {
          certificateNumber,
          certificateName,
          categoryId,
          clientId,
          departmentId,
          issuingBody: cellToString(get("issuingBody")) || null,
          issueDate: issueDate!,
          validFrom: validFrom,
          expiryDate: expiryDate!,
          storageLocation: cellToString(get("storageLocation")) || null,
          pic,
          picEmail: cellToString(get("picEmail")) || null,
          ccEmail: cellToString(get("ccEmail")) || null,
          description: cellToString(get("description")) || null,
          notes: cellToString(get("notes")) || null,
        },
      });

      results.push({ row: rowNumber, certificateNumber, status: "CREATED" });
    } catch (err) {
      results.push({
        row: rowNumber,
        certificateNumber,
        status: "ERROR",
        message: err instanceof Error ? err.message : "Gagal memproses baris ini.",
      });
    }
  }

  return {
    totalRows: results.length,
    created: results.filter((r) => r.status === "CREATED").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    errors: results.filter((r) => r.status === "ERROR").length,
    results,
  };
}
