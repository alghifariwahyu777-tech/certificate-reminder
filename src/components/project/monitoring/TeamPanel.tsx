"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Pencil, Plus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { DeleteButton, EmptyState, FormError, fmtDate, useMonitoringApi, useOpenFromHash } from "./shared";
import type { ProjectMonitoringDTO, TeamMemberDTO } from "./types";

const ROLE_SUGGESTIONS = ["Ketua Tim", "Inspektur", "Auditor", "Surveyor", "Tenaga Ahli", "Analis Laboratorium", "Pengawas Lapangan", "Admin Project"];

/** SDB load badge: how many running projects this person is on. */
export function LoadBadge({ count }: { count: number }) {
  const cls =
    count >= 5
      ? "bg-signal-expiredBg text-signal-expired border-signal-expiredBorder"
      : count >= 3
        ? "bg-signal-soonBg text-signal-soon border-signal-soonBorder"
        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  return <span className={cn("stamp-badge", cls)}>{count} project aktif</span>;
}

type Form = { employeeId: string; role: string; startDate: string; endDate: string; notes: string };

export function TeamPanel({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMemberDTO | null>(null);
  const [form, setForm] = useState<Form>({ employeeId: "", role: "", startDate: "", endDate: "", notes: "" });
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/team`;

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return data.employees.filter((e) => !q || [e.name, e.nip || "", e.position || ""].some((v) => v.toLowerCase().includes(q)));
  }, [data.employees, filter]);

  function openForm(m: TeamMemberDTO | null) {
    setEditing(m);
    setForm(
      m
        ? { employeeId: m.employeeId, role: m.role, startDate: m.startDate || "", endDate: m.endDate || "", notes: m.notes || "" }
        : { employeeId: "", role: "", startDate: "", endDate: "", notes: "" }
    );
    setFilter("");
    setError(null);
    setOpen(true);
  }

  useOpenFromHash("personil", () => {
    if (data.canManage) openForm(null);
  });


  async function save() {
    if (!form.employeeId) return setError("Pilih personil.");
    if (!form.role.trim()) return setError("Isi peran personil di project ini.");
    const err = editing ? await send("PATCH", `${base}/${editing.id}`, form, "Penugasan diperbarui.") : await send("POST", base, form, "Personil ditambahkan ke tim.");
    if (err) setError(err);
    else setOpen(false);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const warnCount = data.team.filter((m) => m.warnings.length > 0).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Tim project</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Personil yang ditugaskan. Beban kerja dihitung dari semua project berjalan —{" "}
            <Link href="/projects/personnel" className="text-accent hover:underline">
              lihat mapping personil
            </Link>
            .
          </p>
        </div>
        {data.canManage && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Tugaskan personil
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {warnCount > 0 && (
          <div className="mx-5 mb-3 rounded border border-signal-soonBorder bg-signal-soonBg px-3 py-2 text-sm text-signal-soon flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {warnCount} personil memiliki sertifikasi yang habis sebelum penugasannya selesai.
          </div>
        )}
        {data.team.length === 0 ? (
          <EmptyState icon={Users} text="Belum ada personil yang ditugaskan ke project ini." action={data.canManage ? { label: "Tugaskan personil", onClick: () => openForm(null) } : undefined} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.team.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink dark:text-slate-100">{m.name}</p>
                    <span className="text-xs text-slate-500">· {m.role}</span>
                    <LoadBadge count={m.activeProjects} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.nip ? `${m.nip} · ` : ""}
                    {m.position || "—"}
                    {(m.startDate || m.endDate) && ` · ${fmtDate(m.startDate)} – ${fmtDate(m.endDate)}`}
                  </p>
                  {m.warnings.map((w) => (
                    <p key={w.name} className={cn("text-xs mt-1 flex items-center gap-1", w.expired ? "text-signal-expired" : "text-signal-soon")}>
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {w.name} {w.expired ? "sudah habis" : "habis"} {fmtDate(w.expiryDate)}
                    </p>
                  ))}
                </div>
                {data.canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button type="button" aria-label="Edit penugasan" onClick={() => openForm(m)} className="p-1.5 rounded text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <DeleteButton what="penugasan" onConfirm={() => send("DELETE", `${base}/${m.id}`, undefined, "Personil dikeluarkan dari tim.")} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit penugasan" : "Tugaskan personil"} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <Label htmlFor="tm-emp">Personil</Label>
            {!editing && (
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ketik untuk menyaring nama/NIP/jabatan…" className="mb-2" aria-label="Saring personil" />
            )}
            <Select id="tm-emp" value={form.employeeId} disabled={!!editing} onChange={(e) => set("employeeId", e.target.value)}>
              <option value="">— pilih personil —</option>
              {(editing ? data.employees : options).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.nip ? ` (${e.nip})` : ""}
                  {e.position ? ` — ${e.position}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tm-role">Peran di project</Label>
            <Input id="tm-role" list="role-suggestions" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Contoh: Inspektur" />
            <datalist id="role-suggestions">
              {ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <details className="text-sm" open={!!(form.startDate || form.endDate)}>
            <summary className="cursor-pointer text-slate-500 select-none">Periode penugasan (opsional — default mengikuti project)</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label htmlFor="tm-start">Mulai</Label>
                <Input id="tm-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tm-end">Selesai</Label>
                <Input id="tm-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
            </div>
          </details>
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
