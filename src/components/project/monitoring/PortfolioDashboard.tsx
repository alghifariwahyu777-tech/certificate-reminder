"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, SlidersHorizontal } from "lucide-react";
import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent, formatRupiah, mergePadSchedules, shortDate, type ProjectHealth } from "@/lib/project-monitoring-shared";
import type { PortfolioRow } from "@/lib/project-monitoring";
import { cn } from "@/lib/utils";
import { ConditionRibbon, ProgressBar, type Tone } from "./shared";
import { InfoTip } from "@/components/ui/InfoTip";

type SortKey = "severity" | "name" | "progress" | "margin" | "end";

const SEVERITY: Record<ProjectHealth, number> = { KRITIS: 0, WASPADA: 1, ON_TRACK: 2, SELESAI: 3, BATAL: 4 };
const HEALTH_TONE: Record<ProjectHealth, Tone> = { KRITIS: "bad", WASPADA: "warn", ON_TRACK: "default", SELESAI: "default", BATAL: "none" };
const tooltipStyle = { borderRadius: 8, border: "1px solid #E3E8EF", fontSize: 12, fontFamily: "var(--font-body)" };
const CHIPS: { key: string; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "KRITIS", label: "Kritis" },
  { key: "WASPADA", label: "Waspada" },
  { key: "ON_TRACK", label: "Sesuai rencana" },
];

export function PortfolioDashboard({ rows, categories }: { rows: PortfolioRow[]; categories: { id: string; name: string }[] }) {
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

      {/* the one table */}
      <Card>
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
