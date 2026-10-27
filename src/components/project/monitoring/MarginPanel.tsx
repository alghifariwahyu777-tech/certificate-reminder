"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { AlertTriangle, Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatPercent, formatRupiah, shortDate } from "@/lib/project-monitoring-shared";
import { BRIDGE_SHORT } from "@/lib/project-margin";
import { cn } from "@/lib/utils";
import type { ProjectMonitoringDTO } from "./types";

const tooltipStyle = { borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "var(--font-body)" };
const niceCeil = (v: number) => {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const step = mag / 2;
  return Math.ceil(v / step) * step;
};
const juta = (v: number) => `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

export function MarginPanel({ data }: { data: ProjectMonitoringDTO }) {
  const m = data.margin;
  const s = data.summary;
  const missing = [!m.hasContract && "nilai kontrak", !m.hasBudget && "RAB", !m.hasCost && "realisasi biaya"].filter(Boolean) as string[];

  // waterfall as range bars [low, high] — also correct when the margin crosses below zero
  let run = 0;
  const bridge = m.bridge.map((b) => {
    if (b.kind !== "delta") {
      run = b.amount;
      return { key: b.key, label: b.label, short: BRIDGE_SHORT[b.key] ?? b.label, range: [Math.min(0, b.amount), Math.max(0, b.amount)] as [number, number], raw: b.amount, kind: b.kind };
    }
    const from = run;
    run += b.amount;
    return { key: b.key, label: b.label, short: BRIDGE_SHORT[b.key] ?? b.label, range: [Math.min(from, run), Math.max(from, run)] as [number, number], raw: b.amount, kind: b.kind };
  });

  const history = [...data.marginHistory]
    .filter((h) => h.actualMarginPct !== null || h.forecastMarginPct !== null)
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .map((h) => ({ ...h, label: h.weekKey.replace(/^\d{4}-W/, "M") }));

  return (
    <div className="space-y-5">
      {missing.length > 0 && (
        <div className="rounded-md border border-signal-soonBorder bg-signal-soonBg px-4 py-3 text-sm text-signal-soon flex gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Data {missing.join(", ")} belum tersedia, sehingga analisis margin belum lengkap. Unggah RAB dan catat realisasi biaya pada bagian RAB & biaya{!m.hasContract ? ", serta isi nilai kontrak melalui Edit project" : ""}.
          </span>
        </div>
      )}

      <Card>
        <div className="px-5 pt-4">
          <CardTitle className="flex items-center gap-1.5">
            Margin project
            <InfoTip label="Keterangan margin project">
              Setiap project memiliki target margin sendiri, diambil dari RAB. Posisi kas project saat ini (uang diterima dikurangi biaya keluar) {formatRupiah(m.cashPosition, true)}; angka kas
              dipengaruhi waktu penagihan sehingga tidak dipakai sebagai ukuran margin.
            </InfoTip>
          </CardTitle>
        </div>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MarginFigure
              label="Target margin"
              pct={m.targetMarginPct}
              amount={m.targetMarginPct !== null && m.contract ? (m.targetMarginPct / 100) * m.contract : null}
              note={m.targetSource === "project" ? "Dari RAB project" : m.targetSource === "baseline" ? "Dari baseline: nilai kontrak awal − RAB awal" : "Belum ada RAB"}
            />
            <MarginFigure
              label="Prakiraan margin akhir"
              pct={m.hasBudget ? m.forecastMarginPct : null}
              amount={m.hasBudget ? m.forecastMargin : null}
              tone={m.signals.margin}
              note={m.belowTarget ? `Kurang ${formatRupiah(m.targetGap, true)} dari target` : m.hasBudget && m.hasCost ? "Memenuhi target" : undefined}
              emphasis
            />
            <MarginFigure
              label="Margin pekerjaan selesai"
              pct={m.actualMarginPct}
              amount={m.actualMargin}
              note="Nilai pekerjaan selesai dikurangi biaya yang sudah keluar"
            />
          </div>

          {m.hasBudget && m.hasContract && (
            <details className="group rounded-lg bg-slate-50 px-4 py-3 text-[13px] dark:bg-slate-800/50">
              <summary className="cursor-pointer select-none font-semibold text-ink dark:text-slate-100">Cara menghitung prakiraan</summary>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Prakiraan mengasumsikan <strong>sisa pekerjaan berjalan sesuai RAB</strong>: biaya yang sudah keluar ditambah anggaran RAB untuk pekerjaan yang belum selesai.
              </p>
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-slate-700 dark:text-slate-300 sm:max-w-md">
                <span>Biaya yang sudah keluar</span>
                <span className="text-right">{formatRupiah(m.actualCost, true)}</span>
                <span>
                  Sisa RAB ({formatPercent(Math.max(0, 100 - s.actualPercent))} pekerjaan belum selesai)
                </span>
                <span className="text-right">{formatRupiah(Math.max(0, m.eac - m.actualCost), true)}</span>
                <span className="border-t border-line pt-1 font-semibold dark:border-slate-700">Prakiraan biaya akhir</span>
                <span className="border-t border-line pt-1 text-right font-semibold dark:border-slate-700">{formatRupiah(m.eac, true)}</span>
                <span>Nilai kontrak</span>
                <span className="text-right">{formatRupiah(m.contract, true)}</span>
                <span className="font-semibold">Prakiraan margin akhir</span>
                <span className={cn("text-right font-semibold", m.forecastMargin < 0 && "text-signal-expired")}>
                  {formatRupiah(m.forecastMargin, true)} ({formatPercent(m.forecastMarginPct)})
                </span>
              </div>
            </details>
          )}

          {m.cause && (
            <p className="flex gap-2 text-[13.5px] text-slate-700 dark:text-slate-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal-soon" />
              {m.cause}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-2 gap-5">
        {/* EV curve */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
            Kurva biaya dan nilai pekerjaan
            <InfoTip label="Keterangan kurva biaya dan nilai pekerjaan">Bila garis merah (biaya aktual) berada di atas garis biru (nilai pekerjaan selesai), biaya yang keluar lebih besar dari anggaran untuk pekerjaan yang sudah dikerjakan.</InfoTip>
          </CardTitle>
          </CardHeader>
          <CardContent>
            {!m.hasBudget ? (
              <p className="text-sm text-slate-400 py-10 text-center">Isi RAB untuk menampilkan kurva.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.costCurve} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => shortDate(t)} tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={24} />
                    <YAxis
                      domain={[0, niceCeil(Math.max(m.contract, m.budget, m.eac, m.actualCost) * 1.05)]}
                      tickCount={6}
                      tickFormatter={juta}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      label={{ value: "Rp juta", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94A3B8" }}
                    />
                    <Tooltip labelFormatter={(t) => shortDate(Number(t))} formatter={(v, n) => [formatRupiah(Number(v), true), n]} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={m.budget} stroke="#2F855A" strokeDasharray="4 4" label={{ value: "RAB", fontSize: 10, fill: "#2F855A", position: "insideTopLeft" }} />
                    {m.contract > 0 && <ReferenceLine y={m.contract} stroke="#123F6B" strokeDasharray="4 4" label={{ value: "Nilai kontrak", fontSize: 10, fill: "#123F6B", position: "insideTopLeft" }} />}
                    <ReferenceLine x={data.today} stroke="#CBD5E1" />
                    <Line type="monotone" dataKey="pv" name="Rencana (PV)" stroke="#94A3B8" strokeDasharray="6 4" strokeWidth={2} dot={false} />
                    <Line type="stepAfter" dataKey="ev" name="Nilai pekerjaan selesai (EV)" stroke="#1671B8" strokeWidth={2.5} dot={false} />
                    <Line type="stepAfter" dataKey="ac" name="Biaya aktual (AC)" stroke="#C2362F" strokeWidth={2.5} dot={false} />
                    <Line type="linear" dataKey="eac" name="Prakiraan biaya" stroke="#C2362F" strokeDasharray="2 4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* margin bridge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
            Jembatan margin
            <InfoTip label="Keterangan jembatan margin">Dari margin awal (baseline) ke prakiraan margin akhir: apa saja yang menambah dan mengurangi margin (Rp juta).</InfoTip>
          </CardTitle>
          </CardHeader>
          <CardContent>
            {!m.hasBudget || !m.hasContract ? (
              <p className="text-sm text-slate-400 py-10 text-center">Isi nilai kontrak dan RAB untuk menampilkan jembatan margin.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bridge} margin={{ top: 16, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="short" tick={{ fontSize: 10, fill: "#64748B" }} interval={0} height={24} />
                    <YAxis tickFormatter={juta} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
                    <ReferenceLine y={0} stroke="#94A3B8" />
                    <Tooltip
                      cursor={{ fill: "#F1F5F9" }}
                      contentStyle={tooltipStyle}
                      formatter={(_v, _n, item) => {
                        const raw = (item?.payload as { raw: number }).raw;
                        return [`${raw > 0 && (item?.payload as { kind: string }).kind === "delta" ? "+" : ""}${formatRupiah(raw)}`, "Nilai"];
                      }}
                    />
                    <Bar dataKey="range" isAnimationActive={false} radius={[2, 2, 2, 2]}>
                      <LabelList
                        dataKey="raw"
                        position="top"
                        style={{ fontSize: 10, fill: "#334155" }}
                        formatter={(v: unknown) => `${Number(v) > 0 ? "" : "−"}${juta(Math.abs(Number(v)))}`}
                      />
                      {bridge.map((b, i) => (
                        <Cell key={i} fill={b.kind === "start" ? "#123F6B" : b.kind === "end" ? (m.belowTarget ? "#C2362F" : "#2F855A") : b.raw < 0 ? "#E06A63" : "#5BAA7E"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {m.hasBudget && m.hasContract && (
              <ul className="mt-3 space-y-1 text-xs">
                {bridge.map((b) => (
                  <li key={b.key} className="flex justify-between gap-3">
                    <span className={cn(b.kind === "delta" ? "text-slate-600 dark:text-slate-300" : "font-medium text-ink dark:text-slate-100")}>{b.label}</span>
                    <span className={cn("tabular-nums", b.kind === "delta" ? (b.raw < 0 ? "text-signal-expired" : "text-signal-active") : "font-medium")}>
                      {b.kind === "delta" ? (b.raw > 0 ? "+" : "−") : b.raw < 0 ? "−" : ""}
                      {formatRupiah(Math.abs(b.raw), true)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* weekly margin trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Tren prakiraan margin
            <InfoTip label="Keterangan tren prakiraan margin">Prakiraan margin akhir setiap minggu dibandingkan target project, untuk melihat sejak kapan margin mulai tergerus.</InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length < 2 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Riwayat akan terbentuk otomatis setiap minggu (minimal 2 minggu data).</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [formatPercent(Number(v)), n]} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#94A3B8" />
                  {m.targetMarginPct !== null && (
                    <ReferenceLine y={m.targetMarginPct} stroke="#123F6B" strokeDasharray="6 4" label={{ value: `Target ${formatPercent(m.targetMarginPct)}`, fontSize: 10, fill: "#123F6B", position: "insideTopLeft" }} />
                  )}
                  <Line dataKey="forecastMarginPct" name="Prakiraan margin akhir" stroke="#1671B8" strokeWidth={2.5} dot={{ r: 2 }} connectNulls />
                  <Line dataKey="actualMarginPct" name="Margin pekerjaan selesai" stroke="#9AA8B8" strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {m.overBudgetCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bagian biaya yang melebihi RAB</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2.5 font-medium">Kategori</th>
                  <th className="px-3 py-2.5 font-medium text-right">RAB</th>
                  <th className="px-3 py-2.5 font-medium text-right">Realisasi</th>
                  <th className="px-5 py-2.5 font-medium text-right">Kelebihan</th>
                </tr>
              </thead>
              <tbody>
                {m.overBudgetCategories.map((c) => (
                  <tr key={c.category} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="px-5 py-2.5">{c.category}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.budget ? formatRupiah(c.budget, true) : "tidak dianggarkan"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatRupiah(c.actual, true)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-signal-expired font-medium">+{formatRupiah(c.over, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MarginFigure({ label, pct, amount, note, tone, emphasis }: { label: string; pct: number | null; amount: number | null; note?: string; tone?: "good" | "warn" | "bad" | "none"; emphasis?: boolean }) {
  const color = tone === "bad" ? "text-signal-expired" : tone === "warn" ? "text-signal-soon" : tone === "good" ? "text-signal-active" : "text-ink dark:text-slate-100";
  return (
    <div className={cn("rounded-lg border px-4 py-3", emphasis ? "border-brand-blue/40 bg-sky-50/50 dark:bg-sky-900/10" : "border-line dark:border-slate-700")}>
      <p className="text-[12.5px] font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 text-[24px] font-bold leading-tight", pct === null ? "text-slate-400" : color)}>{pct === null ? "-" : formatPercent(pct)}</p>
      <p className="text-[13px] text-slate-600 dark:text-slate-300">{amount === null ? "" : formatRupiah(amount, true)}</p>
      {note && <p className="mt-1 text-[12px] text-slate-500">{note}</p>}
    </div>
  );
}
