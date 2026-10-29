"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { HEALTH_LABEL, formatPercent, formatRupiah, mergePadSchedules } from "@/lib/project-monitoring-shared";
import type { PortfolioRow } from "@/lib/project-monitoring";
import { CHART } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

export const HEALTH_DOT: Record<string, string> = { KRITIS: CHART.bad, WASPADA: CHART.warn, ON_TRACK: CHART.good, SELESAI: CHART.blue, BATAL: CHART.plan };
export const tooltipStyle = { borderRadius: 8, border: `1px solid ${CHART.grid}`, fontSize: 12, fontFamily: "var(--font-body)" };
export const fmt2 = (v: number | null | undefined) => (v === null || v === undefined ? "-" : v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export function HealthLegend({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300", className)}>
      {(["KRITIS", "WASPADA", "ON_TRACK"] as const).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_DOT[k] }} />
          {HEALTH_LABEL[k]}
        </span>
      ))}
    </span>
  );
}

function quadrant(spi: number, cpi: number): { label: string; tone: "bad" | "warn" | "good" } {
  if (spi < 1 && cpi < 1) return { label: "Terlambat dan boros", tone: "bad" };
  if (spi < 1) return { label: "Terlambat", tone: "warn" };
  if (cpi < 1) return { label: "Boros", tone: "warn" };
  return { label: "Sesuai rencana", tone: "good" };
}

/** Running projects that have both indices, numbered from the weakest (lowest SPI × CPI). */
export function useMappedProjects(rows: PortfolioRow[]) {
  return useMemo(() => {
    const ongoing = rows.filter((r) => r.status === "ONGOING");
    const clamp = (v: number) => Math.min(1.47, Math.max(0.53, v));
    const mapped = ongoing
      .filter((r) => r.summary.spi !== null && r.margin.cpi !== null)
      .map((r) => ({ row: r, spi: clamp(r.summary.spi as number), cpi: clamp(r.margin.cpi as number), rawSpi: r.summary.spi as number, rawCpi: r.margin.cpi as number, value: Math.max(1, r.summary.contractValue) }))
      .sort((a, b) => a.rawSpi * a.rawCpi - b.rawSpi * b.rawCpi)
      .map((x, i) => ({ ...x, no: i + 1, id: x.row.id, health: x.row.summary.health }));
    const unmapped = ongoing.filter((r) => r.summary.spi === null || r.margin.cpi === null);
    return { ongoing, mapped, unmapped };
  }, [rows]);
}

// ---------------------------------------------------------------------------
// Matriks waktu dan biaya
// ---------------------------------------------------------------------------

