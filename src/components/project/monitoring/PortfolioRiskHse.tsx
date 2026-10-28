"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { ISSUE_CATEGORY_LABEL, formatPercent, formatRupiah, riskLevel, shortDate } from "@/lib/project-monitoring-shared";
import { summarizeHse, type HseSummary } from "@/lib/project-hse";
import type { PortfolioRisk, PortfolioRow } from "@/lib/project-monitoring";
import type { MappingRow } from "@/lib/personnel-mapping";
import { cn } from "@/lib/utils";
import { SafetyPyramid } from "./HsePanel";

const DAY = 86400000;
const HEALTH_DOT: Record<string, string> = { KRITIS: "#C2362F", WASPADA: "#D69E2E", ON_TRACK: "#2F855A", SELESAI: "#1671B8", BATAL: "#94A3B8" };
const LEVEL_BG: Record<string, string> = { Rendah: "#EAF5EE", Sedang: "#FBF3E4", Tinggi: "#F8D9D6", Ekstrem: "#C2362F" };
const LEVEL_FG: Record<string, string> = { Rendah: "#2F855A", Sedang: "#B7791F", Tinggi: "#C2362F", Ekstrem: "#FFFFFF" };
const num = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? "-" : v.toLocaleString("id-ID", { maximumFractionDigits: d }));

// ---------------------------------------------------------------------------
// Peta risiko: open risks and issues of all running projects on one matrix
// ---------------------------------------------------------------------------

const ROWS = [
  { key: "ISSUE", label: "Sudah terjadi", sub: "kendala" },
  { key: "HIGH", label: "Sangat mungkin" },
  { key: "MEDIUM", label: "Mungkin" },
  { key: "LOW", label: "Jarang" },
] as const;
const COLS = [
  { key: "LOW", label: "Rendah" },
  { key: "MEDIUM", label: "Sedang" },
  { key: "HIGH", label: "Tinggi" },
] as const;

