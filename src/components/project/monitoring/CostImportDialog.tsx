"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/project-monitoring-shared";
import type { ImportPreview } from "@/lib/project-cost-import";
import { FormError, fmtDate } from "./shared";

/** Upload → preview (what will be added / skipped / is wrong) → confirm. */
export function CostImportDialog({ projectId, label = "Impor Excel biaya dan RAB", size = "sm" }: { projectId?: string; label?: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
  }

  async function send(f: File, commit: boolean) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      if (projectId) fd.append("projectId", projectId);
      if (commit) fd.append("commit", "1");
      const res = await fetch("/api/projects/cost-import", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.message || "Gagal memproses file.");
      if (commit) {
        const r = body.result as { costs: number; budgetProjects: number; baselinesLocked: number };
        showToast(`Import selesai: ${r.costs} baris biaya${r.budgetProjects ? `, RAB ${r.budgetProjects} project` : ""}.`);
        setOpen(false);
        reset();
        router.refresh();
      } else setPreview(body.preview);
    } finally {
      setBusy(false);
    }
  }

  const costNew = preview?.costs.filter((c) => c.status === "NEW") ?? [];
  const costDup = preview?.costs.filter((c) => c.status === "DUPLICATE") ?? [];
  const problems = [...(preview?.costs ?? []), ...(preview?.budgets ?? [])].filter((c) => c.status === "ERROR");
  const nothing = preview && costNew.length === 0 && (preview.budgetProjects.length ?? 0) === 0;

  return (
    <>
      <Button size={size} variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="h-4 w-4" />
        {label}
      </Button>
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={label}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-sm">
          {!preview && (
            <>
              <p className="text-slate-600 dark:text-slate-300">
                Unggah file Excel berisi sheet <strong>Biaya</strong> (realisasi biaya) dan/atau <strong>RAB</strong>. Satu file boleh berisi banyak project.
                Baris yang sudah pernah diimpor otomatis dilewati.
              </p>
              <a href="/api/projects/cost-import/template" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                <Download className="h-4 w-4" />
                Unduh template Excel (berisi petunjuk dan daftar nomor project)
              </a>
              <label className="flex items-center gap-2 rounded border border-dashed border-slate-300 dark:border-slate-600 px-3 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <Upload className="h-4 w-4 text-slate-400" />
                <span className="truncate">{file ? file.name : "Pilih file .xlsx"}</span>
                <input type="file" accept=".xlsx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <FormError message={error} />
              <div className="flex justify-end">
                <Button disabled={!file} isLoading={busy} onClick={() => file && send(file, false)}>
                  Periksa file
                </Button>
              </div>
            </>
          )}

          {preview && (
            <>
              {preview.missingSheets.map((m) => (
                <p key={m} className="rounded border border-signal-soonBorder bg-signal-soonBg px-3 py-2 text-signal-soon">
                  {m}
                </p>
              ))}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <p className="text-xs text-slate-500">Biaya baru</p>
                  <p className="font-semibold text-ink dark:text-slate-100">
                    {costNew.length} baris, {formatRupiah(costNew.reduce((s, c) => s + c.amount, 0), true)}
                  </p>
                </div>
                <div className="rounded border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <p className="text-xs text-slate-500">Dilewati (sudah ada)</p>
                  <p className="font-semibold text-ink dark:text-slate-100">{costDup.length} baris</p>
                </div>
                <div className="rounded border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <p className="text-xs text-slate-500">Bermasalah</p>
                  <p className={`font-semibold ${problems.length ? "text-signal-expired" : "text-ink dark:text-slate-100"}`}>{problems.length} baris</p>
                </div>
              </div>

              {preview.budgetProjects.length > 0 && (
                <div>
                  <p className="font-medium text-ink dark:text-slate-100 mb-1">RAB yang akan diganti</p>
                  <ul className="space-y-1">
                    {preview.budgetProjects.map((b) => (
                      <li key={b.projectNumber} className="text-slate-600 dark:text-slate-300">
                        {b.projectName} ({b.projectNumber}): {formatRupiah(b.total)}
                        {b.replaces ? `, menggantikan ${b.replaces} baris RAB lama` : ""}
                        {b.locksBaseline && <span className="ml-1 text-accent">(dijadikan baseline atau rencana awal)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {problems.length > 0 && (
                <div>
                  <p className="font-medium text-ink dark:text-slate-100 mb-1">Baris bermasalah (tidak akan diimpor)</p>
                  <div className="max-h-48 overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <tbody>
                        {problems.slice(0, 100).map((p) => (
                          <tr key={`${p.sheet}-${p.row}`} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">
                              {p.sheet} baris {p.row}
                            </td>
                            <td className="px-2 py-1.5 text-signal-expired">{p.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {costNew.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-slate-500">Lihat {Math.min(costNew.length, 50)} baris biaya pertama</summary>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <tbody>
                        {costNew.slice(0, 50).map((c) => (
                          <tr key={c.row} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(c.date)}</td>
                            <td className="px-2 py-1.5">{c.projectNumber}</td>
                            <td className="px-2 py-1.5">{c.category}</td>
                            <td className="px-2 py-1.5">{c.description}</td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatRupiah(c.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              <FormError message={error} />
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={reset}>
                  Pilih file lain
                </Button>
                <Button disabled={!!nothing} isLoading={busy} onClick={() => file && send(file, true)}>
                  <CheckCircle2 className="h-4 w-4" />
                  {nothing ? "Tidak ada data baru" : `Impor ${costNew.length} biaya${preview.budgetProjects.length ? ` + RAB ${preview.budgetProjects.length} project` : ""}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
