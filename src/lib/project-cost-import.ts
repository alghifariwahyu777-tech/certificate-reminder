import ExcelJS from "exceljs";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Excel import for project costs. One workbook can hold many projects:
 *  - sheet "Biaya" — realisasi biaya (appended; a row already imported is skipped)
 *  - sheet "RAB"   — anggaran per kategori (replaces the project's RAB; locks the
 *                    baseline from it the first time, if not locked yet)
 * Rows are matched to projects by "No. Project". Columns are found by header
 * text (case/spacing-insensitive), so column order doesn't matter and extra
 * columns are ignored — the finance team's existing sheet can be pasted in.
 */

export const COST_COLUMNS = [
  { key: "date", header: "Tanggal", aliases: ["tanggal", "tgl", "date", "tanggal transaksi"], required: true },
  { key: "projectNumber", header: "No. Project", aliases: ["no. project", "no project", "nomor project", "no. proyek", "no proyek", "nomor proyek", "no kontrak", "no. kontrak", "project number"], required: true },
  { key: "category", header: "Kategori", aliases: ["kategori", "kategori biaya", "jenis biaya", "category"], required: false },
  { key: "accountCode", header: "Akun", aliases: ["akun", "kode akun", "no. akun", "no akun", "natural account", "account"], required: false },
  { key: "description", header: "Keterangan", aliases: ["keterangan", "uraian", "deskripsi", "description"], required: true },
  { key: "amount", header: "Nominal", aliases: ["nominal", "jumlah", "nilai", "biaya", "amount", "rp"], required: true },
  { key: "cause", header: "Penyebab", aliases: ["penyebab", "sebab", "cause"], required: false },
  { key: "referenceNo", header: "No. Bukti", aliases: ["no. bukti", "no bukti", "nomor bukti", "no. voucher", "no voucher", "voucher", "reference"], required: false },
] as const;

export const BUDGET_COLUMNS = [
  { key: "projectNumber", header: "No. Project", aliases: COST_COLUMNS[1].aliases, required: true },
  { key: "category", header: "Kategori", aliases: COST_COLUMNS[2].aliases, required: true },
  { key: "description", header: "Keterangan", aliases: ["keterangan", "uraian", "deskripsi", "description"], required: false },
  { key: "amount", header: "Nominal", aliases: COST_COLUMNS[5].aliases, required: true },
] as const;

export type CostRow = {
  sheet: "Biaya";
  row: number;
  projectNumber: string;
  projectName?: string;
  date?: string;
  category: string;
  description: string;
  amount: number;
  cause: "NORMAL" | "DELAY" | "EXTRA_SCOPE";
  referenceNo: string | null;
  status: "NEW" | "DUPLICATE" | "ERROR";
  message?: string;
};
export type BudgetRow = {
  sheet: "RAB";
  row: number;
  projectNumber: string;
  projectName?: string;
  category: string;
  description: string | null;
  amount: number;
  status: "NEW" | "ERROR";
  message?: string;
};
export type ImportPreview = {
  costs: CostRow[];
  budgets: BudgetRow[];
  /** per project: RAB total being imported, and whether the baseline will be locked from it */
  budgetProjects: { projectNumber: string; projectName: string; total: number; locksBaseline: boolean; replaces: number }[];
  missingSheets: string[];
};

const norm = (v: string) => v.toLowerCase().replace(/[\s_]+/g, " ").replace(/[^a-z0-9. ]/g, "").trim();

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if ("result" in o) return cellText(o.result as ExcelJS.CellValue);
    if ("text" in o) return String(o.text);
    if ("richText" in o) return (o.richText as { text: string }[]).map((t) => t.text).join("");
  }
  return String(v).trim();
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in (v as object)) return cellNumber((v as { result: ExcelJS.CellValue }).result);
  const t = cellText(v).replace(/rp/gi, "").replace(/\s/g, "");
  if (!t) return null;
  // Indonesian "1.250.000,50" or plain "1250000.5"
  const cleaned = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/[.,](?=\d{3}(\D|$))/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function cellDate(v: ExcelJS.CellValue): string | null {
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())).toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Excel serial date
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const t = cellText(v);
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); // dd/mm/yyyy (Indonesian order)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function parseCause(v: string): CostRow["cause"] | null {
  const t = norm(v);
  if (!t || t === "normal" || t === "-" || t === "rutin") return "NORMAL";
  if (t.includes("lambat") || t === "delay") return "DELAY";
  if (t.includes("tambah") || t.includes("extra") || t.includes("lingkup")) return "EXTRA_SCOPE";
  return null;
}

