/**
 * One-off data import: Matriks Kompetensi CLP 26 (Cabang Cilacap).
 *
 * Source: Matriks_Kompetensi_CLP_26.xlsx (3 sheets: "Kepala Cabang",
 * "Bidang Dukungan Bisnis", "OPS"). The source is a wide competency
 * checklist — one row per employee, one column per competency/certification
 * grouped under a category header, with "x" marking that the employee holds
 * that competency. It records WHICH competencies each employee has, not
 * WHEN each one expires.
 *
 * Mapping into this system's schema:
 *   - Each unique "Bidang" (division/field) -> Department
 *   - Each employee row                     -> Employee
 *   - Each competency-group header           -> PersonnelCertificationCategory
 *   - Each "x" cell                          -> PersonnelCertification
 *
 * Two adjustments were necessary because the source has no dates and no
 * emails, while this system's schema requires both on every record:
 *
 *   1. expiryDate is NOT NULL on PersonnelCertification (the whole reminder
 *      engine is built around it). The source gives no expiry per
 *      competency, so importing "as-is" would mean fabricating a date. We
 *      use a far-future sentinel (31 Dec 2099) so these records never fire
 *      a reminder milestone, and mark every one with a note explaining why.
 *      If any of these competencies actually do expire and need reminders,
 *      edit that record's "Tanggal Berakhir" once the real date is known —
 *      the reminder engine will then treat it exactly like any other
 *      certification.
 *   2. Employee.email is required, but the source has no email column.
 *      Emails are generated from the company's existing naming convention
 *      (firstname.lastname@sucofindo.co.id, using every name token to avoid
 *      collisions) and MUST be verified/corrected against real corporate
 *      addresses before relying on them for actual reminder delivery.
 *
 * Safe to re-run: every step is upsert/find-or-create, so running this
 * script twice does not create duplicates.
 *
 * Usage:
 *   npx tsx prisma/import-competency.ts
 */
import { PrismaClient } from "@prisma/client";
import data from "./data/competency-clp26.json";

const prisma = new PrismaClient();

const NO_EXPIRY_SENTINEL = new Date("2099-12-31T00:00:00.000Z");
const NO_EXPIRY_NOTE =
  "Data kompetensi dari Matriks Kompetensi CLP 26 (Cabang Cilacap) — sumber tidak mencantumkan tanggal kedaluwarsa per kompetensi. Tanggal berakhir di atas hanyalah placeholder agar tidak memicu reminder; mohon perbarui dengan tanggal sebenarnya bila kompetensi ini punya masa berlaku.";

function slugEmail(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return `${tokens.join(".")}@sucofindo.co.id`;
}

async function findOrCreateEmployee(
  name: string,
  position: string | null,
  departmentId: string
): Promise<{ id: string; created: boolean }> {
  const email = slugEmail(name);
  const existing = await prisma.employee.findFirst({ where: { email } });
  if (existing) return { id: existing.id, created: false };
  const created = await prisma.employee.create({
    data: { name, position, email, departmentId },
  });
  return { id: created.id, created: true };
}

async function main() {
  console.log("Importing Matriks Kompetensi CLP 26...");

  const { employees, records } = data as {
    employees: { name: string; position: string | null; bidang: string; sheet: string }[];
    records: { employee: string; category: string; competency: string }[];
  };

  // 1. Departments (one per unique "bidang")
  const departmentNames = Array.from(new Set(employees.map((e) => e.bidang)));
  const departmentByName = new Map<string, string>();
  for (const name of departmentNames) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    departmentByName.set(name, dept.id);
  }
  console.log(`  Departments ready: ${departmentNames.length}`);

  // 2. Employees
  const employeeByName = new Map<string, string>();
  let createdEmployees = 0;
  for (const e of employees) {
    const departmentId = departmentByName.get(e.bidang)!;
    const { id, created } = await findOrCreateEmployee(e.name, e.position, departmentId);
    if (created) createdEmployees++;
    employeeByName.set(e.name, id);
  }
  console.log(`  Employees ready: ${employees.length} (created ${createdEmployees} new)`);

  // 3. Personnel certification categories (one per competency group)
  const categoryNames = Array.from(new Set(records.map((r) => r.category)));
  const categoryByName = new Map<string, string>();
  for (const name of categoryNames) {
    const cat = await prisma.personnelCertificationCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryByName.set(name, cat.id);
  }
  console.log(`  Certification categories ready: ${categoryNames.length}`);

  // 4. Personnel certifications (one per "x" cell)
  let createdCerts = 0;
  let skippedCerts = 0;
  for (const r of records) {
    const employeeId = employeeByName.get(r.employee);
    const categoryId = categoryByName.get(r.category);
    if (!employeeId || !categoryId) continue;

    const existing = await prisma.personnelCertification.findFirst({
      where: {
        employeeId,
        categoryId,
        certificationName: r.competency,
        deletedAt: null,
      },
    });
    if (existing) {
      skippedCerts++;
      continue;
    }

    await prisma.personnelCertification.create({
      data: {
        employeeId,
        categoryId,
        certificationName: r.competency,
        expiryDate: NO_EXPIRY_SENTINEL,
        notes: NO_EXPIRY_NOTE,
      },
    });
    createdCerts++;
  }
  console.log(`  Certifications: ${createdCerts} created, ${skippedCerts} already existed`);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
