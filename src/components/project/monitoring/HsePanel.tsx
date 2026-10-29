"use client";

import { useState } from "react";
import { HardHat, Pencil, Plus } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { InfoTip } from "@/components/ui/InfoTip";
import { HSE_LEVELS, summarizeHse, type HseRecord } from "@/lib/project-hse";
import { cn } from "@/lib/utils";
import { DeleteButton, EmptyState, FormError, useMonitoringApi, useOpenFromHash } from "./shared";
import type { HseRecordDTO, ProjectMonitoringDTO } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (iso: string) => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const num = (v: number | null | undefined, digits = 0) => (v === null || v === undefined ? "-" : v.toLocaleString("id-ID", { maximumFractionDigits: digits }));

const FIELDS: { key: keyof Omit<HseRecord, "periodDate">; label: string; hint?: string }[] = [
  { key: "manHours", label: "Jam kerja", hint: "Total jam kerja seluruh personil dan subkon pada bulan ini" },
  { key: "fatality", label: "Fatal" },
  { key: "lostTimeInjury", label: "Cedera hilang hari kerja (LTI)" },
  { key: "medicalTreatment", label: "Perawatan medis" },
  { key: "firstAid", label: "P3K" },
  { key: "nearMiss", label: "Nyaris celaka (near miss)" },
  { key: "propertyDamage", label: "Kerusakan aset" },
  { key: "unsafeObservations", label: "Temuan tindakan/kondisi tidak aman" },
  { key: "safetyTalks", label: "Safety talk / toolbox meeting" },
  { key: "inspections", label: "Inspeksi K3" },
];

type Form = Record<(typeof FIELDS)[number]["key"], string> & { period: string; notes: string };
const blank = (): Form => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return { period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, notes: "", ...(Object.fromEntries(FIELDS.map((f) => [f.key, "0"])) as Record<(typeof FIELDS)[number]["key"], string>) };
};

