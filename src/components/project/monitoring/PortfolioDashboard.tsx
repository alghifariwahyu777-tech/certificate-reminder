"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  HEALTH_BADGE_CLASS,
  HEALTH_LABEL,
  formatPercent,
  formatRupiah,
  shortDate,
  type ProjectHealth,
} from "@/lib/project-monitoring-shared";
import type { PortfolioRow } from "@/lib/project-monitoring";
import { cn } from "@/lib/utils";
import { ProgressBar, Stat } from "./shared";

type SortKey = "deviation" | "actual" | "daysRemaining" | "contract" | "outstanding" | "name";

const HEALTH_ORDER: ProjectHealth[] = ["KRITIS", "WASPADA", "ON_TRACK", "SELESAI", "BATAL"];
const HEALTH_COLOR: Record<ProjectHealth, string> = {
  KRITIS: "#B91C1C",
  WASPADA: "#B45309",
  ON_TRACK: "#15803D",
  SELESAI: "#1D4ED8",
  BATAL: "#94A3B8",
};
const tooltipStyle = { borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "var(--font-body)" };

export function PortfolioDashboard({ rows, categories }: { rows: PortfolioRow[]; categories: { id: string; name: string }[] }) {
  const [status, setStatus] = useState("ONGOING");
  const [categoryId, setCategoryId] = useState("");
  const [pic, setPic] = useState("");
  const [health, setHealth] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "deviation", dir: 1 });

  const pics = useMemo(() => [...new Set(rows.map((r) => r.pic))].sort(), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!status || r.status === status) &&
        (!categoryId || r.categoryId === categoryId) &&
        (!pic || r.pic === pic) &&
        (!health || r.summary.health === health) &&
        (!term || [r.projectName, r.projectNumber, r.clientName, r.pic].some((v) => v.toLowerCase().includes(term)))
    );
  }, [rows, status, categoryId, pic, health, q]);

  const sorted = useMemo(() => {
    const val = (r: PortfolioRow): number | string => {
      switch (sort.key) {
        case "deviation":
          return r.status === "ONGOING" ? r.summary.deviation : 999;
        case "actual":
          return r.summary.actualPercent;
        case "daysRemaining":
          return r.summary.daysRemaining;
        case "contract":
          return r.summary.contractValue;
        case "outstanding":
          return r.summary.outstanding;
        default:
          return r.projectName.toLowerCase();
      }
    };
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [filtered, sort]);

  const k = useMemo(() => {
    const sum = (f: (r: PortfolioRow) => number) => filtered.reduce((s, r) => s + f(r), 0);
    const ongoing = filtered.filter((r) => r.status === "ONGOING");
    const contract = sum((r) => r.summary.contractValue);
    const ongoingContract = ongoing.reduce((s, r) => s + r.summary.contractValue, 0);
    // contract-weighted progress (falls back to a plain average when values are missing)
    const weighted = (key: "actualPercent" | "plannedPercent") =>
      ongoing.length === 0
        ? null
        : ongoingContract > 0
          ? ongoing.reduce((s, r) => s + r.summary[key] * r.summary.contractValue, 0) / ongoingContract
          : ongoing.reduce((s, r) => s + r.summary[key], 0) / ongoing.length;
    return {
      count: filtered.length,
      ongoing: ongoing.length,
      contract,
      invoiced: sum((r) => r.summary.invoiced),
      paid: sum((r) => r.summary.paid),
      outstanding: sum((r) => r.summary.outstanding),
      overdueInvoices: sum((r) => r.summary.overdueInvoiceCount),
      overdueAmount: sum((r) => r.summary.overdueInvoiceAmount),
      kritis: ongoing.filter((r) => r.summary.health === "KRITIS").length,
      waspada: ongoing.filter((r) => r.summary.health === "WASPADA").length,
      stale: ongoing.filter((r) => r.summary.isStale).length,
      overdue: ongoing.filter((r) => r.summary.isOverdue).length,
      actual: weighted("actualPercent"),
      planned: weighted("plannedPercent"),
      unbilled: sum((r) => (r.status === "ONGOING" ? r.summary.unbilledEarned : 0)),
      cost: sum((r) => r.summary.costActual),
      budget: sum((r) => r.summary.budgetTotal),
      openHigh: sum((r) => r.summary.openHighIssues),
    };
  }, [filtered]);

  const byCategory = useMemo(() => {
    type CatRow = { name: string; kontrak: number; ditagih: number; dibayar: number } & Record<ProjectHealth, number>;
    const m = new Map<string, CatRow>();
    for (const r of filtered) {
      const row: CatRow = m.get(r.categoryName) || {
        name: r.categoryName,
        kontrak: 0,
        ditagih: 0,
        dibayar: 0,
        KRITIS: 0,
        WASPADA: 0,
        ON_TRACK: 0,
        SELESAI: 0,
        BATAL: 0,
      };
      row.kontrak += r.summary.contractValue / 1e6;
      row.ditagih += r.summary.invoiced / 1e6;
      row.dibayar += r.summary.paid / 1e6;
      row[r.summary.health] += 1;
      m.set(r.categoryName, row);
    }
    return [...m.values()];
  }, [filtered]);

  const attention = useMemo(
    () =>
      filtered
        .filter((r) => r.status === "ONGOING")
        .flatMap((r) => {
          const out: { id: string; name: string; text: string; tone: "bad" | "warn" }[] = [];
          const s = r.summary;
          if (s.isOverdue) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `lewat target ${Math.abs(s.daysRemaining)} hari (progres ${formatPercent(s.actualPercent)})` });
          else if (s.health === "KRITIS") out.push({ id: r.id, name: r.projectName, tone: "bad", text: s.healthReason });
          if (s.overdueInvoiceCount) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `${s.overdueInvoiceCount} invoice lewat jatuh tempo (${formatRupiah(s.overdueInvoiceAmount, true)})` });
          if (s.openHighIssues) out.push({ id: r.id, name: r.projectName, tone: "bad", text: `${s.openHighIssues} kendala berdampak tinggi terbuka` });
          if (s.isStale) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `progres belum diperbarui ${s.daysSinceUpdate} hari` });
          if (s.dueUnbilledCount) out.push({ id: r.id, name: r.projectName, tone: "warn", text: `${s.dueUnbilledCount} termin sudah waktunya ditagih` });
          return out;
        })
        .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1)),
    [filtered]
  );

  const exportHref = `/api/projects/portfolio/export?${new URLSearchParams({ status, categoryId, pic, health, q }).toString()}`;

  function SortTh({ label, k: key, className }: { label: string; k: SortKey; className?: string }) {
    const active = sort.key === key;
    return (
      <th className={cn("px-3 py-2.5 font-medium", className)}>
        <button
          type="button"
          className={cn("inline-flex items-center gap-1 uppercase", active && "text-ink dark:text-slate-100")}
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }))}
        >
          {label}
          {active && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama/nomor project, klien, PIC…" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="lg:w-40" aria-label="Status">
          <option value="">Semua status</option>
          <option value="ONGOING">Berjalan</option>
          <option value="COMPLETED">Selesai</option>
          <option value="CANCELLED">Dibatalkan</option>
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="lg:w-44" aria-label="Kategori">
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={pic} onChange={(e) => setPic(e.target.value)} className="lg:w-44" aria-label="PIC">
          <option value="">Semua PIC</option>
          {pics.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={health} onChange={(e) => setHealth(e.target.value)} className="lg:w-40" aria-label="Kesehatan">
          <option value="">Semua kondisi</option>
          {HEALTH_ORDER.map((h) => (
            <option key={h} value={h}>
              {HEALTH_LABEL[h]}
            </option>
          ))}
        </Select>
        <a href={exportHref}>
          <Button variant="outline" className="w-full lg:w-auto">
            <Download className="h-4 w-4" />
            Excel
          </Button>
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Project" value={k.count} hint={`${k.ongoing} berjalan`} />
        <Stat label="Nilai kontrak" value={formatRupiah(k.contract, true)} hint={`Belum ditagih ± ${formatRupiah(k.unbilled, true)} dari pekerjaan selesai`} />
        <div className="col-span-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Progres portofolio berjalan (tertimbang nilai kontrak)</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-2xl font-semibold tabular-nums">{formatPercent(k.actual)}</span>
            <span className="text-sm text-slate-500">rencana {formatPercent(k.planned)}</span>
          </div>
          <ProgressBar value={k.actual ?? 0} marker={k.planned ?? undefined} className="mt-2" />
        </div>
        <Stat label="Kritis / Waspada" tone={k.kritis ? "bad" : k.waspada ? "warn" : "good"} value={`${k.kritis} / ${k.waspada}`} hint={`${k.overdue} lewat target · ${k.stale} progres tidak diperbarui`} />
        <Stat label="Tertagih / Terbayar" value={formatRupiah(k.invoiced, true)} hint={`Dibayar ${formatRupiah(k.paid, true)}${k.contract ? ` (${Math.round((k.paid / k.contract) * 100)}% kontrak)` : ""}`} />
        <Stat label="Piutang" tone={k.overdueInvoices ? "bad" : "default"} value={formatRupiah(k.outstanding, true)} hint={k.overdueInvoices ? `${k.overdueInvoices} invoice lewat jatuh tempo (${formatRupiah(k.overdueAmount, true)})` : "tidak ada yang lewat jatuh tempo"} />
        <Stat label="Biaya vs anggaran" tone={k.budget && k.cost > k.budget ? "bad" : "default"} value={formatRupiah(k.cost, true)} hint={k.budget ? `dari anggaran ${formatRupiah(k.budget, true)}` : "anggaran belum diisi"} />
      </div>

      {/* Charts */}
      {byCategory.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Kondisi Project per Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F1F5F9" }} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {HEALTH_ORDER.filter((h) => byCategory.some((c) => c[h] > 0)).map((h) => (
                      <Bar key={h} dataKey={h} name={HEALTH_LABEL[h]} stackId="h" fill={HEALTH_COLOR[h]} maxBarSize={40} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kontrak, Tagihan & Pembayaran per Kategori (Rp juta)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("id-ID")} />
                    <Tooltip
                      cursor={{ fill: "#F1F5F9" }}
                      contentStyle={tooltipStyle}
                      formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="kontrak" name="Kontrak" fill="#CBD5E1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="ditagih" name="Ditagih" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="dibayar" name="Dibayar" fill="#15803D" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attention */}
      {attention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Perlu Perhatian ({attention.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {attention.map((a, i) => (
                <li key={i} className="px-5 py-2.5 text-sm flex items-start gap-2">
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", a.tone === "bad" ? "bg-signal-expired" : "bg-signal-soon")} />
                  <span>
                    <Link href={`/projects/${a.id}`} className="font-medium text-ink dark:text-slate-100 hover:text-accent">
                      {a.name}
                    </Link>{" "}
                    <span className="text-slate-600 dark:text-slate-300">— {a.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Semua Project ({sorted.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <SortTh label="Project" k="name" className="px-5" />
                  <SortTh label="Progres" k="actual" />
                  <SortTh label="Deviasi" k="deviation" className="text-right" />
                  <th className="px-3 py-2.5 font-medium uppercase text-right">SPI</th>
                  <SortTh label="Sisa hari" k="daysRemaining" className="text-right" />
                  <SortTh label="Kontrak" k="contract" className="text-right" />
                  <th className="px-3 py-2.5 font-medium uppercase">Tagih / Bayar</th>
                  <SortTh label="Piutang" k="outstanding" className="text-right" />
                  <th className="px-3 py-2.5 font-medium uppercase">Kondisi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                      Tidak ada project yang cocok dengan filter.
                    </td>
                  </tr>
                )}
                {sorted.map((r) => {
                  const s = r.summary;
                  const ongoing = r.status === "ONGOING";
                  const billPct = s.contractValue ? (s.invoiced / s.contractValue) * 100 : null;
                  const paidPct = s.contractValue ? (s.paid / s.contractValue) * 100 : null;
                  return (
                    <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 min-w-[14rem]">
                        <Link href={`/projects/${r.id}`} className="font-medium text-ink dark:text-slate-100 hover:text-accent">
                          {r.projectName}
                        </Link>
                        <p className="text-xs text-slate-400">
                          <span className="font-mono">{r.projectNumber}</span> · {r.categoryName} · {r.pic}
                        </p>
                      </td>
                      <td className="px-3 py-3 min-w-[8rem]">
                        <p className="text-xs tabular-nums mb-1">
                          {formatPercent(s.actualPercent)}
                          {ongoing && <span className="text-slate-400"> / {formatPercent(s.plannedPercent, 0)}</span>}
                        </p>
                        <ProgressBar value={s.actualPercent} marker={ongoing ? s.plannedPercent : undefined} />
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right tabular-nums",
                          ongoing && s.health === "KRITIS" && "text-signal-expired font-medium",
                          ongoing && s.health === "WASPADA" && "text-signal-soon font-medium"
                        )}
                      >
                        {ongoing ? `${s.deviation > 0 ? "+" : ""}${s.deviation.toLocaleString("id-ID")}` : "-"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{ongoing && s.spi !== null ? s.spi.toLocaleString("id-ID") : "-"}</td>
                      <td className={cn("px-3 py-3 text-right tabular-nums whitespace-nowrap", ongoing && s.daysRemaining < 0 && "text-signal-expired")}>
                        {ongoing ? s.daysRemaining : "-"}
                        <span className="block text-[11px] text-slate-400">{shortDate(new Date(r.targetEndDate).getTime())}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{formatRupiah(s.contractValue || null, true)}</td>
                      <td className="px-3 py-3 text-xs tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {billPct === null ? "-" : `${Math.round(billPct)}% / ${Math.round(paidPct ?? 0)}%`}
                      </td>
                      <td className={cn("px-3 py-3 text-right tabular-nums whitespace-nowrap", s.overdueInvoiceCount > 0 && "text-signal-expired font-medium")}>
                        {s.outstanding ? formatRupiah(s.outstanding, true) : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("stamp-badge", HEALTH_BADGE_CLASS[s.health])}>{HEALTH_LABEL[s.health]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