export function RiskHeatmapCard({ risks, today }: { risks: PortfolioRisk[]; today: number }) {
  const [cell, setCell] = useState<{ row: string; col: string } | null>(null);
  const [category, setCategory] = useState("");
  const rowOf = (r: PortfolioRisk) => (r.type === "ISSUE" ? "ISSUE" : r.likelihood);
  const pool = risks.filter((r) => !category || (r.category ?? "LAINNYA") === category);
  const count = (row: string, col: string) => pool.filter((r) => rowOf(r) === row && r.impact === col).length;
  const list = useMemo(
    () =>
      pool
        .filter((r) => !cell || (rowOf(r) === cell.row && r.impact === cell.col))
        .map((r) => ({ ...r, level: riskLevel(r.type, r.likelihood, r.impact), late: r.targetDate !== null && r.targetDate < today }))
        .sort((a, b) => b.level.score - a.level.score || Number(b.late) - Number(a.late) || a.createdAt - b.createdAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, cell, today]
  );
  const byCategory = Object.entries(ISSUE_CATEGORY_LABEL)
    .map(([k, l]) => ({ k, l, n: risks.filter((r) => (r.category ?? "LAINNYA") === k).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const extreme = risks.filter((r) => riskLevel(r.type, r.likelihood, r.impact).label === "Ekstrem").length;
  const late = risks.filter((r) => r.targetDate !== null && r.targetDate < today).length;

  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Peta risiko dan kendala
          <InfoTip label="Keterangan peta risiko">
            Semua risiko dan kendala yang masih terbuka di project berjalan, dipetakan menurut kemungkinan terjadi dan dampaknya. Kendala (sudah terjadi) ada di baris paling atas.
            Warna menunjukkan tingkat: hijau rendah, kuning sedang, merah muda tinggi, merah ekstrem. Klik kotak untuk melihat daftarnya.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">
          {risks.length} terbuka · {extreme} tingkat ekstrem · {late} lewat target penyelesaian
        </p>
      </div>
      <CardContent>
        {byCategory.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setCategory("")} className={cn("rounded-full border px-2.5 py-0.5 text-[12px] font-semibold", !category ? "border-ink bg-ink text-white dark:bg-slate-100 dark:text-ink" : "border-line text-slate-600 dark:border-slate-700 dark:text-slate-300")}>
              Semua {risks.length}
            </button>
            {byCategory.map((c) => (
              <button key={c.k} type="button" onClick={() => { setCategory(c.k === category ? "" : c.k); setCell(null); }} className={cn("rounded-full border px-2.5 py-0.5 text-[12px] font-semibold", category === c.k ? "border-ink bg-ink text-white dark:bg-slate-100 dark:text-ink" : "border-line text-slate-600 dark:border-slate-700 dark:text-slate-300")}>
                {c.l} {c.n}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div>
            <div className="grid grid-cols-[6.5rem_repeat(3,minmax(0,1fr))] gap-1.5 text-[12px]">
              <span />
              {COLS.map((c) => (
                <span key={c.key} className="pb-1 text-center font-semibold text-slate-500">
                  {c.label}
                </span>
              ))}
              {ROWS.map((r) => (
                <div key={r.key} className="contents">
                  <span className={cn("flex flex-col justify-center pr-1 text-right text-slate-600 dark:text-slate-300", r.key === "ISSUE" && "font-semibold text-ink dark:text-slate-100")}>
                    {r.label}
                    {"sub" in r && <span className="text-[10.5px] font-normal text-slate-400">{r.sub}</span>}
                  </span>
                  {COLS.map((c) => {
                    const n = count(r.key, c.key);
                    const lv = riskLevel(r.key === "ISSUE" ? "ISSUE" : "RISK", r.key === "ISSUE" ? "HIGH" : r.key, c.key).label;
                    const active = cell?.row === r.key && cell?.col === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCell(active ? null : { row: r.key, col: c.key })}
                        className={cn("flex h-14 items-center justify-center rounded-md text-[18px] font-bold transition-shadow", active ? "ring-2 ring-ink ring-offset-1 dark:ring-slate-100" : "hover:ring-1 hover:ring-slate-400")}
                        style={{ background: LEVEL_BG[lv], color: LEVEL_FG[lv], opacity: n ? 1 : 0.45 }}
                        aria-label={`${r.label}, dampak ${c.label}: ${n}`}
                      >
                        {n || ""}
                      </button>
                    );
                  })}
                </div>
              ))}
              <span />
              <span className="col-span-3 pt-1 text-center text-[11.5px] text-slate-500">Dampak →</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-[12.5px] font-semibold text-ink dark:text-slate-100">
                {cell ? `${ROWS.find((r) => r.key === cell.row)?.label}, dampak ${COLS.find((c) => c.key === cell.col)?.label.toLowerCase()}` : "Prioritas tertinggi"}
              </p>
              {cell && (
                <button type="button" onClick={() => setCell(null)} className="text-[12px] font-semibold text-accent hover:underline">
                  Semua
                </button>
              )}
            </div>
            {list.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Tidak ada risiko atau kendala.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-line overflow-y-auto pr-1 dark:divide-slate-800">
                {list.slice(0, 30).map((r) => (
                  <li key={r.id} className="py-2">
                    <Link href={`/projects/${r.projectId}#tim/kendala`} className="group block">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: LEVEL_BG[r.level.label], color: LEVEL_FG[r.level.label] }}>
                          {r.level.label}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-snug text-ink group-hover:text-accent dark:text-slate-100">{r.title}</p>
                          <p className="truncate text-[11.5px] text-slate-500">
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: HEALTH_DOT[r.projectHealth] }} />
                            {r.projectName}
                            {r.category ? ` · ${ISSUE_CATEGORY_LABEL[r.category]}` : ""}
                            {r.owner ? ` · ${r.owner}` : ""}
                          </p>
                          {r.targetDate !== null && (
                            <p className={cn("text-[11.5px]", r.late ? "font-semibold text-signal-expired" : "text-slate-500")}>
                              {r.late ? `Lewat target ${Math.round((today - r.targetDate) / DAY)} hari` : `Target ${shortDate(r.targetDate)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// HSE portofolio
// ---------------------------------------------------------------------------

export function HsePortfolioCard({ rows, today }: { rows: PortfolioRow[]; today: number }) {
  const ongoing = rows.filter((r) => r.status === "ONGOING");
  const all = rows.filter((r) => r.hse.months > 0);
  const total: HseSummary = useMemo(() => {
    // combine the per-project totals; rates are recomputed from the combined hours
    const z = summarizeHse([]);
    const sum = (k: keyof HseSummary) => all.reduce((s, r) => s + ((r.hse[k] as number) || 0), 0);
    const manHours = sum("manHours");
    const lti = sum("lostTimeInjury") + sum("fatality");
    const recordable = sum("recordable");
    return {
      ...z,
      months: sum("months"),
      manHours,
      fatality: sum("fatality"),
      lostTimeInjury: sum("lostTimeInjury"),
      medicalTreatment: sum("medicalTreatment"),
      firstAid: sum("firstAid"),
      nearMiss: sum("nearMiss"),
      propertyDamage: sum("propertyDamage"),
      unsafeObservations: sum("unsafeObservations"),
      safetyTalks: sum("safetyTalks"),
      inspections: sum("inspections"),
      recordable,
      ltifr: manHours ? Math.round(((lti * 1e6) / manHours) * 100) / 100 : null,
      trir: manHours ? Math.round(((recordable * 1e6) / manHours) * 100) / 100 : null,
      safeHours: all.reduce((s, r) => s + r.hse.safeHours, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
  const lastMonthEnd = Date.UTC(new Date(today).getUTCFullYear(), new Date(today).getUTCMonth(), 0);
  const missing = ongoing.filter((r) => !r.hse.lastPeriod || r.hse.lastPeriod < lastMonthEnd);
  const incidents = ongoing
    .filter((r) => r.hse.recordable + r.hse.propertyDamage > 0)
    .sort((a, b) => b.hse.lostTimeInjury + b.hse.fatality - (a.hse.lostTimeInjury + a.hse.fatality) || b.hse.recordable - a.hse.recordable);

  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          HSE (K3) portofolio
          <InfoTip label="Keterangan HSE portofolio">
            Gabungan laporan HSE bulanan seluruh project. LTIFR dan TRIR dihitung per 1.000.000 jam kerja; target umumnya 0. Jam kerja aman = jam kerja setelah cedera hilang
            hari kerja terakhir di tiap project.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">
          {missing.length ? `${missing.length} project berjalan belum mengisi laporan HSE bulan lalu` : "Semua project berjalan sudah mengisi laporan HSE bulan lalu"}
        </p>
      </div>
      <CardContent>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <Fig label="Jam kerja" value={num(total.manHours)} />
              <Fig label="Jam kerja aman" value={num(total.safeHours)} tone="good" />
              <Fig label="LTIFR" value={num(total.ltifr, 2)} tone={(total.ltifr ?? 0) > 0 ? "bad" : "good"} />
              <Fig label="TRIR" value={num(total.trir, 2)} tone={total.lostTimeInjury + total.fatality > 0 ? "bad" : (total.trir ?? 0) > 0 ? "warn" : "good"} />
            </div>
            {incidents.length > 0 && (
              <div>
                <p className="mb-1 text-[12.5px] font-semibold text-ink dark:text-slate-100">Project dengan kejadian</p>
                <ul className="space-y-1 text-[12.5px]">
                  {incidents.slice(0, 4).map((r) => (
                    <li key={r.id} className="flex items-baseline justify-between gap-2">
                      <Link href={`/projects/${r.id}#tim/hse`} className="truncate font-medium text-ink hover:text-accent dark:text-slate-100" title={r.projectName}>
                        {r.projectName}
                      </Link>
                      <span className="flex shrink-0 gap-1">
                        {(
                          [
                            [r.hse.fatality, "fatal", "#5B1414"],
                            [r.hse.lostTimeInjury, "LTI", "#B42318"],
                            [r.hse.medicalTreatment, "medis", "#E0592A"],
                            [r.hse.propertyDamage, "aset", "#5F7F9E"],
                          ] as [number, string, string][]
                        )
                          .filter(([n]) => n > 0)
                          .map(([n, t, c]) => (
                            <span key={t} className="rounded px-1.5 py-0.5 text-[10.5px] font-bold text-white" style={{ background: c }}>
                              {n} {t}
                            </span>
                          ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {missing.length > 0 && (
              <p className="text-[12px] text-slate-500">
                Belum lapor:{" "}
                {missing.slice(0, 3).map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ", "}
                    <Link href={`/projects/${r.id}#tim/hse`} className="font-semibold text-accent hover:underline">
                      {r.projectName}
                    </Link>
                  </span>
                ))}
                {missing.length > 3 ? ` dan ${missing.length - 3} lainnya` : ""}
              </p>
            )}
          </div>
          <SafetyPyramid summary={total} />
        </div>
      </CardContent>
    </Card>
  );
}

function Fig({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const accent = tone === "bad" ? "#B42318" : tone === "warn" ? "#E0592A" : tone === "good" ? "#2F855A" : "#123F6B";
  return (
    <div className="relative overflow-hidden rounded-lg border border-line px-3 py-2.5 dark:border-slate-700">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <p className="text-[11.5px] text-slate-500">{label}</p>
      <p className="text-[18px] font-bold leading-tight" style={{ color: tone ? accent : undefined }}>
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Beban dan risiko personil
// ---------------------------------------------------------------------------

export type PersonLoad = MappingRow;

export function PersonnelRiskCard({ people, rows, today, overload = 3 }: { people: PersonLoad[]; rows: PortfolioRow[]; today: number; overload?: number }) {
  const health = new Map(rows.map((r) => [r.id, r.summary.health]));
  const scored = people
    .map((p) => {
      const now = p.assignments.filter((a) => (!a.start || Date.parse(a.start) <= today) && Date.parse(a.end) >= today);
      const concurrent = new Set(now.map((a) => a.projectId)).size;
      const critical = [...new Set(p.assignments.filter((a) => health.get(a.projectId) === "KRITIS").map((a) => a.projectId))].length;
      const expired = p.warnings.filter((w) => w.expired).length;
      const expiring = p.warnings.filter((w) => !w.expired).length;
      const flags: { text: string; tone: "bad" | "warn" }[] = [];
      if (expired) flags.push({ text: "Sertifikat berakhir", tone: "bad" });
      if (concurrent >= overload) flags.push({ text: `${concurrent} project bersamaan`, tone: "bad" });
      if (expiring) flags.push({ text: "Sertifikat habis saat bertugas", tone: "warn" });
      if (critical) flags.push({ text: `${critical} project kritis`, tone: "warn" });
      const score = expired * 4 + Math.max(0, concurrent - overload + 1) * 3 + expiring * 2 + critical;
      return { p, concurrent, critical, flags, score };
    })
    .sort((a, b) => b.score - a.score || b.concurrent - a.concurrent);
  const atRisk = scored.filter((x) => x.flags.length);
  const overloaded = scored.filter((x) => x.concurrent >= overload).length;
  const certIssues = scored.filter((x) => x.p.warnings.length).length;
  const maxLoad = Math.max(overload, ...scored.map((x) => x.concurrent));
  const dist = Array.from({ length: maxLoad }, (_, i) => ({ n: i + 1, people: scored.filter((x) => x.concurrent === i + 1).length }));
  const maxPeople = Math.max(1, ...dist.map((d) => d.people));

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Beban dan risiko personil
            <InfoTip label="Keterangan beban personil">
              Personil yang ditugaskan di project berjalan. Ditandai bila memegang {overload} project atau lebih pada waktu yang sama, sertifikatnya sudah berakhir atau akan
              berakhir sebelum penugasan selesai, atau ditugaskan di project kritis.
            </InfoTip>
          </CardTitle>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {people.length} personil bertugas · {overloaded} beban berlebih · {certIssues} masalah sertifikat
          </p>
        </div>
        <Link href="/projects/personnel" className="shrink-0 text-[12.5px] font-semibold text-accent hover:underline">
          Mapping personil
        </Link>
      </div>
      <CardContent>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink dark:text-slate-100">Jumlah project bersamaan per personil</p>
            <div className="space-y-1.5">
              {dist.map((d) => (
                <div key={d.n} className="flex items-center gap-2 text-[12px]">
                  <span className="w-16 shrink-0 text-slate-500">{d.n} project</span>
                  <div className="h-4 flex-1 rounded bg-slate-100 dark:bg-slate-800">
                    <div className={cn("h-full rounded", d.n >= overload ? "bg-signal-expiredBar" : d.n === overload - 1 ? "bg-signal-soonBar" : "bg-accent")} style={{ width: `${(d.people / maxPeople) * 100}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right tabular-nums text-slate-600 dark:text-slate-300">{d.people} orang</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[12.5px] font-semibold text-ink dark:text-slate-100">Perlu perhatian</p>
            {atRisk.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Tidak ada personil yang perlu perhatian.</p>
            ) : (
              <ul className="max-h-60 divide-y divide-line overflow-y-auto pr-1 dark:divide-slate-800">
                {atRisk.slice(0, 20).map(({ p, concurrent, flags }) => (
                  <li key={p.employeeId} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink dark:text-slate-100">{p.name}</p>
                      <p className="truncate text-[11.5px] text-slate-500" title={p.assignments.map((a) => a.projectName).join(", ")}>
                        {p.position ? `${p.position} · ` : ""}
                        {concurrent} project: {p.assignments.map((a) => a.projectNumber).join(", ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      {flags.map((f) => (
                        <span key={f.text} className={cn("text-[11px] font-semibold", f.tone === "bad" ? "text-signal-expired" : "text-signal-soon")}>
                          {f.text}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Kinerja per portofolio (kategori project)
// ---------------------------------------------------------------------------

export function PortfolioPerformanceCard({ rows }: { rows: PortfolioRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, PortfolioRow[]>();
    for (const r of rows.filter((x) => x.status === "ONGOING")) map.set(r.categoryName, [...(map.get(r.categoryName) ?? []), r]);
    return [...map.entries()]
      .map(([name, list]) => {
        const value = list.reduce((s, r) => s + r.summary.contractValue, 0);
        const w = (r: PortfolioRow) => Math.max(1, r.summary.contractValue);
        const avg = (get: (r: PortfolioRow) => number | null) => {
          const xs = list.filter((r) => get(r) !== null);
          const tw = xs.reduce((s, r) => s + w(r), 0);
          return xs.length ? xs.reduce((s, r) => s + (get(r) as number) * w(r), 0) / tw : null;
        };
        const withMargin = list.filter((r) => r.margin.hasBudget && r.margin.hasContract);
        const contractM = withMargin.reduce((s, r) => s + r.margin.contract, 0);
        const forecastM = withMargin.reduce((s, r) => s + r.margin.forecastMargin, 0);
        const targetM = withMargin.reduce((s, r) => s + ((r.margin.targetMarginPct ?? 0) / 100) * r.margin.contract, 0);
        return {
          name,
          count: list.length,
          value,
          spi: avg((r) => r.summary.spi),
          cpi: avg((r) => r.margin.cpi),
          margin: contractM ? (forecastM / contractM) * 100 : null,
          target: contractM ? (targetM / contractM) * 100 : null,
          critical: list.filter((r) => r.summary.health === "KRITIS").length,
          outstanding: list.reduce((s, r) => s + r.summary.outstanding, 0),
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [rows]);
  if (!groups.length) return null;
  const maxValue = Math.max(...groups.map((g) => g.value));
  const tone = (v: number | null) => (v === null ? "text-slate-400" : v < 0.9 ? "text-signal-expired font-semibold" : v < 1 ? "text-signal-soon font-semibold" : "text-signal-active");

  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Kinerja per portofolio
          <InfoTip label="Keterangan kinerja per portofolio">
            Project berjalan dikelompokkan menurut portofolio (kategori project). Kinerja waktu dan biaya adalah rata-rata tertimbang nilai kontrak; 1 berarti sesuai rencana.
            Margin = total prakiraan margin dibanding total nilai kontrak project yang sudah memiliki RAB.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{groups.length} portofolio dengan project berjalan</p>
      </div>
      <CardContent className="px-0 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-slate-500 dark:border-slate-800">
                <th className="px-5 py-2 font-medium">Portofolio</th>
                <th className="px-3 py-2 font-medium">Nilai kontrak</th>
                <th className="px-3 py-2 text-right font-medium">Waktu</th>
                <th className="px-3 py-2 text-right font-medium">Biaya</th>
                <th className="px-3 py-2 text-right font-medium">Margin / target</th>
                <th className="px-3 py-2 text-right font-medium">Piutang</th>
                <th className="px-5 py-2 text-right font-medium">Kritis</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.name} className="border-b border-line/70 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-2.5">
                    <p className="font-semibold text-ink dark:text-slate-100">{g.name}</p>
                    <p className="text-[11.5px] text-slate-500">{g.count} project</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="tabular-nums text-ink dark:text-slate-100">{formatRupiah(g.value, true)}</p>
                    <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-brand-blueDark dark:bg-slate-300" style={{ width: `${(g.value / maxValue) * 100}%` }} />
                    </div>
                  </td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", tone(g.spi))}>{num(g.spi, 2)}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", tone(g.cpi))}>{num(g.cpi, 2)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={cn(g.margin !== null && g.target !== null && g.margin < g.target - 1 ? "font-semibold text-signal-expired" : "text-ink dark:text-slate-100")}>{formatPercent(g.margin)}</span>
                    <span className="text-slate-500"> / {formatPercent(g.target)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink dark:text-slate-100">{formatRupiah(g.outstanding, true)}</td>
                  <td className={cn("px-5 py-2.5 text-right tabular-nums", g.critical ? "font-bold text-signal-expired" : "text-slate-400")}>{g.critical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
