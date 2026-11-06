"use client";

/**
 * "Coba sendiri" widgets for the Panduan: the reader moves a slider or clicks
 * a cell and sees the number the system would show. Every formula here is the
 * same one the app uses (see project-monitoring and project-margin), so what
 * the reader learns matches what the screens say.
 */

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleChip } from "./GuideDiagrams";

// ---------------------------------------------------------------------------
// shared bits
// ---------------------------------------------------------------------------

const nf = (v: number, d = 0) => v.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
const rp = (jt: number) => `${jt < 0 ? "−" : ""}${Math.abs(jt) >= 1000 ? `Rp${nf(Math.abs(jt) / 1000, 2)} M` : `Rp${nf(Math.abs(jt))} jt`}`;

type Tone = "good" | "warn" | "bad" | "neutral";
const TONE_TEXT: Record<Tone, string> = {
  good: "text-signal-active",
  warn: "text-signal-soon",
  bad: "text-signal-expired",
  neutral: "text-ink dark:text-slate-100",
};
const TONE_CHIP: Record<Tone, string> = {
  good: "bg-[#EAF5EE] text-[#2F855A] border-[#C6E6D2]",
  warn: "bg-[#FBF3E4] text-[#9A6412] border-[#F0DDB5]",
  bad: "bg-[#FBEDEC] text-[#C2362F] border-[#F2C9C5]",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};
const TONE_BAR: Record<Tone, string> = { good: "bg-[#2F855A]", warn: "bg-[#D69E2E]", bad: "bg-[#C2362F]", neutral: "bg-slate-400" };

