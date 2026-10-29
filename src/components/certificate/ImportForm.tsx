"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, MinusCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Notice } from "@/components/ui/Notice";

type RowResult = {
  row: number;
  certificateNumber: string;
  status: "CREATED" | "SKIPPED" | "ERROR";
  message?: string;
};

type ImportSummary = {
  totalRows: number;
  created: number;
  skipped: number;
  errors: number;
  results: RowResult[];
};

const STATUS_ICON = { CREATED: CheckCircle2, SKIPPED: MinusCircle, ERROR: XCircle };
const STATUS_COLOR = {
  CREATED: "text-signal-active",
  SKIPPED: "text-slate-400",
  ERROR: "text-signal-expired",
};

export function ImportForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    setError(null);
    setSummary(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".xlsx")) {
      setError("Hanya file .xlsx yang diterima.");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/certificates/import", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Gagal memproses file.");
        return;
      }
      setSummary(body.summary);
      if (body.summary.created > 0) {
        showToast(`${body.summary.created} sertifikat berhasil ditambahkan.`);
        router.refresh();
      }
    } catch {
      setError("Gagal mengunggah file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Unduh template</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            Isi data pada template ini. Kategori, klien, dan divisi yang belum terdaftar akan dibuat otomatis.
          </p>
          <a href="/api/certificates/import/template">
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Unduh template Excel
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Unggah file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Notice tone="info">
            <p>
              Kolom wajib: Certificate Number, Certificate Name, Category, Client, Issue Date, Expiry Date, PIC. Nomor sertifikat yang sudah terdaftar dilewati, data lama tidak ditimpa.
            </p>
          </Notice>

          <label
            htmlFor="excel-upload"
            className="flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/60 px-4 py-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <FileSpreadsheet className="h-6 w-6 text-slate-400" />
            <span className="text-sm text-slate-500">
              {file ? file.name : "Klik untuk pilih file .xlsx (maks. 5 MB)"}
            </span>
            <input id="excel-upload" type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
          </label>

          {error && (
            <Notice tone="danger">
              {error}
            </Notice>
          )}

          <Button onClick={handleUpload} disabled={!file} isLoading={uploading}>
            <Upload className="h-4 w-4" />
            Proses impor
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil impor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm font-mono">
              <span className="text-signal-active">{summary.created} dibuat</span>
              <span className="text-slate-400">{summary.skipped} dilewati</span>
              <span className="text-signal-expired">{summary.errors} gagal</span>
            </div>
            {summary.results.length > 0 && (
              <div className="rounded border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                {summary.results.map((r, i) => {
                  const Icon = STATUS_ICON[r.status];
                  return (
                    <div key={i} className="px-3 py-2 flex items-start gap-2 text-xs">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", STATUS_COLOR[r.status])} />
                      <div className="min-w-0">
                        <span className="text-slate-400 font-mono">Baris {r.row}</span>{" "}
                        <span className="text-ink font-medium">{r.certificateNumber}</span>
                        {r.message && <p className="text-slate-500 mt-0.5">{r.message}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
