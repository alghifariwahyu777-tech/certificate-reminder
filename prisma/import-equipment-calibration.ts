/**
 * One-off data import: Laporan Monitoring Peralatan Kalibrasi — Cabang
 * Cilacap (FOR-SCI-UMU-198, sheet "Rev. 03").
 *
 * The Equipment schema's field structure already mirrors this form's
 * columns (see prisma/schema.prisma) — this script imports the actual
 * row data (43 pieces of lab equipment) on top of that structure.
 *
 * Two fields are required by the schema but not given per-row in the
 * source form, so a documented default was used for every row:
 *
 *   1. category (required FK) — the source has no equipment-category
 *      column; every item on this form is lab/laboratory equipment, so
 *      all 43 rows are filed under one new category, "Alat Laboratorium".
 *      Split it into finer categories later from Equipment > Kategori if
 *      you want (e.g. separating ovens/furnaces from balances) — nothing
 *      here depends on staying in one category.
 *   2. pic (required FK, Employee) — the source has no per-item PIC column,
 *      only "Unit Kerja Pemilik" (SCI CILACAP, a branch, not a person).
 *      The form's own signature block names its preparer ("Disiapkan
 *      Oleh: Bhumi Hardianto") — he is used as the default PIC for every
 *      row. Reassign individual items to a different PIC from the
 *      Equipment edit page if a different person actually owns upkeep for
 *      that specific item.
 *
 * Note on the data itself: 14 of the 43 items have a calibration expiry
 * date that has already passed as of the import date. That is not an
 * import error — it is what the source form says — and once this data is
 * in the live database, the reminder engine will immediately treat those
 * 14 as "Kedaluwarsa" (and queue/​send the expiry reminder email to the PIC
 * plus every active Supervisor on the next reminder run). Recalibrate
 * those items or correct their dates first if you don't want that email
 * going out immediately.
 *
 * Safe to re-run: equipment rows are matched by (name, assetNumber,
 * serialNumber) and skipped if already present.
 *
 * Usage:
 *   npx tsx prisma/import-equipment-calibration.ts
 */
import { PrismaClient } from "@prisma/client";
import rows from "./data/equipment-clp-kalibrasi.json";

const prisma = new PrismaClient();

const DEFAULT_CATEGORY_NAME = "Alat Laboratorium";
const DEFAULT_PIC = {
  name: "Bhumi Hardianto",
  position: "Inspector 4",
  department: "Bidang Inspeksi dan Pengujian Cabang Cilacap",
};

function slugEmail(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return `${tokens.join(".")}@sucofindo.co.id`;
}

type EquipmentRow = {
  name: string;
  assetNumber: string | null;
  brand: string | null;
  serialNumber: string | null;
  color: string | null;
  condition: string | null;
  usageStatus: string | null;
  calibrationNumber: string | null;
  calibrationInterval: string | null;
  lastCalibrationDate: string | null;
  nextCalibrationDate: string;
  ownerUnit: string | null;
  calibratedBy: string | null;
  calibrationType: string | null;
  measurementRange: string | null;
};

async function main() {
  console.log("Importing peralatan kalibrasi (Cabang Cilacap, Rev. 03)...");

  const data = rows as EquipmentRow[];

  // 1. Default category
  const category = await prisma.equipmentCategory.upsert({
    where: { name: DEFAULT_CATEGORY_NAME },
    update: {},
    create: { name: DEFAULT_CATEGORY_NAME },
  });

  // 2. Default PIC employee
  const picEmail = slugEmail(DEFAULT_PIC.name);
  let pic = await prisma.employee.findFirst({ where: { email: picEmail } });
  if (!pic) {
    const dept = await prisma.department.upsert({
      where: { name: DEFAULT_PIC.department },
      update: {},
      create: { name: DEFAULT_PIC.department },
    });
    pic = await prisma.employee.create({
      data: {
        name: DEFAULT_PIC.name,
        position: DEFAULT_PIC.position,
        email: picEmail,
        departmentId: dept.id,
      },
    });
  }

  // 3. Equipment rows
  let created = 0;
  let skipped = 0;
  for (const r of data) {
    const existing = await prisma.equipment.findFirst({
      where: {
        name: r.name,
        assetNumber: r.assetNumber,
        serialNumber: r.serialNumber,
        deletedAt: null,
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.equipment.create({
      data: {
        name: r.name,
        assetNumber: r.assetNumber,
        serialNumber: r.serialNumber,
        brand: r.brand,
        color: r.color,
        categoryId: category.id,
        picId: pic.id,
        condition: r.condition,
        usageStatus: r.usageStatus,
        ownerUnit: r.ownerUnit,
        calibrationNumber: r.calibrationNumber,
        calibratedBy: r.calibratedBy,
        calibrationType: r.calibrationType,
        calibrationInterval: r.calibrationInterval,
        measurementRange: r.measurementRange,
        lastCalibrationDate: r.lastCalibrationDate ? new Date(r.lastCalibrationDate) : null,
        nextCalibrationDate: new Date(r.nextCalibrationDate),
        notes:
          "Diimpor dari Laporan Monitoring Peralatan Kalibrasi FOR-SCI-UMU-198 (Rev. 03) — Cabang Cilacap.",
      },
    });
    created++;
  }

  console.log(`  Equipment: ${created} created, ${skipped} already existed`);
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