function findSheet(wb: ExcelJS.Workbook, names: string[]) {
  return wb.worksheets.find((ws) => names.includes(norm(ws.name)));
}

/** Locates the header row (first 10 rows) and maps each column key to its column index. */
function mapHeader(ws: ExcelJS.Worksheet, cols: readonly { key: string; aliases: readonly string[]; required: boolean; header: string }[]) {
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const map: Record<string, number> = {};
    row.eachCell((cell, c) => {
      const h = norm(cellText(cell.value));
      for (const col of cols) if (!(col.key in map) && col.aliases.includes(h)) map[col.key] = c;
    });
    const missing = cols.filter((c) => c.required && !(c.key in map)).map((c) => c.header);
    if (missing.length === 0) return { headerRow: r, map, missing: [] as string[] };
    if (Object.keys(map).length >= 2) return { headerRow: r, map, missing };
  }
  return { headerRow: 0, map: {} as Record<string, number>, missing: cols.filter((c) => c.required).map((c) => c.header) };
}

export function importKeyFor(r: { projectNumber: string; date?: string; category: string; description: string; amount: number; referenceNo: string | null }) {
  return createHash("sha1")
    .update([r.projectNumber.toLowerCase(), r.date, norm(r.category), norm(r.description), Math.round(r.amount * 100), (r.referenceNo || "").toLowerCase()].join("|"))
    .digest("hex")
    .slice(0, 32);
}

