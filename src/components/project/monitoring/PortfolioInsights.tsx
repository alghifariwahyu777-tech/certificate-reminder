"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { HEALTH_LABEL, formatPercent, formatRupiah, shortDate } from "@/lib/project-monitoring-shared";
import type { AgingBucket, HealthTrendRow, PortfolioRow } from "@/lib/project-monitoring";
import { cn } from "@/lib/utils";

const DAY = 86400000;
const HEALTH_DOT: Record<string, string> = { KRITIS: "#C2362F", WASPADA: "#D69E2E", ON_TRACK: "#2F855A", SELESAI: "#1671B8", BATAL: "#94A3B8" };
const tooltipStyle = { borderRadius: 8, border: "1px solid #E3E8EF", fontSize: 12, fontFamily: "var(--font-body)" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Prev / next pager used by the dashboard lists that can hold dozens of projects. */
export function Pager({ page, pages, total, size, onChange }: { page: number; pages: number; total: number; size: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const from = page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return (
    <div className="flex items-center gap-1 text-[12.5px] text-slate-500">
      <span className="mr-1 tabular-nums">
        {from}–{to} dari {total}
      </span>
      <button type="button" aria-label="Sebelumnya" disabled={page === 0} onClick={() => onChange(page - 1)} className="rounded-md border border-line p-1 hover:bg-paper disabled:opacity-40 dark:border-slate-700">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Berikutnya" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} className="rounded-md border border-line p-1 hover:bg-paper disabled:opacity-40 dark:border-slate-700">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jadwal portofolio: every running project on one time axis
// ---------------------------------------------------------------------------

export function ScheduleTimeline({ rows, today }: { rows: PortfolioRow[]; today: number }) {
  const [sort, setSort] = useState<"slip" | "end">("slip");
  const [page, setPage] = useState(0);
  const size = 10;
  const items = useMemo(() => {
    return rows
      .filter((r) => r.status === "ONGOING")
      .map((r) => {
        const start = r.startDate ? Date.parse(r.startDate) : today;
        const end = Date.parse(r.targetEndDate);
        const forecast = r.summary.forecastEndDate;
        const slip = forecast ? Math.round((forecast - end) / DAY) : r.summary.isOverdue ? Math.abs(r.summary.daysRemaining) : 0;
        return { r, start, end, forecast, slip };
      })
      .sort((a, b) => (sort === "slip" ? b.slip - a.slip : a.end - b.end));
  }, [rows, today, sort]);
  if (!items.length) return null;

  const pages = Math.ceil(items.length / size);
  const p = Math.min(page, pages - 1);
  const shown = items.slice(p * size, p * size + size);
  const min = Math.min(...items.map((x) => x.start), today);
  const max = Math.max(...items.map((x) => Math.max(x.end, x.forecast ?? 0)), today) + 7 * DAY;
  const pos = (t: number) => ((t - min) / (max - min)) * 100;
  const ticks: number[] = [];
  const d = new Date(min);
  const months = (max - min) / (30 * DAY);
  const every = months <= 8 ? 1 : months <= 18 ? 2 : months <= 36 ? 3 : 6;
  for (let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1; ; m += every) {
    const t = Date.UTC(y + Math.floor(m / 12), m % 12, 1);
    if (t >= max) break;
    ticks.push(t);
  }
  const late = items.filter((x) => x.slip > 0).length;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Jadwal portofolio
            <InfoTip label="Keterangan jadwal portofolio">
              Setiap baris satu project berjalan. Batang abu-abu = rentang rencana (mulai sampai target selesai), bagian biru = progres realisasi. Tanda belah ketupat = prakiraan
              selesai, dihitung dari durasi rencana dibagi kinerja waktu; merah bila melewati target. Garis tegak = hari ini.
            </InfoTip>
          </CardTitle>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {late > 0 ? `${late} dari ${items.length} project diperkirakan selesai melewati target` : "Semua project diperkirakan selesai sesuai target"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={sort} onChange={(e) => { setSort(e.target.value as "slip" | "end"); setPage(0); }} className="h-8 rounded-md border border-line bg-white px-2 text-[12.5px] dark:border-slate-700 dark:bg-slate-900" aria-label="Urutkan jadwal">
            <option value="slip">Keterlambatan terbesar</option>
            <option value="end">Target selesai terdekat</option>
          </select>
          <Pager page={p} pages={pages} total={items.length} size={size} onChange={setPage} />
        </div>
      </div>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="relative ml-[13rem] h-6 border-b border-line text-[10.5px] text-slate-400 dark:border-slate-800">
              {ticks.map((t) => (
                <span key={t} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(t)}%` }}>
                  {MONTHS[new Date(t).getUTCMonth()]} {String(new Date(t).getUTCFullYear()).slice(2)}
                </span>
              ))}
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-[13rem] right-0">
                {ticks.map((t) => (
                  <span key={t} className="absolute inset-y-0 border-l border-line/60 dark:border-slate-800" style={{ left: `${pos(t)}%` }} />
                ))}
                <span className="absolute inset-y-0 border-l-2 border-dashed border-slate-400" style={{ left: `${pos(today)}%` }} />
              </div>
              {shown.map(({ r, start, end, forecast, slip }) => {
                const actualEnd = start + ((end - start) * Math.min(100, r.summary.actualPercent)) / 100;
                const plannedNow = start + ((end - start) * Math.min(100, r.summary.plannedPercent)) / 100;
                return (
                  <Link key={r.id} href={`/projects/${r.id}`} className="group flex items-center border-b border-line/50 py-1.5 last:border-0 dark:border-slate-800">
                    <div className="w-[13rem] shrink-0 pr-3">
                      <p className="truncate text-[12.5px] font-semibold text-ink group-hover:text-accent dark:text-slate-100" title={r.projectName}>
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: HEALTH_DOT[r.summary.health] }} />
                        {r.projectName}
                      </p>
                      <p className={cn("text-[11px]", slip > 0 ? "font-semibold text-signal-expired" : "text-slate-500")}>
                        {slip > 0 ? `Prakiraan terlambat ${slip} hari` : `Target ${shortDate(end)}`}
                      </p>
                    </div>
                    <div className="relative h-7 flex-1" title={`Rencana s.d. hari ini ${formatPercent(r.summary.plannedPercent)}, realisasi ${formatPercent(r.summary.actualPercent)}`}>
                      <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded bg-slate-200 dark:bg-slate-700" style={{ left: `${pos(start)}%`, width: `${Math.max(0.5, pos(end) - pos(start))}%` }} />
                      <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded bg-accent" style={{ left: `${pos(start)}%`, width: `${Math.max(0, pos(actualEnd) - pos(start))}%` }} />
                      <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-ink/60 dark:bg-slate-200" style={{ left: `${pos(plannedNow)}%` }} title="Posisi rencana hari ini" />
                      {forecast && (
                        <span
                          className={cn("absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-white", forecast > end ? "bg-signal-expiredBar" : "bg-signal-activeBar")}
                          style={{ left: `${Math.min(100, pos(forecast))}%` }}
                          title={`Prakiraan selesai ${shortDate(forecast)}`}
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-slate-200" />Rentang rencana</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-accent" />Progres realisasi</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-ink/60" />Posisi rencana hari ini</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 bg-signal-expiredBar" />Prakiraan selesai</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Kekurangan margin: which projects lose the most money against their target
// ---------------------------------------------------------------------------

export function MarginGapCard({ rows }: { rows: PortfolioRow[] }) {
  const list = rows
    .filter((r) => r.status === "ONGOING" && r.margin.belowTarget && r.margin.targetGap > 0)
    .sort((a, b) => b.margin.targetGap - a.margin.targetGap);
  const total = list.reduce((s, r) => s + r.margin.targetGap, 0);
  const top = list.slice(0, 6);
  const max = top[0]?.margin.targetGap ?? 1;
  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Kekurangan margin
          <InfoTip label="Keterangan kekurangan margin">
            Selisih rupiah antara target margin dan prakiraan margin akhir, per project. Diurutkan dari yang terbesar: perbaikan pada project teratas paling berpengaruh pada
            margin portofolio.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{list.length ? `Total ${formatRupiah(total, true)} dari ${list.length} project` : "Tidak ada project di bawah target"}</p>
      </div>
      <CardContent>
        {top.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Semua project memenuhi target margin.</p>
        ) : (
          <ul className="space-y-2.5">
            {top.map((r) => (
              <li key={r.id}>
                <Link href={`/projects/${r.id}#keuangan/margin`} className="group block">
                  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="truncate font-semibold text-ink group-hover:text-accent dark:text-slate-100" title={r.projectName}>{r.projectName}</span>
                    <span className="shrink-0 tabular-nums font-semibold text-signal-expired">{formatRupiah(r.margin.targetGap, true)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-signal-expiredBar" style={{ width: `${(r.margin.targetGap / max) * 100}%` }} />
                    </div>
                    <span className="w-[6.5rem] shrink-0 text-right text-[11px] text-slate-500">
                      {formatPercent(r.margin.forecastMarginPct)} / {formatPercent(r.margin.targetMarginPct)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {list.length > top.length && <p className="mt-3 text-[12px] text-slate-500">dan {list.length - top.length} project lainnya</p>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Umur piutang: invoices not yet paid, by days past due
// ---------------------------------------------------------------------------

const AGING_COLOR = ["#94A3B8", "#E3B341", "#D69E2E", "#E06A63", "#C2362F"];

export function AgingCard({ aging }: { aging: AgingBucket[] }) {
  const total = aging.reduce((s, b) => s + b.amount, 0);
  const overdue = aging.slice(1).reduce((s, b) => s + b.amount, 0);
  const worst = [...aging].reverse().find((b) => b.key !== "current" && b.amount > 0);
  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Umur piutang
          <InfoTip label="Keterangan umur piutang">
            Invoice yang sudah ditagih tetapi belum dibayar, dikelompokkan menurut lama lewat jatuh tempo (JT = jatuh tempo). Makin ke kanan makin lama tertunggak dan makin perlu ditindaklanjuti.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">
          {total ? `Piutang ${formatRupiah(total, true)}, lewat jatuh tempo ${formatRupiah(overdue, true)}` : "Tidak ada piutang"}
        </p>
      </div>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aging} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#E9EDF2" vertical={false} />
              <XAxis dataKey="label" tickFormatter={(l: string) => (l === "Belum jatuh tempo" ? "Belum JT" : l)} tick={{ fontSize: 10, fill: "#5B6B7F" }} interval={0} axisLine={{ stroke: "#E3E8EF" }} tickLine={false} />
              <YAxis tickFormatter={(v: number) => (v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} tick={{ fontSize: 10, fill: "#5B6B7F" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#F1F5F9" }} contentStyle={tooltipStyle} formatter={(v) => [formatRupiah(Number(v), true), "Piutang"]} />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                {aging.map((b, i) => (
                  <Cell key={b.key} fill={AGING_COLOR[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {worst && (
          <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
            Paling lama ({worst.label}):{" "}
            {worst.projects.slice(0, 2).map((x, i) => (
              <span key={x.id}>
                {i > 0 && ", "}
                <Link href={`/projects/${x.id}#keuangan/termin`} className="font-semibold text-accent hover:underline">
                  {x.name}
                </Link>{" "}
                ({formatRupiah(x.amount, true)})
              </span>
            ))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tren kondisi: is the portfolio getting better or worse week by week?
// ---------------------------------------------------------------------------

export function HealthTrendCard({ trend }: { trend: HealthTrendRow[] }) {
  const data = trend.map((t) => ({ ...t, label: shortDate(t.date) }));
  const first = trend[0];
  const last = trend[trend.length - 1];
  const delta = first && last ? last.KRITIS - first.KRITIS : 0;
  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Tren kondisi mingguan
          <InfoTip label="Keterangan tren kondisi mingguan" align="right">
            Jumlah project berjalan menurut kondisinya setiap minggu (dicatat otomatis tiap minggu). Bila bagian merah makin tinggi, kondisi portofolio memburuk.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">
          {trend.length < 2 ? "Riwayat terbentuk setiap minggu" : delta > 0 ? `Project kritis bertambah ${delta} sejak ${shortDate(first.date)}` : delta < 0 ? `Project kritis berkurang ${Math.abs(delta)} sejak ${shortDate(first.date)}` : `Jumlah project kritis tetap sejak ${shortDate(first.date)}`}
        </p>
      </div>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#E9EDF2" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5B6B7F" }} axisLine={{ stroke: "#E3E8EF" }} tickLine={false} minTickGap={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#5B6B7F" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#F1F5F9" }} contentStyle={tooltipStyle} labelFormatter={(l) => `Minggu ${l}`} />
              <Bar dataKey="KRITIS" name={HEALTH_LABEL.KRITIS} stackId="h" fill={HEALTH_DOT.KRITIS} maxBarSize={28} isAnimationActive={false} />
              <Bar dataKey="WASPADA" name={HEALTH_LABEL.WASPADA} stackId="h" fill={HEALTH_DOT.WASPADA} maxBarSize={28} isAnimationActive={false} />
              <Bar dataKey="ON_TRACK" name={HEALTH_LABEL.ON_TRACK} stackId="h" fill={HEALTH_DOT.ON_TRACK} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex gap-3 text-[11.5px] text-slate-500">
          {(["KRITIS", "WASPADA", "ON_TRACK"] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_DOT[k] }} />
              {HEALTH_LABEL[k]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
