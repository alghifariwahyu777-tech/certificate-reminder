import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { lockBaselineIfOpen } from "@/lib/project-cost-import";

/**
 * Reader for the standard Sucofindo RAB workbook ("RENCANA ANGGARAN DAN BIAYA
 * PROYEK", sheet "RAB"). Cells are located by their labels, not by fixed
 * addresses, so the reader keeps working when rows are inserted or the
 * template is updated. Formula cells are read from their cached results.
 *
 * What the monitoring system takes from it:
 *  - data proyek     : SPMK, nama, klien, lokasi, unit, portofolio, PM, periode, skema pembayaran
 *  - lingkup & keluaran, tim pelaksana (jumlah per posisi)
 *  - anggaran        : setiap baris berkode akun, dikelompokkan per bagian (I–VII)
 *  - ringkasan laba  : pendapatan, biaya proyek, biaya tak terduga, biaya operasi,
 *                      laba operasi & margin (= target margin project), per tahun
 * Biaya operasi (biaya proyek + biaya tak terduga) is the RAB total that actual
 * costs are monitored against, matching how the template computes laba operasi.
 */

export type RabItem = {
  section: string;
  account: string | null;
  code: string;
  fv: "F" | "V" | null;
  description: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number;
};

export type RabSection = { code: string; name: string; category: string; total: number; items: number };

export type RabYear = { label: string; revenue: number; cost: number; profit: number; marginPct: number | null };

export type RabData = {
  project: {
    contractNumber: string | null;
    name: string | null;
    client: string | null;
    location: string | null;
    unit: string | null;
    portfolio: string | null;
    subPortfolio: string | null;
    serviceType: string | null;
    pmu: string | null;
    responsible: string | null;
    projectManager: string | null;
    accountPartner: string | null;
    financePic: string | null;
    paymentScheme: string | null;
    durationMonths: number | null;
    startDate: string | null; // yyyy-mm-dd
    endDate: string | null;
    objective: string | null;
  };
  scopes: { no: number; scope: string; deliverable: string | null }[];
  team: { group: string; position: string; count: number; months: number | null }[];
  teamTotal: number;
  sections: RabSection[];
  items: RabItem[];
  revenue: number;
  projectCost: number;
  contingency: number;
  contingencyPct: number | null;
  operatingCost: number; // = total RAB monitored
  overhead: number;
  overheadPct: number | null;
  operatingProfit: number;
  marginPct: number | null;
  years: RabYear[];
  warnings: string[];
};