export async function parseCostWorkbook(buffer: Buffer, opts: { restrictToProjectId?: string } = {}): Promise<ImportPreview> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const costSheet = findSheet(wb, ["biaya", "realisasi biaya", "realisasi", "costs"]) ?? (wb.worksheets.length === 1 ? wb.worksheets[0] : undefined);
  const budgetSheet = findSheet(wb, ["rab", "anggaran", "budget"]);

  const projects = await prisma.project.findMany({
    where: { deletedAt: null, ...(opts.restrictToProjectId ? { id: opts.restrictToProjectId } : {}) },
    select: {
      id: true,
      projectNumber: true,
      projectName: true,
      baselineLockedAt: true,
      _count: { select: { budgetItems: true } },
      budgetItems: { where: { accountCode: { not: null } }, select: { accountCode: true, category: true } },
    },
  });
  // RAB account code → category, per project (RAB Sucofindo lines carry their account code)
  const accountCategory = new Map(projects.map((p) => [p.id, new Map(p.budgetItems.map((b) => [String(b.accountCode), b.category]))]));
  const byNumber = new Map(projects.map((p) => [p.projectNumber.trim().toLowerCase(), p]));
  const onlyOne = opts.restrictToProjectId ? projects[0] : undefined;

  const preview: ImportPreview = { costs: [], budgets: [], budgetProjects: [], missingSheets: [] };
  if (!costSheet && !budgetSheet) preview.missingSheets.push('Sheet "Biaya" atau "RAB" tidak ditemukan');

  // ---- costs
  if (costSheet) {
    const { headerRow, map, missing } = mapHeader(costSheet, COST_COLUMNS);
    if (missing.length) preview.missingSheets.push(`Sheet "${costSheet.name}": kolom wajib tidak ditemukan, ${missing.join(", ")}`);
    else {
      const keysInFile = new Set<string>();
      const candidates: (CostRow & { projectId?: string; key?: string })[] = [];
      for (let r = headerRow + 1; r <= costSheet.rowCount; r++) {
        const row = costSheet.getRow(r);
        const get = (k: string) => (map[k] ? row.getCell(map[k]).value : null);
        const projectNumber = (cellText(get("projectNumber")) || (onlyOne?.projectNumber ?? "")).trim();
        const description = cellText(get("description"));
        const amount = cellNumber(get("amount"));
        let account = cellText(get("accountCode")).replace(/\.0+$/, "");
        let category = cellText(get("category"));
        // older sheets used an "Akun" column for the category name itself
        if (account && !/^\d+$/.test(account)) {
          if (!category) category = account;
          account = "";
        }
        if (!projectNumber && !description && amount === null && !category && !account) continue; // empty row
        const date = cellDate(get("date"));
        const causeRaw = cellText(get("cause"));
        const cause = parseCause(causeRaw);
        const referenceNo = cellText(get("referenceNo")) || null;
        const p = byNumber.get(projectNumber.toLowerCase());
        if (!category && account && p) category = accountCategory.get(p.id)?.get(account) ?? "";
        const base: CostRow & { projectId?: string; key?: string } = {
          sheet: "Biaya",
          row: r,
          projectNumber,
          projectName: p?.projectName,
          date: date ?? undefined,
          category,
          description,
          amount: amount ?? 0,
          cause: cause ?? "NORMAL",
          referenceNo,
          status: "NEW",
          projectId: p?.id,
        };
        const err =
          !p
            ? opts.restrictToProjectId
              ? `No. project "${projectNumber}" bukan project ini`
              : `No. project "${projectNumber}" tidak ditemukan`
            : !date
              ? "Tanggal tidak valid (gunakan format tanggal Excel atau dd/mm/yyyy)"
              : !category
                ? account
                  ? `Akun ${account} tidak ada pada RAB project ini, isi kolom Kategori`
                  : "Kategori atau Akun wajib diisi"
                : !description
                  ? "Keterangan kosong"
                  : amount === null || amount <= 0
                    ? "Nominal tidak valid"
                    : cause === null
                      ? `Penyebab "${causeRaw}" tidak dikenali (isi: Normal / Keterlambatan / Pekerjaan tambahan)`
                      : null;
        if (err) {
          candidates.push({ ...base, status: "ERROR", message: err });
          continue;
        }
        const key = importKeyFor(base);
        if (keysInFile.has(`${p!.id}|${key}`)) {
          candidates.push({ ...base, status: "DUPLICATE", message: "Baris sama muncul lebih dari sekali di file" });
          continue;
        }
        keysInFile.add(`${p!.id}|${key}`);
        candidates.push({ ...base, key });
      }
      const keyed = candidates.filter((c) => c.key && c.projectId);
      const existing = keyed.length
        ? await prisma.projectExpense.findMany({
            where: { OR: keyed.map((c) => ({ projectId: c.projectId as string, importKey: c.key as string })) },
            select: { projectId: true, importKey: true },
          })
        : [];
      const existingSet = new Set(existing.map((e) => `${e.projectId}|${e.importKey}`));
      preview.costs = candidates.map(({ projectId, key, ...c }) =>
        key && projectId && existingSet.has(`${projectId}|${key}`) ? { ...c, status: "DUPLICATE" as const, message: "Sudah pernah diimpor" } : c
      );
    }
  }

  // ---- budget (RAB)
  if (budgetSheet) {
    const { headerRow, map, missing } = mapHeader(budgetSheet, BUDGET_COLUMNS);
    if (missing.length) preview.missingSheets.push(`Sheet "${budgetSheet.name}": kolom wajib tidak ditemukan, ${missing.join(", ")}`);
    else {
      for (let r = headerRow + 1; r <= budgetSheet.rowCount; r++) {
        const row = budgetSheet.getRow(r);
        const get = (k: string) => (map[k] ? row.getCell(map[k]).value : null);
        const projectNumber = (cellText(get("projectNumber")) || (onlyOne?.projectNumber ?? "")).trim();
        const category = cellText(get("category"));
        const amount = cellNumber(get("amount"));
        if (!projectNumber && !category && amount === null) continue;
        const p = byNumber.get(projectNumber.toLowerCase());
        const err = !p ? `No. project "${projectNumber}" tidak ditemukan` : !category ? "Kategori kosong" : amount === null || amount < 0 ? "Nominal tidak valid" : null;
        preview.budgets.push({
          sheet: "RAB",
          row: r,
          projectNumber,
          projectName: p?.projectName,
          category,
          description: cellText(get("description")) || null,
          amount: amount ?? 0,
          status: err ? "ERROR" : "NEW",
          message: err ?? undefined,
        });
      }
      const groups = new Map<string, number>();
      for (const b of preview.budgets.filter((x) => x.status === "NEW")) groups.set(b.projectNumber.toLowerCase(), (groups.get(b.projectNumber.toLowerCase()) || 0) + b.amount);
      preview.budgetProjects = [...groups.entries()].map(([num, total]) => {
        const p = byNumber.get(num)!;
        return { projectNumber: p.projectNumber, projectName: p.projectName, total, locksBaseline: !p.baselineLockedAt, replaces: p._count.budgetItems };
      });
    }
  }
  return preview;
}

