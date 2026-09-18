"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Save } from "lucide-react";
import {
  personnelCertificationSchema,
  type PersonnelCertificationInput,
  MAX_FILE_SIZE,
  ACCEPTED_FILE_TYPES,
} from "@/lib/validations";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

type EmployeeLite = { id: string; name: string; position: string | null };
type CategoryLite = { id: string; name: string };

export function PersonnelCertificationForm({
  employees,
  categories,
  initialData,
}: {
  employees: EmployeeLite[];
  categories: CategoryLite[];
  initialData?: PersonnelCertificationInput & { id: string };
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = !!initialData;

  const [fileUrl, setFileUrl] = useState<string | null>(initialData?.fileUrl || null);
  const [driveFileId, setDriveFileId] = useState<string | null>(initialData?.driveFileId || null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(initialData?.fileMimeType || null);
  const [fileName, setFileName] = useState<string>(
    initialData?.fileUrl ? "Dokumen tersimpan (klik untuk mengganti)" : ""
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonnelCertificationInput>({
    resolver: zodResolver(personnelCertificationSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          issueDate: toDateInputValue(initialData.issueDate),
          validFrom: toDateInputValue(initialData.validFrom),
          expiryDate: toDateInputValue(initialData.expiryDate),
        }
      : { employeeId: "", categoryId: "" },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setUploadError("Hanya file PDF, JPG, atau PNG yang diterima.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Ukuran file maksimum 20 MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "personnel");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setUploadError(body.message || "Gagal mengunggah dokumen.");
        return;
      }
      setFileUrl(body.fileUrl);
      setDriveFileId(body.driveFileId);
      setFileMimeType(body.fileMimeType);
      setFileName(file.name);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: PersonnelCertificationInput) {
    setServerError(null);
    const payload = { ...data, fileUrl, driveFileId, fileMimeType };

    const url = isEdit ? `/api/personnel-certifications/${initialData.id}` : "/api/personnel-certifications";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      setServerError(body.message || "Gagal menyimpan data.");
      return;
    }

    showToast(isEdit ? "Sertifikasi berhasil diperbarui." : "Sertifikasi berhasil ditambahkan.");
    router.push("/personnel-certifications");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pc-employee">Personil</Label>
              <Select id="pc-employee" {...register("employeeId")} error={errors.employeeId?.message}>
                <option value="">— Pilih personil —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.position ? ` (${e.position})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pc-category">Kategori</Label>
              <Select id="pc-category" {...register("categoryId")} error={errors.categoryId?.message}>
                <option value="">— Pilih kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="pc-name">Nama Sertifikasi</Label>
            <Input
              id="pc-name"
              {...register("certificationName")}
              error={errors.certificationName?.message}
              placeholder="Contoh: Sertifikasi Ahli K3 Umum"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pc-number">Nomor Sertifikasi</Label>
              <Input id="pc-number" {...register("certificationNumber")} error={errors.certificationNumber?.message} />
            </div>
            <div>
              <Label htmlFor="pc-issuer">Instansi Penerbit</Label>
              <Input id="pc-issuer" {...register("issuingBody")} error={errors.issuingBody?.message} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="pc-issue">Tanggal Terbit</Label>
              <Input id="pc-issue" type="date" {...register("issueDate")} error={errors.issueDate?.message} />
            </div>
            <div>
              <Label htmlFor="pc-valid">Berlaku Sejak</Label>
              <Input id="pc-valid" type="date" {...register("validFrom")} error={errors.validFrom?.message} />
            </div>
            <div>
              <Label htmlFor="pc-expiry">Tanggal Berakhir</Label>
              <Input id="pc-expiry" type="date" {...register("expiryDate")} error={errors.expiryDate?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="pc-cc">Email HR/Atasan (CC)</Label>
            <Input
              id="pc-cc"
              type="email"
              {...register("ccEmail")}
              error={errors.ccEmail?.message}
              placeholder="hr@sucofindo.co.id"
            />
            <p className="text-xs text-slate-400 mt-1">
              Reminder akan dikirim ke email personil, dengan CC ke alamat ini (opsional).
            </p>
          </div>

          <div>
            <Label htmlFor="pc-notes">Catatan</Label>
            <Textarea id="pc-notes" {...register("notes")} error={errors.notes?.message} rows={3} />
          </div>

          <div>
            <Label>Dokumen Sertifikasi</Label>
            <label className="cursor-pointer block">
              <div className="flex items-center gap-2 rounded border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:border-accent hover:bg-accent/5">
                {fileUrl && !uploading ? <FileText className="h-4 w-4 text-accent" /> : <UploadCloud className="h-4 w-4" />}
                {uploading ? "Mengunggah..." : fileName || "Klik untuk unggah PDF, JPG, atau PNG (maks. 20 MB)"}
              </div>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={uploading} />
            </label>
            {uploading && (
              <div className="mt-2">
                <UploadProgressBar />
              </div>
            )}
            {uploadError && <p className="mt-1 text-xs text-signal-expired">{uploadError}</p>}
          </div>
        </CardContent>
      </Card>

      {serverError && (
        <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2.5 text-sm text-signal-expired">
          {serverError}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" isLoading={isSubmitting} disabled={uploading}>
          <Save className="h-4 w-4" />
          Simpan
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          <X className="h-4 w-4" />
          Batal
        </Button>
      </div>
    </form>
  );
}
