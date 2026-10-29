"use client";

import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/ui/Stat";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Notice } from "@/components/ui/Notice";

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
    <Notice tone="danger">
      {message}
    </Notice>
  );
}

export function FileUploadField({
  value,
  onChange,
  label = "Lampiran (opsional)",
  uploadUrl = "/api/upload",
}: {
  value: FileValue;
  onChange: (v: FileValue) => void;
  label?: string;
  /** PIC screens post to their own upload endpoint (/api/pic/upload or the link's). */
  uploadUrl?: string;
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
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
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

export function ProgressBar({ value, marker, className, tone }: { value: number; marker?: number; className?: string; tone?: Tone }) {
  return (
    <div className={cn("relative h-2 rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full", tone ? TONE_BAR[tone] : "bg-accent")}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      {marker !== undefined && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink dark:bg-slate-200"
          style={{ left: `${Math.min(100, Math.max(0, marker))}%` }}
          title={`Rencana ${marker}%`}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared visual language: tones, the 4-part condition ribbon, tiles, sub-tabs
// ---------------------------------------------------------------------------

export type Tone = "good" | "warn" | "bad" | "none" | "default";
export const TONE_TEXT: Record<Tone, string> = {
  good: "text-signal-active",
  warn: "text-signal-soon",
  bad: "text-signal-expired",
  none: "text-slate-400",
  default: "text-ink dark:text-slate-100",
};
export const TONE_BAR: Record<Tone, string> = {
  good: "bg-signal-activeBar",
  warn: "bg-signal-soonBar",
  bad: "bg-signal-expiredBar",
  none: "bg-signal-none dark:bg-slate-700",
  default: "bg-accent",
};
export const SIGNAL_WORD: Record<Tone, string> = { good: "Baik", warn: "Waspada", bad: "Kritis", none: "Belum ada data", default: "" };

const RIBBON_PARTS = [
  { key: "time", short: "W", label: "Waktu" },
  { key: "cost", short: "B", label: "Biaya" },
  { key: "scope", short: "L", label: "Lingkup" },
  { key: "margin", short: "M", label: "Margin" },
] as const;

/** Four small bars — Waktu, Biaya, Lingkup, Margin — the same condition marker everywhere a project appears. */
export function ConditionRibbon({ signals, showLetters = true }: { signals: Record<"time" | "cost" | "scope" | "margin", Tone>; showLetters?: boolean }) {
  return (
    <div className="inline-flex flex-col gap-1" aria-label={RIBBON_PARTS.map((p) => `${p.label}: ${SIGNAL_WORD[signals[p.key]]}`).join(", ")}>
      <div className="flex gap-[3px]">
        {RIBBON_PARTS.map((p) => (
          <span key={p.key} title={`${p.label}: ${SIGNAL_WORD[signals[p.key]]}`} className={cn("h-2 w-6 rounded-sm", TONE_BAR[signals[p.key]])} />
        ))}
      </div>
      {showLetters && (
        <div className="flex gap-[3px] text-[10.5px] leading-none text-slate-400">
          {RIBBON_PARTS.map((p) => (
            <span key={p.key} className="w-6 text-center">
              {p.short}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** A constraint tile: coloured top edge, label + verdict, one figure, one line of context. */
export function ConstraintTile({ label, tone, value, sub, children, href }: { label: string; tone: Tone; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; href?: string }) {
  const Tag = href ? "a" : "div";
  return (
    <Tag href={href} className={cn("block rounded-lg border border-line dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3.5 border-t-4", href && "transition-shadow hover:shadow-panel", {
      "border-t-signal-activeBar": tone === "good",
      "border-t-signal-soonBar": tone === "warn",
      "border-t-signal-expiredBar": tone === "bad",
      "border-t-signal-none dark:border-t-slate-700": tone === "none" || tone === "default",
    })}>
      <div className="flex items-center justify-between gap-2 text-[13px] font-semibold text-ink dark:text-slate-100">
        <span>{label}</span>
        <span className={cn("text-[12.5px]", TONE_TEXT[tone])}>{SIGNAL_WORD[tone]}</span>
      </div>
      <div className="mt-2 text-[22px] font-bold leading-tight text-ink dark:text-slate-100">{value}</div>
      {sub && <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">{sub}</p>}
      {children}
      {href && <p className="mt-2 text-[12.5px] font-semibold text-accent">Lihat rincian</p>}
    </Tag>
  );
}

/** Segmented control for the sections inside a tab. */
export function SubTabs<K extends string>({ items, value, onChange }: { items: { key: K; label: string; badge?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 p-1">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
            value === it.key ? "bg-white text-brand-blueDark shadow-sm dark:bg-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-ink dark:hover:text-slate-200"
          )}
        >
          {it.label}
          {!!it.badge && <span className="ml-1.5 rounded-full bg-signal-expired px-1.5 py-0.5 text-[10px] leading-none text-white">{it.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, text, action }: { icon: React.ComponentType<{ className?: string }>; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-slate-400">
      <Icon className="h-6 w-6" />
      <p className="max-w-md text-center text-sm text-slate-500">{text}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-md border border-accent/40 px-3 py-1.5 text-[13px] font-semibold text-accent hover:bg-accent/5"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Key figure inside the project pages: the shared StatCard, so it looks the same as everywhere else. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  icon?: LucideIcon;
}) {
  return <StatCard label={label} value={value} sub={hint} tone={tone} icon={icon} />;
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

/**
 * Opens a form when the page is reached with "#<tab>/<section>/baru" (used by
 * the shortcut buttons: "Perbarui progres", "Unggah RAB", …). The "/baru" part is
 * removed again so a refresh doesn't reopen the form.
 */
export function useOpenFromHash(section: string, open: () => void, action = "baru") {
  const ref = useRef(open);
  ref.current = open;
  useEffect(() => {
    const check = () => {
      const parts = window.location.hash.slice(1).split("/");
      if (parts[1] === section && parts[2] === action) {
        history.replaceState(null, "", `#${parts[0]}/${parts[1]}`);
        ref.current();
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [section, action]);
}

/** Small two-to-four option switch used inside a card (e.g. "Per project / Gabungan"). */
export { Segmented } from "@/components/ui/Segmented";

const STATUS_DOT: Record<string, string> = { KRITIS: "#C2362F", WASPADA: "#D69E2E", ON_TRACK: "#2F855A" };

/** Filter chips by project condition, each with its count. */
export function StatusChips({ value, onChange, counts }: { value: string; onChange: (v: string) => void; counts: (h: string) => number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[
        ["", "Semua"],
        ["KRITIS", "Kritis"],
        ["WASPADA", "Waspada"],
        ["ON_TRACK", "Sesuai rencana"],
      ].map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors",
            value === k ? "border-accent bg-accent/10 text-accent dark:border-sky-400 dark:bg-sky-400/10 dark:text-sky-300" : "border-line bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          )}
        >
          {k && <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[k] }} />}
          {l}
          <span className={cn("tabular-nums", value === k ? "text-white/80 dark:text-ink/70" : "text-slate-400")}>{counts(k)}</span>
        </button>
      ))}
    </div>
  );
}
