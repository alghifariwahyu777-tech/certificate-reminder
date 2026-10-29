"use client";

import { FolderKanban, Percent, Receipt, TrendingUp } from "lucide-react";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { StatCard, StatGrid } from "@/components/ui/Stat";
import { TabNav } from "@/components/ui/TabNav";
import { filterGroupClass, toolbarActionsClass, toolbarClass } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { formatPercent, formatRupiah } from "@/lib/project-monitoring-shared";
import type { AgingBucket, HealthTrendRow, MiniCurvePoint, PortfolioCurvePoint, PortfolioRisk, PortfolioRow } from "@/lib/project-monitoring";
import type { CalendarEvent, CashflowMonth, ParetoItem, PerformanceWeek } from "@/lib/portfolio-insights";
import { cn } from "@/lib/utils";
import { CalendarCard, CashflowCard, ParetoCard, PerformanceTrendCard, ProjectMapCard } from "./PortfolioMore";
import { HsePortfolioCard, PersonnelRiskCard, PortfolioPerformanceCard, RiskHeatmapCard, type PersonLoad } from "./PortfolioRiskHse";
import { AgingCard, HealthTrendCard, MarginGapCard, ScheduleTimeline } from "./PortfolioInsights";
import { AttentionCard, PadCard, PositionTableCard, TimeCostMatrixCard, buildAttention } from "./PortfolioPriority";
import { SCurveGridCard } from "./PortfolioSCurves";
import { ProjectTable } from "./ProjectTable";

