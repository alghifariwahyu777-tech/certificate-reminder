import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export const PERSONNEL_IMPORT_COLUMNS = [
  { header: "Employee Name", key: "employeeName", required: true },
  { header: "Employee ID (NIP)", key: "employeeId", required: false },
  { header: "Position", key: "position", required: false },
  { header: "Department", key: "department", required: false },
  { header: "Employee Email", key: "employeeEmail", required: true },
  { header: "Category", key: "category", required: true },
  { header: "Certification Name", key: "certificationName", required: true },
  { header: "Certification Number", key: "certificationNumber", required: false },
  { header: "Issuing Body", key: "issuingBody", required: false },
  { header: "Issue Date", key: "issueDate", required: false },
  { header: "Valid From", key: "validFrom", required: false },
  { header: "Expiry Date", key: "expiryDate", required: true },
  { header: "HR/Supervisor Email (CC)", key: "ccEmail", required: false },
  { header: "Notes", key: "notes", required: false },
] as const;

export type PersonnelImportRowResult = {
  row: number;
  employeeName: string;
  certificationName: string;
  status: "CREATED" | "SKIPPED" | "ERROR";
  message?: string;
};

export type PersonnelImportSummary = {
  totalRows: number;
  created: number;
  skipped: number;
  errors: number;
  results: PersonnelImportRowResult[];
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as object)) {
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
export async function generatePersonnelImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Personnel Certifications");

  sheet.columns = PERSONNEL_IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 24 }));
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  });

  sheet.addRow({
    employeeName: "Contoh Nama Personil",
    employeeId: "NIP-001",
    position: "Inspector",
    department: "Divisi Sertifikasi",
    employeeEmail: "personil@sucofindo.co.id",
    category: "K3",
    certificationName: "Sertifikasi Ahli K3 Umum",
    certificationNumber: "K3U-2026-001",
    issuingBody: "Kemnaker RI",
    issueDate: "2026-01-15",
    validFrom: "2026-01-15",
    expiryDate: "2029-01-15",
    ccEmail: "hr@sucofindo.co.id",
    notes: "",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Parses an uploaded workbook and creates one Employee (if not already
 * existing by email) + one PersonnelCertification per valid row. Employee
 * and Category are matched by name/email (case-insensitive) and
 * auto-created if missing, same convention as the client certificate import.
 */
export async function importPersonnelCertificationsFromExcel(buffer: Buffer): Promise<PersonnelImportSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return { totalRows: 0, created: 0, skipped: 0, errors: 0, results: [] };
  }

  const headerRow = sheet.getRow(1);
  const columnIndexByKey = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const headerText = cellToString(cell.value).toLowerCase();
    const match = PERSONNEL_IMPORT_COLUMNS.find((c) => c.header.toLowerCase() === headerText);
    if (match) columnIndexByKey.set(match.key, colNumber);
  });

  const missingRequired = PERSONNEL_IMPORT_COLUMNS.filter((c) => c.required && !columnIndexByKey.has(c.key));
  if (missingRequired.length > 0) {
    return {
      totalRows: 0,
      created: 0,
      skipped: 0,
      errors: 1,
      results: [
        {
          row: 1,
          employeeName: "-",
          certificationName: "-",
          status: "ERROR",
          message: `Kolom wajib tidak ditemukan di header: ${missingRequired.map((c) => c.header).join(", ")}. Gunakan template yang disediakan.`,
        },
      ],
    };
  }

  const results: PersonnelImportRowResult[] = [];
  const categoryCache = new Map<string, string>();
  const departmentCache = new Map<string, string>();
  const employeeCache = new Map<string, string>();

  async function getOrCreateCategory(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key)!;
    const existing = await prisma.personnelCertificationCategory.findFirst({ where: { name: { equals: name } } });
    const record = existing ?? (await prisma.personnelCertificationCategory.create({ data: { name } }));
    categoryCache.set(key, record.id);
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

  async function getOrCreateEmployee(params: {
    email: string;
    name: string;
    employeeId: string;
    position: string;
    departmentId: string | null;
  }): Promise<string> {
    const key = params.email.toLowerCase();
    if (employeeCache.has(key)) return employeeCache.get(key)!;
    const existing = await prisma.employee.findFirst({ where: { email: { equals: params.email } } });
    const record =
      existing ??
      (await prisma.employee.create({
        data: {
          name: params.name,
          email: params.email,
          employeeId: params.employeeId || null,
          position: params.position || null,
          departmentId: params.departmentId,
        },
      }));
    employeeCache.set(key, record.id);
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

    const employeeName = cellToString(get("employeeName"));
    const certificationName = cellToString(get("certificationName"));
    if (!employeeName && !certificationName) continue; // blank row — skip silently

    try {
      const employeeEmail = cellToString(get("employeeEmail"));
      const categoryName = cellToString(get("category"));
      const departmentName = cellToString(get("department"));
      const expiryDate = cellToDate(get("expiryDate"));

      const missing: string[] = [];
      if (!employeeName) missing.push("Employee Name");
      if (!employeeEmail) missing.push("Employee Email");
      if (!categoryName) missing.push("Category");
      if (!certificationName) missing.push("Certification Name");
      if (!expiryDate) missing.push("Expiry Date");

      if (missing.length > 0) {
        results.push({
          row: rowNumber,
          employeeName: employeeName || "-",
          certificationName: certificationName || "-",
          status: "ERROR",
          message: `Field wajib kosong/tidak valid: ${missing.join(", ")}.`,
        });
        continue;
      }

      const certificationNumber = cellToString(get("certificationNumber")) || null;

      if (certificationNumber) {
        const existingCert = await prisma.personnelCertification.findFirst({
          where: { certificationNumber, deletedAt: null },
        });
        if (existingCert) {
          results.push({
            row: rowNumber,
            employeeName,
            certificationName,
            status: "SKIPPED",
            message: "Nomor sertifikasi sudah ada — dilewati.",
          });
          continue;
        }
      }

      const departmentId = departmentName ? await getOrCreateDepartment(departmentName) : null;
      const [categoryId, employeeId] = await Promise.all([
        getOrCreateCategory(categoryName),
        getOrCreateEmployee({
          email: employeeEmail,
          name: employeeName,
          employeeId: cellToString(get("employeeId")),
          position: cellToString(get("position")),
          departmentId,
        }),
      ]);

      await prisma.personnelCertification.create({
        data: {
          employeeId,
          categoryId,
          certificationName,
          certificationNumber,
          issuingBody: cellToString(get("issuingBody")) || null,
          issueDate: cellToDate(get("issueDate")),
          validFrom: cellToDate(get("validFrom")),
          expiryDate: expiryDate!,
          ccEmail: cellToString(get("ccEmail")) || null,
          notes: cellToString(get("notes")) || null,
        },
      });

      results.push({ row: rowNumber, employeeName, certificationName, status: "CREATED" });
    } catch (err) {
      results.push({
        row: rowNumber,
        employeeName: employeeName || "-",
        certificationName: certificationName || "-",
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
