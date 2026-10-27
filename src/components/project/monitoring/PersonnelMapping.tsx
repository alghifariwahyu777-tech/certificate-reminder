"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import type { MappingRow } from "@/lib/personnel-mapping";
import { cn } from "@/lib/utils";
import { EmptyState, Stat, fmtDate } from "./shared";
import { LoadBadge } from "./TeamPanel";

export function PersonnelMapping({ rows }: { rows: MappingRow[] }) {
  const [q, setQ] = useState("");
  const [showIdle, setShowIdle] = useState(false);
  const [onlyWarn, setOnlyWarn] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (showIdle || r.activeProjects > 0) &&
        (!onlyWarn || r.warnings.length > 0) &&
        (!t ||
          [r.name, r.nip || "", r.position || "", r.department || "", ...r.assignments.map((a) => `${a.projectName} ${a.projectNumber} ${a.role}`)].some((v) =>
            v.toLowerCase().includes(t)
          ))
    );
  }, [rows, q, showIdle, onlyWarn]);

  const assigned = rows.filter((r) => r.activeProjects > 0);
  const busy = assigned.filter((r) => r.activeProjects >= 3).length;
  const withWarn = assigned.filter((r) => r.warnings.length > 0).length;
  const expired = assigned.filter((r) => r.warnings.some((w) => w.expired)).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Personil bertugas" value={assigned.length} hint={`dari ${rows.length} personil aktif`} />
        <Stat label="Beban ≥ 3 project" tone={busy ? "warn" : "default"} value={busy} hint="perlu dipantau kapasitasnya" />
        <Stat label="Sertifikasi habis saat bertugas" tone={withWarn ? "warn" : "good"} value={withWarn} />
        <Stat label="Sertifikasi sudah habis" tone={expired ? "bad" : "good"} value={expired} hint="masih ditugaskan" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex-1">
          <SearchPopoverButton value={q} onChange={setQ} label="Cari personil / project" placeholder="Nama, NIP, jabatan, project, atau peran" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="rounded border-slate-300" checked={onlyWarn} onChange={(e) => setOnlyWarn(e.target.checked)} />
          Hanya yang ada peringatan
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="rounded border-slate-300" checked={showIdle} onChange={(e) => setShowIdle(e.target.checked)} />
          Tampilkan yang belum bertugas
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Users} text="Belum ada personil yang cocok. Tugaskan personil dari tab Tim di halaman detail project." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-2.5 font-medium">Personil</th>
                    <th className="px-3 py-2.5 font-medium">Beban</th>
                    <th className="px-3 py-2.5 font-medium">Project & peran</th>
                    <th className="px-5 py-2.5 font-medium">Sertifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.employeeId} className="border-b border-slate-50 dark:border-slate-800/60 align-top">
                      <td className="px-5 py-3 min-w-[12rem]">
                        <p className="font-medium text-ink dark:text-slate-100">{r.name}</p>
                        <p className="text-xs text-slate-500">{[r.nip, r.position, r.department].filter(Boolean).join(" · ") || "—"}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.activeProjects > 0 ? <LoadBadge count={r.activeProjects} /> : <span className="text-xs text-slate-400">tidak bertugas</span>}</td>
                      <td className="px-3 py-3 min-w-[16rem]">
                        <div className="flex flex-wrap gap-1.5">
                          {r.assignments.map((a, i) => (
                            <Link
                              key={i}
                              href={`/projects/${a.projectId}#tim`}
                              title={`${a.projectNumber} · ${fmtDate(a.start)} – ${fmtDate(a.end)}`}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs hover:border-accent/50"
                            >
                              <span className="text-ink dark:text-slate-100 max-w-[14rem] truncate">{a.projectName}</span>
                              <span className="text-slate-400">· {a.role}</span>
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 min-w-[12rem]">
                        {r.warnings.length === 0 ? (
                          <span className="text-xs text-slate-400">aman</span>
                        ) : (
                          r.warnings.map((w) => (
                            <p key={w.name} className={cn("text-xs flex items-center gap-1", w.expired ? "text-signal-expired" : "text-signal-soon")}>
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {w.name} — {w.expired ? "sudah habis" : "habis"} {fmtDate(w.expiryDate)}
                            </p>
                          ))
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
