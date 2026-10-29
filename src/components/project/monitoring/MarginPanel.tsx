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
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatPercent, formatRupiah, shortDate } from "@/lib/project-monitoring-shared";
import { BRIDGE_SHORT } from "@/lib/project-margin";
import { cn } from "@/lib/utils";
import type { ProjectMonitoringDTO } from "./types";
import { Notice } from "@/components/ui/Notice";

const tooltipStyle = { borderRadius: 6, border: "1px solid #E6EBF1", fontSize: 12, fontFamily: "var(--font-body)" };
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

  const history = data.marginTimeline;

  return (
    <div className="space-y-5">
      {missing.length > 0 && (
        <Notice tone="warning">
          <span>
            Data {missing.join(", ")} belum tersedia, sehingga analisis margin belum lengkap. Unggah RAB dan catat realisasi biaya pada bagian RAB & biaya{!m.hasContract ? ", serta isi nilai kontrak melalui Ubah project" : ""}.
          </span>
        </Notice>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Margin project
            <InfoTip label="Keterangan margin project">
              Target margin ditetapkan dalam RAB setiap project. Posisi kas saat ini (uang diterima dikurangi biaya keluar) {formatRupiah(m.cashPosition, true)}; angka kas
              dipengaruhi waktu penagihan sehingga tidak dipakai sebagai ukuran margin.
            </InfoTip>
          </CardTitle>
          <CardDescription>Tiga angka untuk menilai keuntungan project: target, proyeksi saat selesai, dan realisasi sampai hari ini</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MarginFigure
              label="Target margin"
              question="Berapa yang direncanakan?"
              pct={m.targetMarginPct}
              amount={m.targetMarginPct !== null && m.contract ? (m.targetMarginPct / 100) * m.contract : null}
              note={m.targetSource === "project" ? "Ditetapkan dalam RAB project" : m.targetSource === "baseline" ? "Dari baseline: nilai kontrak awal dikurangi RAB awal" : "Belum ada RAB"}
            />
            <MarginFigure
              label="Proyeksi margin akhir"
              question="Berapa yang akan diperoleh saat project selesai?"
              pct={m.hasBudget ? m.forecastMarginPct : null}
              amount={m.hasBudget ? m.forecastMargin : null}
              tone={m.signals.margin}
              note={m.belowTarget ? `Kurang ${formatRupiah(m.targetGap, true)} dari target` : m.hasBudget && m.hasCost ? "Memenuhi target" : "Memerlukan RAB dan realisasi biaya"}
              emphasis
            />
            <MarginFigure
              label="Margin realisasi"
              question="Berapa yang sudah diperoleh sampai hari ini?"
              pct={m.actualMarginPct}
              amount={m.actualMargin}
              note={`Dari pekerjaan yang sudah dikerjakan (${formatPercent(s.actualPercent)})`}
            />
          </div>

          {m.hasBudget && m.hasContract && (
            <details open className="rounded-lg border border-line bg-paper/70 px-4 py-3 text-[13px] dark:border-slate-700 dark:bg-slate-800/50">
              <summary className="cursor-pointer select-none font-semibold text-ink dark:text-slate-100">Cara perhitungan</summary>
              <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div>
                  <p className="font-semibold text-ink dark:text-slate-100">Proyeksi margin akhir</p>
                  <p className="mt-0.5 text-[12.5px] text-slate-600 dark:text-slate-300">
                    Biaya yang sudah keluar dianggap final; pekerjaan yang belum dikerjakan diperkirakan menghabiskan biaya sesuai RAB. Pemborosan yang sudah terjadi langsung
                    mengurangi margin akhir.
                  </p>
                  <dl className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-slate-700 dark:text-slate-300">
                    <dt>Biaya yang sudah keluar</dt>
                    <dd className="text-right tabular-nums">{formatRupiah(m.actualCost, true)}</dd>
                    <dt>
                      RAB untuk pekerjaan yang belum dikerjakan
                      <span className="block text-[12px] text-slate-500">
                        {formatPercent(Math.max(0, 100 - s.actualPercent))} dari RAB {formatRupiah(m.budget, true)}
                      </span>
                    </dt>
                    <dd className="text-right tabular-nums">{formatRupiah(Math.max(0, m.eac - m.actualCost), true)}</dd>
                    <dt className="border-t border-line pt-1.5 font-semibold dark:border-slate-700">Proyeksi biaya akhir</dt>
                    <dd className="border-t border-line pt-1.5 text-right font-semibold tabular-nums dark:border-slate-700">{formatRupiah(m.eac, true)}</dd>
                    <dt>Nilai kontrak</dt>
                    <dd className="text-right tabular-nums">{formatRupiah(m.contract, true)}</dd>
                    <dt className="border-t border-line pt-1.5 font-semibold dark:border-slate-700">Proyeksi margin akhir</dt>
                    <dd className={cn("border-t border-line pt-1.5 text-right font-semibold tabular-nums dark:border-slate-700", m.belowTarget && "text-signal-expired")}>
                      {formatRupiah(m.forecastMargin, true)} ({formatPercent(m.forecastMarginPct)})
                    </dd>
                  </dl>
                </div>
                <div>
                  <p className="font-semibold text-ink dark:text-slate-100">Margin realisasi</p>
                  <p className="mt-0.5 text-[12.5px] text-slate-600 dark:text-slate-300">
                    Nilai pekerjaan yang sudah dikerjakan (progres dikali nilai kontrak) dikurangi biaya yang sudah keluar. Angka ini menunjukkan keuntungan yang sudah terbentuk,
                    belum termasuk sisa pekerjaan.
                  </p>
                  <dl className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-slate-700 dark:text-slate-300">
                    <dt>
                      Nilai pekerjaan yang sudah dikerjakan
                      <span className="block text-[12px] text-slate-500">
                        {formatPercent(s.actualPercent)} dari nilai kontrak {formatRupiah(m.contract, true)}
                      </span>
                    </dt>
                    <dd className="text-right tabular-nums">{formatRupiah((s.actualPercent / 100) * m.contract, true)}</dd>
                    <dt>Biaya yang sudah keluar</dt>
                    <dd className="text-right tabular-nums">{formatRupiah(m.actualCost, true)}</dd>
                    <dt className="border-t border-line pt-1.5 font-semibold dark:border-slate-700">Margin realisasi</dt>
                    <dd className="border-t border-line pt-1.5 text-right font-semibold tabular-nums dark:border-slate-700">
                      {m.actualMargin === null ? "-" : `${formatRupiah(m.actualMargin, true)} (${formatPercent(m.actualMarginPct)})`}
                    </dd>
                  </dl>
                </div>
              </div>
            </details>
          )}

          {m.cause && (
            <Notice tone="warning">
              <span>{m.cause}</span>
            </Notice>
          )}
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-2 gap-5">
        {/* EV curve */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Biaya dibanding nilai pekerjaan
              <InfoTip label="Keterangan biaya dibanding nilai pekerjaan">
                Garis biru adalah nilai pekerjaan yang sudah dikerjakan menurut RAB; garis merah adalah biaya yang benar-benar keluar. Bila garis merah berada di atas garis biru,
                project lebih boros dari anggaran. Garis abu-abu putus-putus adalah rencana biaya sesuai jadwal; garis merah titik-titik adalah proyeksi biaya sampai selesai.
              </InfoTip>
            </CardTitle>
            <CardDescription>Dalam Rp juta, sejak project dimulai</CardDescription>
          </CardHeader>
          <CardContent>
            {!m.hasBudget ? (
              <p className="text-sm text-slate-400 py-10 text-center">Isi RAB untuk menampilkan kurva.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.costCurve} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6EBF1" vertical={false} />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => shortDate(t)} tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={24} />
                    <YAxis
                      domain={[0, niceCeil(Math.max(m.contract, m.budget, m.eac, m.actualCost) * 1.05)]}
                      tickCount={6}
                      tickFormatter={juta}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                                          />
                    <Tooltip labelFormatter={(t) => shortDate(Number(t))} formatter={(v, n) => [formatRupiah(Number(v), true), n]} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11.5 }} iconType="plainline" />
                    <ReferenceLine y={m.budget} stroke="#2F855A" strokeDasharray="4 4" label={{ value: "RAB", fontSize: 10, fill: "#2F855A", position: "insideTopLeft" }} />
                    {m.contract > 0 && <ReferenceLine y={m.contract} stroke="#123F6B" strokeDasharray="4 4" label={{ value: "Nilai kontrak", fontSize: 10, fill: "#123F6B", position: "insideTopLeft" }} />}
                    <ReferenceLine x={data.today} stroke="#CBD5E1" />
                    <Line type="monotone" dataKey="pv" name="Rencana biaya" stroke="#94A3B8" strokeDasharray="6 4" strokeWidth={2} dot={false} />
                    <Line type="linear" dataKey="ev" name="Nilai pekerjaan" stroke="#1671B8" strokeWidth={2.5} dot={false} />
                    <Line type="linear" dataKey="ac" name="Biaya keluar" stroke="#C2362F" strokeWidth={2.5} dot={false} />
                    <Line type="linear" dataKey="eac" name="Proyeksi biaya" stroke="#C2362F" strokeDasharray="2 4" strokeWidth={2} dot={false} />
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
              Penyebab perubahan margin
              <InfoTip label="Keterangan penyebab perubahan margin">
                Dimulai dari margin awal (baseline, batang biru tua), lalu setiap faktor yang mengurangi (merah) atau menambah (hijau) margin, sampai proyeksi margin akhir.
              </InfoTip>
            </CardTitle>
            <CardDescription>Dari margin awal ke proyeksi margin akhir, dalam Rp juta</CardDescription>
          </CardHeader>
          <CardContent>
            {!m.hasBudget || !m.hasContract ? (
              <p className="text-sm text-slate-400 py-10 text-center">Isi nilai kontrak dan RAB untuk menampilkan jembatan margin.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bridge} margin={{ top: 16, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6EBF1" vertical={false} />
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

      {/* margin forecast since the project started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Perkembangan proyeksi margin
            <InfoTip label="Keterangan perkembangan proyeksi margin">
              Setiap titik adalah proyeksi margin akhir menurut biaya dan progres yang tercatat sampai tanggal itu. Garis yang turun menunjukkan sejak kapan margin mulai tergerus.
            </InfoTip>
          </CardTitle>
          <CardDescription>
            {history.length ? `Sejak ${shortDate(history[0].t)} sampai hari ini. ` : ""}Area merah muda berarti proyeksi berada di bawah target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length < 2 ? (
            <p className="py-8 text-center text-sm text-slate-500">Isi nilai kontrak dan RAB untuk menampilkan perkembangan margin.</p>
          ) : (
            (() => {
              const vals = history.map((h) => h.forecastMarginPct).filter((v): v is number => v !== null);
              const lo = Math.floor(Math.min(...vals, m.targetMarginPct ?? 0, 0) / 5) * 5;
              const hi = Math.ceil(Math.max(...vals, m.targetMarginPct ?? 0) / 5) * 5 + 5;
              const step = hi - lo > 40 ? 10 : 5;
              const ticks: number[] = [];
              for (let v = Math.floor(lo / step) * step; v <= hi; v += step) ticks.push(v);
              return (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke="#E6EBF1" vertical={false} />
                      <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => shortDate(t)} tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={28} tickLine={false} axisLine={{ stroke: "#E6EBF1" }} />
                      <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} />
                      <Tooltip labelFormatter={(t) => shortDate(Number(t))} formatter={(v, n) => [formatPercent(Number(v)), n]} contentStyle={tooltipStyle} />
                      {m.targetMarginPct !== null && <ReferenceArea y1={ticks[0]} y2={m.targetMarginPct} fill="#FBEDEC" fillOpacity={0.7} />}
                      {m.targetMarginPct !== null && (
                        <ReferenceLine y={m.targetMarginPct} stroke="#123F6B" strokeDasharray="6 4" label={{ value: `Target ${formatPercent(m.targetMarginPct)}`, fontSize: 11, fill: "#123F6B", position: "insideTopLeft" }} />
                      )}
                      <ReferenceLine y={0} stroke="#94A3B8" />
                      <Line type="linear" dataKey="forecastMarginPct" name="Proyeksi margin akhir" stroke="#1671B8" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded bg-accent" />
              Proyeksi margin akhir
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-[#123F6B]" />
              Target margin
            </span>
          </div>
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
                <tr className="th-row">
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

function MarginFigure({ label, question, pct, amount, note, tone, emphasis }: { label: string; question: string; pct: number | null; amount: number | null; note?: string; tone?: "good" | "warn" | "bad" | "none"; emphasis?: boolean }) {
  const color = tone === "bad" ? "text-signal-expired" : tone === "warn" ? "text-signal-soon" : tone === "good" ? "text-signal-active" : "text-ink dark:text-slate-100";
  return (
    <div className={cn("rounded-lg border px-4 py-3", emphasis ? "border-brand-blue/40 bg-sky-50/50 dark:bg-sky-900/10" : "border-line dark:border-slate-700")}>
      <p className="text-[13px] font-semibold text-ink dark:text-slate-100">{label}</p>
      <p className="text-[12px] text-slate-500">{question}</p>
      <p className={cn("mt-1 text-[24px] font-bold leading-tight", pct === null ? "text-slate-400" : color)}>{pct === null ? "-" : formatPercent(pct)}</p>
      <p className="text-[13px] text-slate-600 dark:text-slate-300">{amount === null ? "" : formatRupiah(amount, true)}</p>
      {note && <p className="mt-1 text-[12px] text-slate-500">{note}</p>}
    </div>
  );
}
