"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export type FileValue = { fileUrl: string | null; driveFileId: string | null; fileMimeType: string | null };
export const EMPTY_FILE: FileValue = { fileUrl: null, driveFileId: null, fileMimeType: null };

/** fetch → toast → router.refresh(); returns the error message (if any) so forms can show it inline. */
export function useMonitoringApi() {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function send(method: "POST" | "PATCH" | "PUT" | "DELETE", url: string, body: unknown, successText: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return (data.message as string) || "Gagal menyimpan data.";
      showToast(successText);
      router.refresh();
      return null;
    } catch {
      return "Tidak dapat terhubung ke server.";
    } finally {
      setBusy(false);
    }
  }

  return { send, busy };
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
      {message}
    </div>
  );
}

export function FileUploadField({
  value,
  onChange,
  label = "Lampiran (opsional)",
}: {
  value: FileValue;
  onChange: (v: FileValue) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>(value.fileUrl ? "Dokumen tersimpan (klik untuk mengganti)" : "");

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return setError("Hanya file PDF, JPG, atau PNG yang diterima.");
    if (file.size > MAX_FILE_SIZE) return setError("Ukuran file maksimum 20 MB.");
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "projects");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) return setError(body.message || "Gagal mengunggah dokumen.");
      onChange({ fileUrl: body.fileUrl, driveFileId: body.driveFileId, fileMimeType: body.fileMimeType });
      setName(file.name);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="block text-sm font-medium text-ink dark:text-slate-200 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <label className="flex-1 flex items-center gap-2 rounded border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
          {value.fileUrl && !uploading ? <FileText className="h-4 w-4 text-accent" /> : <UploadCloud className="h-4 w-4" />}
          <span className="truncate">{uploading ? "Mengunggah..." : name || "Unggah PDF, JPG, atau PNG (maks. 20 MB)"}</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handle} disabled={uploading} />
        </label>
        {value.fileUrl && !uploading && (
          <button
            type="button"
            aria-label="Hapus lampiran"
            onClick={() => {
              onChange(EMPTY_FILE);
              setName("");
            }}
            className="p-2 rounded text-slate-400 hover:text-signal-expired hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {uploading && (
        <div className="mt-2">
          <UploadProgressBar />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-signal-expired">{error}</p>}
    </div>
  );
}

export function FileLink({ url, label = "Lampiran" }: { url: string | null; label?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
      <FileText className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export function DeleteButton({ onConfirm, what }: { onConfirm: () => Promise<string | null>; what: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        aria-label={`Hapus ${what}`}
        title={`Hapus ${what}`}
        onClick={() => setOpen(true)}
        className="p-1.5 rounded text-slate-400 hover:text-signal-expired hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={`Hapus ${what}?`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Data yang dihapus tidak dapat dikembalikan.</p>
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              isLoading={busy}
              onClick={async () => {
                setBusy(true);
                const err = await onConfirm();
                setBusy(false);
                if (err) setError(err);
                else setOpen(false);
              }}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function ProgressBar({ value, marker, className }: { value: number; marker?: number; className?: string }) {
  return (
    <div className={cn("relative h-2 rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      {marker !== undefined && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 bg-ink dark:bg-slate-200"
          style={{ left: `${Math.min(100, Math.max(0, marker))}%` }}
          title={`Rencana ${marker}%`}
        />
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
      <Icon className="h-6 w-6" />
      <p className="text-sm text-center">{text}</p>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    default: "text-ink dark:text-slate-100",
    good: "text-signal-active",
    warn: "text-signal-soon",
    bad: "text-signal-expired",
  }[tone];
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-semibold tabular-nums", toneClass)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** "2026-10-22" → "22 Okt 2026" without timezone drift. */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${day} ${months[m - 1]} ${y}`;
}

export function todayInput(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB
  return now.toISOString().slice(0, 10);
}
