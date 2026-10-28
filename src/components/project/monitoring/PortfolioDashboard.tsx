"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, SlidersHorizontal } from "lucide-react";
import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent, formatRupiah, mergePadSchedules, shortDate, type ProjectHealth } from "@/lib/project-monitoring-shared";
import type { AgingBucket, HealthTrendRow, MiniCurvePoint, PortfolioCurvePoint, PortfolioRisk, PortfolioRow } from "@/lib/project-monitoring";
import { CalendarCard, CashflowCard, ParetoCard, PerformanceTrendCard, ProjectMapCard } from "./PortfolioMore";
import type { CalendarEvent, CashflowMonth, ParetoItem, PerformanceWeek } from "@/lib/portfolio-insights";
import { HsePortfolioCard, PersonnelRiskCard, PortfolioPerformanceCard, RiskHeatmapCard, type PersonLoad } from "./PortfolioRiskHse";
import { AgingCard, HealthTrendCard, MarginGapCard, Pager, ScheduleTimeline } from "./PortfolioInsights";
import { cn } from "@/lib/utils";
import { ConditionRibbon, ProgressBar, type Tone } from "./shared";
import { InfoTip } from "@/components/ui/InfoTip";

type SortKey = "severity" | "name" | "progress" | "margin" | "end";

const SEVERITY: Record<ProjectHealth, number> = { KRITIS: 0, WASPADA: 1, ON_TRACK: 2, SELESAI: 3, BATAL: 4 };
const HEALTH_TONE: Record<ProjectHealth, Tone> = { KRITIS: "bad", WASPADA: "warn", ON_TRACK: "default", SELESAI: "default", BATAL: "none" };
const tooltipStyle = { borderRadius: 8, border: "1px solid #E3E8EF", fontSize: 12, fontFamily: "var(--font-body)" };
export type DashboardExtra = { cashflow: CashflowMonth[]; paretoCost: ParetoItem[]; paretoIssues: ParetoItem[]; perfTrend: PerformanceWeek[]; calendar: CalendarEvent[] };
const EMPTY_EXTRA: DashboardExtra = { cashflow: [], paretoCost: [], paretoIssues: [], perfTrend: [], calendar: [] };
const CHIPS: { key: string; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "KRITIS", label: "Kritis" },
  { key: "WASPADA", label: "Waspada" },
  { key: "ON_TRACK", label: "Sesuai rencana" },
];

