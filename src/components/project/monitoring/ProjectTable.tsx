"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/ui/InfoTip";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent, formatRupiah, shortDate, type ProjectHealth } from "@/lib/project-monitoring-shared";
import type { PortfolioRow } from "@/lib/project-monitoring";
import { cn } from "@/lib/utils";
import { ConditionRibbon, ProgressBar, StatusChips, type Tone } from "./shared";

type SortKey = "severity" | "name" | "progress" | "margin" | "end";
const SEVERITY: Record<ProjectHealth, number> = { KRITIS: 0, WASPADA: 1, ON_TRACK: 2, SELESAI: 3, BATAL: 4 };
const HEALTH_TONE: Record<ProjectHealth, Tone> = { KRITIS: "bad", WASPADA: "warn", ON_TRACK: "default", SELESAI: "default", BATAL: "none" };

/** The full project list: condition chips, sortable columns, one card per project on phones. */
export function ProjectTable({ rows, allCount, health, onHealth }: { rows: PortfolioRow[]; allCount: number; health: string; onHealth: (h: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "severity", dir: 1 });
  const filtered = useMemo(() => rows.filter((r) => !health || r.summary.health === health), [rows, health]);
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
  const rowsAll = { length: allCount };

  function SortTh({ label, k: key, className, children, tip }: { label: string; k: SortKey; className?: string; children?: React.ReactNode; tip?: React.ReactNode }) {
    const active = sort.key === key;
    return (
      <th className={cn("whitespace-nowrap px-4 py-2.5 font-semibold", className)}>
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

  return (
    <Card>
      <div className="border-b border-line px-4 py-3 dark:border-slate-800">
        <StatusChips value={health} onChange={onHealth} counts={(h) => (h ? rows.filter((r) => r.summary.health === h).length : rows.length)} />
      </div>
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
                        {s.contractValue ? `, ${formatRupiah(s.contractValue, true)}` : ""}
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
              <tr className="th-row">
                <SortTh label="Project" k="name" className="pl-5" />
                <SortTh label="Progres" k="progress" tip={<><strong>Angka biru</strong> = progres realisasi, angka abu-abu = rencana per hari ini. Garis tegak pada bar menunjukkan posisi rencana. Warna bar mengikuti status project.</>} />
                <th className="px-4 py-2.5 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    Kondisi
                    <InfoTip label="Keterangan kondisi">
                      Empat penanda, dari kiri: <strong>Waktu</strong> (progres dibanding rencana), <strong>Biaya</strong> (biaya terpakai dibanding pekerjaan selesai),{" "}
                      <strong>Lingkup</strong> (pekerjaan tambahan yang belum tertutup addendum), dan <strong>Margin</strong> (proyeksi dibanding target). Hijau = baik, kuning =
                      waspada, merah = kritis, abu-abu = belum ada data.
                    </InfoTip>
                  </span>
                </th>
                <SortTh label="Margin" k="margin" tip={<>Proyeksi margin akhir dibandingkan <strong>target margin project tersebut</strong> (dari RAB). Proyeksi = nilai kontrak dikurangi biaya yang sudah keluar dan sisa RAB.</>} />
                <SortTh label="Target selesai" k="end" />
                <SortTh label="Status" k="severity" className="pr-5" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    {rowsAll.length === 0 ? (
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
                        {s.contractValue ? `, ${formatRupiah(s.contractValue, true)}` : ""}, {r.pic}
                      </p>
                    </td>
                    <td className="min-w-[10rem] px-4 py-3.5">
                      <p className="text-[13px]">
                        <span className="font-bold text-accent">{formatPercent(s.actualPercent)}</span>
                        {ongoing && <span className="text-slate-500"> / {formatPercent(s.plannedPercent)}</span>}
                      </p>
                      <ProgressBar value={s.actualPercent} marker={ongoing ? s.plannedPercent : undefined} tone={ongoing ? HEALTH_TONE[s.health] : "default"} className="mt-1.5 max-w-[160px]" />
                      {ongoing && s.isStale && <p className="mt-1 text-[11.5px] font-medium text-signal-soon">Diperbarui terakhir {s.daysSinceUpdate} hari lalu</p>}
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
  );
}
