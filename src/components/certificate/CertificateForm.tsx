"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Save, Loader2 } from "lucide-react";
import { certificateSchema, type CertificateInput, MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/validations";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";
import { formatFileSize } from "@/lib/utils";
import type { CategoryLite, ClientLite, DepartmentLite, CertificateWithCategory } from "@/types/certificate";

function toDateInputValue(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function CertificateForm({
  categories,
  clients,
  departments,
  initialData,
}: {
  categories: CategoryLite[];
  clients: ClientLite[];
  departments: DepartmentLite[];
  initialData?: CertificateWithCategory;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = !!initialData;

  const [fileUrl, setFileUrl] = useState<string | null>(initialData?.fileUrl || null);
  const [driveFileId, setDriveFileId] = useState<string | null>(initialData?.driveFileId || null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(initialData?.fileMimeType || null);
  const [fileName, setFileName] = useState<string>(initialData?.fileUrl ? "Dokumen tersimpan (klik untuk mengganti)" : "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CertificateInput>({
    resolver: zodResolver(certificateSchema),
    defaultValues: initialData
      ? {
          certificateNumber: initialData.certificateNumber,
          certificateName: initialData.certificateName,
          categoryId: initialData.categoryId,
          clientId: initialData.clientId,
          departmentId: initialData.departmentId || "",
          issuingBody: initialData.issuingBody || "",
          issueDate: toDateInputValue(initialData.issueDate),
          validFrom: toDateInputValue(initialData.validFrom || undefined),
          expiryDate: toDateInputValue(initialData.expiryDate),
          storageLocation: initialData.storageLocation || "",
          pic: initialData.pic,
          picEmail: initialData.picEmail || "",
          ccEmail: initialData.ccEmail || "",
          description: initialData.description || "",
          notes: initialData.notes || "",
          fileUrl: initialData.fileUrl || "",
          driveFileId: initialData.driveFileId || "",
          fileMimeType: initialData.fileMimeType || "",
        }
      : undefined,
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
      formData.append("folder", "certificates");
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

  function removeFile() {
    setFileUrl(null);
    setDriveFileId(null);
    setFileMimeType(null);
    setFileName("");
    setValue("fileUrl", "");
    setValue("driveFileId", "");
    setValue("fileMimeType", "");
  }

  async function onSubmit(data: CertificateInput) {
    setServerError(null);
    const payload = {
      ...data,
      fileUrl: fileUrl || "",
      driveFileId: driveFileId || "",
      fileMimeType: fileMimeType || "",
    };

    const res = await fetch(
      isEdit ? `/api/certificates/${initialData!.id}` : "/api/certificates",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.message || "Gagal menyimpan sertifikat.");
      return;
    }

    const body = await res.json();
    showToast(isEdit ? "Sertifikat berhasil diperbarui." : "Sertifikat berhasil ditambahkan.");
    router.push(isEdit ? `/certificate/${initialData!.id}` : `/certificate/${body.certificate.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="certificateNumber">Nomor Sertifikat</Label>
            <Input
              id="certificateNumber"
              placeholder="CERT-2026-001"
              error={errors.certificateNumber?.message}
              {...register("certificateNumber")}
            />
          </div>

          <div>
            <Label htmlFor="certificateName">Nama Sertifikat</Label>
            <Input
              id="certificateName"
              placeholder="ISO 9001:2015 Quality Management"
              error={errors.certificateName?.message}
              {...register("certificateName")}
            />
          </div>

          <div>
            <Label htmlFor="clientId">Klien / Perusahaan</Label>
            <Select id="clientId" error={errors.clientId?.message} {...register("clientId")}>
              <option value="">Pilih klien</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="categoryId">Kategori</Label>
            <Select id="categoryId" error={errors.categoryId?.message} {...register("categoryId")}>
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="departmentId">Divisi</Label>
            <Select id="departmentId" error={errors.departmentId?.message} {...register("departmentId")}>
              <option value="">Pilih divisi (opsional)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="issuingBody">Instansi Penerbit</Label>
            <Input
              id="issuingBody"
              placeholder="Contoh: Kemnaker RI, BSN, TÜV Rheinland"
              error={errors.issuingBody?.message}
              {...register("issuingBody")}
            />
          </div>

          <div>
            <Label htmlFor="pic">PIC</Label>
            <Input id="pic" placeholder="Nama penanggung jawab" error={errors.pic?.message} {...register("pic")} />
          </div>

          <div>
            <Label htmlFor="picEmail">Email PIC</Label>
            <Input
              id="picEmail"
              type="email"
              placeholder="pic@perusahaan.co.id"
              error={errors.picEmail?.message}
              {...register("picEmail")}
            />
            <p className="text-xs text-slate-400 mt-1">Reminder sertifikasi akan dikirim ke email ini.</p>
          </div>

          <div>
            <Label htmlFor="issueDate">Tanggal Terbit</Label>
            <Input id="issueDate" type="date" error={errors.issueDate?.message} {...register("issueDate")} />
          </div>

          <div>
            <Label htmlFor="validFrom">Berlaku Sejak</Label>
            <Input id="validFrom" type="date" error={errors.validFrom?.message} {...register("validFrom")} />
          </div>

          <div>
            <Label htmlFor="expiryDate">Tanggal Berakhir</Label>
            <Input id="expiryDate" type="date" error={errors.expiryDate?.message} {...register("expiryDate")} />
          </div>

          <div>
            <Label htmlFor="storageLocation">Lokasi Penyimpanan</Label>
            <Input
              id="storageLocation"
              placeholder="Contoh: Lemari Arsip Lt.2 - Rak B3"
              error={errors.storageLocation?.message}
              {...register("storageLocation")}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" rows={3} placeholder="Deskripsi singkat sertifikat" {...register("description")} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" rows={2} placeholder="Catatan tambahan (opsional)" {...register("notes")} />
          </div>

          <div className="md:col-span-2">
            <Label>Dokumen Sertifikat</Label>
            {!fileUrl ? (
              <label
                htmlFor="doc-upload"
                className="flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                ) : (
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                )}
                <span className="text-sm text-slate-500">
                  {uploading ? "Mengunggah..." : "Klik untuk unggah PDF, JPG, atau PNG (maks. 20 MB)"}
                </span>
                <input
                  id="doc-upload"
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
                  <span className="text-sm text-ink truncate">{fileName || "File terunggah"}</span>
                </div>
                <button type="button" onClick={removeFile} className="text-slate-400 hover:text-signal-expired p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {uploading && <div className="mt-2"><UploadProgressBar /></div>}
            {uploadError && <p className="mt-1 text-xs text-signal-expired">{uploadError}</p>}
          </div>
        </CardContent>
      </Card>

      {serverError && (
        <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-4 py-3 text-sm text-signal-expired">
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={uploading}>
          <Save className="h-4 w-4" />
          {isEdit ? "Simpan Perubahan" : "Simpan Sertifikat"}
        </Button>
      </div>
    </form>
  );
}