export function PortfolioDashboard({ rows, categories, curve = [], curves = {}, healthTrend = [], aging = [], risks = [], people = [], extra = EMPTY_EXTRA, today = Date.now() }: { rows: PortfolioRow[]; categories: { id: string; name: string }[]; curve?: PortfolioCurvePoint[]; curves?: Record<string, MiniCurvePoint[]>; healthTrend?: HealthTrendRow[]; aging?: AgingBucket[]; risks?: PortfolioRisk[]; people?: PersonLoad[]; extra?: DashboardExtra; today?: number }) {
  const [status, setStatus] = useState("ONGOING");
  const [categoryId, setCategoryId] = useState("");
  const [pic, setPic] = useState("");
  const [health, setHealth] = useState("");
  const [q, setQ] = useState("");
  const [more, setMore] = useState(false);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "severity", dir: 1 });

  const pics = useMemo(() => [...new Set(rows.map((r) => r.pic))].sort(), [rows]);

  // filters other than the condition chips — the chips show counts within this set
  const base = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!status || r.status === status) &&
        (!categoryId || r.categoryId === categoryId) &&
        (!pic || r.pic === pic) &&
        (!term || [r.projectName, r.projectNumber, r.clientName, r.pic].some((v) => v.toLowerCase().includes(term)))
    );
  }, [rows, status, categoryId, pic, q]);
  const filtered = useMemo(() => base.filter((r) => !health || r.summary.health === health), [base, health]);

  const sorted = useMemo(() => {
    const val = (r: PortfolioRow): number | string => {
      switch (sort.key) {
        case "name":
          return r.projectName.toLowerCase();
        case "progress":
          return r.status === "ONGOING" ? r.summary.deviation : 999;
        case "margin":
          return r.margin.forecastMarginPct !== null && r.margin.targetMarginPct !== null && r.margin.hasCost ? r.margin.forecastMarginPct - r.margin.targetMarginPct : 999;
        case "end":
          return new Date(r.targetEndDate).getTime();
        default:
          return SEVERITY[r.summary.health] * 1000 + (r.status === "ONGOING" ? r.summary.deviation : 0);
      }
    };
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [filtered, sort]);

  const k = useMemo(() => {
    const ongoing = base.filter((r) => r.status === "ONGOING");
    const below = ongoing.filter((r) => r.margin.belowTarget);
    const overduePad = base.reduce((a, r) => a + r.padSchedule.filter((b) => b.kind === "OVERDUE").reduce((x, b) => x + b.amount, 0), 0);
    return {
      ongoing: ongoing.length,
      kritis: ongoing.filter((r) => r.summary.health === "KRITIS").length,
      waspada: ongoing.filter((r) => r.summary.health === "WASPADA").length,
      below: below.length,
      tracked: ongoing.filter((r) => r.margin.signals.margin !== "none").length,
      gap: below.reduce((a, r) => a + r.margin.targetGap, 0),
      pad: base.reduce((a, r) => a + r.summary.pad, 0),
      overduePad,
      contract: base.reduce((a, r) => a + r.summary.contractValue, 0),
      clients: new Set(base.map((r) => r.clientName.trim().toLowerCase())).size,
      count: base.length,
    };
  }, [base]);
  const chipCount = (h: string) => (h ? base.filter((r) => r.summary.health === h).length : base.length);

  const attention = useMemo(
    () =>
      base
        .filter((r) => r.status === "ONGOING" || r.closeoutComplete === false)
        .flatMap((r) => {
          const out: { id: string; name: string; text: string; tone: "bad" | "warn"; at?: string }[] = [];
          const s = r.summary;
          if (r.closeoutComplete === false) return [{ id: r.id, name: r.projectName, tone: "warn" as const, text: "selesai, tetapi BAPP/BAST/laporan final belum lengkap", at: "dokumen/penutupan" }];
          if (s.isOverdue) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `melewati target ${Math.abs(s.daysRemaining)} hari (progres ${formatPercent(s.actualPercent)})`, at: "jadwal/progres" });
          else if (s.health === "KRITIS") out.push({ id: r.id, name: r.projectName, tone: "bad", text: s.healthReason.replace(/\.$/, "").toLowerCase(), at: "jadwal/progres" });
          if (r.margin.signals.margin === "bad")
            out.push({ id: r.id, name: r.projectName, tone: "bad", text: `prakiraan margin ${formatPercent(r.margin.forecastMarginPct)}, target ${formatPercent(r.margin.targetMarginPct)}`, at: "keuangan/margin" });
          if (s.overdueInvoiceCount) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `${s.overdueInvoiceCount} invoice lewat jatuh tempo (${formatRupiah(s.overdueInvoiceAmount, true)})`, at: "keuangan/termin" });
          if (s.openHighIssues) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `${s.openHighIssues} kendala berdampak tinggi terbuka`, at: "tim/kendala" });
          if (r.trend !== null && r.trend <= -5) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `progres makin tertinggal ${Math.abs(r.trend)} poin dari minggu lalu`, at: "jadwal/progres" });
          if (s.isStale) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `data progres belum diperbarui ${s.daysSinceUpdate} hari`, at: "jadwal/progres" });
          if (s.dueUnbilledCount) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `${s.dueUnbilledCount} termin sudah waktunya ditagih`, at: "keuangan/termin" });
          return out;
        })
        .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1)),
    [base]
  );

  const padBuckets = useMemo(() => mergePadSchedules(base.map((r) => r.padSchedule)).map((b) => ({ ...b, juta: Math.round(b.amount / 1e5) / 10 })), [base]);
  const exportHref = `/api/projects/portfolio/export?${new URLSearchParams({ status, categoryId, pic, health, q }).toString()}`;

  function SortTh({ label, k: key, className, children, tip }: { label: string; k: SortKey; className?: string; children?: React.ReactNode; tip?: React.ReactNode }) {
    const active = sort.key === key;
    return (
      <th className={cn("px-4 py-2.5 font-semibold", className)}>
        <button
          type="button"
          className={cn("inline-flex items-center gap-1 text-left", active && "text-ink dark:text-slate-100")}
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }))}
        >
          <span>
            {label}
            {children}
          </span>
          {active && (sort.dir === 1 ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />)}
        </button>
        {tip && (
          <InfoTip label={`Keterangan ${label.toLowerCase()}`} className="ml-1.5">
            {tip}
          </InfoTip>
        )}
      </th>
    );
  }

  const attentionShown = showAllAttention ? attention : attention.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* four headline numbers */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Headline
          onClick={() => setHealth(k.kritis ? "KRITIS" : "WASPADA")}
          label="Perlu perhatian"
          value={`${k.kritis + k.waspada} project`}
          tone={k.kritis ? "bad" : k.waspada ? "warn" : "default"}
          sub={k.kritis + k.waspada ? `${k.kritis} kritis, ${k.waspada} waspada` : "Semua project sesuai rencana"}
        />
        <Headline
          label="Di bawah target margin"
          value={k.tracked ? `${k.below} project` : "-"}
          tone={k.below ? "warn" : "default"}
          sub={k.tracked ? (k.below ? `Kurang ${formatRupiah(k.gap, true)} dari target` : `Dari ${k.tracked} project dengan data biaya`) : "Belum ada data RAB dan biaya"}
        />
        <Headline label="PAD" value={formatRupiah(k.pad, true)} sub={k.overduePad ? `${formatRupiah(k.overduePad, true)} tertunggak` : "Tidak ada yang tertunggak"} />
        <Headline label="Nilai kontrak" value={formatRupiah(k.contract, true)} sub={`${k.count} project, ${k.clients} klien`} />
      </div>

      <nav aria-label="Bagian dasbor" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {[
          ["prioritas", "Prioritas"],
          ["lokasi", "Lokasi"],
          ["kurva-s", "Kurva S"],
          ["jadwal", "Jadwal & kalender"],
          ["keuangan", "Keuangan"],
          ["risiko", "Risiko & HSE"],
          ["sumber-daya", "Personil & portofolio"],
          ["daftar", "Daftar project"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-[12.5px] font-semibold text-slate-600 hover:border-accent hover:text-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {label}
          </a>
        ))}
      </nav>

      <PortfolioAnalysis rows={base} curve={curve} curves={curves} healthTrend={healthTrend} aging={aging} extra={extra} today={today} />

      <section id="risiko" className="scroll-mt-24 space-y-4">
        <RiskHeatmapCard risks={risks.filter((r) => base.some((b) => b.id === r.projectId))} today={today} />
        <ParetoCard cost={extra.paretoCost} issues={extra.paretoIssues} />
        <HsePortfolioCard rows={base} today={today} />
      </section>

      <section id="sumber-daya" className="scroll-mt-24 space-y-4">
        <PersonnelRiskCard people={people} rows={rows} today={today} />
        <PortfolioPerformanceCard rows={base} />
      </section>

      {/* the one table */}
      <Card id="daftar" className="scroll-mt-24">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setHealth(c.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors",
                  health === c.key ? "border-ink bg-ink text-white dark:border-slate-100 dark:bg-slate-100 dark:text-ink" : "border-line text-slate-500 hover:text-ink dark:border-slate-700"
                )}
              >
                {c.label} {chipCount(c.key)}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
            <div className="w-full sm:w-56">
              <SearchPopoverButton value={q} onChange={setQ} label="Cari project" placeholder="Nama/nomor project, klien, atau PIC" />
            </div>
            <div className="w-36 shrink-0">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                <option value="ONGOING">Berjalan</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
                <option value="">Semua status</option>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMore((v) => !v)} aria-expanded={more}>
              <SlidersHorizontal className="h-4 w-4" />
              Filter{categoryId || pic ? " (aktif)" : ""}
            </Button>
            <a href={exportHref}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </a>
          </div>
        </div>
        {more && (
          <div className="flex flex-wrap gap-2 border-b border-line bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="w-48">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Kategori">
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            </div>
            <div className="w-48">
            <Select value={pic} onChange={(e) => setPic(e.target.value)} aria-label="PIC">
              <option value="">Semua PIC</option>
              {pics.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            </div>
          </div>
        )}
        {/* phones: one card per project */}
        <ul className="divide-y divide-line md:hidden dark:divide-slate-800">
          {sorted.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-500">Tidak ada project yang cocok dengan filter.</li>}
          {sorted.map((r) => {
            const s = r.summary;
            const m = r.margin;
            const ongoing = r.status === "ONGOING";
            return (
              <li key={r.id}>
                <Link href={`/projects/${r.id}`} className="block px-4 py-3.5 active:bg-slate-50 dark:active:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug text-ink dark:text-slate-100">{r.projectName}</p>
                      <p className="mt-0.5 text-[12.5px] text-slate-500">
                        {r.clientName}
                        {s.contractValue ? ` · ${formatRupiah(s.contractValue, true)}` : ""}
                      </p>
                    </div>
                    <span className={cn("stamp-badge shrink-0", HEALTH_BADGE_CLASS[s.health])}>{HEALTH_LABEL[s.health]}</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <p className="w-28 shrink-0 text-[13px]">
                      <span className="font-bold text-accent">{formatPercent(s.actualPercent)}</span>
                      {ongoing && <span className="text-slate-500"> / {formatPercent(s.plannedPercent)}</span>}
                    </p>
                    <ProgressBar value={s.actualPercent} marker={ongoing ? s.plannedPercent : undefined} tone={ongoing ? HEALTH_TONE[s.health] : "default"} className="flex-1" />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-slate-500">
                    <ConditionRibbon signals={m.signals} showLetters={false} />
                    <span>
                      Margin{" "}
                      {m.hasBudget && m.hasCost && m.forecastMarginPct !== null ? (
                        <>
                          <strong className={cn(m.signals.margin === "bad" ? "text-signal-expired" : m.signals.margin === "warn" ? "text-signal-soon" : "text-signal-active")}>
                            {formatPercent(m.forecastMarginPct)}
                          </strong>{" "}
                          / {formatPercent(m.targetMarginPct)}
                        </>
                      ) : (
                        "-"
                      )}
                    </span>
                    <span className={cn(ongoing && s.daysRemaining < 0 && "font-semibold text-signal-expired")}>
                      {ongoing ? (s.daysRemaining < 0 ? `Terlambat ${Math.abs(s.daysRemaining)} hari` : `${s.daysRemaining} hari lagi`) : shortDate(new Date(r.targetEndDate).getTime())}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-left text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
                <SortTh label="Project" k="name" className="pl-5" />
                <SortTh label="Progres" k="progress" tip={<><strong>Angka biru</strong> = progres realisasi, angka abu-abu = rencana per hari ini. Garis tegak pada bar menunjukkan posisi rencana. Warna bar mengikuti status project.</>} />
                <th className="px-4 py-2.5 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    Kondisi
                    <InfoTip label="Keterangan kondisi">
                      Empat penanda, dari kiri: <strong>Waktu</strong> (progres dibanding rencana), <strong>Biaya</strong> (biaya terpakai dibanding pekerjaan selesai),{" "}
                      <strong>Lingkup</strong> (pekerjaan tambahan yang belum tertutup addendum), dan <strong>Margin</strong> (prakiraan dibanding target). Hijau = baik, kuning =
                      waspada, merah = kritis, abu-abu = belum ada data.
                    </InfoTip>
                  </span>
                </th>
                <SortTh label="Margin" k="margin" tip={<>Prakiraan margin akhir dibandingkan <strong>target margin project tersebut</strong> (dari RAB). Prakiraan = nilai kontrak dikurangi biaya yang sudah keluar dan sisa RAB.</>} />
                <SortTh label="Target selesai" k="end" />
                <SortTh label="Status" k="severity" className="pr-5" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    {rows.length === 0 ? (
                      <span className="flex flex-col items-center gap-3">
                        Belum ada project. Tambahkan project pertama; data dapat diisi otomatis dari file RAB.
                        <Link href="/projects/new">
                          <Button size="sm">Project baru</Button>
                        </Link>
                      </span>
                    ) : (
                      "Tidak ada project yang cocok dengan filter."
                    )}
                  </td>
                </tr>
              )}
              {sorted.map((r) => {
                const s = r.summary;
                const m = r.margin;
                const ongoing = r.status === "ONGOING";
                const marginShown = m.hasBudget && m.hasCost && m.forecastMarginPct !== null;
                return (
                  <tr key={r.id} className="border-b border-line/70 last:border-0 hover:bg-slate-50/70 dark:border-slate-800/60 dark:hover:bg-slate-800/30">
                    <td className="min-w-[16rem] py-3.5 pl-5 pr-4">
                      <Link href={`/projects/${r.id}`} className="font-semibold text-ink hover:text-accent dark:text-slate-100">
                        {r.projectName}
                      </Link>
                      <p className="mt-0.5 text-[12.5px] text-slate-500">
                        {r.clientName}
                        {s.contractValue ? ` · ${formatRupiah(s.contractValue, true)}` : ""} · {r.pic}
                      </p>
                    </td>
                    <td className="min-w-[10rem] px-4 py-3.5">
                      <p className="text-[13px]">
                        <span className="font-bold text-accent">{formatPercent(s.actualPercent)}</span>
                        {ongoing && <span className="text-slate-500"> / {formatPercent(s.plannedPercent)}</span>}
                      </p>
                      <ProgressBar value={s.actualPercent} marker={ongoing ? s.plannedPercent : undefined} tone={ongoing ? HEALTH_TONE[s.health] : "default"} className="mt-1.5 max-w-[160px]" />
                      {ongoing && s.isStale && <p className="mt-1 text-[11.5px] font-medium text-signal-soon">Update terakhir {s.daysSinceUpdate} hari lalu</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <ConditionRibbon signals={m.signals} showLetters={false} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px]" title={m.belowTarget ? m.cause : undefined}>
                      {marginShown ? (
                        <>
                          <span className={cn("font-bold", m.signals.margin === "bad" ? "text-signal-expired" : m.signals.margin === "warn" ? "text-signal-soon" : "text-signal-active")}>
                            {formatPercent(m.forecastMarginPct)}
                          </span>
                          <span className="text-slate-500"> / {formatPercent(m.targetMarginPct)}</span>
                        </>
                      ) : (
                        <span className="text-[12px] text-slate-400">{m.hasBudget ? "Belum ada biaya" : "Belum ada RAB"}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px]">
                      {shortDate(new Date(r.targetEndDate).getTime())}
                      {ongoing && (
                        <span className={cn("block text-[12px]", s.daysRemaining < 0 ? "font-semibold text-signal-expired" : "text-slate-500")}>
                          {s.daysRemaining < 0 ? `terlambat ${Math.abs(s.daysRemaining)} hari` : `${s.daysRemaining} hari lagi`}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 pr-5">
                      <span className={cn("stamp-badge", HEALTH_BADGE_CLASS[s.health])}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {HEALTH_LABEL[s.health]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="px-5 pt-4">
            <CardTitle>
              Perlu tindakan {attention.length > 0 && <span className="ml-1 rounded-full bg-signal-expiredBg px-2 py-0.5 text-[12px] font-semibold text-signal-expired">{attention.length}</span>}
            </CardTitle>
            {attention.length === 0 && <p className="mt-0.5 text-[12.5px] text-slate-500">Tidak ada hal yang perlu ditindaklanjuti.</p>}
          </div>
          <CardContent className="pt-2">
            <ul className="divide-y divide-line dark:divide-slate-800">
              {attentionShown.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 py-2.5 text-[13.5px]">
                  <span className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", a.tone === "bad" ? "bg-signal-expiredBar" : "bg-signal-soonBar")} />
                  <span>
                    <Link href={`/projects/${a.id}${a.at ? `#${a.at}` : ""}`} className="font-semibold text-ink hover:text-accent dark:text-slate-100">
                      {a.name}
                    </Link>
                    <span className="text-slate-600 dark:text-slate-300">: {a.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            {attention.length > 6 && (
              <button type="button" onClick={() => setShowAllAttention((v) => !v)} className="mt-2 text-[13px] font-semibold text-accent hover:underline">
                {showAllAttention ? "Tampilkan lebih sedikit" : `Tampilkan semua (${attention.length})`}
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="px-5 pt-4">
            <CardTitle className="flex items-center gap-1.5">
              Proyeksi PAD per bulan
              <InfoTip label="Keterangan PAD">
                PAD (Pendapatan yang Akan Diterima) = nilai kontrak yang belum diterima, dikelompokkan menurut jatuh tempo invoice atau rencana tagih termin, dalam Rp juta.{" "}
                <strong className="text-signal-expired">Merah</strong> = tertunggak (lewat tanggalnya, belum diterima); abu-abu = belum terjadwal.
              </InfoTip>
            </CardTitle>
          </div>
          <CardContent>
            {padBuckets.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">Belum ada PAD.</p>
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={padBuckets} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
                    <CartesianGrid stroke="#E9EDF2" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5B6B7F" }} axisLine={{ stroke: "#E3E8EF" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5B6B7F" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("id-ID")} />
                    <Tooltip cursor={{ fill: "#F2F4F7" }} contentStyle={tooltipStyle} formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`} />
                    <Bar dataKey="juta" name="PAD" radius={[4, 4, 0, 0]} maxBarSize={34}>
                      {padBuckets.map((b) => (
                        <Cell key={b.key} fill={b.kind === "OVERDUE" ? "#C2362F" : b.kind === "UNSCHEDULED" ? "#B8C3D0" : "#1671B8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Headline({ label, value, sub, tone = "default", onClick }: { label: string; value: string; sub: string; tone?: Tone; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={cn("rounded-lg border border-line bg-white px-4 py-3.5 text-left sm:px-5 sm:py-4 dark:border-slate-700 dark:bg-slate-900", onClick && "transition-shadow hover:shadow-panel")}>
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-[19px] font-bold leading-tight sm:text-[24px]",
          tone === "bad" ? "text-signal-expired" : tone === "warn" ? "text-signal-soon" : "text-ink dark:text-slate-100"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[12.5px] text-slate-500">{sub}</p>
    </Tag>
  );
}

const HEALTH_DOT: Record<string, string> = { KRITIS: "#C2362F", WASPADA: "#D69E2E", ON_TRACK: "#2F855A", SELESAI: "#1671B8", BATAL: "#94A3B8" };
const fmt2 = (v: number | null | undefined) => (v === null || v === undefined ? "-" : v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function quadrant(spi: number, cpi: number): { label: string; tone: "bad" | "warn" | "good" } {
  if (spi < 1 && cpi < 1) return { label: "Terlambat & boros", tone: "bad" };
  if (spi < 1) return { label: "Terlambat, biaya terkendali", tone: "warn" };
  if (cpi < 1) return { label: "Tepat waktu, boros", tone: "warn" };
  return { label: "Sesuai rencana", tone: "good" };
}

/**
 * Portfolio analysis for many projects at once:
 *  - Kurva S per project as small charts side by side (the honest view: each
 *    project has its own plan), with a weighted combined curve as an option;
 *  - every project placed by schedule (SPI) and cost (CPI) performance, with a
 *    table that names each project's position.
 */
function PortfolioAnalysis({ rows, curve, curves, healthTrend, aging, extra, today }: { rows: PortfolioRow[]; curve: PortfolioCurvePoint[]; curves: Record<string, MiniCurvePoint[]>; healthTrend: HealthTrendRow[]; aging: AgingBucket[]; extra: DashboardExtra; today: number }) {
  const router = useRouter();
  const [view, setView] = useState<"each" | "all">("each");
  const [page, setPage] = useState(0);
  const [healthFilter, setHealthFilter] = useState("");
  const [order, setOrder] = useState<"dev" | "value" | "end">("dev");
  const ongoing = rows.filter((r) => r.status === "ONGOING");
  if (!ongoing.length) return null;

  const PAGE = 8;
  const sorted = ongoing
    .filter((r) => !healthFilter || r.summary.health === healthFilter)
    .sort((a, b) =>
      order === "value" ? b.summary.contractValue - a.summary.contractValue : order === "end" ? Date.parse(a.targetEndDate) - Date.parse(b.targetEndDate) : a.summary.deviation - b.summary.deviation
    );
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const pg = Math.min(page, pages - 1);
  const visible = sorted.slice(pg * PAGE, pg * PAGE + PAGE);
  const countOf = (h: string) => ongoing.filter((r) => !h || r.summary.health === h).length;
  const last = [...curve].reverse().find((c) => c.actual !== null);

  const clamp = (v: number) => Math.min(1.47, Math.max(0.53, v));
  const mapped = ongoing
    .filter((r) => r.summary.spi !== null && r.margin.cpi !== null)
    .map((r) => ({ id: r.id, code: r.projectNumber, name: r.projectName, health: r.summary.health, spi: clamp(r.summary.spi as number), cpi: clamp(r.margin.cpi as number), rawSpi: r.summary.spi as number, rawCpi: r.margin.cpi as number, value: Math.max(1, r.summary.contractValue) }))
    .sort((a, b) => a.rawSpi * a.rawCpi - b.rawSpi * b.rawCpi)
    .map((x, i) => ({ ...x, no: i + 1 }));
  const unmapped = ongoing.filter((r) => r.summary.spi === null || r.margin.cpi === null);

  return (
    <div className="space-y-4">
      <div id="prioritas" className="grid scroll-mt-24 grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <div className="px-5 pt-4">
            <CardTitle className="flex items-center gap-1.5">
              Matriks waktu dan biaya
              <InfoTip label="Keterangan matriks waktu dan biaya" align="right">
                Setiap titik adalah satu project berjalan; angka di titik sama dengan nomor urut di tabel Posisi tiap project (ukuran titik = nilai kontrak). Mendatar = <strong>kinerja waktu</strong>: progres realisasi
                dibagi rencana. Tegak = <strong>kinerja biaya</strong>: nilai pekerjaan selesai menurut RAB dibagi biaya yang sudah keluar. Angka 1 berarti sesuai rencana; di
                bawah 1 berarti terlambat atau boros. Klik titik untuk membuka project.
              </InfoTip>
            </CardTitle>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              {mapped.length} dari {ongoing.length} project dapat dipetakan
            </p>
          </div>
          <CardContent>
            {mapped.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">Belum ada project dengan data RAB dan biaya.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 14, right: 16, left: -14, bottom: 4 }}>
                    <ReferenceArea x1={0.4} x2={1} y1={0.4} y2={1} fill="#FBEDEC" fillOpacity={0.7} label={{ value: "Terlambat & boros", position: "insideBottomLeft", fontSize: 10, fill: "#C2362F" }} />
                    <ReferenceArea x1={1} x2={1.6} y1={1} y2={1.6} fill="#EAF5EE" fillOpacity={0.7} label={{ value: "Cepat & hemat", position: "insideTopRight", fontSize: 10, fill: "#2F855A" }} />
                    <ReferenceArea x1={0.4} x2={1} y1={1} y2={1.6} fill="#FBF3E4" fillOpacity={0.5} label={{ value: "Terlambat, hemat", position: "insideTopLeft", fontSize: 10, fill: "#B7791F" }} />
                    <ReferenceArea x1={1} x2={1.6} y1={0.4} y2={1} fill="#FBF3E4" fillOpacity={0.5} label={{ value: "Cepat, boros", position: "insideBottomRight", fontSize: 10, fill: "#B7791F" }} />
                    <XAxis type="number" dataKey="spi" domain={[0.4, 1.6]} ticks={[0.5, 0.75, 1, 1.25, 1.5]} tick={{ fontSize: 11, fill: "#5B6B7F" }} tickFormatter={(v: number) => v.toLocaleString("id-ID")} axisLine={{ stroke: "#E3E8EF" }} tickLine={false} />
                    <YAxis type="number" dataKey="cpi" domain={[0.4, 1.6]} ticks={[0.5, 0.75, 1, 1.25, 1.5]} tick={{ fontSize: 11, fill: "#5B6B7F" }} tickFormatter={(v: number) => v.toLocaleString("id-ID")} axisLine={false} tickLine={false} />
                    <ZAxis type="number" dataKey="value" range={[220, 520]} />
                    <ReferenceLine x={1} stroke="#94A3B8" />
                    <ReferenceLine y={1} stroke="#94A3B8" />
                    <Tooltip
                      cursor={false}
                      content={({ payload }) => {
                        const d = payload?.[0]?.payload as (typeof mapped)[number] | undefined;
                        if (!d) return null;
                        return (
                          <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-panel">
                            <p className="font-semibold text-ink">{d.name}</p>
                            <p className="text-slate-500">
                              Waktu {fmt2(d.rawSpi)} · Biaya {fmt2(d.rawCpi)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={mapped} onClick={(d: { id?: string; payload?: { id: string } }) => router.push(`/projects/${d.payload?.id ?? d.id}`)} className="cursor-pointer" isAnimationActive={false}>
                      <LabelList dataKey="no" position="center" fill="#FFFFFF" stroke="none" fontSize={10} fontWeight={700} />
                      {mapped.map((p) => (
                        <Cell key={p.id} fill={HEALTH_DOT[p.health]} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11.5px] text-slate-500">
              <span className="flex flex-wrap gap-x-3">
                {[["KRITIS", "Kritis"], ["WASPADA", "Waspada"], ["ON_TRACK", "Sesuai rencana"]].map(([k, l]) => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_DOT[k] }} />
                    {l}
                  </span>
                ))}
              </span>
              <span>Mendatar: waktu · Tegak: biaya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="px-5 pt-4">
            <CardTitle className="flex items-center gap-1.5">
              Posisi tiap project
              <InfoTip label="Keterangan posisi tiap project" align="right">
                Angka kinerja waktu dan biaya setiap project, diurutkan dari yang paling perlu perhatian. Contoh: kinerja waktu 0,80 berarti progres baru 80% dari yang
                direncanakan; kinerja biaya 0,90 berarti setiap Rp 1 biaya baru menghasilkan pekerjaan senilai Rp 0,90 menurut RAB.
              </InfoTip>
            </CardTitle>
          </div>
          <CardContent className="px-0 pb-2">
            <div className="max-h-[21rem] overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-line text-left text-[12px] text-slate-500 dark:border-slate-800">
                    <th className="w-8 py-2 pl-5 text-left font-medium">No</th>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-2 py-2 text-right font-medium">Waktu</th>
                    <th className="px-2 py-2 text-right font-medium">Biaya</th>
                    <th className="hidden px-5 py-2 font-medium sm:table-cell">Posisi</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.map((p) => {
                    const qd = quadrant(p.rawSpi, p.rawCpi);
                    return (
                      <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-paper/60 dark:border-slate-800">
                        <td className="py-2 pl-5">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: HEALTH_DOT[p.health] }}>
                            {p.no}
                          </span>
                        </td>
                        <td className="max-w-[14rem] px-3 py-2">
                          <Link href={`/projects/${p.id}`} className="block truncate font-semibold text-ink hover:text-accent dark:text-slate-100" title={p.name}>
                            {p.name}
                          </Link>
                          <span className="text-[11.5px] text-slate-500">{p.code}</span>
                        </td>
                        <td className={cn("px-2 py-2 text-right tabular-nums", p.rawSpi < 1 ? "font-semibold text-signal-expired" : "text-ink dark:text-slate-100")}>{fmt2(p.rawSpi)}</td>
                        <td className={cn("px-2 py-2 text-right tabular-nums", p.rawCpi < 1 ? "font-semibold text-signal-expired" : "text-ink dark:text-slate-100")}>{fmt2(p.rawCpi)}</td>
                        <td className="hidden px-5 py-2 sm:table-cell">
                          <span className={cn("whitespace-nowrap text-[12px] font-semibold", qd.tone === "bad" ? "text-signal-expired" : qd.tone === "warn" ? "text-signal-soon" : "text-signal-active")}>{qd.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {unmapped.map((r) => (
                    <tr key={r.id} className="border-b border-line/70 last:border-0 dark:border-slate-800">
                      <td className="py-2 pl-5 text-slate-400">-</td>
                      <td className="max-w-[14rem] px-3 py-2">
                        <Link href={`/projects/${r.id}`} className="block truncate font-semibold text-ink hover:text-accent dark:text-slate-100" title={r.projectName}>
                          {r.projectName}
                        </Link>
                        <span className="text-[11.5px] text-slate-500">{r.projectNumber}</span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-ink dark:text-slate-100">{fmt2(r.summary.spi)}</td>
                      <td className="px-2 py-2 text-right text-slate-400">-</td>
                      <td className="hidden px-5 py-2 text-[12px] text-slate-500 sm:table-cell">{r.margin.hasBudget ? "Belum ada realisasi biaya" : "Belum ada RAB"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <div id="lokasi" className="scroll-mt-24">
        <ProjectMapCard rows={rows} />
      </div>

      <Card id="kurva-s" className="scroll-mt-24">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
          <div>
            <CardTitle className="flex items-center gap-1.5">
              Kurva S
              <InfoTip label="Keterangan kurva S">
                <strong>Per project</strong>: kurva S setiap project berjalan, diurutkan dari yang paling tertinggal. Garis putus-putus = rencana, garis biru = realisasi. Klik
                kartu untuk membuka detail project.
                <br />
                <br />
                <strong>Gabungan</strong>: rata-rata progres semua project berjalan, dibobot nilai kontrak (project bernilai besar berpengaruh lebih besar). Berguna untuk melihat
                posisi keseluruhan, tetapi keputusan tetap per project.
              </InfoTip>
            </CardTitle>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              {view === "each" ? `${ongoing.length} project berjalan · ${PAGE} per halaman` : "Gabungan seluruh project berjalan, dibobot nilai kontrak"}
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-paper p-0.5 text-[12.5px] font-semibold dark:bg-slate-800" role="tablist">
            {(
              [
                ["each", "Per project"],
                ["all", "Gabungan"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                onClick={() => setView(k)}
                className={cn("rounded-md px-3 py-1.5 transition-colors", view === k ? "bg-white text-ink shadow-card dark:bg-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-ink")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <CardContent>
          {view === "each" ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {[["", "Semua"], ["KRITIS", "Kritis"], ["WASPADA", "Waspada"], ["ON_TRACK", "Sesuai rencana"]].map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setHealthFilter(k); setPage(0); }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold",
                        healthFilter === k ? "border-ink bg-ink text-white dark:border-slate-100 dark:bg-slate-100 dark:text-ink" : "border-line text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
                      )}
                    >
                      {k && <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_DOT[k] }} />}
                      {l} {countOf(k)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <select value={order} onChange={(e) => { setOrder(e.target.value as "dev" | "value" | "end"); setPage(0); }} className="h-8 rounded-md border border-line bg-white px-2 text-[12.5px] dark:border-slate-700 dark:bg-slate-900" aria-label="Urutkan kurva S">
                    <option value="dev">Paling tertinggal</option>
                    <option value="value">Nilai kontrak terbesar</option>
                    <option value="end">Target selesai terdekat</option>
                  </select>
                  <Pager page={pg} pages={pages} total={sorted.length} size={PAGE} onChange={setPage} />
                </div>
              </div>
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Tidak ada project dengan kondisi ini.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
                  {visible.map((r) => (
                    <MiniSCurveCard key={r.id} row={r} points={curves[r.id] ?? []} today={today} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {last && (
                <p className="mb-2 text-[13px] text-slate-600 dark:text-slate-300">
                  Realisasi gabungan <span className="font-bold text-accent">{formatPercent(last.actual)}</span> dari rencana <span className="font-bold text-ink dark:text-slate-100">{formatPercent(last.planned)}</span>
                </p>
              )}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curve} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke="#E9EDF2" vertical={false} />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => shortDate(t)} tick={{ fontSize: 11, fill: "#5B6B7F" }} minTickGap={28} axisLine={{ stroke: "#E3E8EF" }} tickLine={false} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#5B6B7F" }} axisLine={false} tickLine={false} />
                    <Tooltip labelFormatter={(t) => shortDate(Number(t))} formatter={(v, n) => [`${Number(v).toLocaleString("id-ID")}%`, n]} contentStyle={tooltipStyle} />
                    <ReferenceLine x={today} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Hari ini", fontSize: 10, fill: "#64748B", position: "top" }} />
                    <Line type="monotone" dataKey="planned" name="Rencana" stroke="#9AA8B8" strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="actual" name="Realisasi" stroke="#1671B8" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div id="jadwal" className="scroll-mt-24 space-y-4">
        <ScheduleTimeline rows={rows} today={today} />
        <CalendarCard events={extra.calendar.filter((e) => !e.projectId || rows.some((r) => r.id === e.projectId))} today={today} />
      </div>
      <div id="keuangan" className="scroll-mt-24 space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
          <CashflowCard months={extra.cashflow} />
          <MarginGapCard rows={rows} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AgingCard aging={aging} />
          <HealthTrendCard trend={healthTrend} />
          <PerformanceTrendCard weeks={extra.perfTrend} />
        </div>
      </div>
    </div>
  );
}

function MiniSCurveCard({ row, points, today }: { row: PortfolioRow; points: MiniCurvePoint[]; today: number }) {
  const s = row.summary;
  const dev = s.deviation;
  const devColor = dev < -10 ? "text-signal-expired" : dev < -0.05 ? "text-signal-soon" : "text-signal-active";
  const first = points[0]?.t;
  const lastT = points[points.length - 1]?.t;
  return (
    <Link href={`/projects/${row.id}`} className="group block rounded-lg border border-line bg-white p-3 transition-colors hover:border-accent/50 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug text-ink group-hover:text-accent dark:text-slate-100" title={row.projectName}>
          {row.projectName}
        </p>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: HEALTH_DOT[s.health] }} title={HEALTH_LABEL[s.health]} />
      </div>
      <p className="mt-1 text-[12px] text-slate-500">
        <span className="font-bold text-accent">{formatPercent(s.actualPercent)}</span> / {formatPercent(s.plannedPercent)}
        <span className={cn("ml-2 font-semibold", devColor)}>
          {dev > 0 ? "+" : ""}
          {dev.toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin
        </span>
      </p>
      <div className="mt-2 h-20">
        {points.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`mini-${row.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1671B8" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#1671B8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
              <YAxis domain={[0, 100]} hide />
              {today > first && today < lastT && <ReferenceLine x={today} stroke="#CBD5E1" strokeDasharray="2 2" />}
              <Line type="monotone" dataKey="p" stroke="#9AA8B8" strokeDasharray="4 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Area type="linear" dataKey="a" stroke="#1671B8" strokeWidth={2} fill={`url(#mini-${row.id})`} dot={false} connectNulls={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="pt-6 text-center text-[12px] text-slate-400">Belum ada data</p>
        )}
      </div>
      {first !== undefined && (
        <div className="mt-1 flex justify-between text-[10.5px] text-slate-400">
          <span>{shortDate(first)}</span>
          <span>{shortDate(lastT)}</span>
        </div>
      )}
    </Link>
  );
}
