import type { Prisma } from "@prisma/client";
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
  const lastRow = sheet.rowCount;

  // Read every row first, then talk to the database a few times for the whole
  // file (not several times per row), so large files finish well within the
  // hosting time limit even when the database is far away.
  type Pending = { row: number; certificateNumber: string; data: Omit<Prisma.CertificateUncheckedCreateInput, "categoryId" | "clientId" | "departmentId">; categoryName: string; clientName: string; departmentName: string };
  const pending: Pending[] = [];
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0 || row.values === undefined) continue;
    const get = (key: string) => {
      const idx = columnIndexByKey.get(key);
      return idx ? row.getCell(idx).value : null;
    };
    const certificateNumber = cellToString(get("certificateNumber"));
    if (!certificateNumber) continue; // blank row: skip silently, not an error
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
      results.push({ row: rowNumber, certificateNumber, status: "ERROR", message: `Field wajib kosong/tidak valid: ${missing.join(", ")}.` });
      continue;
    }
    if (expiryDate! <= issueDate!) {
      results.push({ row: rowNumber, certificateNumber, status: "ERROR", message: "Expiry Date harus lebih besar dari Issue Date." });
      continue;
    }
    pending.push({
      row: rowNumber,
      certificateNumber,
      categoryName,
      clientName,
      departmentName,
      data: {
        certificateNumber,
        certificateName,
        issuingBody: cellToString(get("issuingBody")) || null,
        issueDate: issueDate!,
        validFrom,
        expiryDate: expiryDate!,
        storageLocation: cellToString(get("storageLocation")) || null,
        pic,
        picEmail: cellToString(get("picEmail")) || null,
        ccEmail: cellToString(get("ccEmail")) || null,
        description: cellToString(get("description")) || null,
        notes: cellToString(get("notes")) || null,
      },
    });
  }

  // numbers already in the system (one query), and duplicates inside the file
  const existing = new Map(
    (await prisma.certificate.findMany({ where: { certificateNumber: { in: pending.map((p) => p.certificateNumber) } }, select: { certificateNumber: true, deletedAt: true } })).map((c) => [c.certificateNumber, c])
  );
  const seen = new Set<string>();
  const toCreate: Pending[] = [];
  for (const p of pending) {
    const ex = existing.get(p.certificateNumber);
    if (ex) {
      results.push({ row: p.row, certificateNumber: p.certificateNumber, status: "SKIPPED", message: ex.deletedAt ? "Nomor sertifikat sudah dipakai oleh sertifikat di Trash." : "Nomor sertifikat sudah ada, dilewati." });
    } else if (seen.has(p.certificateNumber)) {
      results.push({ row: p.row, certificateNumber: p.certificateNumber, status: "SKIPPED", message: "Nomor sertifikat muncul lebih dari sekali di file, baris ini dilewati." });
    } else {
      seen.add(p.certificateNumber);
      toCreate.push(p);
    }
  }

  // master data: load once, create only the names that are new
  const ensure = async (
    names: string[],
    load: () => Promise<{ id: string; name: string }[]>,
    create: (name: string) => Promise<{ id: string }>
  ): Promise<Map<string, string>> => {
    const map = new Map((await load()).map((r) => [r.name.toLowerCase(), r.id]));
    for (const n of [...new Set(names.filter(Boolean))]) if (!map.has(n.toLowerCase())) map.set(n.toLowerCase(), (await create(n)).id);
    return map;
  };
  const [categories, clients, departments] = toCreate.length
    ? await Promise.all([
        ensure(toCreate.map((p) => p.categoryName), () => prisma.category.findMany({ select: { id: true, name: true } }), (name) => prisma.category.create({ data: { name } })),
        ensure(toCreate.map((p) => p.clientName), () => prisma.client.findMany({ select: { id: true, name: true } }), (name) => prisma.client.create({ data: { name } })),
        ensure(toCreate.map((p) => p.departmentName), () => prisma.department.findMany({ select: { id: true, name: true } }), (name) => prisma.department.create({ data: { name } })),
      ])
    : [new Map<string, string>(), new Map<string, string>(), new Map<string, string>()];

  const rowData = (p: Pending): Prisma.CertificateUncheckedCreateInput => ({
    ...p.data,
    categoryId: categories.get(p.categoryName.toLowerCase())!,
    clientId: clients.get(p.clientName.toLowerCase())!,
    departmentId: p.departmentName ? (departments.get(p.departmentName.toLowerCase()) ?? null) : null,
  });

  // write in chunks; a chunk that fails is retried row by row so each row gets its own result
  for (let i = 0; i < toCreate.length; i += 200) {
    const chunk = toCreate.slice(i, i + 200);
    try {
      await prisma.certificate.createMany({ data: chunk.map(rowData) });
      for (const p of chunk) results.push({ row: p.row, certificateNumber: p.certificateNumber, status: "CREATED" });
    } catch {
      for (const p of chunk) {
        try {
          await prisma.certificate.create({ data: rowData(p) });
          results.push({ row: p.row, certificateNumber: p.certificateNumber, status: "CREATED" });
        } catch (err) {
          results.push({ row: p.row, certificateNumber: p.certificateNumber, status: "ERROR", message: err instanceof Error ? err.message : "Gagal memproses baris ini." });
        }
      }
    }
  }
  results.sort((a, b) => a.row - b.row);

  return {
    totalRows: results.length,
    created: results.filter((r) => r.status === "CREATED").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    errors: results.filter((r) => r.status === "ERROR").length,
    results,
  };
}
