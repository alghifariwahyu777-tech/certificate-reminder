"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Save } from "lucide-react";
import { projectSchema, type ProjectInput, MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/validations";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

type CategoryLite = { id: string; name: string };

export function ProjectForm({
  categories,
  initialData,
}: {
  categories: CategoryLite[];
  initialData?: ProjectInput & { id: string };
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
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          startDate: toDateInputValue(initialData.startDate),
          targetEndDate: toDateInputValue(initialData.targetEndDate),
          actualEndDate: toDateInputValue(initialData.actualEndDate),
          contractValue: initialData.contractValue?.toString() || "",
        }
      : { categoryId: "", status: "ONGOING" },
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
      formData.append("folder", "projects");

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

  async function onSubmit(data: ProjectInput) {
    setServerError(null);
    const payload = { ...data, fileUrl, driveFileId, fileMimeType };

    const url = isEdit ? `/api/projects/${initialData.id}` : "/api/projects";
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

    showToast(isEdit ? "Project berhasil diperbarui." : "Project berhasil ditambahkan.");
    router.push(isEdit ? `/projects/${initialData.id}` : "/projects");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pr-number">Nomor Project</Label>
              <Input id="pr-number" {...register("projectNumber")} error={errors.projectNumber?.message} placeholder="Contoh: PRJ-2026-001" />
            </div>
            <div>
              <Label htmlFor="pr-category">Kategori / Portofolio</Label>
              <Select id="pr-category" {...register("categoryId")} error={errors.categoryId?.message}>
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
            <Label htmlFor="pr-name">Nama Project</Label>
            <Input id="pr-name" {...register("projectName")} error={errors.projectName?.message} placeholder="Nama pekerjaan/kontrak" />
          </div>

          <div>
            <Label htmlFor="pr-client">Klien / Pemberi Kerja</Label>
            <Input id="pr-client" {...register("clientName")} error={errors.clientName?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pr-pic">PIC</Label>
              <Input id="pr-pic" {...register("pic")} error={errors.pic?.message} placeholder="Nama penanggung jawab" />
            </div>
            <div>
              <Label htmlFor="pr-picEmail">Email PIC</Label>
              <Input id="pr-picEmail" type="email" {...register("picEmail")} error={errors.picEmail?.message} />
              <p className="text-xs text-slate-400 mt-1">Reminder project akan dikirim ke email ini.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="pr-value">Nilai Kontrak (Rp)</Label>
            <Input id="pr-value" type="number" step="any" {...register("contractValue")} error={errors.contractValue?.message} placeholder="0" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="pr-start">Tanggal Mulai</Label>
              <Input id="pr-start" type="date" {...register("startDate")} error={errors.startDate?.message} />
            </div>
            <div>
              <Label htmlFor="pr-target">Target Selesai</Label>
              <Input id="pr-target" type="date" {...register("targetEndDate")} error={errors.targetEndDate?.message} />
              <p className="text-xs text-slate-400 mt-1">Reminder dihitung dari tanggal ini.</p>
            </div>
            <div>
              <Label htmlFor="pr-status">Status</Label>
              <Select id="pr-status" {...register("status")} error={errors.status?.message}>
                <option value="ONGOING">Berjalan</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="pr-actualEnd">Tanggal Selesai Aktual (opsional)</Label>
            <Input id="pr-actualEnd" type="date" {...register("actualEndDate")} error={errors.actualEndDate?.message} />
            <p className="text-xs text-slate-400 mt-1">Isi saat pekerjaan benar-benar selesai — untuk catatan database.</p>
          </div>

          <div>
            <Label htmlFor="pr-desc">Deskripsi / Lingkup Pekerjaan</Label>
            <Textarea id="pr-desc" {...register("description")} error={errors.description?.message} rows={3} />
          </div>

          <div>
            <Label htmlFor="pr-notes">Catatan</Label>
            <Textarea id="pr-notes" {...register("notes")} error={errors.notes?.message} rows={2} />
          </div>

          <div>
            <Label>Dokumen Kontrak</Label>
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