export class RabFormatError extends Error {}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const norm = (v: string) =>
  v
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .replace(/[^a-z0-9./ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function text(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if ("error" in o) return "";
    if ("result" in o) return text(o.result as ExcelJS.CellValue);
    if ("richText" in o) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if ("text" in o) return String(o.text);
    return "";
  }
  return String(v).replace(/\s+/g, " ").trim();
}
function num(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (v && typeof v === "object" && "result" in (v as object)) return num((v as { result: ExcelJS.CellValue }).result);
  const t = text(v).replace(/rp/gi, "").replace(/\s/g, "");
  if (!t || !/^-?[\d.,]+$/.test(t)) return null;
  const cleaned = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/[.,](?=\d{3}(\D|$))/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}
function date(v: ExcelJS.CellValue): string | null {
  if (v && typeof v === "object" && !(v instanceof Date) && "result" in (v as object)) return date((v as { result: ExcelJS.CellValue }).result);
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())).toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const m = text(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Strips the "Beban"/"Biaya" prefix so categories read naturally: "Beban Perjalanan Dinas" → "Perjalanan Dinas". */
export function sectionCategory(name: string) {
  const t = name.replace(/\s+/g, " ").trim().replace(/^(beban|biaya)\s+/i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

class Grid {
  rows: number;
  cols: number;
  constructor(private ws: ExcelJS.Worksheet) {
    this.rows = Math.min(ws.rowCount, 1500);
    this.cols = Math.min(ws.columnCount || 40, 40);
  }
  raw(r: number, c: number) {
    return this.ws.getRow(r).getCell(c).value;
  }
  t(r: number, c: number) {
    return text(this.raw(r, c));
  }
  n(r: number, c: number) {
    return num(this.raw(r, c));
  }
  /** first cell whose normalized text matches; search limited to a row range */
  find(match: (t: string) => boolean, from = 1, to = this.rows, colFrom = 1, colTo = this.cols): { r: number; c: number } | null {
    for (let r = from; r <= to; r++)
      for (let c = colFrom; c <= colTo; c++) {
        const t = this.t(r, c);
        if (t && match(norm(t))) return { r, c };
      }
    return null;
  }
  /** the value written after a "Label : value" pair on the same row */
  valueAfter(pos: { r: number; c: number } | null): ExcelJS.CellValue {
    if (!pos) return null;
    let c = pos.c + 1;
    for (let k = 0; k < 6 && c <= this.cols; k++, c++) {
      const t = this.t(pos.r, c);
      if (t === ":") {
        c++;
        break;
      }
      if (t) break;
    }
    for (; c <= this.cols; c++) {
      const v = this.raw(pos.r, c);
      const t = text(v);
      if (t && t !== ":") return v;
    }
    return null;
  }
}

function findRabSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  const visible = wb.worksheets.filter((w) => w.state === "visible" || !w.state);
  const titled = (ws: ExcelJS.Worksheet) => {
    for (let r = 1; r <= Math.min(8, ws.rowCount); r++)
      for (let c = 1; c <= Math.min(30, ws.columnCount || 30); c++) if (/rencana anggaran dan biaya/i.test(text(ws.getRow(r).getCell(c).value))) return true;
    return false;
  };
  return visible.find((w) => norm(w.name) === "rab" && titled(w)) ?? visible.find(titled) ?? null;
}

/** True when the workbook is a Sucofindo RAB (used to route uploads to the right importer). */
export async function isSucofindoRab(buffer: Buffer): Promise<boolean> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return !!findRabSheet(wb);
}

export async function parseRabWorkbook(buffer: Buffer): Promise<RabData> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = findRabSheet(wb);
  if (!ws) throw new RabFormatError('Sheet RAB dengan judul "Rencana Anggaran dan Biaya Proyek" tidak ditemukan. Pastikan file menggunakan template RAB Sucofindo.');
  const g = new Grid(ws);
  const warnings: string[] = [];

  // ---- section anchors
  const budgetHead = g.find((t) => t === "anggaran biaya");
  const teamHead = g.find((t) => t === "tim pelaksana");
  const headerEnd = (teamHead?.r ?? budgetHead?.r ?? 60) - 1;

  // ---- data proyek
  const field = (match: (t: string) => boolean) => g.valueAfter(g.find(match, 1, headerEnd));
  const s = (v: ExcelJS.CellValue) => text(v) || null;
  const startPos = g.find((t) => t === "mulai", 1, headerEnd);
  let startDate: string | null = null;
  let endDate: string | null = null;
  if (startPos) {
    for (let c = startPos.c + 1; c <= g.cols; c++) {
      const d = date(g.raw(startPos.r, c));
      if (d && !startDate) startDate = d;
      else if (d) {
        endDate = d;
        break;
      }
    }
  }
  const objPos = g.find((t) => t.startsWith("tujuan proyek"), 1, headerEnd);
  let objective: string | null = null;
  if (objPos)
    for (let r = objPos.r + 1; r <= objPos.r + 3 && !objective; r++)
      for (let c = 1; c <= g.cols; c++) {
        const t = g.t(r, c);
        if (t && t.length > 12) {
          objective = t;
          break;
        }
      }

  const project: RabData["project"] = {
    contractNumber: s(field((t) => t.startsWith("spmk") || t === "no. kontrak" || t === "nomor kontrak")),
    name: s(field((t) => t === "nama proyek")),
    client: s(field((t) => t === "klien" || t === "pemberi kerja")),
    location: s(field((t) => t === "lokasi proyek")),
    unit: s(field((t) => t === "unit pelaksana")),
    portfolio: s(field((t) => t === "portofolio")),
    subPortfolio: s(field((t) => t === "subportofolio" || t === "sub portofolio")),
    serviceType: s(field((t) => t === "jenis jasa")),
    pmu: s(field((t) => t.startsWith("proyek pmu"))),
    responsible: s(field((t) => t.startsWith("penanggung jawab"))),
    projectManager: s(field((t) => t.startsWith("manajer proyek"))),
    accountPartner: s(field((t) => t.startsWith("account partner"))),
    financePic: s(field((t) => t.startsWith("financial person"))),
    paymentScheme: s(field((t) => t.startsWith("pembayaran imbal jasa"))),
    durationMonths: num(field((t) => t.startsWith("durasi pelaksanaan"))),
    startDate,
    endDate,
    objective,
  };
  const contractFromHeader = num(field((t) => t.startsWith("nilai proyek")));

  // ---- lingkup & keluaran
  const scopes: RabData["scopes"] = [];
  const scopeHead = g.find((t) => t.startsWith("lingkup kerja"), 1, headerEnd);
  if (scopeHead) {
    const delivHead = g.find((t) => t.startsWith("keluaran"), scopeHead.r, scopeHead.r);
    for (let r = scopeHead.r + 1; r <= headerEnd; r++) {
      const scope = g.t(r, scopeHead.c);
      if (/tim pelaksana/i.test(g.t(r, 2)) || /tim pelaksana/i.test(scope)) break;
      if (!scope) continue;
      scopes.push({ no: scopes.length + 1, scope, deliverable: delivHead ? g.t(r, delivHead.c) || null : null });
    }
  }

  // ---- tim pelaksana
  const team: RabData["team"] = [];
  let teamTotal = 0;
  if (teamHead) {
    const end = (budgetHead?.r ?? teamHead.r + 40) - 1;
    const posHead = g.find((t) => t === "posisi", teamHead.r, end);
    const cntHead = g.find((t) => t === "jumlah", teamHead.r, end);
    const moHead = g.find((t) => t.startsWith("incharge"), teamHead.r, end);
    if (posHead && cntHead) {
      let group = "";
      for (let r = posHead.r + 1; r <= end; r++) {
        const roman = g.t(r, cntHead.c - 1);
        if (ROMAN.includes(roman)) {
          group = g.t(r, cntHead.c);
          continue;
        }
        const position = g.t(r, posHead.c);
        const count = g.n(r, cntHead.c);
        if (position && count && count > 0) {
          team.push({ group, position, count, months: moHead ? g.n(r, moHead.c) : null });
          teamTotal += count;
        }
      }
    }
  }

  // ---- anggaran biaya
  if (!budgetHead) throw new RabFormatError('Bagian "ANGGARAN BIAYA" tidak ditemukan pada sheet RAB.');
  const head = g.find((t) => t === "uraian", budgetHead.r, budgetHead.r + 4);
  if (!head) throw new RabFormatError('Baris judul kolom anggaran ("Uraian", "Jumlah (Rp)") tidak ditemukan.');
  const H = head.r;
  const colOf = (match: (t: string) => boolean) => g.find(match, H, H)?.c ?? null;
  const cAccount = colOf((t) => t === "akun") ?? 2;
  const cNo = colOf((t) => t === "no." || t === "no") ?? 3;
  const cDesc = head.c;
  const cQty = colOf((t) => t === "jumlah");
  const cUnit = colOf((t) => t === "satuan");
  const cPrice = colOf((t) => t.startsWith("harga satuan"));
  const cAmount = colOf((t) => t.startsWith("jumlah rp") || t === "jumlah (rp)" || t === "total");
  if (!cAmount) throw new RabFormatError('Kolom "Jumlah (Rp)" tidak ditemukan pada bagian anggaran.');
  const yearCols: { label: string; c: number }[] = [];
  for (let c = cAmount + 1; c <= g.cols; c++) {
    const t = g.t(H, c);
    if (/^tahun\s*\d+/i.test(t)) yearCols.push({ label: t.replace(/\s+/g, " "), c });
  }

  const revenuePos = g.find((t) => t.startsWith("pendapatan"), H + 1);
  const budgetEnd = (revenuePos?.r ?? g.rows) - 1;

  const items: RabItem[] = [];
  const sectionMeta: { code: string; name: string; subtotal: number | null }[] = [];
  let section: { code: string; name: string; subtotal: number | null } | null = null;
  let contingency = 0;
  let contingencyPct: number | null = null;
  let overhead = 0;
  let overheadPct: number | null = null;
  for (let r = H + 1; r <= budgetEnd; r++) {
    const no = g.t(r, cNo);
    const desc = g.t(r, cDesc);
    if (ROMAN.includes(no) && desc) {
      section = { code: no, name: desc, subtotal: null };
      sectionMeta.push(section);
      continue;
    }
    const nd = norm(desc);
    const amount = g.n(r, cAmount);
    if (nd.startsWith("biaya tak terduga")) {
      contingency = amount ?? 0;
      contingencyPct = findPct(g, r, cDesc, cAmount);
      continue;
    }
    if (nd.startsWith("biaya overhead")) {
      overhead = amount ?? 0;
      overheadPct = findPct(g, r, cDesc, cAmount);
      continue;
    }
    if (cPrice && norm(g.t(r, cPrice)) === "sub total" && section) {
      section.subtotal = amount;
      continue;
    }
    const acct = g.t(r, cAccount);
    if (!section || !/^\d{3,}$/.test(acct) || !amount) continue;
    const fvRaw = g.t(r, cNo + 1).toUpperCase();
    items.push({
      section: section.code,
      account: acct,
      code: no,
      fv: fvRaw === "F" || fvRaw === "V" ? fvRaw : null,
      description: desc || `Akun ${acct}`,
      qty: cQty ? g.n(r, cQty) : null,
      unit: cUnit ? g.t(r, cUnit) || null : null,
      unitPrice: cPrice ? g.n(r, cPrice) : null,
      amount,
    });
  }

  const sections: RabSection[] = sectionMeta
    .map((m) => {
      const its = items.filter((i) => i.section === m.code);
      const total = its.reduce((a, i) => a + i.amount, 0);
      if (m.subtotal !== null && Math.abs(m.subtotal - total) > 1)
        warnings.push(`Bagian ${m.code} (${m.name}): jumlah rincian ${fmt(total)} berbeda dengan sub total ${fmt(m.subtotal)}.`);
      return { code: m.code, name: m.name, category: sectionCategory(m.name), total, items: its.length };
    })
    .filter((x) => x.total > 0);

  // ---- ringkasan laba (block starting at "Pendapatan")
  const sum = (match: (t: string) => boolean) => {
    if (!revenuePos) return null;
    const p = g.find(match, revenuePos.r, revenuePos.r + 12);
    return p ? { total: g.n(p.r, cAmount), years: yearCols.map((y) => g.n(p.r, y.c) ?? 0) } : null;
  };
  const rRevenue = sum((t) => t.startsWith("pendapatan"));
  const rProject = sum((t) => t === "biaya proyek");
  const rContingency = sum((t) => t.startsWith("biaya tak terduga"));
  const rOperating = sum((t) => t === "biaya operasi");
  const rProfit = sum((t) => t === "laba operasi");

  const itemsTotal = items.reduce((a, i) => a + i.amount, 0);
  const revenue = rRevenue?.total ?? contractFromHeader ?? 0;
  const projectCost = rProject?.total ?? itemsTotal;
  if (rContingency?.total !== null && rContingency?.total !== undefined) contingency = rContingency.total;
  const operatingCost = rOperating?.total ?? projectCost + contingency;
  const operatingProfit = rProfit?.total ?? revenue - operatingCost;
  const marginPct = revenue > 0 ? Math.round((operatingProfit / revenue) * 10000) / 100 : null;

  if (!(revenue > 0)) throw new RabFormatError("Nilai pendapatan / nilai proyek pada RAB tidak ditemukan atau bernilai nol.");
  if (!(operatingCost > 0) || !items.length) throw new RabFormatError("Rincian anggaran berkode akun tidak ditemukan pada RAB.");
  if (Math.abs(projectCost - itemsTotal) > 1)
    warnings.push(`Jumlah rincian berkode akun (${fmt(itemsTotal)}) berbeda dengan Biaya Proyek pada ringkasan (${fmt(projectCost)}). Sistem memakai rincian per akun.`);
  if (contractFromHeader && Math.abs(contractFromHeader - revenue) > 1)
    warnings.push(`Nilai proyek pada data proyek (${fmt(contractFromHeader)}) berbeda dengan pendapatan pada ringkasan (${fmt(revenue)}).`);

  const years: RabYear[] = yearCols
    .map((y, i) => {
      const rev = rRevenue?.years[i] ?? 0;
      const cost = rOperating?.years[i] ?? (rProject?.years[i] ?? 0) + (rContingency?.years[i] ?? 0);
      const profit = rProfit?.years[i] ?? rev - cost;
      return { label: y.label, revenue: rev, cost, profit, marginPct: rev > 0 ? Math.round((profit / rev) * 1000) / 10 : null };
    })
    .filter((y) => y.revenue || y.cost);

  return {
    project,
    scopes,
    team,
    teamTotal,
    sections,
    items,
    revenue,
    projectCost: itemsTotal,
    contingency,
    contingencyPct,
    operatingCost: itemsTotal + contingency,
    overhead,
    overheadPct,
    operatingProfit: revenue - (itemsTotal + contingency),
    marginPct: revenue > 0 ? Math.round(((revenue - itemsTotal - contingency) / revenue) * 10000) / 100 : marginPct,
    years,
    warnings,
  };
}