export function HsePanel({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HseRecordDTO | null>(null);
  const [form, setForm] = useState<Form>(blank());
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/hse`;
  const s = data.hse.summary;
  const records = [...data.hse.records].sort((a, b) => b.periodDate.localeCompare(a.periodDate));

  function openForm(r: HseRecordDTO | null) {
    setEditing(r);
    setForm(
      r
        ? { period: r.periodDate.slice(0, 7), notes: r.notes || "", ...(Object.fromEntries(FIELDS.map((f) => [f.key, String(r[f.key])])) as Record<(typeof FIELDS)[number]["key"], string>) }
        : blank()
    );
    setError(null);
    setOpen(true);
  }
  useOpenFromHash("hse", () => {
    if (data.canManage) openForm(null);
  });

  async function save() {
    if (!form.period) return setError("Periode wajib diisi.");
    const body = { periodDate: `${form.period}-01`, notes: form.notes, ...Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key] || 0)])) };
    const err = editing ? await send("PATCH", `${base}/${editing.id}`, body, "Laporan HSE diperbarui.") : await send("POST", base, body, "Laporan HSE disimpan.");
    if (err) setError(err.includes("sama sudah ada") ? "Laporan HSE untuk bulan ini sudah ada. Ubah data bulan tersebut." : err);
    else setOpen(false);
  }

  const chart = [...data.hse.records]
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate))
    .map((r, i, arr) => {
      const upTo = summarizeHse(arr.slice(0, i + 1).map((x) => ({ ...x, periodDate: Date.parse(x.periodDate) })));
      return { label: monthLabel(r.periodDate), fatality: r.fatality, lostTimeInjury: r.lostTimeInjury, medicalTreatment: r.medicalTreatment, firstAid: r.firstAid, nearMiss: r.nearMiss, trir: upTo.trir };
    });

  const signalText =
    s.signal === "bad"
      ? "Terjadi kecelakaan kerja dengan hilang hari kerja atau fatal."
      : s.signal === "warn"
        ? "Ada kejadian perawatan medis atau kerusakan aset, tanpa hilang hari kerja."
        : s.signal === "good"
          ? "Tidak ada kecelakaan kerja yang tercatat."
          : "Belum ada laporan HSE.";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-1.5">
              Kinerja HSE
              <InfoTip label="Keterangan kinerja HSE">
                Diisi per bulan oleh PIC atau petugas HSE. <strong>LTIFR</strong> = jumlah cedera hilang hari kerja (termasuk fatal) × 1.000.000 ÷ jam kerja.{" "}
                <strong>TRIR</strong> = (fatal + hilang hari kerja + perawatan medis) × 1.000.000 ÷ jam kerja. Makin kecil makin baik; target umumnya 0.
              </InfoTip>
            </CardTitle>
            <p className={cn("mt-0.5 text-[12.5px]", s.signal === "bad" ? "font-semibold text-signal-expired" : s.signal === "warn" ? "text-signal-soon" : "text-slate-500")}>{signalText}</p>
          </div>
          {data.canManage && (
            <Button size="sm" onClick={() => openForm(null)}>
              <Plus className="h-4 w-4" />
              Isi laporan HSE
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {s.months === 0 ? (
            <EmptyState icon={HardHat} text="Belum ada laporan HSE. Isi jam kerja dan kejadian K3 setiap bulan." action={data.canManage ? { label: "Isi laporan HSE", onClick: () => openForm(null) } : undefined} />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Kpi label="Jam kerja tercatat" value={num(s.manHours)} sub={`${s.months} bulan`} />
                  <Kpi label="Jam kerja aman" value={num(s.safeHours)} sub={s.lastLtiMonth ? `sejak LTI ${monthLabel(new Date(s.lastLtiMonth).toISOString())}` : "tanpa cedera hilang hari kerja"} tone={s.lastLtiMonth ? "warn" : "good"} />
                  <Kpi label="LTIFR" value={num(s.ltifr, 2)} sub="per 1 juta jam kerja" tone={(s.ltifr ?? 0) > 0 ? "bad" : "good"} />
                  <Kpi label="TRIR" value={num(s.trir, 2)} sub="per 1 juta jam kerja" tone={s.lostTimeInjury + s.fatality > 0 ? "bad" : (s.trir ?? 0) > 0 ? "warn" : "good"} />
                </div>
                <p className="text-[12.5px] text-slate-600 dark:text-slate-300">
                  Kegiatan proaktif: {num(s.safetyTalks)} safety talk, {num(s.inspections)} inspeksi K3, {num(s.unsafeObservations)} temuan tidak aman dilaporkan.
                </p>
              </div>
              <SafetyPyramid summary={s} />
            </div>
          )}
        </CardContent>
      </Card>

      {chart.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Tren bulanan
              <InfoTip label="Keterangan tren HSE">Batang = jumlah kejadian per bulan, diwarnai menurut tingkat keparahan (merah tua paling berat, kuning paling ringan). Garis putus-putus = TRIR kumulatif sejak project dimulai.</InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#E6EBF1" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E6EBF1" }} tickLine={false} />
                  <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E6EBF1", fontSize: 12 }} />
                  {[...HSE_LEVELS].reverse().filter((l) => l.key !== "unsafeObservations").map((l, i, arr) => (
                    <Bar key={l.key} yAxisId="n" dataKey={l.key} name={l.short} stackId="i" fill={l.color} maxBarSize={28} radius={i === arr.length - 1 ? [3, 3, 0, 0] : undefined} isAnimationActive={false} />
                  ))}
                  <Line yAxisId="r" dataKey="trir" name="TRIR kumulatif" stroke="#123F6B" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "#123F6B" }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
              {HSE_LEVELS.filter((l) => l.key !== "unsafeObservations").map((l) => (
                <span key={l.key} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
                  {l.short}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[#123F6B]" />
                TRIR kumulatif
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Laporan bulanan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="th-row">
                    <th className="px-5 py-2.5 font-medium">Bulan</th>
                    <th className="px-3 py-2.5 text-right font-medium">Jam kerja</th>
                    <th className="px-3 py-2.5 text-right font-medium">Fatal</th>
                    <th className="px-3 py-2.5 text-right font-medium">LTI</th>
                    <th className="px-3 py-2.5 text-right font-medium">Medis</th>
                    <th className="px-3 py-2.5 text-right font-medium">P3K</th>
                    <th className="px-3 py-2.5 text-right font-medium">Nyaris</th>
                    <th className="px-3 py-2.5 text-right font-medium">Safety talk</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-line/70 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-ink dark:text-slate-100">{monthLabel(r.periodDate)}</p>
                        {r.notes && <p className="max-w-xs truncate text-[12px] text-slate-500" title={r.notes}>{r.notes}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{num(r.manHours)}</td>
                      <td className={cn("px-3 py-2.5 text-right tabular-nums", r.fatality > 0 && "font-bold text-signal-expired")}>{r.fatality}</td>
                      <td className={cn("px-3 py-2.5 text-right tabular-nums", r.lostTimeInjury > 0 && "font-bold text-signal-expired")}>{r.lostTimeInjury}</td>
                      <td className={cn("px-3 py-2.5 text-right tabular-nums", r.medicalTreatment > 0 && "font-semibold text-signal-soon")}>{r.medicalTreatment}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.firstAid}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.nearMiss}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.safetyTalks}</td>
                      <td className="px-5 py-2.5">
                        {data.canManage && (
                          <div className="flex justify-end gap-1">
                            <button type="button" aria-label="Ubah" onClick={() => openForm(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <DeleteButton what="laporan HSE" onConfirm={() => send("DELETE", `${base}/${r.id}`, undefined, "Laporan HSE dihapus.")} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Ubah laporan HSE" : "Isi laporan HSE"} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hse-period">Bulan</Label>
              <Input id="hse-period" type="month" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} disabled={!!editing} />
            </div>
            <div>
              <Label htmlFor="hse-manHours">Jam kerja</Label>
              <Input id="hse-manHours" type="number" min={0} value={form.manHours} onChange={(e) => setForm((f) => ({ ...f, manHours: e.target.value }))} />
            </div>
          </div>
          <p className="text-[12.5px] text-slate-500">Jumlah kejadian pada bulan tersebut. Isi 0 bila tidak ada.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.filter((f) => f.key !== "manHours").map((f) => (
              <div key={f.key}>
                <Label htmlFor={`hse-${f.key}`}>{f.label}</Label>
                <Input id={`hse-${f.key}`} type="number" min={0} value={form[f.key]} onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="hse-notes">Catatan kejadian / tindak lanjut</Label>
            <Textarea id="hse-notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button isLoading={busy} onClick={save}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }) {
  const accent = tone === "bad" ? "#B42318" : tone === "warn" ? "#E0592A" : tone === "good" ? "#2F855A" : "#123F6B";
  return (
    <div className="relative overflow-hidden rounded-lg border border-line px-4 py-3 dark:border-slate-700">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <p className="text-[12px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[22px] font-bold leading-tight" style={{ color: tone ? accent : undefined }}>
        {value}
      </p>
      {sub && <p className="text-[11.5px] text-slate-500">{sub}</p>}
    </div>
  );
}

/**
 * Heinrich's safety pyramid drawn as a real triangle: severe injuries at the
 * narrow top, many minor events and unsafe acts at the wide base. Each layer is
 * coloured by severity; layers with no events stay as a pale tint of their colour.
 */
export function SafetyPyramid({ summary }: { summary: ReturnType<typeof summarizeHse> }) {
  const n = HSE_LEVELS.length;
  const width = (k: number) => 16 + (84 * k) / n; // % of the base width at layer edge k
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink dark:text-slate-100">
        Piramida keselamatan
        <InfoTip label="Keterangan piramida keselamatan" align="right">
          Kecelakaan berat jarang terjadi, tetapi berdiri di atas banyak kejadian kecil dan tindakan tidak aman. Tiga lapis atas adalah cedera yang tercatat; tiga lapis bawah
          adalah tanda peringatan dini. Laporan nyaris celaka dan temuan tidak aman yang banyak menandakan budaya pelaporan yang baik; menekan bagian bawah mencegah kejadian di
          puncak.
        </InfoTip>
      </p>
      <div className="flex gap-3">
        <div className="relative w-[46%] shrink-0">
          {HSE_LEVELS.map((l, i) => {
            const top = width(i);
            const bottom = width(i + 1);
            const v = summary[l.key as keyof typeof summary] as number;
            const on = v > 0;
            return (
              <div
                key={l.key}
                className="flex h-9 items-center justify-center text-[13px] font-bold tabular-nums"
                style={{
                  clipPath: `polygon(${(100 - top) / 2}% 0, ${(100 + top) / 2}% 0, ${(100 + bottom) / 2}% 100%, ${(100 - bottom) / 2}% 100%)`,
                  background: on ? l.color : l.tint,
                  color: on ? "#FFFFFF" : l.color,
                  marginTop: i ? 2 : 0,
                }}
                title={`${l.label}: ${v}`}
              >
                {v.toLocaleString("id-ID")}
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          {HSE_LEVELS.map((l, i) => (
            <div
              key={l.key}
              className={cn(
                "flex h-9 items-center gap-2 border-l-2 pl-2.5 text-[12px] leading-tight text-slate-700 dark:text-slate-300",
                l.group === "lagging" ? "border-[#B42318]/60" : "border-[#E9B21F]/80"
              )}
              style={{ marginTop: i ? 2 : 0 }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
          <p className="mt-2 pl-3 text-[11px] text-slate-500">Garis merah: cedera tercatat. Garis kuning: peringatan dini.</p>
        </div>
      </div>
    </div>
  );
}
