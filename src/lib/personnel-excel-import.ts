import type { Prisma } from "@prisma/client";
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
  const lastRow = sheet.rowCount;

  // Read every row first, then talk to the database a few times for the whole
  // file (not several times per row), so large files finish within the
  // hosting time limit even when the database is far away.
  type Pending = {
    row: number;
    employeeName: string;
    employeeEmail: string;
    employeeCode: string;
    position: string;
    categoryName: string;
    departmentName: string;
    certificationName: string;
    certificationNumber: string | null;
    data: Omit<Prisma.PersonnelCertificationUncheckedCreateInput, "employeeId" | "categoryId">;
  };
  const pending: Pending[] = [];
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0 || row.values === undefined) continue;
    const get = (key: string) => {
      const idx = columnIndexByKey.get(key);
      return idx ? row.getCell(idx).value : null;
    };
    const employeeName = cellToString(get("employeeName"));
    const certificationName = cellToString(get("certificationName"));
    if (!employeeName && !certificationName) continue; // blank row: skip silently
    const employeeEmail = cellToString(get("employeeEmail"));
    const categoryName = cellToString(get("category"));
    const expiryDate = cellToDate(get("expiryDate"));
    const missing: string[] = [];
    if (!employeeName) missing.push("Employee Name");
    if (!employeeEmail) missing.push("Employee Email");
    if (!categoryName) missing.push("Category");
    if (!certificationName) missing.push("Certification Name");
    if (!expiryDate) missing.push("Expiry Date");
    if (missing.length > 0) {
      results.push({ row: rowNumber, employeeName: employeeName || "-", certificationName: certificationName || "-", status: "ERROR", message: `Field wajib kosong/tidak valid: ${missing.join(", ")}.` });
      continue;
    }
    const certificationNumber = cellToString(get("certificationNumber")) || null;
    pending.push({
      row: rowNumber,
      employeeName,
      employeeEmail,
      employeeCode: cellToString(get("employeeId")),
      position: cellToString(get("position")),
      categoryName,
      departmentName: cellToString(get("department")),
      certificationName,
      certificationNumber,
      data: {
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
  }

  // certification numbers already in the system (one query), and duplicates inside the file
  const numbers = pending.map((p) => p.certificationNumber).filter((n): n is string => !!n);
  const taken = new Set(
    (await prisma.personnelCertification.findMany({ where: { certificationNumber: { in: numbers }, deletedAt: null }, select: { certificationNumber: true } })).map((c) => c.certificationNumber)
  );
  const seen = new Set<string>();
  const toCreate: Pending[] = [];
  for (const p of pending) {
    if (p.certificationNumber && taken.has(p.certificationNumber)) {
      results.push({ row: p.row, employeeName: p.employeeName, certificationName: p.certificationName, status: "SKIPPED", message: "Nomor sertifikasi sudah ada, dilewati." });
    } else if (p.certificationNumber && seen.has(p.certificationNumber)) {
      results.push({ row: p.row, employeeName: p.employeeName, certificationName: p.certificationName, status: "SKIPPED", message: "Nomor sertifikasi muncul lebih dari sekali di file, baris ini dilewati." });
    } else {
      if (p.certificationNumber) seen.add(p.certificationNumber);
      toCreate.push(p);
    }
  }

  // master data and employees: load once, create only what is new
  const categories = new Map((await prisma.personnelCertificationCategory.findMany({ select: { id: true, name: true } })).map((r) => [r.name.toLowerCase(), r.id]));
  const departments = new Map((await prisma.department.findMany({ select: { id: true, name: true } })).map((r) => [r.name.toLowerCase(), r.id]));
  const emails = [...new Set(toCreate.map((p) => p.employeeEmail.toLowerCase()))];
  const employees = new Map(
    (await prisma.employee.findMany({ where: { email: { in: toCreate.map((p) => p.employeeEmail), mode: "insensitive" } }, select: { id: true, email: true } })).map((e) => [e.email.toLowerCase(), e.id])
  );
  for (const p of toCreate) {
    const c = p.categoryName.toLowerCase();
    if (!categories.has(c)) categories.set(c, (await prisma.personnelCertificationCategory.create({ data: { name: p.categoryName } })).id);
    const d = p.departmentName.toLowerCase();
    if (p.departmentName && !departments.has(d)) departments.set(d, (await prisma.department.create({ data: { name: p.departmentName } })).id);
  }
  for (const email of emails) {
    if (employees.has(email)) continue;
    const p = toCreate.find((x) => x.employeeEmail.toLowerCase() === email)!;
    const created = await prisma.employee.create({
      data: {
        name: p.employeeName,
        email: p.employeeEmail,
        employeeId: p.employeeCode || null,
        position: p.position || null,
        departmentId: p.departmentName ? (departments.get(p.departmentName.toLowerCase()) ?? null) : null,
      },
    });
    employees.set(email, created.id);
  }

  const rowData = (p: Pending): Prisma.PersonnelCertificationUncheckedCreateInput => ({
    ...p.data,
    employeeId: employees.get(p.employeeEmail.toLowerCase())!,
    categoryId: categories.get(p.categoryName.toLowerCase())!,
  });

  // write in chunks; a chunk that fails is retried row by row so each row gets its own result
  for (let i = 0; i < toCreate.length; i += 200) {
    const chunk = toCreate.slice(i, i + 200);
    try {
      await prisma.personnelCertification.createMany({ data: chunk.map(rowData) });
      for (const p of chunk) results.push({ row: p.row, employeeName: p.employeeName, certificationName: p.certificationName, status: "CREATED" });
    } catch {
      for (const p of chunk) {
        try {
          await prisma.personnelCertification.create({ data: rowData(p) });
          results.push({ row: p.row, employeeName: p.employeeName, certificationName: p.certificationName, status: "CREATED" });
        } catch (err) {
          results.push({ row: p.row, employeeName: p.employeeName, certificationName: p.certificationName, status: "ERROR", message: err instanceof Error ? err.message : "Gagal memproses baris ini." });
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
