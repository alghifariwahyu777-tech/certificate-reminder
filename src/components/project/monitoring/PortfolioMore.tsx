"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { HEALTH_LABEL, formatRupiah, shortDate } from "@/lib/project-monitoring-shared";
import { INDONESIA_PATHS, MAP_BOUNDS } from "@/lib/indonesia-map";
import type { PortfolioRow } from "@/lib/project-monitoring";
import type { CalendarEvent, CashflowMonth, ParetoItem } from "@/lib/portfolio-insights";
import { cn } from "@/lib/utils";

const HEALTH_DOT: Record<string, string> = { KRITIS: "#C2362F", WASPADA: "#D69E2E", ON_TRACK: "#2F855A", SELESAI: "#1671B8", BATAL: "#94A3B8" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tooltipStyle = { borderRadius: 8, border: "1px solid #E6EBF1", fontSize: 12, fontFamily: "var(--font-body)" };
const juta = (v: number) => `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

// ---------------------------------------------------------------------------
// Peta lokasi project
// ---------------------------------------------------------------------------

export function ProjectMapCard({ rows }: { rows: PortfolioRow[] }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const ongoing = rows.filter((r) => r.status === "ONGOING");
  const placed = ongoing.filter((r) => r.location);
  const missing = ongoing.length - placed.length;
  const { lon0, lat0, width, height } = MAP_BOUNDS;
  const k = width / (MAP_BOUNDS.lon1 - lon0);
  // projects sharing a province capital are fanned out slightly so every dot stays clickable
  const points = useMemo(() => {
    const seen = new Map<string, number>();
    return placed.map((r) => {
      const loc = r.location!;
      const key = `${loc.lat.toFixed(1)}|${loc.lon.toFixed(1)}`;
      const nth = seen.get(key) ?? 0;
      seen.set(key, nth + 1);
      const angle = nth * 2.4;
      const radius = nth ? 9 + nth * 2 : 0;
      return { r, x: (loc.lon - lon0) * k + Math.cos(angle) * radius, y: (lat0 - loc.lat) * k + Math.sin(angle) * radius };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
  const byProvince = useMemo(() => {
    const m = new Map<string, PortfolioRow[]>();
    for (const r of placed) m.set(r.location!.province ?? "Koordinat", [...(m.get(r.location!.province ?? "Koordinat") ?? []), r]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
  const active = points.find((p) => p.r.id === hover);
  const maxValue = Math.max(1, ...placed.map((r) => r.summary.contractValue));

  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Peta lokasi project
          <InfoTip label="Keterangan peta lokasi">
            Setiap titik adalah satu project berjalan. Warna menunjukkan kondisi, ukuran menunjukkan nilai kontrak. Lokasi diisi melalui Ubah project. Klik titik untuk membuka project.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">
          {placed.length} project di {byProvince.length} lokasi{missing ? `, ${missing} project belum diisi lokasinya` : ""}
        </p>
      </div>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_15rem]">
          <div className="relative overflow-hidden rounded-lg bg-[#EAF2F9] dark:bg-slate-800/60">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Peta Indonesia dengan lokasi project">
              {INDONESIA_PATHS.map((d, i) => (
                <path key={i} d={d} fill="#FFFFFF" stroke="#C5D3E2" strokeWidth={0.8} className="dark:fill-slate-700 dark:stroke-slate-600" />
              ))}
              {points
                .slice()
                .sort((a, b) => (a.r.id === hover ? 1 : b.r.id === hover ? -1 : 0))
                .map(({ r, x, y }) => {
                  const rad = 5 + 7 * Math.sqrt(r.summary.contractValue / maxValue);
                  return (
                    <g key={r.id} className="cursor-pointer" onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/projects/${r.id}`)}>
                      {r.summary.health === "KRITIS" && <circle cx={x} cy={y} r={rad + 5} fill={HEALTH_DOT.KRITIS} opacity={0.18} />}
                      <circle cx={x} cy={y} r={rad} fill={HEALTH_DOT[r.summary.health]} stroke="#fff" strokeWidth={2} opacity={hover && hover !== r.id ? 0.55 : 0.95} />
                    </g>
                  );
                })}
            </svg>
            {active && (
              <div
                className="pointer-events-none absolute z-10 max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-panel dark:border-slate-700 dark:bg-slate-900"
                style={{ left: `${(active.x / width) * 100}%`, top: `calc(${(active.y / height) * 100}% - 12px)` }}
              >
                <p className="font-semibold text-ink dark:text-slate-100">{active.r.projectName}</p>
                <p className="text-slate-500">
                  {active.r.location?.province ?? "Koordinat project"}, {HEALTH_LABEL[active.r.summary.health]}, {formatRupiah(active.r.summary.contractValue, true)}
                </p>
              </div>
            )}
            <div className="absolute bottom-2 left-3 flex gap-3 rounded bg-white/80 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              {(["KRITIS", "WASPADA", "ON_TRACK"] as const).map((h) => (
                <span key={h} className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_DOT[h] }} />
                  {HEALTH_LABEL[h]}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink dark:text-slate-100">Sebaran per lokasi</p>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-[12.5px]">
              {byProvince.map(([prov, list]) => (
                <li key={prov} className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-700 dark:text-slate-300">{prov}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {list.map((r) => (
                      <Link key={r.id} href={`/projects/${r.id}`} title={r.projectName} onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}>
                        <span className="block h-2.5 w-2.5 rounded-full" style={{ background: HEALTH_DOT[r.summary.health] }} />
                      </Link>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pareto penyebab masalah
// ---------------------------------------------------------------------------

export function ParetoCard({ cost, issues }: { cost: ParetoItem[]; issues: ParetoItem[] }) {
  const [mode, setMode] = useState<"cost" | "issues">(cost.length ? "cost" : "issues");
  const items = (mode === "cost" ? cost : issues).slice(0, 8);
  const total = (mode === "cost" ? cost : issues).reduce((s, x) => s + x.value, 0);
  let run = 0;
  const data = items.map((x) => {
    run += x.value;
    return { ...x, cum: total ? Math.round((run / total) * 1000) / 10 : 0 };
  });
  const vital = data.findIndex((d) => d.cum >= 80);
  const vitalCount = vital === -1 ? data.length : vital + 1;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Pareto penyebab masalah
            <InfoTip label="Keterangan pareto">
              Penyebab diurutkan dari yang terbesar (batang), dengan persentase kumulatif (garis). Umumnya sebagian kecil penyebab menimbulkan sebagian besar masalah
              (prinsip 80/20); perbaikan sebaiknya dimulai dari penyebab di kiri. <strong>Biaya</strong>: rupiah biaya akibat keterlambatan, pekerjaan tambahan yang belum
              tertutup addendum, dan biaya rutin per bagian yang melebihi porsi RAB untuk pekerjaan yang sudah selesai. <strong>Kendala</strong>: risiko dan kendala 12 bulan
              terakhir per kategori, dibobot tingkatnya (rendah 1 sampai ekstrem 4).
            </InfoTip>
          </CardTitle>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {data.length
              ? `${vitalCount} penyebab teratas = ${data[vitalCount - 1]?.cum.toLocaleString("id-ID")}% dari ${mode === "cost" ? `pembengkakan ${formatRupiah(total, true)}` : "bobot kendala"}`
              : "Belum ada data"}
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-paper p-0.5 text-[12.5px] font-semibold dark:bg-slate-800">
          {(
            [
              ["cost", "Biaya"],
              ["issues", "Kendala"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={cn("rounded-md px-3 py-1.5", mode === k ? "bg-white text-ink shadow-card dark:bg-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-ink")}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Tidak ada pembengkakan atau kendala yang tercatat.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#E6EBF1" vertical={false} />
                <XAxis dataKey="label" interval={0} height={40} tick={<WrapTick />} axisLine={{ stroke: "#E6EBF1" }} tickLine={false} />
                <YAxis yAxisId="v" tickFormatter={(v: number) => (mode === "cost" ? juta(v) : String(v))} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="c" orientation="right" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name, item) =>
                    name === "Kumulatif"
                      ? [`${Number(v).toLocaleString("id-ID")}%`, name]
                      : [mode === "cost" ? `${formatRupiah(Number(v), true)} (${(item?.payload as ParetoItem).projects} project)` : `${v} (${(item?.payload as ParetoItem).projects} project)`, mode === "cost" ? "Biaya" : "Bobot"]
                  }
                />
                <ReferenceLine yAxisId="c" y={80} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: "80%", position: "insideTopRight", fontSize: 10, fill: "#64748B" }} />
                <Bar yAxisId="v" dataKey="value" name="Nilai" maxBarSize={40} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell key={d.label} fill={i < vitalCount ? (mode === "cost" ? "#C2362F" : "#D69E2E") : "#CBD5E1"} />
                  ))}
                </Bar>
                <Line yAxisId="c" dataKey="cum" name="Kumulatif" stroke="#123F6B" strokeWidth={2} dot={{ r: 3, fill: "#123F6B" }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Axis label broken over two lines so long cause names stay readable without rotating. */
export function WrapTick(props: { x?: number; y?: number; payload?: { value: string } }) {
  const words = (props.payload?.value ?? "").split(" ");
  const lines: string[] = [""];
  for (const w of words) {
    if ((lines[lines.length - 1] + " " + w).trim().length > 16 && lines[lines.length - 1] && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w).trim();
  }
  return (
    <text x={props.x} y={(props.y ?? 0) + 12} textAnchor="middle" fontSize={10.5} fill="#64748B">
      {lines.map((l, i) => (
        <tspan key={i} x={props.x} dy={i ? 12 : 0}>
          {l.length > 22 ? `${l.slice(0, 21)}…` : l}
        </tspan>
      ))}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Arus kas proyeksi
// ---------------------------------------------------------------------------

export function CashflowCard({ months }: { months: CashflowMonth[] }) {
  const data = months.map((m) => {
    const d = new Date(m.t);
    return { ...m, label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, out: -m.outflow };
  });
  const future = months.filter((m) => m.projected);
  const negative = future.filter((m) => m.net < 0);
  const nowIdx = months.findIndex((m) => m.projected);
  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Arus kas project
          <InfoTip label="Keterangan arus kas">
            Enam bulan terakhir: pembayaran termin yang diterima dan biaya yang keluar. Bulan ini dan enam bulan ke depan (batang bergaris tipis): invoice diharapkan dibayar
            pada jatuh tempo (yang sudah lewat dihitung bulan ini), termin yang belum ditagih pada rencana tanggal tagih, dan sisa biaya (proyeksi biaya akhir dikurangi
            biaya keluar) disebar mengikuti rencana progres. Garis = saldo kumulatif.
          </InfoTip>
        </CardTitle>
        <p className={cn("mt-0.5 text-[12.5px]", negative.length ? "font-semibold text-signal-expired" : "text-slate-500")}>
          {negative.length
            ? `Proyeksi kas bersih negatif pada ${negative.map((m) => `${MONTHS[new Date(m.t).getUTCMonth()]} ${String(new Date(m.t).getUTCFullYear()).slice(2)}`).join(", ")}`
            : `Proyeksi masuk ${formatRupiah(future.reduce((s, m) => s + m.inflow, 0), true)}, keluar ${formatRupiah(future.reduce((s, m) => s + m.outflow, 0), true)} dalam 7 bulan`}
        </p>
      </div>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} stackOffset="sign" margin={{ top: 18, right: 4, left: -4, bottom: 0 }}>
              <defs>
                <pattern id="cf-in" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#2F855A" opacity="0.55" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#2F855A" strokeWidth="3" />
                </pattern>
                <pattern id="cf-out" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#C2362F" opacity="0.5" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#C2362F" strokeWidth="3" />
                </pattern>
              </defs>
              <CartesianGrid stroke="#E6EBF1" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#64748B" }} axisLine={{ stroke: "#E6EBF1" }} tickLine={false} interval={0} />
              <YAxis tickFormatter={juta} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [formatRupiah(Math.abs(Number(v)), true), name]}
                labelFormatter={(l, p) => `${l}${p?.[0]?.payload?.projected ? " (proyeksi)" : ""}`}
              />
              <ReferenceLine y={0} stroke="#94A3B8" />
              {nowIdx > 0 && <ReferenceLine x={data[nowIdx].label} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Bulan ini", position: "top", fontSize: 10, fill: "#64748B" }} />}
              <Bar dataKey="inflow" name="Kas masuk" stackId="cf" maxBarSize={30} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.projected ? "url(#cf-in)" : "#2F855A"} />
                ))}
              </Bar>
              <Bar dataKey="out" name="Kas keluar" stackId="cf" maxBarSize={30} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.projected ? "url(#cf-out)" : "#C2362F"} />
                ))}
              </Bar>
              <Line dataKey="cumulative" name="Saldo kumulatif" stroke="#123F6B" strokeWidth={2} dot={{ r: 2.5, fill: "#123F6B" }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#2F855A]" />Kas masuk</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#C2362F]" />Kas keluar</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-slate-400 bg-[repeating-linear-gradient(45deg,#CBD5E1_0_2px,transparent_2px_4px)]" />Proyeksi</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-[#123F6B]" />Saldo kumulatif (Rp juta)</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Kalender kegiatan
// ---------------------------------------------------------------------------

const KIND: Record<CalendarEvent["kind"], { label: string; color: string }> = {
  INVOICE: { label: "Jatuh tempo invoice", color: "#C2362F" },
  TERM: { label: "Rencana tagih", color: "#2F855A" },
  MILESTONE: { label: "Milestone", color: "#1671B8" },
  END: { label: "Target selesai", color: "#123F6B" },
  ISSUE: { label: "Tindak lanjut kendala", color: "#D69E2E" },
  CERT: { label: "Sertifikat berakhir", color: "#64748B" },
  HSE: { label: "Laporan HSE", color: "#0E7490" },
};
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function CalendarCard({ events, today }: { events: CalendarEvent[]; today: number }) {
  const t0 = new Date(today);
  const [cursor, setCursor] = useState({ y: t0.getUTCFullYear(), m: t0.getUTCMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [kinds, setKinds] = useState<Set<string>>(new Set(Object.keys(KIND)));
  const todayKey = new Date(today).toISOString().slice(0, 10);
  const visible = events.filter((e) => kinds.has(e.kind));
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of visible) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [visible]);
  const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= daysInMonth ? new Date(Date.UTC(cursor.y, cursor.m, day)).toISOString().slice(0, 10) : null;
  });
  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`;
  const agenda = selected ? byDay.get(selected) ?? [] : visible.filter((e) => e.date.startsWith(monthPrefix));
  const lateCount = visible.filter((e) => e.late).length;
  const shift = (d: number) => setCursor((c) => ({ y: c.y + Math.floor((c.m + d) / 12), m: (((c.m + d) % 12) + 12) % 12 }));

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Kalender kegiatan
            <InfoTip label="Keterangan kalender">
              Tanggal penting project berjalan: penagihan termin, jatuh tempo invoice, milestone, tindak lanjut kendala, target selesai, sertifikasi personil yang berakhir, dan batas laporan HSE. Klik tanggal untuk melihat rincian.
            </InfoTip>
          </CardTitle>
          <p className={cn("mt-0.5 text-[12.5px]", lateCount ? "text-signal-expired" : "text-slate-500")}>{lateCount ? `${lateCount} kegiatan sudah lewat tanggalnya dan belum selesai` : "Tidak ada kegiatan yang terlewat"}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Bulan sebelumnya" onClick={() => { shift(-1); setSelected(null); }} className="rounded-md border border-line p-1 hover:bg-paper dark:border-slate-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-28 text-center text-[13px] font-semibold text-ink dark:text-slate-100">
            {MONTHS[cursor.m]} {cursor.y}
          </span>
          <button type="button" aria-label="Bulan berikutnya" onClick={() => { shift(1); setSelected(null); }} className="rounded-md border border-line p-1 hover:bg-paper dark:border-slate-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.entries(KIND).map(([k, v]) => {
            const on = kinds.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKinds((s) => { const x = new Set(s); if (x.has(k)) x.delete(k); else x.add(k); return x; })}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold", on ? "border-line text-slate-700 dark:border-slate-700 dark:text-slate-200" : "border-dashed border-line text-slate-400 dark:border-slate-700")}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: on ? v.color : "#CBD5E1" }} />
                {v.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">
              {DAYS.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const evs = byDay.get(d) ?? [];
                const isToday = d === todayKey;
                const late = evs.some((e) => e.late);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelected(selected === d ? null : d)}
                    className={cn(
                      "flex h-14 flex-col items-start rounded-md border p-1 text-left transition-colors",
                      selected === d ? "border-ink dark:border-slate-100" : "border-line hover:border-slate-400 dark:border-slate-800",
                      isToday && "bg-sky-50 dark:bg-sky-950/30",
                      late && "bg-signal-expiredBg/60"
                    )}
                  >
                    <span className={cn("text-[11.5px] font-semibold", isToday ? "rounded bg-accent px-1 text-white" : "text-slate-600 dark:text-slate-300")}>{Number(d.slice(8))}</span>
                    <span className="mt-auto flex flex-wrap gap-0.5">
                      {evs.slice(0, 6).map((e, j) => (
                        <span key={j} className="h-1.5 w-1.5 rounded-full" style={{ background: KIND[e.kind].color }} />
                      ))}
                      {evs.length > 6 && <span className="text-[9px] leading-none text-slate-500">+{evs.length - 6}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink dark:text-slate-100">{selected ? shortDate(Date.parse(selected)) : `Agenda ${MONTHS[cursor.m]} ${cursor.y}`}</p>
            {agenda.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Tidak ada kegiatan.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-line overflow-y-auto pr-1 dark:divide-slate-800">
                {agenda.map((e, i) => (
                  <li key={i} className="flex gap-2.5 py-2">
                    <span className="w-11 shrink-0 text-[11.5px] font-semibold tabular-nums text-slate-500">{shortDate(Date.parse(e.date)).split(" ").slice(0, 2).join(" ")}</span>
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: KIND[e.kind].color }} />
                    <div className="min-w-0">
                      {e.href ? (
                        <Link href={e.href} className="text-[12.5px] font-semibold leading-snug text-ink hover:text-accent dark:text-slate-100">
                          {e.title}
                        </Link>
                      ) : (
                        <p className="text-[12.5px] font-semibold text-ink dark:text-slate-100">{e.title}</p>
                      )}
                      {e.projectName && <p className="truncate text-[11.5px] text-slate-500">{e.projectName}</p>}
                      {e.late && <p className="text-[11px] font-semibold text-signal-expired">Terlewat</p>}
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
// Tren kinerja waktu & biaya portofolio
// ---------------------------------------------------------------------------

export function PerformanceTrendCard({ weeks }: { weeks: import("@/lib/portfolio-insights").PerformanceWeek[] }) {
  const data = weeks.map((w) => ({ ...w, label: shortDate(w.date) }));
  const first = weeks.find((w) => w.spi !== null);
  const last = [...weeks].reverse().find((w) => w.spi !== null);
  const dir = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? 0 : Math.round((b - a) * 100) / 100);
  const dSpi = dir(first?.spi, last?.spi);
  const dCpi = dir(first?.cpi, last?.cpi);
  const word = (d: number) => (d > 0.005 ? "membaik" : d < -0.005 ? "memburuk" : "tetap");
  return (
    <Card>
      <div className="px-5 pt-4">
        <CardTitle className="flex items-center gap-1.5">
          Tren kinerja waktu dan biaya
          <InfoTip label="Keterangan tren kinerja" align="right">
            Rata-rata kinerja waktu (SPI) dan kinerja biaya (CPI) seluruh project berjalan setiap minggu, dibobot nilai kontrak. Di atas 1 lebih baik dari rencana, di bawah 1
            terlambat atau boros.
          </InfoTip>
        </CardTitle>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{weeks.length < 2 ? "Riwayat terbentuk setiap minggu" : `Waktu ${word(dSpi)}, biaya ${word(dCpi)} sejak ${shortDate(weeks[0].date)}`}</p>
      </div>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#E6EBF1" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={{ stroke: "#E6EBF1" }} tickLine={false} minTickGap={10} />
              <YAxis domain={["dataMin - 0.05", "dataMax + 0.05"]} tickFormatter={(v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 2 })} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [Number(v).toLocaleString("id-ID", { minimumFractionDigits: 2 }), n]} />
              <ReferenceLine y={1} stroke="#94A3B8" strokeDasharray="4 4" />
              <Line dataKey="spi" name="Kinerja waktu" stroke="#1671B8" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
              <Line dataKey="cpi" name="Kinerja biaya" stroke="#123F6B" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex gap-3 text-[11.5px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-[#1671B8]" />Waktu</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-[#123F6B]" />Biaya</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-slate-400" />1 = sesuai</span>
        </div>
      </CardContent>
    </Card>
  );
}