/** Writes a parsed preview. Only NEW rows are written; RAB replaces each listed project's RAB. */
export async function commitCostImport(preview: ImportPreview, actorName: string): Promise<{ costs: number; budgetProjects: number; baselinesLocked: number }> {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, projectNumber: { in: [...new Set([...preview.costs, ...preview.budgets].map((r) => r.projectNumber))] } },
    select: { id: true, projectNumber: true },
  });
  const idOf = new Map(projects.map((p) => [p.projectNumber.trim().toLowerCase(), p.id]));

  const costs = preview.costs.filter((c) => c.status === "NEW" && idOf.has(c.projectNumber.toLowerCase()));
  if (costs.length) {
    await prisma.projectExpense.createMany({
      data: costs.map((c) => ({
        projectId: idOf.get(c.projectNumber.toLowerCase()) as string,
        expenseDate: new Date(c.date as string),
        category: c.category,
        description: c.description,
        amount: c.amount,
        cause: c.cause,
        referenceNo: c.referenceNo,
        importKey: importKeyFor(c),
        createdBy: `${actorName} (import Excel)`,
      })),
      skipDuplicates: true,
    });
  }

  let baselinesLocked = 0;
  const budgetByProject = new Map<string, BudgetRow[]>();
  for (const b of preview.budgets.filter((x) => x.status === "NEW")) {
    const id = idOf.get(b.projectNumber.toLowerCase());
    if (!id) continue;
    budgetByProject.set(id, [...(budgetByProject.get(id) || []), b]);
  }
  for (const [projectId, rows] of budgetByProject) {
    await prisma.$transaction([
      prisma.projectBudgetItem.deleteMany({ where: { projectId } }),
      prisma.projectBudgetItem.createMany({ data: rows.map((r) => ({ projectId, category: r.category, description: r.description, amount: r.amount })) }),
    ]);
    const locked = await lockBaselineIfOpen(projectId, actorName);
    if (locked) baselinesLocked += 1;
  }
  return { costs: costs.length, budgetProjects: budgetByProject.size, baselinesLocked };
}

/** Locks the baseline from the project's current contract value, RAB and target date — only if not locked yet. */
export async function lockBaselineIfOpen(projectId: string, actorName: string, force = false): Promise<boolean> {
  const p = await prisma.project.findUnique({ where: { id: projectId }, include: { budgetItems: true } });
  if (!p || (p.baselineLockedAt && !force)) return false;
  const byCat: Record<string, number> = {};
  for (const b of p.budgetItems) byCat[b.category] = (byCat[b.category] || 0) + Number(b.amount);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      baselineLockedAt: new Date(),
      baselineLockedBy: actorName,
      baselineContractValue: p.contractValue,
      baselineBudget: Object.values(byCat).reduce((a, b) => a + b, 0),
      baselineBudgetJson: JSON.stringify(byCat),
      baselineEndDate: p.targetEndDate,
    },
  });
  return true;
}

