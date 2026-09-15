"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { RefreshCw, History, UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { renewalSchema, type RenewalInput, MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/validations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { Renewal } from "@/types/certificate";

export function CertificateRenewalSection({
  certificateId,
  currentNumber,
  initialRenewals,
  canManage = true,
}: {
  certificateId: string;
  currentNumber: string;
  initialRenewals: Renewal[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [renewals, setRenewals] = useState(initialRenewals);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RenewalInput>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      renewalDate: new Date().toISOString().slice(0, 10),
      newCertificateNumber: currentNumber,
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setUploadError("Hanya file PDF, JPG, atau PNG yang diterima.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Ukuran file maksimum 20 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.message || "Gagal mengunggah file.");
        return;
      }
      setFileUrl(data.fileUrl);
      setDriveFileId(data.driveFileId);
      setFileMimeType(data.fileMimeType);
      setFileName(file.name);
      setValue("fileUrl", data.fileUrl);
      setValue("driveFileId", data.driveFileId);
      setValue("fileMimeType", data.fileMimeType);
    } catch {
      setUploadError("Gagal mengunggah file.");
    } finally {
      setUploading(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setServerError(null);
    setUploadError(null);
    setFileUrl(null);
    setDriveFileId(null);
    setFileMimeType(null);
    setFileName("");
    reset({ renewalDate: new Date().toISOString().slice(0, 10), newCertificateNumber: currentNumber });
  }

  async function onSubmit(data: RenewalInput) {
    setServerError(null);
    const payload = {
      ...data,
      fileUrl: fileUrl || "",
      driveFileId: driveFileId || "",
      fileMimeType: fileMimeType || "",
    };

    const res = await fetch(`/api/certificates/${certificateId}/renewals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.message || "Gagal menyimpan renewal.");
      return;
    }

    const body = await res.json();
    setRenewals((prev) => [body.renewal, ...prev]);
    showToast("Sertifikat berhasil diperpanjang.");
    closeModal();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          <CardTitle>Riwayat Renewal</CardTitle>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <RefreshCw className="h-4 w-4" />
            Perpanjang Sertifikat
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {renewals.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Belum ada riwayat renewal untuk sertifikat ini.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {renewals.map((r) => (
              <div key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.previousNumber} <span className="text-slate-400">→</span> {r.newCertificateNumber}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diperpanjang {formatDate(r.renewalDate)} · Berlaku s/d {formatDate(r.newExpiryDate)}
                  </p>
                  {r.notes && <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{r.notes}&rdquo;</p>}
                </div>
                {r.fileUrl && (
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-accent hover:text-accent-light font-medium"
                  >
                    Lihat dokumen
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={closeModal} title="Perpanjang Sertifikat" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="renewalDate">Tanggal Renewal</Label>
            <Input id="renewalDate" type="date" error={errors.renewalDate?.message} {...register("renewalDate")} />
          </div>

          <div>
            <Label htmlFor="newCertificateNumber">Nomor Sertifikat Baru</Label>
            <Input
              id="newCertificateNumber"
              error={errors.newCertificateNumber?.message}
              {...register("newCertificateNumber")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newValidFrom">Tanggal Berlaku Baru</Label>
              <Input id="newValidFrom" type="date" error={errors.newValidFrom?.message} {...register("newValidFrom")} />
            </div>
            <div>
              <Label htmlFor="newExpiryDate">Tanggal Berakhir Baru</Label>
              <Input
                id="newExpiryDate"
                type="date"
                error={errors.newExpiryDate?.message}
                {...register("newExpiryDate")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="renewal-notes">Catatan</Label>
            <Textarea id="renewal-notes" rows={2} placeholder="Catatan renewal (opsional)" {...register("notes")} />
          </div>

          <div>
            <Label>Upload Sertifikat Baru</Label>
            {!fileUrl ? (
              <label
                htmlFor="renewal-upload"
                className="flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                ) : (
                  <UploadCloud className="h-5 w-5 text-slate-400" />
                )}
                <span className="text-xs text-slate-500">
                  {uploading ? "Mengunggah..." : "PDF, JPG, atau PNG (maks. 20 MB)"}
                </span>
                <input
                  id="renewal-upload"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-ink truncate">{fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileUrl(null);
                    setDriveFileId(null);
                    setFileMimeType(null);
                    setFileName("");
                    setValue("fileUrl", "");
                    setValue("driveFileId", "");
                    setValue("fileMimeType", "");
                  }}
                  className="text-slate-400 hover:text-signal-expired p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {uploadError && <p className="mt-1 text-xs text-signal-expired">{uploadError}</p>}
          </div>

          {serverError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={uploading}>
              Simpan Renewal
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