function Play({ hint = "Geser angkanya, hasilnya langsung berubah.", children }: { hint?: string; children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-xl border border-[#C9DDF0] bg-[#F5F9FD] p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] font-semibold text-brand-blueDark dark:text-slate-200">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Coba sendiri
        </span>
        <span className="font-normal text-slate-500">{hint}</span>
      </p>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  show,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  show: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-[12.5px] text-slate-600 dark:text-slate-300">
        {label}
        <span className="font-semibold tabular-nums text-ink dark:text-slate-100">{show(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-2 w-full cursor-pointer accent-[#123F6B] dark:accent-slate-200"
      />
    </label>
  );
}

function Result({ label, value, tone = "neutral", note }: { label: string; value: string; tone?: Tone; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[11.5px] text-slate-500">{label}</p>
      <p className={cn("text-[22px] font-bold leading-tight tabular-nums", TONE_TEXT[tone])}>{value}</p>
      {note && <p className="mt-0.5 text-[11.5px] text-slate-500">{note}</p>}
    </div>
  );
}

function Verdict({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <p className={cn("mt-3 rounded-lg border px-3 py-2 text-[13px] font-medium", TONE_CHIP[tone])}>{children}</p>;
}

function Bar({ label, value, max, tone = "neutral", text }: { label: string; value: number; max: number; tone?: Tone | "plan" | "navy"; text: string }) {
  const cls = tone === "plan" ? "bg-slate-300 dark:bg-slate-600" : tone === "navy" ? "bg-brand-blueDark dark:bg-slate-300" : TONE_BAR[tone];
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-[12px]">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="flex items-center gap-2">
        <span className="h-3 flex-1 overflow-hidden rounded-full bg-white dark:bg-slate-900">
          <span className={cn("block h-full rounded-full transition-[width] duration-200", cls)} style={{ width: `${Math.max(0, Math.min(100, (value / Math.max(max, 1e-9)) * 100))}%` }} />
        </span>
        <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-ink dark:text-slate-100">{text}</span>
      </span>
    </div>
  );
}

const ratioTone = (v: number): Tone => (v >= 0.95 ? "good" : v >= 0.85 ? "warn" : "bad");

// ---------------------------------------------------------------------------
// Alur project: pick a role to see its steps
// ---------------------------------------------------------------------------

const PHASES: { title: string; when: string; steps: [string[], string][] }[] = [
  {
    title: "1. Persiapan",
    when: "Minggu pertama",
    steps: [
      [["PM"], "Buat project, unggah RAB"],
      [["PM"], "Isi milestone dan jadwal"],
      [["HC"], "Tugaskan personil"],
      [["Keuangan"], "Isi termin pembayaran"],
    ],
  },
  {
    title: "2. Pelaksanaan",
    when: "Selama project berjalan",
    steps: [
      [["PM"], "Perbarui realisasi kegiatan (boleh harian)"],
      [["PM", "Keuangan"], "Catat biaya dan penyebabnya"],
      [["PM", "QHSE"], "Catat kendala dan risiko"],
      [["QHSE"], "Laporan HSE tiap bulan"],
      [["Keuangan"], "Invoice dan pembayaran"],
    ],
  },
  {
    title: "3. Penutupan",
    when: "Saat pekerjaan selesai",
    steps: [
      [["PM"], "Ubah status ke Selesai"],
      [["PM"], "Lengkapi BAPP, BAST, laporan akhir"],
      [["Keuangan"], "Tagih dan terima termin terakhir"],
    ],
  },
];
const FLOW_ROLES = ["Semua", "PM", "Keuangan", "QHSE", "HC"];

export function FlowPlay() {
  const [role, setRole] = useState("Semua");
  return (
    <div className="my-3 rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Tampilkan langkah untuk">
        <span className="mr-1 text-[12px] text-slate-500">Tampilkan langkah untuk:</span>
        {FLOW_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            onClick={() => setRole(r)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition-colors",
              role === r ? "border-brand-blueDark bg-brand-blueDark text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900" : "border-line text-slate-600 hover:bg-paper dark:border-slate-700 dark:text-slate-300"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PHASES.map((p, i) => (
          <div key={p.title} className="relative rounded-lg border border-line bg-paper/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-[13px] font-bold text-ink dark:text-slate-100">{p.title}</p>
            <p className="mb-2 text-[11.5px] text-slate-500">{p.when}</p>
            <ul className="space-y-2.5">
              {p.steps.map(([roles, text]) => {
                const on = role === "Semua" || roles.includes(role);
                return (
                  <li key={text} className={cn("text-[12.5px] transition-opacity", on ? "opacity-100" : "opacity-25")}>
                    <span className="flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <RoleChip key={r} role={r} />
                      ))}
                    </span>
                    <span className={cn("mt-0.5 block", on && role !== "Semua" ? "font-semibold text-ink dark:text-slate-100" : "text-slate-700 dark:text-slate-200")}>{text}</span>
                  </li>
                );
              })}
            </ul>
            {i < PHASES.length - 1 && (
              <span aria-hidden className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-[13px] text-slate-500 md:flex dark:border-slate-700 dark:bg-slate-900">
                ›
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <RoleChip role="Manajemen" />
        <span>Memantau angka utama, project kritis, dan laporan mingguan, lalu mengambil keputusan.</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kurva S: move "hari ini"
// ---------------------------------------------------------------------------

const logistic = (x: number) => 1 / (1 + Math.exp(-10 * (x - 0.5)));
const L0 = logistic(0);
const L1 = logistic(1);
const planAt = (x: number) => ((logistic(x) - L0) / (L1 - L0)) * 100;
const actualAt = (x: number) => planAt(x * 0.8);

export function SCurvePlay({ warn, crit }: { warn: number; crit: number }) {
  const [day, setDay] = useState(60);
  const x = day / 100;
  const plan = planAt(x);
  const actual = actualAt(x);
  const dev = actual - plan;
  const tone: Tone = dev <= -crit ? "bad" : dev <= -warn ? "warn" : "good";
  const status = tone === "bad" ? "Kritis" : tone === "warn" ? "Waspada" : "Sesuai rencana";
  const X = (t: number) => 40 + t * 450;
  const Y = (v: number) => 190 - v * 1.6;
  const pts = (f: (t: number) => number, to: number) =>
    Array.from({ length: 61 }, (_, i) => (i / 60) * to)
      .map((t) => `${X(t).toFixed(1)},${Y(f(t)).toFixed(1)}`)
      .join(" ");
  const left = x > 0.62;
  return (
    <Play hint="Geser hari ini dan lihat deviasinya.">
      <svg viewBox="0 0 520 225" className="h-auto w-full max-w-[600px]" role="img" aria-label="Kurva S interaktif">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={40} x2={490} y1={Y(v)} y2={Y(v)} className="stroke-slate-200 dark:stroke-slate-700" />
            <text x={32} y={Y(v) + 4} textAnchor="end" fontSize={11} className="fill-slate-500">
              {v}%
            </text>
          </g>
        ))}
        <polyline points={pts(planAt, 1)} fill="none" stroke="#94A3B8" strokeWidth={2.5} strokeDasharray="6 5" />
        <polyline points={pts(actualAt, x)} fill="none" stroke="#1671B8" strokeWidth={3} />
        <line x1={X(x)} x2={X(x)} y1={18} y2={196} stroke="#1671B8" strokeDasharray="3 3" />
        <circle cx={X(x)} cy={Y(plan)} r={4} fill="#94A3B8" />
        <circle cx={X(x)} cy={Y(actual)} r={4.5} fill="#1671B8" />
        {Math.abs(dev) > 1 && <line x1={X(x) + (left ? -8 : 8)} x2={X(x) + (left ? -8 : 8)} y1={Y(plan)} y2={Y(actual)} stroke={tone === "good" ? "#2F855A" : tone === "warn" ? "#D69E2E" : "#C2362F"} strokeWidth={3} />}
        <text x={X(x) + (left ? -16 : 16)} y={(Y(plan) + Y(actual)) / 2 + 4} textAnchor={left ? "end" : "start"} fontSize={12.5} fontWeight={700} fill={tone === "good" ? "#2F855A" : tone === "warn" ? "#B7791F" : "#C2362F"}>
          Deviasi {dev < 0 ? "−" : "+"}
          {nf(Math.abs(dev), 1)} poin
        </text>
        <text x={X(x)} y={212} textAnchor="middle" fontSize={11} fill="#1671B8">
          Hari ini
        </text>
        <text x={40} y={212} fontSize={11} className="fill-slate-500">
          Mulai
        </text>
        <text x={490} y={212} textAnchor="end" fontSize={11} className="fill-slate-500">
          Target selesai
        </text>
      </svg>
      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Slider label="Hari ini (persen dari durasi project)" value={day} min={5} max={100} onChange={setDay} show={(v) => `${v}%`} />
        <span className={cn("justify-self-start rounded-full border px-3 py-1 text-[12.5px] font-bold", TONE_CHIP[tone])}>{status}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Result label="Rencana" value={`${nf(plan, 1)}%`} />
        <Result label="Realisasi" value={`${nf(actual, 1)}%`} />
        <Result label="Deviasi" value={`${dev < 0 ? "−" : "+"}${nf(Math.abs(dev), 1)}`} tone={tone} note="poin" />
      </div>
    </Play>
  );
}

// ---------------------------------------------------------------------------
// Kondisi: the three bands on one scale
// ---------------------------------------------------------------------------

export function ConditionScale({ warn, crit }: { warn: number; crit: number }) {
  const span = crit * 1.6;
  const pct = (v: number) => (v / span) * 100;
  return (
    <div className="my-3">
      <div className="flex h-9 overflow-hidden rounded-lg text-[12px] font-bold">
        <div className="flex items-center justify-center bg-[#FBEDEC] text-[#C2362F]" style={{ width: `${100 - pct(crit)}%` }}>
          Kritis
        </div>
        <div className="flex items-center justify-center bg-[#FBF3E4] text-[#9A6412]" style={{ width: `${pct(crit) - pct(warn)}%` }}>
          Waspada
        </div>
        <div className="flex items-center justify-center bg-[#EAF5EE] text-[#2F855A]" style={{ width: `${pct(warn)}%` }}>
          Sesuai
        </div>
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-slate-500">
        <span className="absolute -translate-x-1/2" style={{ left: `${100 - pct(crit)}%` }}>
          −{crit}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${100 - pct(warn)}%` }}>
          −{warn}
        </span>
        <span className="absolute right-0">0 poin</span>
      </div>
      <p className="mt-1 text-[12px] text-slate-500">Deviasi progres: makin ke kiri makin tertinggal dari rencana.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kinerja waktu
// ---------------------------------------------------------------------------

export function SpiPlay() {
  const [plan, setPlan] = useState(50);
  const [act, setAct] = useState(40);
  const spi = plan > 0 ? act / plan : 0;
  const tone = ratioTone(spi);
  return (
    <Play>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Progres rencana hari ini" value={plan} min={5} max={100} onChange={setPlan} show={(v) => `${v}%`} />
          <Slider label="Progres realisasi" value={act} min={0} max={100} onChange={setAct} show={(v) => `${v}%`} />
          <div className="space-y-1.5 pt-1">
            <Bar label="Rencana" value={plan} max={100} tone="plan" text={`${plan}%`} />
            <Bar label="Realisasi" value={act} max={100} tone={tone} text={`${act}%`} />
          </div>
        </div>
        <div className="space-y-2">
          <Result label="Kinerja waktu" value={nf(spi, 2)} tone={tone} note={`${act} ÷ ${plan}`} />
        </div>
      </div>
      <Verdict tone={tone}>
        {spi >= 1
          ? `Lebih cepat dari rencana. Pekerjaan sudah ${nf(spi * 100)}% dari yang seharusnya.`
          : `Terlambat. Pekerjaan baru ${nf(spi * 100)}% dari yang seharusnya.`}
      </Verdict>
    </Play>
  );
}

// ---------------------------------------------------------------------------
// Kinerja biaya
// ---------------------------------------------------------------------------

export function CpiPlay() {
  const [rab, setRab] = useState(1000);
  const [prog, setProg] = useState(40);
  const [cost, setCost] = useState(500);
  const ev = (rab * prog) / 100;
  const cpi = cost > 0 ? ev / cost : 0;
  const tone = ratioTone(cpi);
  const max = Math.max(ev, cost, 1);
  return (
    <Play>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Total RAB" value={rab} min={100} max={3000} step={50} onChange={setRab} show={rp} />
          <Slider label="Progres realisasi" value={prog} min={0} max={100} onChange={setProg} show={(v) => `${v}%`} />
          <Slider label="Biaya yang sudah keluar" value={cost} min={10} max={3000} step={10} onChange={setCost} show={rp} />
        </div>
        <div className="space-y-2">
          <Result label="Kinerja biaya" value={nf(cpi, 2)} tone={tone} note={`${nf(ev)} ÷ ${nf(cost)}`} />
          <div className="space-y-1.5 rounded-lg border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <Bar label="Nilai pekerjaan" value={ev} max={max} tone="good" text={rp(ev)} />
            <Bar label="Biaya keluar" value={cost} max={max} tone="navy" text={rp(cost)} />
          </div>
        </div>
      </div>
      <Verdict tone={tone}>
        Setiap Rp1 biaya menghasilkan pekerjaan senilai Rp{nf(cpi, 2)}. {cpi >= 1 ? "Biaya hemat atau sesuai RAB." : "Biaya lebih besar dari anggaran untuk pekerjaan ini."}
      </Verdict>
    </Play>
  );
}

// ---------------------------------------------------------------------------
// Proyeksi selesai
// ---------------------------------------------------------------------------

export function ForecastPlay() {
  const [dur, setDur] = useState(300);
  const [spi, setSpi] = useState(0.8);
  const proj = Math.round(dur / spi);
  const late = proj - dur;
  const tone: Tone = late <= 0 ? "good" : late <= dur * 0.1 ? "warn" : "bad";
  const scale = Math.max(dur, proj) * 1.05;
  return (
    <Play>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Durasi rencana" value={dur} min={30} max={730} step={10} onChange={setDur} show={(v) => `${v} hari`} />
        <Slider label="Kinerja waktu" value={spi} min={0.5} max={1.5} step={0.05} onChange={setSpi} show={(v) => nf(v, 2)} />
      </div>
      <div className="mt-4 space-y-2">
        <div className="relative h-7 rounded-md bg-white dark:bg-slate-900">
          <div className="absolute inset-y-0 left-0 flex items-center rounded-md bg-slate-300 pl-2 text-[11.5px] font-semibold text-slate-700 dark:bg-slate-600 dark:text-slate-100" style={{ width: `${(dur / scale) * 100}%` }}>
            Rencana {dur} hari
          </div>
        </div>
        <div className="relative h-7 rounded-md bg-white dark:bg-slate-900">
          <div className={cn("absolute inset-y-0 left-0 flex items-center rounded-md pl-2 text-[11.5px] font-semibold text-white transition-[width] duration-200", TONE_BAR[tone])} style={{ width: `${(proj / scale) * 100}%` }}>
            Proyeksi {proj} hari
          </div>
        </div>
      </div>
      <Verdict tone={tone}>
        {late > 0 ? `Bila laju ini berlanjut, project terlambat sekitar ${late} hari.` : `Bila laju ini berlanjut, project selesai ${Math.abs(late)} hari lebih cepat.`} Rumus: {dur} ÷ {nf(spi, 2)} = {proj} hari.
      </Verdict>
    </Play>
  );
}

// ---------------------------------------------------------------------------
// Margin
// ---------------------------------------------------------------------------

export function MarginPlay() {
  const [contract, setContract] = useState(1200);
  const [rab, setRab] = useState(1000);
  const [prog, setProg] = useState(40);
  const [cost, setCost] = useState(500);
  const m = useMemo(() => {
    const ev = (rab * prog) / 100;
    const rest = Math.max(0, rab - ev);
    const eac = cost + rest;
    const earned = (contract * prog) / 100;
    return {
      plan: contract - rab,
      planPct: contract ? ((contract - rab) / contract) * 100 : 0,
      real: earned - cost,
      realPct: earned ? ((earned - cost) / earned) * 100 : 0,
      proj: contract - eac,
      projPct: contract ? ((contract - eac) / contract) * 100 : 0,
      rest,
      eac,
      earned,
    };
  }, [contract, rab, prog, cost]);
  const t = (v: number): Tone => (v > 0 ? "good" : v === 0 ? "warn" : "bad");
  const scale = Math.max(contract, m.eac);
  const w = (v: number) => `${Math.max(0, (v / scale) * 100)}%`;
  const projTone: Tone = m.projPct < m.planPct - 1 ? (m.proj < 0 ? "bad" : "warn") : "good";
  return (
    <Play>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Nilai kontrak" value={contract} min={300} max={3000} step={50} onChange={setContract} show={rp} />
        <Slider label="Total RAB" value={rab} min={200} max={3000} step={50} onChange={setRab} show={rp} />
        <Slider label="Progres" value={prog} min={0} max={100} onChange={setProg} show={(v) => `${v}%`} />
        <Slider label="Biaya yang sudah keluar" value={cost} min={0} max={3000} step={10} onChange={setCost} show={rp} />
      </div>

      <div className="mt-4 space-y-3 rounded-lg border border-line bg-white p-3 text-[12px] dark:border-slate-700 dark:bg-slate-900">
        <div>
          <p className="mb-1.5 font-semibold text-ink dark:text-slate-100">Saat project selesai (proyeksi)</p>
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2 sm:grid-cols-[7.5rem_1fr]">
            <span className="text-slate-600 dark:text-slate-300">Nilai kontrak</span>
            <div className="flex h-6">
              <div className="flex items-center justify-center rounded bg-[#C9DDF0] font-semibold text-[#123F6B]" style={{ width: w(contract) }}>
                {rp(contract)}
              </div>
            </div>
            <span className="text-slate-600 dark:text-slate-300">Proyeksi biaya akhir</span>
            <div className="flex h-6 overflow-hidden rounded">
              <div className="flex items-center justify-center truncate bg-brand-blueDark px-1 font-semibold text-white" style={{ width: w(cost) }} title="Biaya keluar">
                <span className="hidden sm:inline">{cost / scale > 0.15 ? `Keluar ${nf(cost)}` : ""}</span>
              </div>
              <div className="flex items-center justify-center truncate bg-slate-400 px-1 font-semibold text-white" style={{ width: w(m.rest) }} title="Sisa RAB">
                <span className="hidden sm:inline">{m.rest / scale > 0.15 ? `Sisa RAB ${nf(m.rest)}` : ""}</span>
              </div>
              {m.proj > 0 && (
                <div className="flex items-center justify-center truncate bg-[#2F855A] px-1 font-semibold text-white" style={{ width: w(m.proj) }} title="Proyeksi margin">
                  <span className="hidden sm:inline">{m.proj / scale > 0.1 ? `Margin ${nf(m.proj)}` : ""}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-semibold text-ink dark:text-slate-100">Sampai hari ini (realisasi)</p>
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2 sm:grid-cols-[7.5rem_1fr]">
            <span className="text-slate-600 dark:text-slate-300">Pekerjaan selesai</span>
            <div className="flex h-6">
              <div className="flex items-center justify-center truncate rounded bg-[#C9DDF0] px-1 font-semibold text-[#123F6B]" style={{ width: w(m.earned) }}>
                {m.earned / scale > 0.12 ? nf(m.earned) : ""}
              </div>
            </div>
            <span className="text-slate-600 dark:text-slate-300">Biaya keluar</span>
            <div className="flex h-6">
              <div className="flex items-center justify-center truncate rounded bg-brand-blueDark px-1 font-semibold text-white" style={{ width: w(cost) }}>
                {cost / scale > 0.12 ? nf(cost) : ""}
              </div>
            </div>
          </div>
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-blueDark" />Biaya keluar</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-400" />Sisa RAB</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#2F855A]" />Proyeksi margin</span>
          <span>Angka dalam Rp juta.</span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Result label="Margin rencana" value={rp(m.plan)} tone={t(m.plan)} note={`${nf(m.planPct, 1)}% dari kontrak`} />
        <Result label="Margin realisasi" value={rp(m.real)} tone={t(m.real)} note={prog > 0 ? `${nf(m.realPct, 1)}% dari pekerjaan selesai` : "belum ada progres"} />
        <Result label="Proyeksi margin" value={rp(m.proj)} tone={projTone} note={`${nf(m.projPct, 1)}% dari kontrak`} />
      </div>
      <Verdict tone={projTone}>
        {m.proj < 0
          ? "Project diperkirakan rugi. Biaya yang sudah keluar ditambah sisa RAB melebihi nilai kontrak."
          : projTone === "good"
            ? "Proyeksi margin masih sesuai rencana."
            : `Proyeksi margin turun ${nf(m.planPct - m.projPct, 1)} poin dari rencana karena biaya sudah melebihi porsi RAB untuk progres saat ini.`}
      </Verdict>
    </Play>
  );
}

// ---------------------------------------------------------------------------
// Peta risiko
// ---------------------------------------------------------------------------

const LV = ["", "Rendah", "Sedang", "Tinggi"];
const level = (s: number) =>
  s >= 9
    ? { name: "Ekstrem", bg: "#C2362F", fg: "#fff", act: "Tangani segera dan laporkan ke manajemen hari ini." }
    : s >= 6
      ? { name: "Tinggi", bg: "#F8D9D6", fg: "#C2362F", act: "Tetapkan penanggung jawab dan tindak lanjut dalam minggu ini." }
      : s >= 3
        ? { name: "Sedang", bg: "#FBF3E4", fg: "#B7791F", act: "Pantau rutin dan siapkan rencana cadangan." }
        : { name: "Rendah", bg: "#EAF5EE", fg: "#2F855A", act: "Cukup dipantau." };

export function RiskPlay() {
  const [sel, setSel] = useState<[number, number]>([3, 2]);
  const s = sel[0] * sel[1];
  const lv = level(s);
  return (
    <Play hint="Klik salah satu kotak.">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="grid w-full max-w-[21rem] shrink-0 grid-cols-[4rem_repeat(3,minmax(0,1fr))] gap-1 text-[12px]">
          <div className="col-span-4 mb-0.5 text-[11.5px] text-slate-500">Kemungkinan ↑</div>
          {[3, 2, 1].map((l) => (
            <div key={l} className="contents">
              <div className="flex items-center justify-end pr-2 text-slate-500">{LV[l]}</div>
              {[1, 2, 3].map((d) => {
                const c = level(l * d);
                const on = sel[0] === l && sel[1] === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSel([l, d])}
                    aria-pressed={on}
                    aria-label={`Kemungkinan ${LV[l]}, dampak ${LV[d]}`}
                    className={cn("flex h-14 flex-col items-center justify-center rounded transition-transform hover:scale-[1.04]", on && "ring-2 ring-brand-blueDark ring-offset-2 dark:ring-slate-100 dark:ring-offset-slate-900")}
                    style={{ background: c.bg, color: c.fg }}
                  >
                    <span className="text-[15px] font-bold">{l * d}</span>
                    <span className="text-[11px] font-semibold">{c.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div />
          {[1, 2, 3].map((d) => (
            <div key={d} className="text-center text-slate-500">
              {LV[d]}
            </div>
          ))}
          <div />
          <div className="col-span-3 text-center text-[11.5px] text-slate-500">Dampak →</div>
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-line bg-white p-3 text-[13px] dark:border-slate-700 dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-300">
            Kemungkinan <strong>{LV[sel[0]]}</strong> ({sel[0]}) × dampak <strong>{LV[sel[1]]}</strong> ({sel[1]}) = <strong>{s}</strong>
          </p>
          <p className="mt-2">
            <span className="rounded px-2 py-0.5 text-[12px] font-bold" style={{ background: lv.bg, color: lv.fg }}>
              {lv.name}
            </span>
          </p>
          <p className="mt-2 font-medium text-ink dark:text-slate-100">{lv.act}</p>
          <p className="mt-2 text-[12px] text-slate-500">Kendala (sudah terjadi) selalu dihitung dengan kemungkinan Tinggi.</p>
        </div>
      </div>
    </Play>
  );
}

// ---------------------------------------------------------------------------
// Pareto
// ---------------------------------------------------------------------------

const PARETO = [
  { label: "Keterlambatan", v: 50 },
  { label: "Operasional", v: 25 },
  { label: "Personil", v: 12 },
  { label: "Fasilitas", v: 8 },
  { label: "Lainnya", v: 5 },
];

export function ParetoPlay() {
  const [sel, setSel] = useState(0);
  let run = 0;
  const rows = PARETO.map((p) => ({ ...p, cum: (run += p.v) }));
  const r = rows[sel];
  return (
    <Play hint="Klik batangnya.">
      <svg viewBox="0 0 490 210" className="h-auto w-full max-w-[540px]" role="img" aria-label="Diagram Pareto interaktif">
        <line x1={30} x2={450} y1={170 - 80 * 1.5} y2={170 - 80 * 1.5} stroke="#94A3B8" strokeDasharray="4 4" />
        <text x={454} y={170 - 80 * 1.5 + 4} fontSize={10.5} className="fill-slate-500">
          80%
        </text>
        {rows.map((p, i) => (
          <g key={p.label} onClick={() => setSel(i)} className="cursor-pointer">
            <rect x={35 + i * 80} y={20} width={70} height={168} fill="transparent" />
            <rect x={45 + i * 80} y={170 - p.v * 2} width={50} height={p.v * 2} rx={3} fill={p.cum <= 80 ? "#C2362F" : "#CBD5E1"} stroke={i === sel ? "#123F6B" : "none"} strokeWidth={3} />
            <text x={70 + i * 80} y={188} textAnchor="middle" fontSize={10.5} fontWeight={i === sel ? 700 : 400} className="fill-slate-600 dark:fill-slate-300">
              {p.label}
            </text>
          </g>
        ))}
        <polyline points={rows.map((p, i) => `${70 + i * 80},${170 - p.cum * 1.5}`).join(" ")} fill="none" stroke="#123F6B" strokeWidth={2} />
        {rows.map((p, i) => (
          <circle key={i} cx={70 + i * 80} cy={170 - p.cum * 1.5} r={i === sel ? 5 : 3.5} fill="#123F6B" />
        ))}
        <line x1={30} x2={450} y1={170} y2={170} className="stroke-slate-200 dark:stroke-slate-700" />
      </svg>
      <p className="mt-2 rounded-lg border border-line bg-white px-3 py-2 text-[13px] dark:border-slate-700 dark:bg-slate-900">
        <strong>{r.label}</strong>: {r.v}% dari total pembengkakan. Bersama penyebab di kirinya, kumulatif <strong>{r.cum}%</strong>.{" "}
        {r.cum <= 80 ? "Termasuk penyebab utama, prioritaskan." : "Pengaruhnya kecil, tangani setelah penyebab utama."}
      </p>
    </Play>
  );
}

// ---------------------------------------------------------------------------
// HSE
// ---------------------------------------------------------------------------

export function HsePlay() {
  const [hours, setHours] = useState(200_000);
  const [lti, setLti] = useState(1);
  const [med, setMed] = useState(2);
  const ltifr = (lti * 1e6) / hours;
  const trir = ((lti + med) * 1e6) / hours;
  const t = (v: number): Tone => (v === 0 ? "good" : v < 2 ? "warn" : "bad");
  return (
    <Play>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Jam kerja seluruh personil" value={hours} min={10_000} max={1_000_000} step={10_000} onChange={setHours} show={(v) => nf(v)} />
          <Slider label="Cedera hilang hari kerja" value={lti} min={0} max={5} onChange={setLti} show={(v) => `${v} kejadian`} />
          <Slider label="Cedera perawatan medis" value={med} min={0} max={10} onChange={setMed} show={(v) => `${v} kejadian`} />
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Result label="LTIFR" value={nf(ltifr, 2)} tone={t(ltifr)} note={`${lti} × 1 juta ÷ ${nf(hours)}`} />
          <Result label="TRIR" value={nf(trir, 2)} tone={t(trir)} note={`${lti + med} × 1 juta ÷ ${nf(hours)}`} />
        </div>
      </div>
    </Play>
  );
}