/** Template workbook with both sheets, headers, an example row and an instructions sheet. */
export async function buildCostTemplate(projects: { projectNumber: string; projectName: string }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Reminder System";
  const head = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123F6B" } };
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };
  const ex = projects[0]?.projectNumber || "PRJ-001";

  const cost = wb.addWorksheet("Biaya");
  cost.columns = [
    { header: "Tanggal", key: "date", width: 13, style: { numFmt: "dd/mm/yyyy" } },
    { header: "No. Project", key: "projectNumber", width: 18 },
    { header: "Kategori", key: "category", width: 24 },
    { header: "Akun", key: "accountCode", width: 9 },
    { header: "Keterangan", key: "description", width: 40 },
    { header: "Nominal", key: "amount", width: 16, style: { numFmt: "#,##0" } },
    { header: "Penyebab", key: "cause", width: 20 },
    { header: "No. Bukti", key: "referenceNo", width: 16 },
  ];
  head(cost);
  cost.addRow({ date: new Date(), projectNumber: ex, category: "Perjalanan Dinas", description: "Contoh: tiket pesawat inspektur (hapus baris ini)", amount: 2500000, cause: "Normal", referenceNo: "BKK-001" });
  cost.getCell("G2").dataValidation = { type: "list", allowBlank: true, formulae: ['"Normal,Keterlambatan,Pekerjaan tambahan"'] };
  for (let r = 3; r <= 500; r++) cost.getCell(`G${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Normal,Keterlambatan,Pekerjaan tambahan"'] };

  const rab = wb.addWorksheet("RAB");
  rab.columns = [
    { header: "No. Project", key: "projectNumber", width: 18 },
    { header: "Kategori", key: "category", width: 24 },
    { header: "Keterangan", key: "description", width: 40 },
    { header: "Nominal", key: "amount", width: 16, style: { numFmt: "#,##0" } },
  ];
  head(rab);
  rab.addRow({ projectNumber: ex, category: "Perjalanan Dinas", description: "Contoh (hapus baris ini)", amount: 120000000 });

  const info = wb.addWorksheet("Petunjuk");
  info.getColumn(1).width = 110;
  [
    "PETUNJUK IMPORT BIAYA & RAB PROJECT",
    "",
    "Sheet \"Biaya\", realisasi biaya. Satu baris = satu transaksi. Baris yang sudah pernah diimpor otomatis dilewati, jadi file yang sama/bertambah boleh diunggah ulang.",
    "Sheet \"RAB\", anggaran per kategori. Mengimpor RAB akan MENGGANTI RAB project tersebut. RAB pertama yang diimpor menjadi baseline (rencana awal).",
    "Kolom \"Akun\" (opsional): kode akun sesuai RAB Sucofindo (mis. 4421). Bila Kategori dikosongkan, kategori diisi otomatis dari akun pada RAB project.",
    "Kolom \"Penyebab\" (opsional): Normal / Keterlambatan / Pekerjaan tambahan. Diisi bila biaya timbul karena project terlambat atau karena pekerjaan di luar kontrak awal.",
    "No. Project harus sama persis dengan nomor project di sistem. Daftar nomor project ada di bawah.",
    "Tanggal: format tanggal Excel atau dd/mm/yyyy. Nominal: angka tanpa \"Rp\".",
    "Urutan kolom bebas; kolom lain di file Anda akan diabaikan.",
    "",
    "DAFTAR PROJECT:",
    ...projects.map((p) => `${p.projectNumber} - ${p.projectName}`),
  ].forEach((t, i) => {
    const c = info.getCell(i + 1, 1);
    c.value = t;
    if (i === 0) c.font = { bold: true, size: 13, color: { argb: "FF123F6B" } };
    if (t === "DAFTAR PROJECT:") c.font = { bold: true };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
