"use client";

import { useState } from "react";
import Link from "next/link";
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { HEALTH_LABEL, formatPercent, shortDate } from "@/lib/project-monitoring-shared";
import type { MiniCurvePoint, PortfolioCurvePoint, PortfolioRow } from "@/lib/project-monitoring";
import { CHART } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import { Pager } from "./PortfolioInsights";
import { HEALTH_DOT, tooltipStyle } from "./PortfolioPriority";
import { Segmented, StatusChips } from "./shared";

const PAGE = 8;

/** Kurva S of every running project side by side (each has its own plan), with a contract-weighted combined curve as the alternative view. */
export function SCurveGridCard({ rows, curves, curve, today }: { rows: PortfolioRow[]; curves: Record<string, MiniCurvePoint[]>; curve: PortfolioCurvePoint[]; today: number }) {
  const [view, setView] = useState<"each" | "all">("each");
  const [page, setPage] = useState(0);
  const [health, setHealth] = useState("");
  const [order, setOrder] = useState<"dev" | "value" | "end">("dev");
  const ongoing = rows.filter((r) => r.status === "ONGOING");
  const sorted = ongoing
    .filter((r) => !health || r.summary.health === health)
    .sort((a, b) =>
      order === "value" ? b.summary.contractValue - a.summary.contractValue : order === "end" ? Date.parse(a.targetEndDate) - Date.parse(b.targetEndDate) : a.summary.deviation - b.summary.deviation
    );
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const pg = Math.min(page, pages - 1);
  const visible = sorted.slice(pg * PAGE, pg * PAGE + PAGE);
  const last = [...curve].reverse().find((c) => c.actual !== null);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Kurva S
            <InfoTip label="Keterangan kurva S">
              <strong>Per project</strong> menampilkan kurva S setiap project berjalan. Garis putus-putus adalah rencana, garis biru adalah realisasi. Klik kartu untuk membuka
              project. <strong>Gabungan</strong> menampilkan rata-rata progres seluruh project berjalan yang dibobot nilai kontrak, untuk melihat posisi keseluruhan.
            </InfoTip>
          </CardTitle>
          <CardDescription>{view === "each" ? `${ongoing.length} project berjalan` : "Rata-rata tertimbang nilai kontrak"}</CardDescription>
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            ["each", "Per project"],
            ["all", "Gabungan"],
          ]}
        />
      </CardHeader>
      <CardContent>
        {view === "each" ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <StatusChips
                value={health}
                onChange={(v) => {
                  setHealth(v);
                  setPage(0);
                }}
                counts={(h) => ongoing.filter((r) => !h || r.summary.health === h).length}
              />
              <div className="flex items-center gap-3">
                <select
                  value={order}
                  onChange={(e) => {
                    setOrder(e.target.value as "dev" | "value" | "end");
                    setPage(0);
                  }}
                  className="h-8 rounded-md border border-line bg-white px-2 text-[12.5px] dark:border-slate-700 dark:bg-slate-900"
                  aria-label="Urutkan"
                >
                  <option value="dev">Paling tertinggal</option>
                  <option value="value">Nilai kontrak terbesar</option>
                  <option value="end">Target selesai terdekat</option>
                </select>
                <Pager page={pg} pages={pages} total={sorted.length} size={PAGE} onChange={setPage} />
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Tidak ada project dengan kondisi ini.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                Realisasi gabungan <span className="font-bold text-accent">{formatPercent(last.actual)}</span> dari rencana{" "}
                <span className="font-bold text-ink dark:text-slate-100">{formatPercent(last.planned)}</span>
              </p>
            )}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve} margin={{ top: 16, right: 12, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => shortDate(t)} tick={{ fontSize: 11, fill: CHART.axis }} minTickGap={28} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} />
                  <Tooltip labelFormatter={(t) => shortDate(Number(t))} formatter={(v, n) => [`${Number(v).toLocaleString("id-ID")}%`, n]} contentStyle={tooltipStyle} />
                  <ReferenceLine x={today} stroke={CHART.plan} strokeDasharray="3 3" label={{ value: "Hari ini", fontSize: 10, fill: CHART.axis, position: "top" }} />
                  <Line type="monotone" dataKey="planned" name="Rencana" stroke={CHART.plan} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="actual" name="Realisasi" stroke={CHART.blue} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-[#94A3B8]" />
            Rencana
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded bg-accent" />
            Realisasi
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniSCurveCard({ row, points, today }: { row: PortfolioRow; points: MiniCurvePoint[]; today: number }) {
  const s = row.summary;
  const dev = s.deviation;
  const devColor = dev < -10 ? "text-signal-expired" : dev < -0.05 ? "text-signal-soon" : "text-signal-active";
  const first = points[0]?.t;
  const lastT = points[points.length - 1]?.t;
  return (
    <Link href={`/projects/${row.id}`} className="group block rounded-lg border border-line bg-white p-3.5 transition-colors hover:border-accent/50 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug text-ink group-hover:text-accent dark:text-slate-100" title={row.projectName}>
          {row.projectName}
        </p>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: HEALTH_DOT[s.health] }} title={HEALTH_LABEL[s.health]} />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between text-[12px]">
        <span className="text-slate-500">
          <span className="font-bold text-accent">{formatPercent(s.actualPercent)}</span> / {formatPercent(s.plannedPercent)}
        </span>
        <span className={cn("font-semibold tabular-nums", devColor)}>
          {dev > 0 ? "+" : ""}
          {dev.toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin
        </span>
      </div>
      <div className="mt-2 h-20">
        {points.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`mini-${row.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={CHART.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
              <YAxis domain={[0, 100]} hide />
              {today > first && today < lastT && <ReferenceLine x={today} stroke={CHART.neutral} strokeDasharray="2 2" />}
              <Line type="monotone" dataKey="p" stroke={CHART.plan} strokeDasharray="4 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Area type="linear" dataKey="a" stroke={CHART.blue} strokeWidth={2} fill={`url(#mini-${row.id})`} dot={false} connectNulls={false} isAnimationActive={false} />
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