/** percentage written next to "Biaya Tak Terduga"/"Biaya Overhead" (e.g. 0,5% stored as 0.005) */
function findPct(g: Grid, r: number, from: number, to: number): number | null {
  for (let c = from + 1; c < to; c++) {
    const v = g.n(r, c);
    if (v !== null && v > 0 && v < 1) return Math.round(v * 10000) / 100;
  }
  return null;
}

function fmt(v: number) {
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
}

// ---------------------------------------------------------------------------
// Preview & commit for one project
// ---------------------------------------------------------------------------

export const RAB_PROJECT_FIELDS = ["contractValue", "startDate", "targetEndDate", "clientName", "projectName"] as const;
export type RabProjectField = (typeof RAB_PROJECT_FIELDS)[number];
const FIELD_LABEL: Record<RabProjectField, string> = {
  contractValue: "Nilai kontrak",
  startDate: "Tanggal mulai",
  targetEndDate: "Target selesai",
  clientName: "Klien",
  projectName: "Nama project",
};

export type RabPreview = {
  data: RabData;
  fileName: string;
  nextVersion: number; // 0 = RAB awal
  current: { version: number; totalCost: number; marginPct: number | null; contractValue: number | null; createdAt: string } | null;
  currentBudgetTotal: number; // RAB currently in the system (may come from manual entry / simple import)
  targetMarginPct: number | null;
  baselineLocked: boolean;
  numberMismatch: string | null;
  fields: { key: RabProjectField; label: string; current: string | number | null; fromRab: string | number | null; differs: boolean }[];
};

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export async function previewRabImport(projectId: string, data: RabData, fileName: string): Promise<RabPreview> {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    include: { budgetItems: { select: { amount: true } }, rabRevisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!p) throw new RabFormatError("Project tidak ditemukan.");
  const last = p.rabRevisions[0];
  const fromRab: Record<RabProjectField, string | number | null> = {
    contractValue: data.revenue,
    startDate: data.project.startDate,
    targetEndDate: data.project.endDate,
    clientName: data.project.client,
    projectName: data.project.name,
  };
  const current: Record<RabProjectField, string | number | null> = {
    contractValue: p.contractValue === null ? null : Number(p.contractValue),
    startDate: day(p.startDate),
    targetEndDate: day(p.targetEndDate),
    clientName: p.clientName,
    projectName: p.projectName,
  };
  const same = (a: string | number | null, b: string | number | null) =>
    typeof a === "number" || typeof b === "number" ? Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 1 : norm(String(a ?? "")) === norm(String(b ?? ""));
  const rabNo = data.project.contractNumber?.trim();
  return {
    data,
    fileName,
    nextVersion: last ? last.version + 1 : 0,
    current: last
      ? { version: last.version, totalCost: Number(last.totalCost), marginPct: last.marginPct, contractValue: last.contractValue === null ? null : Number(last.contractValue), createdAt: last.createdAt.toISOString() }
      : null,
    currentBudgetTotal: p.budgetItems.reduce((a, b) => a + Number(b.amount), 0),
    targetMarginPct: p.targetMarginPct,
    baselineLocked: !!p.baselineLockedAt,
    numberMismatch:
      rabNo && norm(rabNo) !== norm(p.projectNumber)
        ? `Nomor SPMK pada RAB (${rabNo}) berbeda dengan nomor project di sistem (${p.projectNumber}). Pastikan file RAB ini memang untuk project ini.`
        : null,
    fields: RAB_PROJECT_FIELDS.filter((k) => fromRab[k] !== null && fromRab[k] !== "").map((k) => ({
      key: k,
      label: FIELD_LABEL[k],
      current: current[k],
      fromRab: fromRab[k],
      differs: !same(current[k], fromRab[k]),
    })),
  };
}