export type DashboardExtra = { cashflow: CashflowMonth[]; paretoCost: ParetoItem[]; paretoIssues: ParetoItem[]; perfTrend: PerformanceWeek[]; calendar: CalendarEvent[] };
const EMPTY_EXTRA: DashboardExtra = { cashflow: [], paretoCost: [], paretoIssues: [], perfTrend: [], calendar: [] };

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "jadwal", label: "Jadwal" },
  { key: "keuangan", label: "Keuangan" },
  { key: "risiko", label: "Risiko dan HSE" },
  { key: "sumber-daya", label: "Sumber daya" },
  { key: "daftar", label: "Daftar project" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/**
 * Monitoring Project: four headline figures, one filter bar, then six tabs, each
 * answering one management question (what needs attention, are we on schedule,
 * are we making money, what could go wrong, who and where, the full list).
 * The open tab lives in the URL hash so links and refreshes land on it.
 */
export function PortfolioDashboard({
  rows,
  categories,
  curve = [],
  curves = {},
  healthTrend = [],
  aging = [],
  risks = [],
  people = [],
  extra = EMPTY_EXTRA,
  today = Date.now(),
  actions,
}: {
  rows: PortfolioRow[];
  categories: { id: string; name: string }[];
  curve?: PortfolioCurvePoint[];
  curves?: Record<string, MiniCurvePoint[]>;
  healthTrend?: HealthTrendRow[];
  aging?: AgingBucket[];
  risks?: PortfolioRisk[];
  people?: PersonLoad[];
  extra?: DashboardExtra;
  today?: number;
  actions?: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("ringkasan");
  const [status, setStatus] = useState("ONGOING");
  const [categoryId, setCategoryId] = useState("");
  const [pic, setPic] = useState("");
  const [q, setQ] = useState("");
  const [health, setHealth] = useState("");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as TabKey;
      if (TABS.some((t) => t.key === h)) setTab(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const go = (k: TabKey) => {
    setTab(k);
    history.replaceState(null, "", `#${k}`);
  };

  const pics = useMemo(() => [...new Set(rows.map((r) => r.pic))].sort(), [rows]);
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
  const ids = useMemo(() => new Set(base.map((r) => r.id)), [base]);
  const urgent = useMemo(() => buildAttention(base).filter((a) => a.tone === "bad").length, [base]);
  const exportHref = `/api/projects/portfolio/export?${new URLSearchParams({ status, categoryId, pic, health, q }).toString()}`;
  const filtersActive = !!(categoryId || pic || q || status !== "ONGOING");

  return (
    <div className="space-y-5">
      <div className={toolbarClass}>
        <div className={filterGroupClass}>
          <div>
            <SearchPopoverButton value={q} onChange={setQ} label="Cari project" placeholder="Nama atau nomor project, klien, PIC" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status project">
            <option value="ONGOING">Berjalan</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
            <option value="">Semua status</option>
          </Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Portofolio">
            <option value="">Semua portofolio</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={pic} onChange={(e) => setPic(e.target.value)} aria-label="PIC">
            <option value="">Semua PIC</option>
            {pics.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div className={toolbarActionsClass}>
          <a href={exportHref}>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4" />
              Ekspor Excel
            </Button>
          </a>
          {actions}
        </div>
      </div>
      {filtersActive && (
        <p className="-mt-2 text-[12.5px] text-slate-500">
          Menampilkan {base.length} dari {rows.length} project.{" "}
          <button
            type="button"
            className="font-semibold text-accent hover:underline"
            onClick={() => {
              setStatus("ONGOING");
              setCategoryId("");
              setPic("");
              setQ("");
            }}
          >
            Atur ulang filter
          </button>
        </p>
      )}

      <Headlines rows={base} />

      <TabNav label="Bagian monitoring project" tabs={TABS.map((t) => ({ ...t, badge: t.key === "ringkasan" ? urgent : 0 }))} value={tab} onChange={go} />

      {tab === "ringkasan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
            <TimeCostMatrixCard rows={base} />
            <AttentionCard rows={base} />
          </div>
          <PositionTableCard rows={base} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <HealthTrendCard trend={healthTrend} />
            <PerformanceTrendCard weeks={extra.perfTrend} />
          </div>
        </div>
      )}

      {tab === "jadwal" && (
        <div className="space-y-4">
          <SCurveGridCard rows={base} curves={curves} curve={curve} today={today} />
          <ScheduleTimeline rows={base} today={today} />
          <CalendarCard events={extra.calendar.filter((e) => !e.projectId || ids.has(e.projectId))} today={today} />
        </div>
      )}

      {tab === "keuangan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <CashflowCard months={extra.cashflow} />
            <MarginGapCard rows={base} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PadCard rows={base} />
            <AgingCard aging={aging} />
          </div>
        </div>
      )}

      {tab === "risiko" && (
        <div className="space-y-4">
          <RiskHeatmapCard risks={risks.filter((r) => ids.has(r.projectId))} today={today} />
          <HsePortfolioCard rows={base} today={today} />
          <ParetoCard cost={extra.paretoCost} issues={extra.paretoIssues} />
        </div>
      )}

      {tab === "sumber-daya" && (
        <div className="space-y-4">
          <PortfolioPerformanceCard rows={base} />
          <PersonnelRiskCard people={people} rows={rows} today={today} />
          <ProjectMapCard rows={base} />
        </div>
      )}

      {tab === "daftar" && <ProjectTable rows={base} allCount={rows.length} health={health} onHealth={setHealth} />}
    </div>
  );
}

/** Four figures a manager reads first: how many projects need attention, overall progress, projected margin, overdue receivables. */
function Headlines({ rows }: { rows: PortfolioRow[] }) {
  const k = useMemo(() => {
    const ongoing = rows.filter((r) => r.status === "ONGOING");
    const value = ongoing.reduce((s, r) => s + r.summary.contractValue, 0);
    const w = (r: PortfolioRow) => (value > 0 ? r.summary.contractValue : 1);
    const tw = ongoing.reduce((s, r) => s + w(r), 0) || 1;
    const withMargin = ongoing.filter((r) => r.margin.hasBudget && r.margin.hasCost && r.margin.hasContract);
    const contractM = withMargin.reduce((s, r) => s + r.margin.contract, 0);
    return {
      ongoing: ongoing.length,
      kritis: ongoing.filter((r) => r.summary.health === "KRITIS").length,
      waspada: ongoing.filter((r) => r.summary.health === "WASPADA").length,
      onTrack: ongoing.filter((r) => r.summary.health === "ON_TRACK").length,
      actual: ongoing.reduce((s, r) => s + r.summary.actualPercent * w(r), 0) / tw,
      planned: ongoing.reduce((s, r) => s + r.summary.plannedPercent * w(r), 0) / tw,
      value,
      margin: contractM ? (withMargin.reduce((s, r) => s + r.margin.forecastMargin, 0) / contractM) * 100 : null,
      target: contractM ? (withMargin.reduce((s, r) => s + ((r.margin.targetMarginPct ?? 0) / 100) * r.margin.contract, 0) / contractM) * 100 : null,
      gap: ongoing.filter((r) => r.margin.belowTarget).reduce((s, r) => s + r.margin.targetGap, 0),
      outstanding: rows.reduce((s, r) => s + r.summary.outstanding, 0),
      overdue: rows.reduce((s, r) => s + r.summary.overdueInvoiceAmount, 0),
      overdueCount: rows.reduce((s, r) => s + r.summary.overdueInvoiceCount, 0),
    };
  }, [rows]);
  const total = Math.max(1, k.kritis + k.waspada + k.onTrack);
  const dev = k.actual - k.planned;
  return (
    <StatGrid>
      <StatCard icon={ENTITY_ICON.project} label="Project berjalan" value={String(k.ongoing)} sub={`Nilai kontrak ${formatRupiah(k.value, true)}`}>
        <div className="mt-2.5 flex h-1.5 gap-px overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <span className="bg-signal-expiredBar" style={{ width: `${(k.kritis / total) * 100}%` }} />
          <span className="bg-signal-soonBar" style={{ width: `${(k.waspada / total) * 100}%` }} />
          <span className="bg-signal-activeBar" style={{ width: `${(k.onTrack / total) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-[12px] text-slate-500">
          <span className="font-semibold text-signal-expired">{k.kritis} kritis</span>, <span className="font-semibold text-signal-soon">{k.waspada} waspada</span>, {k.onTrack} sesuai
          rencana
        </p>
      </StatCard>
      <StatCard
        icon={TrendingUp}
        label="Progres portofolio"
        value={formatPercent(k.actual)}
        tone="accent"
        sub={`Rencana ${formatPercent(k.planned)}, deviasi ${dev > 0 ? "+" : ""}${dev.toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin`}
        hint="Rata-rata tertimbang nilai kontrak project berjalan"
      />
      <StatCard
        icon={Percent}
        label="Proyeksi margin portofolio"
        value={k.margin === null ? "-" : formatPercent(k.margin)}
        tone={k.margin !== null && k.target !== null && k.margin < k.target - 0.5 ? "bad" : "default"}
        sub={k.margin === null ? "Belum ada data RAB dan biaya" : `Target ${formatPercent(k.target)}${k.gap ? `, kurang ${formatRupiah(k.gap, true)}` : ""}`}
        hint="Gabungan project berjalan yang memiliki RAB dan realisasi biaya"
      />
      <StatCard
        icon={Receipt}
        label="Piutang lewat jatuh tempo"
        value={formatRupiah(k.overdue, true)}
        tone={k.overdue ? "bad" : "default"}
        sub={`${k.overdueCount} invoice, dari total piutang ${formatRupiah(k.outstanding, true)}`}
      />
    </StatGrid>
  );
}