export function TimeCostMatrixCard({ rows }: { rows: PortfolioRow[] }) {
  const router = useRouter();
  const { ongoing, mapped } = useMappedProjects(rows);
  const zones = [
    { x1: 0.4, x2: 1, y1: 0.4, y2: 1, fill: "#FBEDEC", label: "Terlambat dan boros", pos: "insideBottomLeft", color: CHART.bad },
    { x1: 1, x2: 1.6, y1: 1, y2: 1.6, fill: "#EAF5EE", label: "Sesuai rencana", pos: "insideTopRight", color: CHART.good },
    { x1: 0.4, x2: 1, y1: 1, y2: 1.6, fill: "#FBF5E8", label: "Terlambat", pos: "insideTopLeft", color: "#B7791F" },
    { x1: 1, x2: 1.6, y1: 0.4, y2: 1, fill: "#FBF5E8", label: "Boros", pos: "insideBottomRight", color: "#B7791F" },
  ] as const;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Matriks waktu dan biaya
          <InfoTip label="Keterangan matriks waktu dan biaya">
            Setiap titik adalah satu project berjalan. Nomor pada titik sama dengan nomor pada tabel Posisi tiap project; ukuran titik menunjukkan nilai kontrak. Sumbu mendatar
            adalah <strong>kinerja waktu</strong> (progres realisasi dibagi rencana), sumbu tegak adalah <strong>kinerja biaya</strong> (nilai pekerjaan yang sudah dikerjakan
            menurut RAB dibagi biaya yang sudah keluar). Nilai 1 berarti sesuai rencana. Klik titik untuk membuka project.
          </InfoTip>
        </CardTitle>
        <CardDescription>
          {mapped.length} dari {ongoing.length} project berjalan memiliki data jadwal dan biaya
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {mapped.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">Belum ada project dengan data RAB dan realisasi biaya.</p>
        ) : (
          <div className="min-h-[20rem] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
                {zones.map((z) => (
                  <ReferenceArea key={z.label} x1={z.x1} x2={z.x2} y1={z.y1} y2={z.y2} fill={z.fill} fillOpacity={0.9} label={{ value: z.label, position: z.pos, fontSize: 10.5, fill: z.color }} />
                ))}
                <XAxis type="number" dataKey="spi" domain={[0.4, 1.6]} ticks={[0.5, 0.75, 1, 1.25, 1.5]} tick={{ fontSize: 11, fill: CHART.axis }} tickFormatter={(v: number) => v.toLocaleString("id-ID")} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                <YAxis type="number" dataKey="cpi" domain={[0.4, 1.6]} ticks={[0.5, 0.75, 1, 1.25, 1.5]} tick={{ fontSize: 11, fill: CHART.axis }} tickFormatter={(v: number) => v.toLocaleString("id-ID")} axisLine={false} tickLine={false} />
                <ZAxis type="number" dataKey="value" range={[220, 520]} />
                <ReferenceLine x={1} stroke={CHART.plan} />
                <ReferenceLine y={1} stroke={CHART.plan} />
                <Tooltip
                  cursor={false}
                  content={({ payload }) => {
                    const d = payload?.[0]?.payload as (typeof mapped)[number] | undefined;
                    if (!d) return null;
                    return (
                      <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-panel">
                        <p className="font-semibold text-ink">
                          {d.no}. {d.row.projectName}
                        </p>
                        <p className="text-slate-500">
                          Kinerja waktu {fmt2(d.rawSpi)}, kinerja biaya {fmt2(d.rawCpi)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter data={mapped} onClick={(d: { id?: string; payload?: { id: string } }) => router.push(`/projects/${d.payload?.id ?? d.id}`)} className="cursor-pointer" isAnimationActive={false}>
                  <LabelList dataKey="no" position="center" fill="#FFFFFF" stroke="none" fontSize={10} fontWeight={700} />
                  {mapped.map((p) => (
                    <Cell key={p.id} fill={HEALTH_DOT[p.health]} stroke="#fff" strokeWidth={1.5} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-slate-500">
          <HealthLegend />
          <span>Mendatar: kinerja waktu. Tegak: kinerja biaya.</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Posisi tiap project
// ---------------------------------------------------------------------------

export function PositionTableCard({ rows }: { rows: PortfolioRow[] }) {
  const { mapped, unmapped } = useMappedProjects(rows);
  const tone = (v: number) => (v < 0.9 ? "font-semibold text-signal-expired" : v < 1 ? "font-semibold text-signal-soon" : "text-ink dark:text-slate-100");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Posisi tiap project
          <InfoTip label="Keterangan posisi tiap project">
            Diurutkan dari project yang paling perlu perhatian. Kinerja waktu 0,80 berarti progres baru 80% dari rencana; kinerja biaya 0,90 berarti setiap Rp1 biaya yang
            keluar baru menghasilkan pekerjaan senilai Rp0,90 menurut RAB.
          </InfoTip>
        </CardTitle>
        <CardDescription>Nomor sesuai titik pada matriks waktu dan biaya</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="th-row">
                <th className="w-12 py-2 pl-5 font-medium">No</th>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 text-right font-medium">Progres</th>
                <th className="px-3 py-2 text-right font-medium">Kinerja waktu</th>
                <th className="px-3 py-2 text-right font-medium">Kinerja biaya</th>
                <th className="px-3 py-2 text-right font-medium">Proyeksi margin</th>
                <th className="px-5 py-2 font-medium">Posisi</th>
              </tr>
            </thead>
            <tbody>
              {mapped.map((p) => {
                const r = p.row;
                const qd = quadrant(p.rawSpi, p.rawCpi);
                return (
                  <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-paper/60 dark:border-slate-800">
                    <td className="py-2.5 pl-5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: HEALTH_DOT[p.health] }}>
                        {p.no}
                      </span>
                    </td>
                    <td className="max-w-[18rem] px-3 py-2.5">
                      <Link href={`/projects/${p.id}`} className="block truncate font-semibold text-ink hover:text-accent dark:text-slate-100" title={r.projectName}>
                        {r.projectName}
                      </Link>
                      <span className="text-[12px] text-slate-500">
                        {r.projectNumber}, PIC {r.pic}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      <span className="font-semibold text-accent">{formatPercent(r.summary.actualPercent)}</span>
                      <span className="text-slate-500"> / {formatPercent(r.summary.plannedPercent)}</span>
                    </td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums", tone(p.rawSpi))}>{fmt2(p.rawSpi)}</td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums", tone(p.rawCpi))}>{fmt2(p.rawCpi)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      <span className={cn("font-semibold", r.margin.belowTarget ? "text-signal-expired" : "text-ink dark:text-slate-100")}>{formatPercent(r.margin.forecastMarginPct)}</span>
                      <span className="text-slate-500"> / {formatPercent(r.margin.targetMarginPct)}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5">
                      <span className={cn("text-[12.5px] font-semibold", qd.tone === "bad" ? "text-signal-expired" : qd.tone === "warn" ? "text-signal-soon" : "text-signal-active")}>{qd.label}</span>
                    </td>
                  </tr>
                );
              })}
              {unmapped.map((r) => (
                <tr key={r.id} className="border-b border-line/70 last:border-0 dark:border-slate-800">
                  <td className="py-2.5 pl-5 text-slate-400">-</td>
                  <td className="max-w-[18rem] px-3 py-2.5">
                    <Link href={`/projects/${r.id}`} className="block truncate font-semibold text-ink hover:text-accent dark:text-slate-100" title={r.projectName}>
                      {r.projectName}
                    </Link>
                    <span className="text-[12px] text-slate-500">
                      {r.projectNumber}, PIC {r.pic}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    <span className="font-semibold text-accent">{formatPercent(r.summary.actualPercent)}</span>
                    <span className="text-slate-500"> / {formatPercent(r.summary.plannedPercent)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt2(r.summary.spi)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">-</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">-</td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-[12.5px] text-slate-500">{r.margin.hasBudget ? "Belum ada realisasi biaya" : "Belum ada RAB"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Perlu tindakan
// ---------------------------------------------------------------------------

type Attention = { id: string; name: string; text: string; tone: "bad" | "warn"; at?: string };

export function buildAttention(rows: PortfolioRow[]): Attention[] {
  return rows
    .filter((r) => r.status === "ONGOING" || r.closeoutComplete === false)
    .flatMap((r) => {
      const out: Attention[] = [];
      const s = r.summary;
      if (r.closeoutComplete === false) return [{ id: r.id, name: r.projectName, tone: "warn" as const, text: "Project selesai, tetapi dokumen BAPP, BAST, atau laporan akhir belum lengkap.", at: "dokumen/penutupan" }];
      if (s.isOverdue) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `Melewati target selesai ${Math.abs(s.daysRemaining)} hari dengan progres ${formatPercent(s.actualPercent)}.`, at: "jadwal/progres" });
      else if (s.health === "KRITIS") out.push({ id: r.id, name: r.projectName, tone: "bad", text: s.healthReason.endsWith(".") ? s.healthReason : `${s.healthReason}.`, at: "jadwal/progres" });
      if (r.margin.signals.margin === "bad")
        out.push({ id: r.id, name: r.projectName, tone: "bad", text: `Proyeksi margin ${formatPercent(r.margin.forecastMarginPct)}, di bawah target ${formatPercent(r.margin.targetMarginPct)}.`, at: "keuangan/margin" });
      if (s.overdueInvoiceCount) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `${s.overdueInvoiceCount} invoice melewati jatuh tempo senilai ${formatRupiah(s.overdueInvoiceAmount, true)}.`, at: "keuangan/termin" });
      if (s.openHighIssues) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `${s.openHighIssues} kendala berdampak tinggi belum terselesaikan.`, at: "tim/kendala" });
      if (r.hse.lostTimeInjury + r.hse.fatality > 0) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `Tercatat ${r.hse.lostTimeInjury + r.hse.fatality} kecelakaan kerja dengan hilang hari kerja.`, at: "tim/hse" });
      if (r.trend !== null && r.trend <= -5) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `Deviasi memburuk ${Math.abs(r.trend)} poin dibanding minggu lalu.`, at: "jadwal/progres" });
      if (s.isStale) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `Data progres belum diperbarui selama ${s.daysSinceUpdate} hari.`, at: "jadwal/progres" });
      if (s.dueUnbilledCount) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `${s.dueUnbilledCount} termin sudah memasuki jadwal penagihan.`, at: "keuangan/termin" });
      return out;
    })
    .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}