export type RabCommitOptions = {
  reason?: string | null;
  /** revision only: replace the project's target margin with this RAB's margin */
  updateTarget?: boolean;
  /** project fields to overwrite with the values from the RAB */
  applyFields?: RabProjectField[];
};

export async function commitRabImport(projectId: string, data: RabData, fileName: string, opts: RabCommitOptions, actorName: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId }, include: { rabRevisions: { orderBy: { version: "desc" }, take: 1 } } });
  if (!p) throw new RabFormatError("Project tidak ditemukan.");
  const version = p.rabRevisions.length ? p.rabRevisions[0].version + 1 : 0;
  if (version > 0 && !opts.reason?.trim()) throw new RabFormatError("Alasan revisi RAB wajib diisi.");

  const apply = new Set(opts.applyFields ?? []);
  const projectData: Record<string, unknown> = {};
  if (apply.has("contractValue")) projectData.contractValue = data.revenue;
  if (apply.has("startDate") && data.project.startDate) projectData.startDate = new Date(data.project.startDate);
  if (apply.has("targetEndDate") && data.project.endDate) projectData.targetEndDate = new Date(data.project.endDate);
  if (apply.has("clientName") && data.project.client) projectData.clientName = data.project.client;
  if (apply.has("projectName") && data.project.name) projectData.projectName = data.project.name;
  if (data.marginPct !== null && (version === 0 || p.targetMarginPct === null || opts.updateTarget)) projectData.targetMarginPct = data.marginPct;

  const catOf = new Map(data.sections.map((s) => [s.code, s.category]));
  const budgetRows = [
    ...data.items.map((i) => ({
      projectId,
      category: catOf.get(i.section) ?? "Lainnya",
      description: `${i.code} ${i.description}`.trim(),
      accountCode: i.account,
      amount: i.amount,
    })),
    ...(data.contingency > 0
      ? [{ projectId, category: "Biaya Tak Terduga", description: `Biaya tak terduga${data.contingencyPct !== null ? ` (${data.contingencyPct.toLocaleString("id-ID")}% dari pendapatan)` : ""}`, accountCode: null, amount: data.contingency }]
      : []),
  ];

  await prisma.$transaction([
    prisma.projectRabRevision.create({
      data: {
        projectId,
        version,
        reason: version === 0 ? opts.reason?.trim() || null : opts.reason!.trim(),
        fileName,
        contractValue: data.revenue,
        projectCost: data.projectCost,
        contingency: data.contingency,
        totalCost: data.operatingCost,
        overhead: data.overhead || null,
        operatingProfit: data.operatingProfit,
        marginPct: data.marginPct,
        dataJson: JSON.stringify(data),
        createdBy: actorName,
      },
    }),
    prisma.projectBudgetItem.deleteMany({ where: { projectId } }),
    prisma.projectBudgetItem.createMany({ data: budgetRows }),
    ...(Object.keys(projectData).length ? [prisma.project.update({ where: { id: projectId }, data: projectData })] : []),
  ]);

  // the first RAB becomes the baseline; an earlier baseline locked without any RAB is replaced
  const baselineEmpty = !p.baselineLockedAt || !p.baselineBudget || Number(p.baselineBudget) === 0;
  const baselineLocked = await lockBaselineIfOpen(projectId, actorName, version === 0 && baselineEmpty);
  return { version, baselineLocked, items: budgetRows.length };
}

export type RabRevisionSummary = {
  id: string;
  version: number;
  reason: string | null;
  fileName: string | null;
  contractValue: number | null;
  totalCost: number;
  operatingProfit: number | null;
  marginPct: number | null;
  createdBy: string | null;
  createdAt: string;
};
