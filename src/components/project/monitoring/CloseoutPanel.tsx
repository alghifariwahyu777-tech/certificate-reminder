"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { useState } from "react";
import { CheckCircle2, Circle, Save, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { FileLink, FileUploadField, FormError, fmtDate, useMonitoringApi, EMPTY_FILE } from "./shared";
import type { ProjectMonitoringDTO } from "./types";

const CHECKS = [
  { key: "bappDate", label: "BAPP", hint: "Berita acara penyelesaian pekerjaan" },
  { key: "bastDate", label: "BAST", hint: "Berita acara serah terima" },
  { key: "finalReportDate", label: "Laporan final", hint: "Laporan akhir diserahkan ke klien" },
] as const;

export function CloseoutPanel({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const c = data.closeout;
  const [form, setForm] = useState({
    bappDate: c?.bappDate || "",
    bastDate: c?.bastDate || "",
    finalReportDate: c?.finalReportDate || "",
    satisfaction: c?.satisfaction ?? 0,
    lessonsLearned: c?.lessonsLearned || "",
    notes: c?.notes || "",
    fileUrl: c?.fileUrl ?? EMPTY_FILE.fileUrl,
    driveFileId: c?.driveFileId ?? EMPTY_FILE.driveFileId,
    fileMimeType: c?.fileMimeType ?? EMPTY_FILE.fileMimeType,
  });
  const [error, setError] = useState<string | null>(null);
  const done = CHECKS.filter((k) => form[k.key]).length;
  const editable = data.canManage;

  async function save() {
    setError(null);
    const err = await send(
      "PUT",
      `/api/projects/${data.projectId}/closeout`,
      { ...form, satisfaction: form.satisfaction || null },
      "Penutupan project disimpan."
    );
    if (err) setError(err);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
            Penutupan project
            <InfoTip label="Keterangan penutupan project">{data.status === "COMPLETED"
            ? `Checklist ${done}/3 lengkap.`
            : "Diisi saat pekerjaan selesai. Tanggal setiap dokumen dapat diisi bertahap saat dokumen tersebut terbit."}</InfoTip>
          </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          {CHECKS.map((k) => (
            <div key={k.key} className="flex items-center gap-3 rounded border border-slate-200 dark:border-slate-700 px-3 py-2.5">
              {form[k.key] ? <CheckCircle2 className="h-5 w-5 text-signal-active shrink-0" /> : <Circle className="h-5 w-5 text-slate-300 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink dark:text-slate-100">{k.label}</p>
                <p className="text-xs text-slate-500">{k.hint}</p>
              </div>
              {editable ? (
                <Input type="date" aria-label={`Tanggal ${k.label}`} value={form[k.key]} onChange={(e) => setForm((f) => ({ ...f, [k.key]: e.target.value }))} className="w-40" />
              ) : (
                <span className="text-sm">{fmtDate(form[k.key] || null)}</span>
              )}
            </div>
          ))}
        </div>

        <div>
          <p className="block text-sm font-medium text-ink dark:text-slate-200 mb-1.5">Kepuasan klien</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={!editable}
                aria-label={`Nilai ${n}`}
                onClick={() => setForm((f) => ({ ...f, satisfaction: f.satisfaction === n ? 0 : n }))}
                className="p-0.5"
              >
                <Star className={cn("h-6 w-6", n <= form.satisfaction ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
              </button>
            ))}
            <span className="ml-2 text-sm text-slate-500">{form.satisfaction ? `${form.satisfaction}/5` : "belum dinilai"}</span>
          </div>
        </div>

        <div>
          <Label htmlFor="co-ll">Lessons learned</Label>
          <Textarea
            id="co-ll"
            rows={3}
            disabled={!editable}
            value={form.lessonsLearned}
            onChange={(e) => setForm((f) => ({ ...f, lessonsLearned: e.target.value }))}
            placeholder="Apa yang berjalan baik, apa yang perlu diperbaiki di project serupa berikutnya."
          />
        </div>
        <div>
          <Label htmlFor="co-notes">Catatan</Label>
          <Textarea id="co-notes" rows={2} disabled={!editable} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        {editable ? (
          <FileUploadField
            label="Dokumen penutupan (BAST/BAPP, opsional)"
            value={{ fileUrl: form.fileUrl, driveFileId: form.driveFileId, fileMimeType: form.fileMimeType }}
            onChange={(v) => setForm((f) => ({ ...f, ...v }))}
          />
        ) : (
          <FileLink url={form.fileUrl} label="Dokumen penutupan" />
        )}
        <FormError message={error} />
        {editable && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">{c ? `Terakhir diubah ${fmtDate(c.updatedAt)}${c.updatedBy ? ` oleh ${c.updatedBy}` : ""}` : ""}</p>
            <Button isLoading={busy} onClick={save}>
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