export function AttentionCard({ rows, limit = 6 }: { rows: PortfolioRow[]; limit?: number }) {
  const [all, setAll] = useState(false);
  const items = useMemo(() => buildAttention(rows), [rows]);
  // one entry per project, most urgent first, with every point listed under it
  const groups = useMemo(() => {
    const m = new Map<string, { id: string; name: string; items: Attention[] }>();
    for (const a of items) {
      const g = m.get(a.id) ?? { id: a.id, name: a.name, items: [] };
      g.items.push(a);
      m.set(a.id, g);
    }
    return [...m.values()].sort((a, b) => b.items.filter((x) => x.tone === "bad").length - a.items.filter((x) => x.tone === "bad").length || b.items.length - a.items.length);
  }, [items]);
  const shown = all ? groups : groups.slice(0, limit);
  const bad = items.filter((i) => i.tone === "bad").length;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Perlu tindakan</CardTitle>
        <CardDescription>{items.length ? `${groups.length} project, ${bad} hal mendesak` : "Tidak ada hal yang perlu ditindaklanjuti"}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-1">
        <ul className="divide-y divide-line dark:divide-slate-800">
          {shown.map((g) => (
            <li key={g.id} className="py-2.5">
              <Link href={`/projects/${g.id}${g.items[0].at ? `#${g.items[0].at}` : ""}`} className="text-[13px] font-semibold text-ink hover:text-accent dark:text-slate-100">
                {g.name}
              </Link>
              <ul className="mt-1 space-y-0.5">
                {g.items.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-slate-600 dark:text-slate-300">
                    <span className={cn("mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", a.tone === "bad" ? "bg-signal-expiredBar" : "bg-signal-soonBar")} />
                    <Link href={`/projects/${a.id}${a.at ? `#${a.at}` : ""}`} className="hover:text-accent">
                      {a.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {groups.length > limit && (
          <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-[13px] font-semibold text-accent hover:underline">
            {all ? "Tampilkan lebih sedikit" : `Tampilkan semua (${groups.length} project)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Proyeksi PAD per bulan
// ---------------------------------------------------------------------------

export function PadCard({ rows }: { rows: PortfolioRow[] }) {
  const buckets = useMemo(() => mergePadSchedules(rows.map((r) => r.padSchedule)).map((b) => ({ ...b, juta: Math.round(b.amount / 1e5) / 10 })), [rows]);
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  const overdue = buckets.filter((b) => b.kind === "OVERDUE").reduce((s, b) => s + b.amount, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Pendapatan yang akan diterima (PAD)
          <InfoTip label="Keterangan PAD">
            Nilai kontrak yang belum diterima, dikelompokkan menurut jatuh tempo invoice atau rencana tanggal tagih termin. Merah berarti tertunggak (sudah lewat tanggalnya),
            abu-abu berarti belum memiliki jadwal tagih.
          </InfoTip>
        </CardTitle>
        <CardDescription>{total ? `Total ${formatRupiah(total, true)}${overdue ? `, tertunggak ${formatRupiah(overdue, true)}` : ""}` : "Belum ada PAD"}</CardDescription>
      </CardHeader>
      <CardContent>
        {buckets.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Belum ada PAD.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("id-ID")} />
                <Tooltip cursor={{ fill: "#F2F4F7" }} contentStyle={tooltipStyle} formatter={(v) => [`Rp${Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta`, "PAD"]} />
                <Bar dataKey="juta" name="PAD" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                  {buckets.map((b) => (
                    <Cell key={b.key} fill={b.kind === "OVERDUE" ? CHART.bad : b.kind === "UNSCHEDULED" ? CHART.neutral : CHART.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-1 text-[11.5px] text-slate-500">Dalam Rp juta</p>
      </CardContent>
    </Card>
  );
}
