"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Plus, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { InfoTip } from "@/components/ui/InfoTip";
import type { MappingRow } from "@/lib/personnel-mapping";
import { cn } from "@/lib/utils";
import { FormError, Stat, SubTabs, fmtDate, useMonitoringApi } from "./shared";
import { LoadBadge } from "./TeamPanel";

const ROLE_SUGGESTIONS = ["Ketua Tim", "Inspektur", "Auditor", "Surveyor", "Tenaga Ahli", "Analis Laboratorium", "Pengawas Lapangan", "Admin Project"];

type ProjectOption = { id: string; name: string; number: string };
type View = "bertugas" | "kosong" | "semua";

/**
 * Who works on which running project (SDB — one person may serve several
 * projects at once), with certificates that run out during the assignment.
 * Assigning is done right here: pick a person, a project and a role.
 */
export function PersonnelMapping({ rows, projects, canManage }: { rows: MappingRow[]; projects: ProjectOption[]; canManage: boolean }) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("bertugas");
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [assignFor, setAssignFor] = useState<{ employeeId: string } | null>(null);

  const assigned = rows.filter((r) => r.activeProjects > 0);
  const idle = rows.length - assigned.length;
  const busy = assigned.filter((r) => r.activeProjects >= 3).length;
  const withWarn = assigned.filter((r) => r.warnings.length > 0);
  const expired = withWarn.filter((r) => r.warnings.some((w) => w.expired)).length;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (view === "semua" || (view === "bertugas" ? r.activeProjects > 0 : r.activeProjects === 0)) &&
        (!onlyWarn || r.warnings.length > 0) &&
        (!t ||
          [r.name, r.nip || "", r.position || "", r.department || "", ...r.assignments.map((a) => `${a.projectName} ${a.projectNumber} ${a.role}`)].some((v) =>
            v.toLowerCase().includes(t)
          ))
    );
  }, [rows, q, view, onlyWarn]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink dark:text-slate-100">
          Penugasan personil di project berjalan
          <InfoTip label="Tentang mapping personil">
            Satu personil dapat bertugas di beberapa project sekaligus (SDB). Halaman ini menunjukkan siapa bertugas di mana, siapa yang bebannya tinggi (3 project atau lebih),
            dan sertifikasi yang berakhir selama masa tugas.
          </InfoTip>
        </p>
        {canManage && (
          <Button onClick={() => setAssignFor({ employeeId: "" })} className="shrink-0">
            <UserPlus className="h-4 w-4" />
            Tugaskan personil
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Personil bertugas" value={`${assigned.length} orang`} hint={`${idle} personil aktif belum bertugas di project berjalan`} />
        <Stat label="Beban tinggi" tone={busy ? "warn" : "default"} value={`${busy} orang`} hint="Bertugas di 3 project atau lebih sekaligus" />
        <Stat
          label="Sertifikasi bermasalah"
          tone={expired ? "bad" : withWarn.length ? "warn" : "good"}
          value={`${withWarn.length} orang`}
          hint={expired ? `${expired} di antaranya sudah berakhir, tetapi masih bertugas` : "Berakhir sebelum masa tugas selesai"}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center dark:border-slate-800">
          <SubTabs<View>
            items={[
              { key: "bertugas", label: `Bertugas ${assigned.length}` },
              { key: "kosong", label: `Belum bertugas ${idle}` },
              { key: "semua", label: `Semua ${rows.length}` },
            ]}
            value={view}
            onChange={setView}
          />
          <div className="flex flex-1 flex-wrap items-center gap-3 lg:justify-end">
            <label className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="rounded border-slate-300" checked={onlyWarn} onChange={(e) => setOnlyWarn(e.target.checked)} />
              Hanya yang sertifikasinya bermasalah
            </label>
            <div className="w-full sm:w-60">
              <SearchPopoverButton value={q} onChange={setQ} label="Cari personil / project" placeholder="Nama, NIP, jabatan, project, atau peran" />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <Users className="h-7 w-7 text-slate-400" />
            <p className="max-w-md text-sm text-slate-500">
              {rows.length === 0
                ? "Belum ada data personil. Tambahkan personil terlebih dahulu pada menu Employees."
                : view === "bertugas" && assigned.length === 0
                  ? "Belum ada personil yang ditugaskan ke project berjalan."
                  : "Tidak ada personil yang cocok dengan pencarian atau filter."}
            </p>
            {rows.length === 0 ? (
              <Link href="/employees">
                <Button variant="outline" size="sm">
                  Buka Employees
                </Button>
              </Link>
            ) : (
              canManage &&
              assigned.length === 0 && (
                <Button size="sm" onClick={() => setAssignFor({ employeeId: "" })}>
                  <UserPlus className="h-4 w-4" />
                  Tugaskan personil
                </Button>
              )
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/70 text-left text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
                  <th className="py-2.5 pl-5 pr-3 font-semibold">Personil</th>
                  <th className="px-3 py-2.5 font-semibold">Beban</th>
                  <th className="px-3 py-2.5 font-semibold">Bertugas di</th>
                  <th className="px-3 py-2.5 font-semibold">Sertifikasi</th>
                  {canManage && <th className="py-2.5 pl-3 pr-5" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.employeeId} className="border-b border-line/70 align-top last:border-0 dark:border-slate-800/60">
                    <td className="min-w-[12rem] py-3 pl-5 pr-3">
                      <p className="font-semibold text-ink dark:text-slate-100">{r.name}</p>
                      <p className="text-[12.5px] text-slate-500">{[r.nip, r.position, r.department].filter(Boolean).join(" · ") || "-"}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {r.activeProjects > 0 ? <LoadBadge count={r.activeProjects} /> : <span className="text-[12.5px] text-slate-400">Belum bertugas</span>}
                    </td>
                    <td className="min-w-[16rem] px-3 py-3">
                      {r.assignments.length === 0 ? (
                        <span className="text-[12.5px] text-slate-400">-</span>
                      ) : (
                        <ul className="space-y-1">
                          {r.assignments.map((a, i) => (
                            <li key={i} className="text-[13px]">
                              <Link href={`/projects/${a.projectId}#tim/personil`} className="font-medium text-ink hover:text-accent hover:underline dark:text-slate-100">
                                {a.projectName}
                              </Link>
                              <span className="text-slate-500">
                                {" "}
                                sebagai {a.role}, s.d. {fmtDate(a.end)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="min-w-[12rem] px-3 py-3">
                      {r.warnings.length === 0 ? (
                        <span className="text-[12.5px] text-signal-active">Aman</span>
                      ) : (
                        r.warnings.map((w) => (
                          <p key={w.name} className={cn("flex items-start gap-1 text-[12.5px]", w.expired ? "text-signal-expired" : "text-signal-soon")}>
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>
                              {w.name}: {w.expired ? "sudah berakhir" : "berakhir"} {fmtDate(w.expiryDate)}
                            </span>
                          </p>
                        ))
                      )}
                    </td>
                    {canManage && (
                      <td className="py-3 pl-3 pr-5 text-right">
                        <Button size="sm" variant="outline" onClick={() => setAssignFor({ employeeId: r.employeeId })}>
                          <Plus className="h-4 w-4" />
                          Tugaskan
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {assignFor && <AssignDialog rows={rows} projects={projects} initialEmployeeId={assignFor.employeeId} onClose={() => setAssignFor(null)} />}
    </div>
  );
}

function AssignDialog({ rows, projects, initialEmployeeId, onClose }: { rows: MappingRow[]; projects: ProjectOption[]; initialEmployeeId: string; onClose: () => void }) {
  const { send, busy } = useMonitoringApi();
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const person = rows.find((r) => r.employeeId === employeeId);
  const already = new Set(person?.assignments.map((a) => a.projectId) ?? []);

  async function save() {
    if (!employeeId) return setError("Pilih personil.");
    if (!projectId) return setError("Pilih project.");
    if (!role.trim()) return setError("Isi peran personil di project ini.");
    const err = await send("POST", `/api/projects/${projectId}/team`, { employeeId, role, startDate, endDate, notes: "" }, "Personil berhasil ditugaskan.");
    if (err) setError(err);
    else onClose();
  }

  return (
    <Modal isOpen onClose={onClose} title="Tugaskan personil ke project" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div>
          <Label htmlFor="as-emp">Personil</Label>
          <Select id="as-emp" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Pilih personil</option>
            {rows.map((r) => (
              <option key={r.employeeId} value={r.employeeId}>
                {r.name}
                {r.position ? ` (${r.position})` : ""}
                {r.activeProjects ? `, ${r.activeProjects} project aktif` : ""}
              </option>
            ))}
          </Select>
          {person && person.activeProjects >= 3 && (
            <p className="mt-1 text-[12.5px] text-signal-soon">Personil ini sudah bertugas di {person.activeProjects} project. Pastikan bebannya masih memungkinkan.</p>
          )}
          {person && person.warnings.some((w) => w.expired) && (
            <p className="mt-1 text-[12.5px] text-signal-expired">Ada sertifikasi personil ini yang sudah berakhir.</p>
          )}
        </div>
        <div>
          <Label htmlFor="as-prj">Project</Label>
          <Select id="as-prj" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Pilih project berjalan</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} disabled={already.has(p.id)}>
                {p.name} ({p.number}){already.has(p.id) ? ", sudah bertugas" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="as-role">Peran di project</Label>
          <Input id="as-role" list="as-role-suggestions" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Contoh: Inspektur" />
          <datalist id="as-role-suggestions">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-slate-500">Periode penugasan (opsional; bila kosong mengikuti periode project)</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="as-start">Mulai</Label>
              <Input id="as-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="as-end">Selesai</Label>
              <Input id="as-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </details>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button isLoading={busy} onClick={save}>
            Tugaskan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
