"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/validations";

/** The contract document, uploaded or replaced right here instead of only through "Ubah project". */
export function ContractDocumentCard({
  projectId,
  projectName,
  fileUrl,
  fileMimeType,
  canEdit,
}: {
  projectId: string;
  projectName: string;
  fileUrl: string | null;
  fileMimeType: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(body: { fileUrl: string | null; driveFileId?: string | null; fileMimeType?: string | null }, done: string) {
    const res = await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || "Gagal menyimpan dokumen.");
    showToast(done, "success");
    router.refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return setError("Hanya file PDF, JPG, atau PNG.");
    if (file.size > MAX_FILE_SIZE) return setError("Ukuran file maksimum 20 MB.");
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "projects");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const up = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(up.message || "Gagal mengunggah dokumen.");
      await save({ fileUrl: up.fileUrl, driveFileId: up.driveFileId, fileMimeType: up.fileMimeType }, fileUrl ? "Dokumen kontrak diganti." : "Dokumen kontrak diunggah.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah dokumen.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Hapus dokumen kontrak dari project ini?")) return;
    setBusy(true);
    try {
      await save({ fileUrl: null }, "Dokumen kontrak dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus dokumen.");
    } finally {
      setBusy(false);
    }
  }

  const pick = () => input.current?.click();

  return (
    <Card>
      <CardHead
        title="Dokumen kontrak"
        description={fileUrl ? "Kontrak, SPK, atau surat perjanjian project ini." : "Unggah kontrak, SPK, atau surat perjanjian dalam PDF, JPG, atau PNG (maks. 20 MB)."}
        action={
          <div className="flex flex-wrap gap-2">
            {fileUrl && (
              <a href={`${fileUrl}?download=1`}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Unduh
                </Button>
              </a>
            )}
            {canEdit && fileUrl && (
              <>
                <Button variant="outline" size="sm" onClick={pick} disabled={busy}>
                  <RefreshCw className="h-4 w-4" />
                  Ganti
                </Button>
                <Button variant="ghost" size="sm" onClick={remove} disabled={busy} aria-label="Hapus dokumen kontrak">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        }
      />
      <CardContent>
        <input ref={input} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={upload} />
        {busy && (
          <div className="mb-3">
            <UploadProgressBar />
          </div>
        )}
        {error && <p className="mb-3 text-sm text-signal-expired">{error}</p>}
        {!fileUrl ? (
          canEdit ? (
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-sm text-slate-500 transition-colors hover:border-accent hover:text-accent dark:border-slate-600"
            >
              <UploadCloud className="h-6 w-6" aria-hidden />
              <span className="font-semibold">{busy ? "Mengunggah..." : "Unggah dokumen kontrak"}</span>
              <span className="text-xs">PDF, JPG, atau PNG, maksimal 20 MB</span>
            </button>
          ) : (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <FileText className="h-4 w-4" aria-hidden />
              Belum ada dokumen kontrak.
            </p>
          )
        ) : fileMimeType?.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={`Dokumen kontrak ${projectName}`} className="mx-auto max-h-[600px] rounded border border-line dark:border-slate-700" />
        ) : (
          <iframe src={fileUrl} title={`Dokumen kontrak ${projectName}`} className="h-[600px] w-full rounded border border-line dark:border-slate-700" />
        )}
      </CardContent>
    </Card>
  );
}
