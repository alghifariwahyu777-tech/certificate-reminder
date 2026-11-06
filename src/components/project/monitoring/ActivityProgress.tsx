"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { activityActualAt, activityShares, activityStatusOn, formatPercent, interpolate, plannedPoints } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { FormError, fmtDate, todayInput, useMonitoringApi } from "./shared";
import type { ProjectMonitoringDTO } from "./types";

export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const dayMs = (iso: string) => Date.parse(`${iso}T00:00:00.000Z`);

/**
 * "Perbarui realisasi": one line per activity, type the activity's latest
 * cumulative %. The planned % for the chosen date is shown next to it, and the
 * project % updates as you type (weights as entered, or equal).
 */
export function ActivityProgressModal({ data, open, onClose, initialDate }: { data: ProjectMonitoringDTO; open: boolean; onClose: () => void; initialDate?: string }) {
  const { send, busy } = useMonitoringApi();
  const [date, setDate] = useState(initialDate ?? todayInput());
  const [values, setValues] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState("");

  const t = dayMs(date);
  const status = useMemo(() => activityStatusOn(data.input, t), [data.input, t]);
  const shares = useMemo(() => activityShares(data.input.milestones), [data.input.milestones]);

  // reset the inputs whenever the form opens or the date changes: start from what is recorded for that date
  const stamp = `${open}-${date}`;
  if (open && key !== stamp) {
    setKey(stamp);
    const v: Record<string, string> = {};
    data.milestones.forEach((m, i) => (v[m.id] = String(status[i]?.actual ?? 0)));
    setValues(v);
    const rep = data.reports.find((r) => r.reportDate.slice(0, 10) === date && r.source === "ACTIVITY");
    setSummary(rep?.summary ?? "");
    setNextPlan(rep?.nextPlan ?? "");
    setError(null);
  }

  const num = (id: string) => {
    const n = Number(values[id]);
    return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
  };
  const projectActual = data.milestones.reduce((s, m, i) => s + num(m.id) * (shares[i] ?? 0), 0);
  const projectPlan = interpolate(plannedPoints(data.input).points, t);

  async function save() {
    const changed = data.milestones.filter((m, i) => {
      const before = activityActualAt(data.input.milestones[i], t);
      const logged = (data.input.milestones[i].logs ?? []).some((l) => l.t === t);
      return logged || Math.abs(num(m.id) - before) > 0.0001;
    });
    for (const m of data.milestones) {
      const raw = values[m.id];
      if (raw === "" || isNaN(Number(raw)) || Number(raw) < 0 || Number(raw) > 100) return setError(`Realisasi "${m.name}" harus 0 sampai 100.`);
    }
    if (!changed.length && !summary.trim() && !nextPlan.trim()) return setError("Belum ada angka yang berubah.");
    const items = (changed.length ? changed : data.milestones).map((m) => ({ milestoneId: m.id, percent: num(m.id) }));
    const err = await send("POST", `/api/projects/${data.projectId}/activity-progress`, { date, items, summary, nextPlan }, `Realisasi ${fmtDate(date)} disimpan.`);
    if (err) setError(err);
    else onClose();
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Perbarui realisasi" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label htmlFor="ap-date">Tanggal</Label>
            <div className="w-44">
              <Input id="ap-date" type="date" value={date} max={todayInput()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
          </div>
          <p className="text-[12.5px] text-slate-500">Isi persentase kumulatif tiap kegiatan sampai tanggal ini.</p>
        </div>

        <div className="max-h-[46vh] overflow-y-auto rounded-lg border border-line dark:border-slate-700">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
              <tr className="th-row">
                <th className="px-3 py-2">Kegiatan</th>
                <th className="hidden px-2 py-2 text-right sm:table-cell">Bobot</th>
                <th className="px-2 py-2 text-right">Rencana</th>
                <th className="px-3 py-2 text-right">Realisasi</th>
              </tr>
            </thead>
            <tbody>
              {data.milestones.map((m, i) => {
                const st = status[i];
                const v = num(m.id);
                const behind = st && v < st.plan - 0.05;
                return (
                  <tr key={m.id} className="border-t border-line/70 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <p className="font-medium text-ink dark:text-slate-100">{m.name}</p>
                      <p className="text-[11.5px] text-slate-500">
                        {st?.window ? `${fmtDate(isoDay(st.window.start))} sampai ${fmtDate(isoDay(st.window.end))}` : "Tanggal rencana belum diisi"}
                      </p>
                    </td>
                    <td className="hidden px-2 py-2 text-right tabular-nums text-slate-500 sm:table-cell">{formatPercent((shares[i] ?? 0) * 100)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatPercent(st?.plan ?? 0)}</td>
                    <td className="px-3 py-2">
                      <div className="ml-auto flex w-[8.5rem] items-center justify-end gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          inputMode="decimal"
                          aria-label={`Realisasi ${m.name} (%)`}
                          value={values[m.id] ?? ""}
                          onChange={(e) => setValues((s) => ({ ...s, [m.id]: e.target.value }))}
                          className={cn("h-9 text-right tabular-nums", behind && "border-signal-expired/60")}
                        />
                        <button
                          type="button"
                          onClick={() => setValues((s) => ({ ...s, [m.id]: "100" }))}
                          className="rounded border border-line px-1.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-paper dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Isi 100% (selesai)"
                        >
                          100%
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 text-[13px] dark:bg-slate-800/50">
          <p>
            <span className="block text-[11.5px] text-slate-500">Progres project</span>
            <span className="text-[18px] font-bold tabular-nums text-ink dark:text-slate-100">{formatPercent(projectActual)}</span>
          </p>
          <p>
            <span className="block text-[11.5px] text-slate-500">Rencana pada tanggal ini</span>
            <span className={cn("text-[18px] font-bold tabular-nums", projectActual < projectPlan - 0.05 ? "text-signal-expired" : "text-signal-active")}>{formatPercent(projectPlan)}</span>
          </p>
        </div>

        <details className="rounded-lg border border-line dark:border-slate-700">
          <summary className="cursor-pointer px-3 py-2 text-[13px] font-semibold text-accent">Tambah catatan (opsional)</summary>
          <div className="space-y-3 border-t border-line p-3 dark:border-slate-700">
            <div>
              <Label htmlFor="ap-sum">Pekerjaan yang telah dilaksanakan</Label>
              <Textarea id="ap-sum" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ap-next">Rencana berikutnya</Label>
              <Textarea id="ap-next" rows={2} value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} />
            </div>
          </div>
        </details>

        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button isLoading={busy} onClick={save}>
            Simpan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

