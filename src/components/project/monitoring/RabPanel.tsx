"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, History, ListTree, Upload } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatPercent, formatRupiah } from "@/lib/project-monitoring-shared";
import type { RabData, RabPreview, RabProjectField } from "@/lib/project-rab-import";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/InfoTip";
import { FormError, ProgressBar, fmtDate, useOpenFromHash, type Tone } from "./shared";
import type { ProjectMonitoringDTO } from "./types";

const versionLabel = (v: number) => (v === 0 ? "RAB awal" : `Revisi ${v}`);

/**
 * The project's RAB at a glance: the four figures that matter (nilai proyek,
 * total RAB, laba operasi, target margin), RAB vs realisasi per bagian, and the
 * revision history. Uploading the Sucofindo RAB file fills all of it.
 */
export function RabCard({ data }: { data: ProjectMonitoringDTO }) {
  const [detail, setDetail] = useState(false);
  const [history, setHistory] = useState(false);
  const latest = data.rab.latest;
  const current = data.rab.revisions[0];
  const m = data.margin;

  const rows = useMemo(() => {
    const map = new Map<string, { budget: number; actual: number }>();
    for (const b of data.budgetItems) map.set(b.category, { budget: (map.get(b.category)?.budget ?? 0) + b.amount, actual: 0 });
    for (const e of data.expenses) {
      const r = map.get(e.category) ?? { budget: 0, actual: 0 };
      r.actual += e.amount;
      map.set(e.category, r);
    }
    return [...map.entries()].sort((a, b) => b[1].budget - a[1].budget);
  }, [data.budgetItems, data.expenses]);
  const progress = data.summary.actualPercent;

  if (!current && data.budgetItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <FileSpreadsheet className="h-8 w-8 text-slate-400" />
          <div>
            <p className="font-semibold text-ink dark:text-slate-100">RAB belum diunggah</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Unggah file RAB (template Sucofindo). Nilai proyek, total RAB, target margin, dan rincian anggaran per bagian akan langsung terbaca.
            </p>
          </div>
          {data.canManage && <RabUploadDialog data={data} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <CardTitle>RAB project</CardTitle>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {current
              ? `${versionLabel(current.version)}, diunggah ${fmtDate(current.createdAt)}${current.createdBy ? ` oleh ${current.createdBy}` : ""}${current.reason ? `. Alasan: ${current.reason}` : ""}`
              : "Diisi manual atau dari impor Excel sederhana."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {latest && (
            <Button size="sm" variant="outline" onClick={() => setDetail(true)}>
              <ListTree className="h-4 w-4" />
              Rincian RAB
            </Button>
          )}
          {data.rab.revisions.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setHistory(true)}>
              <History className="h-4 w-4" />
              Riwayat ({data.rab.revisions.length})
            </Button>
          )}
          {data.canManage && <RabUploadDialog data={data} />}
        </div>
      </div>
      <CardContent className="space-y-5">
        <PnlTable data={data} />

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink dark:text-slate-100">
              RAB dan realisasi per bagian
              <InfoTip label="Keterangan RAB per bagian">
                Angka tebal = biaya yang sudah keluar, angka abu-abu = RAB bagian tersebut. Garis tegak menunjukkan porsi yang wajar pada progres {formatPercent(progress)}. Bar
                kuning = pemakaian jauh di atas progres; merah = melebihi RAB atau biaya di luar RAB.
              </InfoTip>
            </p>
          </div>
          <div className="space-y-3">
            {rows.map(([cat, v]) => {
              const pct = v.budget > 0 ? (v.actual / v.budget) * 100 : v.actual > 0 ? 100 : 0;
              const tone: Tone = v.budget === 0 ? "bad" : pct > 100 ? "bad" : pct > progress + 10 ? "warn" : "default";
              return (
                <div key={cat}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-ink dark:text-slate-100">{cat}</span>
                    <span className={cn("whitespace-nowrap text-slate-600 dark:text-slate-300", tone === "bad" && "font-semibold text-signal-expired", tone === "warn" && "font-semibold text-signal-soon")}>
                      {formatRupiah(v.actual, true)} <span className="text-slate-400">/ {v.budget ? formatRupiah(v.budget, true) : "di luar RAB"}</span>
                    </span>
                  </div>
                  <ProgressBar value={Math.min(pct, 100)} marker={v.budget ? progress : undefined} tone={tone} className="mt-1.5" />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {latest && <RabDetailModal open={detail} onClose={() => setDetail(false)} rab={latest} />}
      <Modal isOpen={history} onClose={() => setHistory(false)} title="Riwayat RAB" maxWidth="max-w-2xl">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-slate-500">
              <th className="py-2 pr-3 font-medium">Versi</th>
              <th className="py-2 pr-3 text-right font-medium">Nilai proyek</th>
              <th className="py-2 pr-3 text-right font-medium">Total RAB</th>
              <th className="py-2 pr-3 text-right font-medium">Margin</th>
              <th className="py-2 font-medium">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.rab.revisions.map((r, i) => {
              const prev = data.rab.revisions[i + 1];
              const delta = prev ? r.totalCost - prev.totalCost : 0;
              return (
                <tr key={r.id} className="border-b border-line/70 align-top last:border-0">
                  <td className="py-2.5 pr-3 font-semibold">
                    {versionLabel(r.version)}
                    <span className="block text-[12px] font-normal text-slate-500">{fmtDate(r.createdAt)}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right">{formatRupiah(r.contractValue, true)}</td>
                  <td className="py-2.5 pr-3 text-right">
                    {formatRupiah(r.totalCost, true)}
                    {prev && Math.round(delta) !== 0 && (
                      <span className={cn("block text-[12px]", delta > 0 ? "text-signal-expired" : "text-signal-active")}>
                        {delta > 0 ? "naik" : "turun"} {formatRupiah(Math.abs(delta), true)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right">{formatPercent(r.marginPct)}</td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300">
                    {r.reason || (r.version === 0 ? "RAB awal (baseline)" : "-")}
                    {r.fileName && <span className="block text-[12px] text-slate-400">{r.fileName}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Modal>
    </Card>
  );
}

function Figure({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[12.5px] font-medium text-slate-500">{label}</p>
      <p className={cn("mt-0.5 text-[19px] font-bold leading-tight", strong ? "text-brand-blueDark dark:text-sky-300" : "text-ink dark:text-slate-100")}>{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Read-only view of everything taken from the RAB file
// ---------------------------------------------------------------------------

export function RabSummaryBlocks({ rab }: { rab: RabData }) {
  const p = rab.project;
  const info: [string, string | null][] = [
    ["No. SPMK", p.contractNumber],
    ["Klien", p.client],
    ["Lokasi", p.location],
    ["Unit pelaksana", p.unit],
    ["Portofolio", [p.portfolio, p.subPortfolio].filter(Boolean).join(" / ") || null],
    ["Manajer proyek", p.projectManager],
    ["Penanggung jawab", p.responsible],
    ["PIC keuangan", p.financePic],
    ["Periode", p.startDate && p.endDate ? `${fmtDate(p.startDate)} s.d. ${fmtDate(p.endDate)}${p.durationMonths ? ` (${p.durationMonths} bulan)` : ""}` : null],
    ["Pembayaran", p.paymentScheme],
  ];
  return (
    <div className="space-y-5 text-[13px]">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {info
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-32 shrink-0 text-slate-500">{k}</dt>
              <dd className="font-medium text-ink dark:text-slate-100">{v}</dd>
            </div>
          ))}
      </dl>

      <div>
        <p className="mb-2 font-semibold text-ink dark:text-slate-100">Komposisi anggaran</p>
        <div className="space-y-2">
          {rab.sections.map((s) => (
            <div key={s.code} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
              <span>
                {s.code}. {s.category}
              </span>
              <span className="text-right font-medium">{formatRupiah(s.total, true)}</span>
              <div className="col-span-2 mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${(s.total / rab.operatingCost) * 100}%` }} />
              </div>
            </div>
          ))}
          {rab.contingency > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Biaya tak terduga ({formatPercent(rab.contingencyPct)} dari pendapatan)</span>
              <span className="font-medium">{formatRupiah(rab.contingency, true)}</span>
            </div>
          )}
        </div>
      </div>

      {rab.years.length > 1 && (
        <div>
          <p className="mb-2 font-semibold text-ink dark:text-slate-100">Rencana per tahun</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-slate-500">
                <th className="py-1.5 font-medium">Tahun</th>
                <th className="py-1.5 text-right font-medium">Pendapatan</th>
                <th className="py-1.5 text-right font-medium">Biaya operasi</th>
                <th className="py-1.5 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rab.years.map((y) => (
                <tr key={y.label} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5">{y.label}</td>
                  <td className="py-1.5 text-right">{formatRupiah(y.revenue, true)}</td>
                  <td className="py-1.5 text-right">{formatRupiah(y.cost, true)}</td>
                  <td className="py-1.5 text-right font-medium">{formatPercent(y.marginPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rab.scopes.length > 0 && (
        <div>
          <p className="mb-2 font-semibold text-ink dark:text-slate-100">Lingkup kerja dan keluaran</p>
          <ol className="space-y-1.5">
            {rab.scopes.map((s) => (
              <li key={s.no} className="grid grid-cols-[1.5rem_1fr] gap-1">
                <span className="text-slate-400">{s.no}.</span>
                <span>
                  {s.scope}
                  {s.deliverable && <span className="block text-[12px] text-slate-500">Keluaran: {s.deliverable}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {rab.team.length > 0 && (
        <div>
          <p className="mb-2 font-semibold text-ink dark:text-slate-100">Tim pelaksana ({rab.teamTotal} orang)</p>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {rab.team.map((t, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{t.position}</span>
                <span className="whitespace-nowrap text-slate-500">
                  {t.count} orang{t.months ? `, ${t.months} bln` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RabDetailModal({ open, onClose, rab }: { open: boolean; onClose: () => void; rab: RabData }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Rincian RAB" maxWidth="max-w-3xl">
      <RabSummaryBlocks rab={rab} />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Upload: file → key figures read from the file → options → save
// ---------------------------------------------------------------------------

function fieldText(key: RabProjectField, v: string | number | null) {
  if (v === null || v === "") return "-";
  if (key === "contractValue") return formatRupiah(Number(v), true);
  if (key === "startDate" || key === "targetEndDate") return fmtDate(String(v));
  return String(v);
}

export function RabUploadDialog({ data }: { data: ProjectMonitoringDTO }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RabPreview | null>(null);
  const [reason, setReason] = useState("");
  const [updateTarget, setUpdateTarget] = useState(false);
  const [apply, setApply] = useState<Set<RabProjectField>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRevision = data.rab.revisions.length > 0;
  useOpenFromHash("biaya", () => setOpen(true));

  function reset() {
    setFile(null);
    setPreview(null);
    setReason("");
    setUpdateTarget(false);
    setApply(new Set());
    setError(null);
  }

  async function send(f: File, commit: boolean) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      if (commit) {
        fd.append("commit", "1");
        fd.append("reason", reason);
        if (updateTarget) fd.append("updateTarget", "1");
        fd.append("apply", [...apply].join(","));
      }
      const res = await fetch(`/api/projects/${data.projectId}/rab`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.message || "Gagal memproses file RAB.");
      if (commit) {
        const v = body.result.version as number;
        showToast(v === 0 ? "RAB tersimpan dan menjadi baseline project." : `Revisi RAB ke-${v} tersimpan.`);
        setOpen(false);
        reset();
        router.refresh();
      } else {
        const pv = body.preview as RabPreview;
        setPreview(pv);
        // pre-select: fill empty project fields; on the first RAB also adopt differing values
        setApply(new Set(pv.fields.filter((f) => f.differs && (f.current === null || f.current === "" || pv.nextVersion === 0)).map((f) => f.key)));
      }
    } finally {
      setBusy(false);
    }
  }

  const d = preview?.data;
  const toggle = (k: RabProjectField) =>
    setApply((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        {isRevision ? "Unggah revisi RAB" : "Unggah RAB"}
      </Button>
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={isRevision ? "Unggah revisi RAB" : "Unggah RAB"}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5 text-sm">
          {!preview && (
            <>
              <p className="text-slate-600 dark:text-slate-300">
                Pilih file RAB Excel (template Sucofindo, .xlsx atau .xlsm). Sistem membaca data proyek, total RAB, laba operasi, target margin, rincian anggaran per akun, lingkup kerja, dan tim pelaksana.
                {isRevision && " RAB awal tetap tersimpan sebagai pembanding (baseline)."}
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
                <FileSpreadsheet className="h-6 w-6 text-brand-blue" />
                <span className="text-slate-600 dark:text-slate-300">{file ? file.name : "Klik untuk memilih file RAB"}</span>
                <input type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <FormError message={error} />
              <div className="flex justify-end">
                <Button disabled={!file} isLoading={busy} onClick={() => file && send(file, false)}>
                  Baca RAB
                </Button>
              </div>
            </>
          )}

          {preview && d && (
            <>
              {(preview.numberMismatch || d.warnings.length > 0) && (
                <div className="space-y-1 rounded-lg border border-signal-soonBorder bg-signal-soonBg px-4 py-3 text-signal-soon">
                  {preview.numberMismatch && <p>{preview.numberMismatch}</p>}
                  {d.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              <div>
                <p className="text-[12.5px] text-slate-500">{preview.fileName}</p>
                <p className="mt-0.5 text-[15px] font-bold text-ink dark:text-slate-100">{d.project.name || "Tanpa nama proyek"}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-line bg-slate-50/70 px-4 py-3.5 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-800/40">
                <Figure label="Nilai proyek" value={formatRupiah(d.revenue, true)} sub="Tanpa PPN" />
                <Figure label="Total RAB" value={formatRupiah(d.operatingCost, true)} sub="Biaya proyek + tak terduga" />
                <Figure label="Laba operasi" value={formatRupiah(d.operatingProfit, true)} sub={d.overhead ? `Overhead ${formatRupiah(d.overhead, true)} tidak dikurangkan` : undefined} />
                <Figure label="Margin" value={formatPercent(d.marginPct)} sub={preview.nextVersion === 0 ? "Menjadi target margin project" : `Target saat ini ${formatPercent(preview.targetMarginPct)}`} strong />
              </div>

              {preview.current && (
                <div className="rounded-lg border border-line px-4 py-3 dark:border-slate-700">
                  <p className="mb-2 font-semibold text-ink dark:text-slate-100">
                    Perubahan dibandingkan {versionLabel(preview.current.version)}
                  </p>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-[12px] text-slate-500">
                        <th />
                        <th className="pb-1 text-right font-medium">Sebelumnya</th>
                        <th className="pb-1 text-right font-medium">RAB ini</th>
                        <th className="pb-1 text-right font-medium">Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Nilai proyek", preview.current.contractValue, d.revenue],
                        ["Total RAB", preview.current.totalCost, d.operatingCost],
                      ].map(([label, a, b]) => {
                        const delta = Number(b) - Number(a ?? 0);
                        return (
                          <tr key={label as string}>
                            <td className="py-1 text-slate-500">{label}</td>
                            <td className="py-1 text-right">{formatRupiah(a as number | null, true)}</td>
                            <td className="py-1 text-right font-semibold">{formatRupiah(b as number, true)}</td>
                            <td className={cn("py-1 text-right", Math.round(delta) === 0 ? "text-slate-400" : "text-ink dark:text-slate-100")}>
                              {Math.round(delta) === 0 ? "tetap" : `${delta > 0 ? "+" : "−"}${formatRupiah(Math.abs(delta), true)}`}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td className="py-1 text-slate-500">Margin</td>
                        <td className="py-1 text-right">{formatPercent(preview.current.marginPct)}</td>
                        <td className="py-1 text-right font-semibold">{formatPercent(d.marginPct)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <details className="rounded-lg border border-line px-4 py-3 dark:border-slate-700">
                <summary className="cursor-pointer font-semibold text-ink dark:text-slate-100">
                  Isi RAB yang terbaca: {d.sections.length} bagian anggaran, {d.items.length} baris berkode akun, {d.scopes.length} lingkup kerja, {d.teamTotal} personil
                </summary>
                <div className="mt-4">
                  <RabSummaryBlocks rab={d} />
                </div>
              </details>

              {preview.fields.some((f) => f.differs) && (
                <div>
                  <p className="mb-1 font-semibold text-ink dark:text-slate-100">Perbarui data project sesuai RAB?</p>
                  <p className="mb-2 text-[12.5px] text-slate-500">Centang data yang ingin disamakan dengan RAB.</p>
                  <div className="space-y-1.5">
                    {preview.fields
                      .filter((f) => f.differs)
                      .map((f) => (
                        <label key={f.key} className="flex cursor-pointer items-start gap-2.5">
                          <input type="checkbox" className="mt-1" checked={apply.has(f.key)} onChange={() => toggle(f.key)} />
                          <span>
                            <span className="font-medium">{f.label}</span>: {fieldText(f.key, f.current)} <span className="text-slate-400">menjadi</span>{" "}
                            <span className="font-medium">{fieldText(f.key, f.fromRab)}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {preview.nextVersion > 0 && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="rab-reason" className="mb-1.5 block text-[13px] font-medium text-slate-600 dark:text-slate-400">
                      Alasan revisi (wajib)
                    </label>
                    <textarea
                      id="rab-reason"
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Contoh: penambahan lingkup sesuai addendum 1; kenaikan harga sewa kendaraan"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                  {d.marginPct !== null && preview.targetMarginPct !== null && Math.abs(d.marginPct - preview.targetMarginPct) >= 0.05 && (
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input type="checkbox" className="mt-1" checked={updateTarget} onChange={(e) => setUpdateTarget(e.target.checked)} />
                      <span>
                        Jadikan margin revisi ini (<strong>{formatPercent(d.marginPct)}</strong>) sebagai target margin project. Target saat ini {formatPercent(preview.targetMarginPct)}.
                      </span>
                    </label>
                  )}
                </div>
              )}

              <p className="text-[12.5px] text-slate-500">
                {preview.nextVersion === 0
                  ? preview.currentBudgetTotal > 0
                    ? `Anggaran yang ada saat ini (${formatRupiah(preview.currentBudgetTotal, true)}) akan diganti dengan rincian RAB ini. RAB ini menjadi baseline dan target margin project.`
                    : "RAB ini menjadi baseline (rencana awal) dan target margin project."
                  : "Rincian anggaran project diganti dengan revisi ini. Baseline (RAB awal) tidak berubah, sehingga selisihnya tampil pada analisis margin."}
              </p>

              <FormError message={error} />
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={reset}>
                  Pilih file lain
                </Button>
                <Button isLoading={busy} disabled={preview.nextVersion > 0 && !reason.trim()} onClick={() => file && send(file, true)}>
                  {preview.nextVersion === 0 ? "Simpan RAB" : "Simpan revisi RAB"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pendapatan, biaya, laba: RAB vs realisasi vs prakiraan
// ---------------------------------------------------------------------------

function PnlTable({ data }: { data: ProjectMonitoringDTO }) {
  const p = data.pnl;
  const m = data.margin;
  const rp = (v: number | null) => (v === null ? "-" : formatRupiah(v, true));
  const share = (a: number, b: number | null) => (b ? ` (${formatPercent((a / b) * 100, 0)})` : "");
  const rows: { label: string; plan: string; actual: React.ReactNode; forecast: string; tone?: "bad" | "good"; bold?: boolean }[] = [
    {
      label: "Pendapatan",
      plan: rp(p.revenue.plan),
      actual: (
        <>
          {rp(p.revenue.actual)}
          <span className="text-slate-400">{share(p.revenue.actual, p.revenue.forecast)}</span>
          <span className="block text-[11.5px] font-normal text-slate-500">
            Ditagih {rp(p.revenue.invoiced)} · diterima {rp(p.revenue.paid)}
          </span>
        </>
      ),
      forecast: rp(p.revenue.forecast),
    },
    {
      label: "Biaya",
      plan: rp(p.cost.plan),
      actual: (
        <>
          {rp(p.cost.actual)}
          <span className="text-slate-400">{share(p.cost.actual, p.cost.plan)}</span>
        </>
      ),
      forecast: rp(p.cost.forecast),
      tone: p.cost.forecast !== null && p.cost.plan !== null && p.cost.forecast > p.cost.plan + 1 ? "bad" : undefined,
    },
    { label: "Laba", plan: rp(p.profit.plan), actual: rp(p.profit.actual), forecast: rp(p.profit.forecast), bold: true, tone: p.profit.forecast !== null && p.profit.forecast < 0 ? "bad" : undefined },
    {
      label: "Margin",
      plan: formatPercent(p.marginPct.plan),
      actual: formatPercent(p.marginPct.actual),
      forecast: formatPercent(p.marginPct.forecast),
      bold: true,
      tone: m.belowTarget ? "bad" : m.signals.margin === "good" ? "good" : undefined,
    },
  ];
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink dark:text-slate-100">
          Pendapatan, biaya, dan laba
          <InfoTip label="Keterangan pendapatan dan biaya">
            <strong>RAB</strong> = rencana awal (baseline). <strong>Realisasi</strong> = s.d. hari ini; pendapatan diakui sesuai progres pekerjaan (progress basis), sedangkan
            ditagih dan diterima mengikuti termin. <strong>Prakiraan akhir</strong> = bila sisa pekerjaan berjalan sesuai RAB. Laba operasi belum dikurangi overhead
            {data.rab.latest?.overhead ? ` (${formatRupiah(data.rab.latest.overhead, true)})` : ""}.
          </InfoTip>
        </p>
        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[12px] font-semibold text-brand-blueDark dark:bg-sky-900/30 dark:text-sky-200">
          Target margin {formatPercent(m.targetMarginPct)}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line dark:border-slate-700">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-50/80 text-left text-[12px] text-slate-500 dark:bg-slate-800/40">
              <th className="px-4 py-2 font-semibold" />
              <th className="px-4 py-2 text-right font-semibold">RAB</th>
              <th className="px-4 py-2 text-right font-semibold">Realisasi s.d. saat ini</th>
              <th className="px-4 py-2 text-right font-semibold">Prakiraan akhir</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line align-top dark:border-slate-800">
                <td className={cn("px-4 py-2.5", r.bold ? "font-semibold text-ink dark:text-slate-100" : "text-slate-600 dark:text-slate-300")}>{r.label}</td>
                <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{r.plan}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-ink dark:text-slate-100">{r.actual}</td>
                <td className={cn("px-4 py-2.5 text-right font-semibold", r.tone === "bad" ? "text-signal-expired" : r.tone === "good" ? "text-signal-active" : "text-ink dark:text-slate-100")}>{r.forecast}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {p.years.length > 1 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-line dark:border-slate-700">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50/80 text-left text-[12px] text-slate-500 dark:bg-slate-800/40">
                <th className="px-4 py-2 font-semibold">Per tahun</th>
                <th className="px-4 py-2 text-right font-semibold">Pendapatan RAB / realisasi</th>
                <th className="px-4 py-2 text-right font-semibold">Biaya RAB / realisasi</th>
                <th className="px-4 py-2 text-right font-semibold">Margin RAB / realisasi</th>
              </tr>
            </thead>
            <tbody>
              {p.years.map((y) => (
                <tr key={y.label} className="border-t border-line dark:border-slate-800">
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {y.label} ({y.year}){y.current && <span className="ml-1.5 text-[11.5px] text-accent">berjalan</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-slate-500">{rp(y.revenuePlan)} / </span>
                    <strong>{y.past || y.current ? rp(y.revenueActual) : "-"}</strong>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-slate-500">{rp(y.costPlan)} / </span>
                    <strong className={cn(y.costActual > y.costPlan && "text-signal-expired")}>{y.past || y.current ? rp(y.costActual) : "-"}</strong>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-slate-500">{formatPercent(y.marginPlan)} / </span>
                    <strong>{formatPercent(y.marginActual)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
