"use client";

import { useState } from "react";
import { AlertOctagon, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ISSUE_IMPACT_LABEL, ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { DeleteButton, EmptyState, FormError, fmtDate, todayInput, useMonitoringApi, useOpenFromHash } from "./shared";
import type { IssueDTO, ProjectMonitoringDTO } from "./types";

const IMPACT_CLASS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  MEDIUM: "bg-signal-soonBg text-signal-soon border-signal-soonBorder",
  HIGH: "bg-signal-expiredBg text-signal-expired border-signal-expiredBorder",
};

type Form = { type: string; title: string; description: string; impact: string; owner: string; targetDate: string; status: string; resolution: string };
const blank: Form = { type: "ISSUE", title: "", description: "", impact: "MEDIUM", owner: "", targetDate: "", status: "OPEN", resolution: "" };

export function IssuePanel({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IssueDTO | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"OPEN" | "ALL">("OPEN");
  const base = `/api/projects/${data.projectId}/issues`;
  const items = filter === "OPEN" ? data.issues.filter((i) => i.status === "OPEN") : data.issues;

  function openForm(i: IssueDTO | null) {
    setEditing(i);
    setForm(
      i
        ? {
            type: i.type,
            title: i.title,
            description: i.description || "",
            impact: i.impact,
            owner: i.owner || "",
            targetDate: i.targetDate || "",
            status: i.status,
            resolution: i.resolution || "",
          }
        : blank
    );
    setError(null);
    setOpen(true);
  }

  useOpenFromHash("kendala", () => {
    if (data.canManage) openForm(null);
  });


  async function save() {
    if (!form.title.trim()) return setError("Judul wajib diisi.");
    const err = editing ? await send("PATCH", `${base}/${editing.id}`, form, "Data diperbarui.") : await send("POST", base, form, "Kendala/risiko dicatat.");
    if (err) setError(err);
    else setOpen(false);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const today = todayInput();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Kendala & risiko</CardTitle>
          <div className="mt-2 flex gap-1">
            {(["OPEN", "ALL"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium",
                  filter === f ? "bg-ink text-white dark:bg-slate-100 dark:text-ink" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {f === "OPEN" ? `Terbuka (${data.issues.filter((i) => i.status === "OPEN").length})` : `Semua (${data.issues.length})`}
              </button>
            ))}
          </div>
        </div>
        {data.canManage && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Catat kendala
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState icon={AlertOctagon} text={filter === "OPEN" ? "Tidak ada kendala atau risiko yang masih terbuka." : "Belum ada kendala atau risiko yang dicatat."} action={data.canManage ? { label: "Catat kendala", onClick: () => openForm(null) } : undefined} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((i) => {
              const late = i.status === "OPEN" && i.targetDate && i.targetDate < today;
              return (
                <div key={i.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{ISSUE_TYPE_LABEL[i.type]}</span>
                      <p className={cn("font-medium text-ink dark:text-slate-100", i.status === "CLOSED" && "line-through opacity-60")}>{i.title}</p>
                      <span className={cn("stamp-badge", IMPACT_CLASS[i.impact])}>Dampak {ISSUE_IMPACT_LABEL[i.impact]?.toLowerCase()}</span>
                      {i.status === "CLOSED" && <span className="stamp-badge bg-signal-activeBg text-signal-active border-signal-activeBorder">{ISSUE_STATUS_LABEL.CLOSED}</span>}
                    </div>
                    {i.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">{i.description}</p>}
                    <p className={cn("text-xs mt-1", late ? "text-signal-expired font-medium" : "text-slate-500")}>
                      {i.owner ? `PIC: ${i.owner} · ` : ""}
                      {i.targetDate ? `Target: ${fmtDate(i.targetDate)}${late ? " (lewat)" : ""} · ` : ""}
                      Dicatat {fmtDate(i.createdAt)}
                      {i.createdBy ? ` oleh ${i.createdBy}` : ""}
                    </p>
                    {i.resolution && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        <span className="font-medium">Tindak lanjut:</span> {i.resolution}
                      </p>
                    )}
                  </div>
                  {data.canManage && (
                    <div className="flex gap-1 shrink-0">
                      <button type="button" aria-label="Edit" onClick={() => openForm(i)} className="p-1.5 rounded text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <DeleteButton what="kendala/risiko" onConfirm={() => send("DELETE", `${base}/${i.id}`, undefined, "Data dihapus.")} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit kendala/risiko" : "Catat kendala/risiko"} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="is-type">Jenis</Label>
              <Select id="is-type" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="ISSUE">Kendala (sudah terjadi)</option>
                <option value="RISK">Risiko (mungkin terjadi)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="is-impact">Dampak</Label>
              <Select id="is-impact" value={form.impact} onChange={(e) => set("impact", e.target.value)}>
                {Object.entries(ISSUE_IMPACT_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="is-title">Judul</Label>
            <Input id="is-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Contoh: Akses lokasi tertunda izin K3 pemilik" />
          </div>
          <div>
            <Label htmlFor="is-desc">Uraian</Label>
            <Textarea id="is-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="is-owner">PIC tindak lanjut</Label>
              <Input id="is-owner" value={form.owner} onChange={(e) => set("owner", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="is-target">Target selesai</Label>
              <Input id="is-target" type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="is-status">Status</Label>
            <Select id="is-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {Object.entries(ISSUE_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="is-res">Tindak lanjut / penyelesaian</Label>
            <Textarea id="is-res" rows={2} value={form.resolution} onChange={(e) => set("resolution", e.target.value)} />
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
    </Card>
  );
}
