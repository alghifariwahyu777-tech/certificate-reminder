"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { useState } from "react";
import { ClipboardList, LineChart, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { actualAt, actualEvents, formatPercent, interpolate, plannedPoints, suggestPlanRows, type PlanShape } from "@/lib/project-monitoring-shared";
import { Notice } from "@/components/ui/Notice";
import { ActivityProgressModal, dayMs } from "./ActivityProgress";
import { DeleteButton, EmptyState, FileLink, FileUploadField, FormError, fmtDate, todayInput, useMonitoringApi, EMPTY_FILE, useOpenFromHash } from "./shared";
import type { ProgressReportDTO, ProjectMonitoringDTO } from "./types";

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function ProgressPanel({ data }: { data: ProjectMonitoringDTO }) {
  return (
    <div className="space-y-5">
      <ReportsCard data={data} />
      <PlanCard data={data} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Laporan progres (realisasi)
// ---------------------------------------------------------------------------

type ReportForm = Omit<ProgressReportDTO, "id" | "actualPercent" | "createdBy" | "source"> & { actualPercent: string };

function ReportsCard({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgressReportDTO | null>(null);
  const [form, setForm] = useState<ReportForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/progress-reports`;
  const plan = plannedPoints(data.input).points;
  const events = actualEvents(data.input);
  // with activities, realisation is entered per activity; the typed project % is only for projects without activities
  const perActivity = data.milestones.length > 0;
  const [act, setAct] = useState<{ open: boolean; date?: string; n: number }>({ open: false, n: 0 });
  const openActivity = (date?: string) => setAct((a) => ({ open: true, date, n: a.n + 1 }));

  function openForm(r: ProgressReportDTO | null) {
    if (perActivity && (!r || r.source === "ACTIVITY")) return openActivity(r?.reportDate.slice(0, 10));
    setEditing(r);
    setForm(
      r
        ? { ...r, actualPercent: String(r.actualPercent) }
        : {
            reportDate: todayInput(),
            // start from the current computed figure so a report is usually a small correction
            actualPercent: String(data.summary.actualPercent),
            summary: null,
            nextPlan: null,
            ...EMPTY_FILE,
          }
    );
    setError(null);
    setOpen(true);
  }

  useOpenFromHash("progres", () => {
    if (data.canManage) openForm(null);
  });


  async function save() {
    if (!form) return;
    if (form.actualPercent === "" || isNaN(Number(form.actualPercent))) return setError("Progres realisasi wajib diisi.");
    const err = editing
      ? await send("PATCH", `${base}/${editing.id}`, form, "Laporan progres diperbarui.")
      : await send("POST", base, form, "Laporan progres disimpan.");
    if (err) setError(err);
    else setOpen(false);
  }

  const set = <K extends keyof ReportForm>(k: K, v: ReportForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const plannedAtForm = form?.reportDate ? interpolate(plan, Date.parse(form.reportDate)) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Riwayat realisasi
            <InfoTip label="Keterangan riwayat realisasi" guide="progres">
              {perActivity
                ? "Klik Perbarui realisasi, lalu isi persentase terbaru setiap kegiatan. Progres project dihitung otomatis dari persentase kegiatan dikali bobotnya. Boleh diisi setiap hari."
                : "Project ini belum punya kegiatan, jadi progres diisi langsung sebagai persentase project. Tambahkan kegiatan di tab Gantt dan milestone agar progres dihitung per kegiatan."}
            </InfoTip>
          </CardTitle>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{perActivity ? "Satu baris per tanggal pengisian. Angka dihitung dari realisasi setiap kegiatan." : "Progres diisi langsung sebagai persentase project."}</p>
        </div>
        {data.canManage && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            {perActivity ? "Perbarui realisasi" : "Perbarui progres"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.reports.length === 0 ? (
          <EmptyState icon={ClipboardList} text={perActivity ? "Belum ada realisasi. Isi persentase setiap kegiatan untuk membentuk kurva S realisasi." : "Belum ada laporan progres."} action={data.canManage ? { label: perActivity ? "Perbarui realisasi" : "Perbarui progres", onClick: () => openForm(null) } : undefined} />
        ) : (
          <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {data.reports.map((r) => {
              const planned = interpolate(plan, Date.parse(r.reportDate));
              // a per-activity entry always shows today's recalculation, so later corrections are reflected
              const value = r.source === "ACTIVITY" ? actualAt(events, dayMs(r.reportDate.slice(0, 10))) : r.actualPercent;
              const dev = value - planned;
              return (
                <div key={r.id} className="px-5 py-3 flex items-start gap-4">
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium text-ink dark:text-slate-100">{fmtDate(r.reportDate)}</p>
                    <p className="text-xs text-slate-400">{r.createdBy || ""}</p>
                  </div>
                  <div className="w-36 shrink-0">
                    <p className="font-display font-semibold tabular-nums">
                      {formatPercent(value)}
                      {r.source !== "ACTIVITY" && perActivity && <span className="ml-1.5 rounded bg-slate-100 px-1 py-px text-[10.5px] font-medium text-slate-500 dark:bg-slate-800">angka manual</span>}
                    </p>
                    <p className={`text-xs tabular-nums ${dev < 0 ? "text-signal-expired" : "text-signal-active"}`}>
                      rencana {formatPercent(planned)} ({dev > 0 ? "+" : ""}
                      {dev.toLocaleString("id-ID", { maximumFractionDigits: 1 })})
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    {r.summary && <p className="whitespace-pre-line">{r.summary}</p>}
                    {r.nextPlan && (
                      <p className="whitespace-pre-line text-slate-500">
                        <span className="font-medium">Rencana berikutnya:</span> {r.nextPlan}
                      </p>
                    )}
                    <FileLink url={r.fileUrl} />
                  </div>
                  {data.canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label="Ubah laporan"
                        onClick={() => openForm(r)}
                        className="p-1.5 rounded text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <DeleteButton what="laporan progres" onConfirm={() => send("DELETE", `${base}/${r.id}`, undefined, "Laporan dihapus.")} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {perActivity && <ActivityProgressModal key={act.n} data={data} open={act.open} initialDate={act.date} onClose={() => setAct((a) => ({ ...a, open: false }))} />}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Ubah laporan progres" : "Perbarui progres"} maxWidth="max-w-lg">
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rp-date">Tanggal laporan</Label>
                <Input id="rp-date" type="date" value={form.reportDate} onChange={(e) => set("reportDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rp-pct">Progres kumulatif (%)</Label>
                <Input id="rp-pct" type="number" min={0} max={100} step="any" value={form.actualPercent} onChange={(e) => set("actualPercent", e.target.value)} />
              </div>
            </div>
            {plannedAtForm !== null && !isNaN(plannedAtForm) && (
              <p className="text-xs text-slate-500">Rencana pada tanggal ini: {formatPercent(plannedAtForm)}</p>
            )}
            <div>
              <Label htmlFor="rp-sum">Pekerjaan yang telah dilaksanakan</Label>
              <Textarea id="rp-sum" rows={3} value={form.summary || ""} onChange={(e) => set("summary", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rp-next">Rencana periode berikutnya</Label>
              <Textarea id="rp-next" rows={2} value={form.nextPlan || ""} onChange={(e) => set("nextPlan", e.target.value)} />
            </div>
            <FileUploadField
              label="Lampiran laporan (opsional)"
              value={{ fileUrl: form.fileUrl, driveFileId: form.driveFileId, fileMimeType: form.fileMimeType }}
              onChange={(v) => setForm((f) => (f ? { ...f, ...v } : f))}
            />
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
        )}
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Rencana progres (Kurva S rencana)
// ---------------------------------------------------------------------------

type Row = { periodDate: string; plannedPercent: string };

function PlanCard({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const source = data.summary.planSource;

  function openEditor() {
    setRows(data.plans.map((p) => ({ periodDate: p.periodDate, plannedPercent: String(p.plannedPercent) })));
    setError(null);
    setOpen(true);
  }

  const hasMilestonePlan = data.input.milestones.some((m) => m.plannedDate !== null && m.weight > 0);
  const [shape, setShape] = useState<PlanShape>("S");
  const [interval, setPeriod] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
  useOpenFromHash("progres", openEditor, "rencana");

  function autofill() {
    setRows(suggestPlanRows(data.input, interval, shape).map((r) => ({ periodDate: iso(r.periodDate), plannedPercent: String(r.plannedPercent) })));
  }

  async function save(clear = false) {
    const clean = clear ? [] : rows.filter((r) => r.periodDate && r.plannedPercent !== "");
    const err = await send(
      "PUT",
      `/api/projects/${data.projectId}/progress-plan`,
      { rows: clean.map((r) => ({ periodDate: r.periodDate, plannedPercent: Number(r.plannedPercent) })) },
      clear ? "Rencana manual dihapus." : "Rencana progres disimpan."
    );
    if (err) setError(err);
    else setOpen(false);
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Kurva S resmi kontrak (opsional)
            <InfoTip label="Keterangan kurva S resmi" guide="progres">
              Garis rencana kurva S dihitung otomatis dari jadwal kegiatan: setiap kegiatan direncanakan merata dari tanggal mulai sampai selesai, lalu dijumlah sesuai bobotnya.
              Isi tabel ini hanya bila kontrak memiliki kurva S resmi yang harus diikuti. Bila diisi, tabel ini yang dipakai sebagai garis rencana.
            </InfoTip>
          </CardTitle>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {source === "MANUAL"
              ? `Garis rencana memakai ${data.plans.length} titik kurva S resmi di bawah, bukan jadwal kegiatan.`
              : source === "ACTIVITY"
                ? "Tidak perlu diisi. Garis rencana sudah dihitung dari jadwal kegiatan."
                : "Garis rencana memakai kurva S standar karena kegiatan belum punya tanggal rencana. Isi tanggal mulai dan selesai pada setiap kegiatan."}
          </p>
        </div>
        {data.canManage && (
          <Button size="sm" variant="outline" onClick={openEditor}>
            <Pencil className="h-4 w-4" />
            {data.plans.length ? "Ubah" : "Isi kurva S resmi"}
          </Button>
        )}
      </CardHeader>
      {data.plans.length > 0 && (
        <CardContent className="p-0">
          <div className="max-h-80 overflow-x-auto border-t border-line dark:border-slate-800">
            {data.canManage && data.milestones.length > 0 && (
              <div className="px-5 pt-3">
                <Notice tone="info">
                  Kurva S resmi sedang dipakai sebagai garis rencana.{" "}
                  <button type="button" onClick={() => save(true)} className="font-semibold underline">
                    Pakai jadwal kegiatan saja
                  </button>
                </Notice>
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="th-row">
                  <th className="px-5 py-2.5 font-medium">Periode</th>
                  <th className="px-5 py-2.5 font-medium text-right">Rencana kumulatif</th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((p) => (
                  <tr key={p.periodDate} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="px-5 py-2">{fmtDate(p.periodDate)}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{formatPercent(p.plannedPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Kurva S resmi kontrak" maxWidth="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Isi persentase <strong>kumulatif</strong> yang direncanakan tercapai pada tiap tanggal, misalnya 10% di akhir bulan pertama, 35% di akhir bulan kedua, sampai 100% di
            target selesai. Agar cepat, buat isian otomatis lalu sesuaikan angkanya.
          </p>
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-paper p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:border-slate-700 dark:bg-slate-800/40">
            <div>
              <Label htmlFor="plan-shape">Bentuk</Label>
              <select id="plan-shape" value={shape} onChange={(e) => setShape(e.target.value as PlanShape)} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="S">Kurva S standar</option>
                {hasMilestonePlan && <option value="MILESTONE">Ikuti jadwal kegiatan</option>}
                <option value="LINEAR">Garis lurus</option>
              </select>
            </div>
            <div>
              <Label htmlFor="plan-interval">Periode</Label>
              <select id="plan-interval" value={interval} onChange={(e) => setPeriod(e.target.value as "DAILY" | "WEEKLY" | "MONTHLY")} className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="MONTHLY">Akhir bulan</option>
                <option value="WEEKLY">Mingguan</option>
                {(Date.parse(data.targetEndDate) - Date.parse(data.startDate ?? data.targetEndDate)) / 86400000 <= 395 && <option value="DAILY">Harian</option>}
              </select>
            </div>
            <Button size="sm" variant="outline" onClick={autofill}>
              <Wand2 className="h-4 w-4" />
              Isi otomatis
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRows((r) => [...r, { periodDate: "", plannedPercent: "" }])}>
              <Plus className="h-4 w-4" />
              Baris
            </Button>
          </div>
          <div className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-slate-400">Belum ada baris.</p>}
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_8rem_2rem] gap-2 items-center">
                <Input type="date" aria-label={`Periode ${i + 1}`} value={r.periodDate} onChange={(e) => setRow(i, { periodDate: e.target.value })} />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  aria-label={`Rencana % periode ${i + 1}`}
                  value={r.plannedPercent}
                  onChange={(e) => setRow(i, { plannedPercent: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Hapus baris"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  className="p-1.5 rounded text-slate-400 hover:text-signal-expired"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <FormError message={error} />
          <div className="flex justify-between gap-2">
            {data.plans.length > 0 ? (
              <Button variant="danger" onClick={() => save(true)} disabled={busy}>
                Hapus, pakai jadwal kegiatan
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button isLoading={busy} onClick={() => save(false)}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
