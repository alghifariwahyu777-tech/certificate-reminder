"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { formatPercent } from "@/lib/project-monitoring-shared";
import type { UpdateFormContext } from "@/lib/pic-update";
import { FileUploadField, FormError, ProgressBar, fmtDate, todayInput, EMPTY_FILE, type FileValue } from "@/components/project/monitoring/shared";

/**
 * The one short form a PIC fills in each week — the same component behind
 * the PIC account page and the no-login emailed link. Kept deliberately
 * small: a percentage, what was done, milestones ticked, an optional issue.
 */
export function ProgressUpdateForm({
  ctx,
  submitUrl,
  uploadUrl,
  onDone,
}: {
  ctx: UpdateFormContext;
  submitUrl: string;
  uploadUrl: string;
  onDone?: () => void;
}) {
  const [percent, setPercent] = useState(String(ctx.actualPercent));
  const [summary, setSummary] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [hasIssue, setHasIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueImpact, setIssueImpact] = useState("MEDIUM");
  const [reportDate, setReportDate] = useState(todayInput());
  const [file, setFile] = useState<FileValue>(EMPTY_FILE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  // Ticking a milestone suggests a % (current + its share); the PIC can still type their own number.
  const totalWeight = ctx.openMilestones.reduce((s, m) => s + m.weight, 0);
  function toggleMilestone(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!summary.trim()) return setError("Mohon isi pekerjaan yang sudah dilakukan.");
    if (percent === "" || isNaN(Number(percent))) return setError("Mohon isi progres (%).");
    if (hasIssue && !issueTitle.trim()) return setError("Mohon isi judul kendala, atau matikan pilihan kendala.");
    setSaving(true);
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          actualPercent: percent,
          summary,
          nextPlan,
          completedMilestoneIds: [...done],
          issueTitle: hasIssue ? issueTitle : null,
          issueImpact,
          ...file,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.message || "Gagal mengirim update.");
      setSent(true);
      onDone?.();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md border border-signal-activeBorder bg-signal-activeBg px-5 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-signal-active" />
        <p className="mt-3 font-display font-semibold text-ink dark:text-slate-100">Terima kasih, pembaruan terkirim.</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Progres {ctx.projectName} tercatat {formatPercent(Number(percent))}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <p className="font-display font-semibold text-ink dark:text-slate-100">{ctx.projectName}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          <span className="font-mono">{ctx.projectNumber}</span>, {ctx.clientName}, target selesai {fmtDate(ctx.targetEndDate)}
        </p>
        <div className="flex justify-between text-xs text-slate-500 mt-3 mb-1.5">
          <span>Tercatat saat ini {formatPercent(ctx.actualPercent)}</span>
          <span>Rencana hari ini {formatPercent(ctx.plannedPercent)}</span>
        </div>
        <ProgressBar value={ctx.actualPercent} marker={ctx.plannedPercent} />
        <p className="text-[11px] text-slate-400 mt-2">
          {ctx.lastReportDate ? `Diperbarui terakhir ${fmtDate(ctx.lastReportDate)}` : "Belum pernah ada pembaruan progres"}
        </p>
      </div>

      {ctx.openMilestones.length > 0 && (
        <div>
          <p className="block text-sm font-medium text-ink dark:text-slate-200 mb-1.5">Milestone yang sudah selesai</p>
          <div className="space-y-1.5">
            {ctx.openMilestones.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 rounded border border-slate-200 dark:border-slate-700 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={done.has(m.id)} onChange={() => toggleMilestone(m.id)} />
                <span className="flex-1 text-sm text-ink dark:text-slate-100">{m.name}</span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {totalWeight > 0 ? `${m.weight.toLocaleString("id-ID")}%` : ""}
                  {m.plannedDate ? `, ${fmtDate(m.plannedDate)}` : ""}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="pu-pct">Progres keseluruhan saat ini (%)</Label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Number(percent) || 0}
            onChange={(e) => setPercent(e.target.value)}
            className="flex-1 accent-[#1671B8]"
            aria-label="Geser progres"
          />
          <Input id="pu-pct" type="number" min={0} max={100} step="any" value={percent} onChange={(e) => setPercent(e.target.value)} className="w-24" />
        </div>
        <p className="mt-1 text-xs text-slate-500">Isi persentase kumulatif seluruh pekerjaan, bukan hanya minggu ini.</p>
      </div>

      <div>
        <Label htmlFor="pu-sum">Apa yang sudah dikerjakan?</Label>
        <Textarea id="pu-sum" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Contoh: Inspeksi tangki 3 dan 4 selesai, draft laporan 60%." />
      </div>

      <div>
        <Label htmlFor="pu-next">Rencana berikutnya (opsional)</Label>
        <Textarea id="pu-next" rows={2} value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} />
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink dark:text-slate-200 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={hasIssue} onChange={(e) => setHasIssue(e.target.checked)} />
          Ada kendala yang perlu diketahui atasan
        </label>
        {hasIssue && (
          <div className="grid sm:grid-cols-[1fr_9rem] gap-3">
            <Input value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} placeholder="Kendala singkat, mis. akses lokasi belum dibuka" aria-label="Judul kendala" />
            <Select value={issueImpact} onChange={(e) => setIssueImpact(e.target.value)} aria-label="Dampak">
              <option value="LOW">Dampak rendah</option>
              <option value="MEDIUM">Dampak sedang</option>
              <option value="HIGH">Dampak tinggi</option>
            </Select>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500 select-none">Lampiran dan tanggal laporan</summary>
        <div className="mt-3 space-y-3">
          <FileUploadField label="Lampiran (foto/dokumen, opsional)" value={file} onChange={setFile} uploadUrl={uploadUrl} />
          <div className="max-w-[12rem]">
            <Label htmlFor="pu-date">Tanggal laporan</Label>
            <Input id="pu-date" type="date" max={todayInput()} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
        </div>
      </details>

      <FormError message={error} />
      <Button className="w-full" size="lg" isLoading={saving} onClick={submit}>
        <Send className="h-4 w-4" />
        Kirim pembaruan
      </Button>
    </div>
  );
}
