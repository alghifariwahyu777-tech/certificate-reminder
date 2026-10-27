"use client";

import { useState } from "react";
import { ClipboardList, LineChart, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatPercent, interpolate, plannedPoints, suggestPlanRows } from "@/lib/project-monitoring-shared";
import { DeleteButton, EmptyState, FileLink, FileUploadField, FormError, fmtDate, todayInput, useMonitoringApi, EMPTY_FILE } from "./shared";
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

type ReportForm = Omit<ProgressReportDTO, "id" | "actualPercent" | "createdBy"> & { actualPercent: string };

function ReportsCard({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgressReportDTO | null>(null);
  const [form, setForm] = useState<ReportForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/progress-reports`;
  const plan = plannedPoints(data.input).points;

  function openForm(r: ProgressReportDTO | null) {
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
          <CardTitle>Laporan Progres</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Isi progres kumulatif secara berkala. Laporan manual mengoreksi angka dari milestone sampai ada milestone selesai/laporan yang lebih baru.
          </p>
        </div>
        {data.canManage && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Laporan Baru
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.reports.length === 0 ? (
          <EmptyState icon={ClipboardList} text="Belum ada laporan progres." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.reports.map((r) => {
              const planned = interpolate(plan, Date.parse(r.reportDate));
              const dev = r.actualPercent - planned;
              return (
                <div key={r.id} className="px-5 py-3 flex items-start gap-4">
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium text-ink dark:text-slate-100">{fmtDate(r.reportDate)}</p>
                    <p className="text-xs text-slate-400">{r.createdBy || ""}</p>
                  </div>
                  <div className="w-36 shrink-0">
                    <p className="font-display font-semibold tabular-nums">{formatPercent(r.actualPercent)}</p>
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
                        aria-label="Edit laporan"
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

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit Laporan Progres" : "Laporan Progres Baru"} maxWidth="max-w-lg">
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

  function autofill(interval: "WEEKLY" | "MONTHLY") {
    setRows(suggestPlanRows(data.input, interval).map((r) => ({ periodDate: iso(r.periodDate), plannedPercent: String(r.plannedPercent) })));
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
          <CardTitle>Rencana Progres (Kurva S Rencana)</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            {source === "MANUAL"
              ? `${data.plans.length} periode rencana diisi manual.`
              : source === "MILESTONE"
                ? "Saat ini dihitung dari tanggal rencana dan bobot milestone. Isi tabel bila punya jadwal rencana resmi (mis. dari proposal/kontrak)."
                : "Saat ini garis lurus dari tanggal mulai ke target selesai. Isi tabel atau tambahkan milestone bertanggal agar lebih akurat."}
          </p>
        </div>
        {data.canManage && (
          <Button size="sm" variant="outline" onClick={openEditor}>
            <Pencil className="h-4 w-4" />
            Atur Rencana
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.plans.length === 0 ? (
          <EmptyState icon={LineChart} text="Belum ada rencana manual." />
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
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
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Atur Rencana Progres" maxWidth="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Isi persentase <strong>kumulatif</strong> yang direncanakan tercapai pada akhir tiap periode. Gunakan isi otomatis sebagai titik awal lalu sesuaikan.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => autofill("WEEKLY")}>
              <Wand2 className="h-4 w-4" />
              Isi otomatis mingguan
            </Button>
            <Button size="sm" variant="outline" onClick={() => autofill("MONTHLY")}>
              <Wand2 className="h-4 w-4" />
              Isi otomatis bulanan
            </Button>
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
                Hapus rencana manual
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
