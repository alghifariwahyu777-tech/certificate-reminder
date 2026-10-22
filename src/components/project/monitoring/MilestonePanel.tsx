"use client";

import { useState } from "react";
import { CheckCircle2, Flag, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MILESTONE_STATUS_LABEL } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { DeleteButton, EmptyState, FileLink, FileUploadField, FormError, fmtDate, todayInput, useMonitoringApi, EMPTY_FILE } from "./shared";
import type { MilestoneDTO, ProjectMonitoringDTO } from "./types";

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  DONE: "bg-signal-activeBg text-signal-active border-signal-activeBorder",
};

type FormState = Omit<MilestoneDTO, "id" | "weight" | "sequence"> & { weight: string; sequence: string };

function toForm(m: MilestoneDTO | null, nextSeq: number, remaining: number): FormState {
  return m
    ? { ...m, weight: String(m.weight), sequence: String(m.sequence) }
    : {
        name: "",
        description: null,
        weight: remaining > 0 ? String(Math.round(remaining * 10) / 10) : "",
        sequence: String(nextSeq),
        plannedDate: null,
        actualDate: null,
        status: "PENDING",
        notes: null,
        ...EMPTY_FILE,
      };
}

export function MilestonePanel({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [editing, setEditing] = useState<MilestoneDTO | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(toForm(null, 1, 100));
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/milestones`;
  const totalWeight = data.milestones.reduce((s, m) => s + m.weight, 0);

  function openForm(m: MilestoneDTO | null) {
    setEditing(m);
    setForm(toForm(m, data.milestones.length + 1, 100 - totalWeight));
    setError(null);
    setOpen(true);
  }

  const payload = (f: FormState) => ({
    ...f,
    weight: f.weight === "" ? 0 : f.weight,
    sequence: f.sequence === "" ? 0 : f.sequence,
    actualDate: f.status === "DONE" ? f.actualDate || todayInput() : null,
  });

  async function save() {
    if (!form.name.trim()) return setError("Nama milestone wajib diisi.");
    const err = editing
      ? await send("PATCH", `${base}/${editing.id}`, payload(form), "Milestone diperbarui.")
      : await send("POST", base, payload(form), "Milestone ditambahkan.");
    if (err) setError(err);
    else setOpen(false);
  }

  async function markDone(m: MilestoneDTO) {
    await send("PATCH", `${base}/${m.id}`, payload({ ...toForm(m, 0, 0), status: "DONE", actualDate: todayInput() }), `"${m.name}" ditandai selesai.`);
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Milestone & Deliverable</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Bobot milestone yang selesai menjadi progres realisasi otomatis. Total bobot saat ini{" "}
            <span className={cn("font-medium", Math.abs(totalWeight - 100) > 0.05 ? "text-signal-soon" : "text-signal-active")}>
              {totalWeight.toLocaleString("id-ID")}%
            </span>
            .
          </p>
        </div>
        {data.canManage && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.milestones.length === 0 ? (
          <EmptyState icon={Flag} text="Belum ada milestone. Tambahkan tahapan pekerjaan beserta bobotnya, mis. Kick-off 5%, Pelaksanaan 60%, Laporan Final 30%, BAST 5%." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2.5 font-medium w-10">#</th>
                  <th className="px-3 py-2.5 font-medium">Milestone</th>
                  <th className="px-3 py-2.5 font-medium text-right">Bobot</th>
                  <th className="px-3 py-2.5 font-medium">Rencana</th>
                  <th className="px-3 py-2.5 font-medium">Aktual</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  {data.canManage && <th className="px-5 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {data.milestones.map((m) => {
                  const late = m.status !== "DONE" && m.plannedDate && m.plannedDate < todayInput();
                  return (
                    <tr key={m.id} className="border-b border-slate-50 dark:border-slate-800/60 align-top">
                      <td className="px-5 py-3 text-slate-400 tabular-nums">{m.sequence}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-ink dark:text-slate-100">{m.name}</p>
                        {m.description && <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{m.description}</p>}
                        <FileLink url={m.fileUrl} label="Bukti" />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{m.weight.toLocaleString("id-ID")}%</td>
                      <td className={cn("px-3 py-3 whitespace-nowrap", late && "text-signal-expired font-medium")}>
                        {fmtDate(m.plannedDate)}
                        {late && <span className="block text-[11px]">terlambat</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{fmtDate(m.actualDate)}</td>
                      <td className="px-3 py-3">
                        <span className={cn("stamp-badge", STATUS_CLASS[m.status])}>{MILESTONE_STATUS_LABEL[m.status]}</span>
                      </td>
                      {data.canManage && (
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {m.status !== "DONE" && (
                              <button
                                type="button"
                                disabled={busy}
                                title="Tandai selesai hari ini"
                                aria-label="Tandai selesai"
                                onClick={() => markDone(m)}
                                className="p-1.5 rounded text-slate-400 hover:text-signal-active hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Edit"
                              aria-label="Edit milestone"
                              onClick={() => openForm(m)}
                              className="p-1.5 rounded text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <DeleteButton what="milestone" onConfirm={() => send("DELETE", `${base}/${m.id}`, undefined, "Milestone dihapus.")} />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit Milestone" : "Tambah Milestone"} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <div>
              <Label htmlFor="ms-name">Nama milestone / deliverable</Label>
              <Input id="ms-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Contoh: Laporan Final" />
            </div>
            <div>
              <Label htmlFor="ms-seq">Urutan</Label>
              <Input id="ms-seq" type="number" min={0} value={form.sequence} onChange={(e) => set("sequence", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ms-desc">Keterangan</Label>
            <Textarea id="ms-desc" rows={2} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ms-weight">Bobot (%)</Label>
              <Input id="ms-weight" type="number" min={0} max={100} step="any" value={form.weight} onChange={(e) => set("weight", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ms-planned">Tanggal rencana</Label>
              <Input id="ms-planned" type="date" value={form.plannedDate || ""} onChange={(e) => set("plannedDate", e.target.value || null)} />
            </div>
            <div>
              <Label htmlFor="ms-status">Status</Label>
              <Select id="ms-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {Object.entries(MILESTONE_STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            {form.status === "DONE" && (
              <div>
                <Label htmlFor="ms-actual">Tanggal selesai aktual</Label>
                <Input id="ms-actual" type="date" value={form.actualDate || ""} onChange={(e) => set("actualDate", e.target.value || null)} />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="ms-notes">Catatan</Label>
            <Textarea id="ms-notes" rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <FileUploadField
            label="Bukti / dokumen deliverable (opsional)"
            value={{ fileUrl: form.fileUrl, driveFileId: form.driveFileId, fileMimeType: form.fileMimeType }}
            onChange={(v) => setForm((f) => ({ ...f, ...v }))}
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
      </Modal>
    </Card>
  );
}
