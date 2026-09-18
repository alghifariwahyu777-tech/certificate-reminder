import { UploadCloud } from "lucide-react";

/**
 * Indeterminate progress bar (the exact byte-level percentage isn't
 * available through fetch()'s API without switching to XMLHttpRequest, so
 * this shows a continuously-animated bar instead — enough to reassure the
 * user the upload is actively in progress, not stalled).
 */
export function UploadProgressBar({ label = "Mengunggah dokumen..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded border border-accent/20 bg-accent/5 px-3 py-2.5">
      <UploadCloud className="h-4 w-4 text-accent shrink-0 animate-pulse" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-accent font-medium mb-1.5">{label}</p>
        <div className="h-1.5 w-full rounded-full bg-accent/15 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-accent animate-[upload-slide_1.1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
