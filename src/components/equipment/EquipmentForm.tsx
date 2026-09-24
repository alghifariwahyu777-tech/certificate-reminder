"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Save } from "lucide-react";
import { equipmentSchema, type EquipmentInput, MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/validations";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

type EmployeeLite = { id: string; name: string; employeeId: string | null };
type CategoryLite = { id: string; name: string };

export function EquipmentForm({
  employees,
  categories,
  initialData,
}: {
  employees: EmployeeLite[];
  categories: CategoryLite[];
  initialData?: EquipmentInput & { id: string };
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
  } = useForm<EquipmentInput>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          lastCalibrationDate: toDateInputValue(initialData.lastCalibrationDate),
          nextCalibrationDate: toDateInputValue(initialData.nextCalibrationDate),
        }
      : { categoryId: "", picId: "" },
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
      formData.append("folder", "equipment");

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

  async function onSubmit(data: EquipmentInput) {
    setServerError(null);
    const payload = { ...data, fileUrl, driveFileId, fileMimeType };

    const url = isEdit ? `/api/equipment/${initialData.id}` : "/api/equipment";
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

    showToast(isEdit ? "Data alat berhasil diperbarui." : "Alat berhasil ditambahkan.");
    router.push("/equipment");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eq-name">Nama Alat</Label>
              <Input id="eq-name" {...register("name")} error={errors.name?.message} placeholder="Contoh: Multimeter Digital" />
            </div>
            <div>
              <Label htmlFor="eq-category">Kategori</Label>
              <Select id="eq-category" {...register("categoryId")} error={errors.categoryId?.message}>
                <option value="">— Pilih kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="eq-asset">Nomor Aset/Seri</Label>
              <Input id="eq-asset" {...register("assetNumber")} error={errors.assetNumber?.message} />
            </div>
            <div>
              <Label htmlFor="eq-brand">Merk</Label>
              <Input id="eq-brand" {...register("brand")} error={errors.brand?.message} />
            </div>
            <div>
              <Label htmlFor="eq-model">Tipe</Label>
              <Input id="eq-model" {...register("model")} error={errors.model?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="eq-color">Warna</Label>
            <Input id="eq-color" {...register("color")} error={errors.color?.message} className="max-w-[200px]" />
          </div>

          <div>
            <Label htmlFor="eq-pic">PIC Alat</Label>
            <Select id="eq-pic" {...register("picId")} error={errors.picId?.message}>
              <option value="">— Pilih personil —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.employeeId ? ` (NIP: ${e.employeeId})` : ""}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-400 mt-1">Reminder kalibrasi akan dikirim ke email PIC ini.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eq-calNumber">Nomor Sertifikat Kalibrasi</Label>
              <Input id="eq-calNumber" {...register("calibrationNumber")} error={errors.calibrationNumber?.message} />
            </div>
            <div>
              <Label htmlFor="eq-calBy">Instansi Kalibrator</Label>
              <Input id="eq-calBy" {...register("calibratedBy")} error={errors.calibratedBy?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eq-lastCal">Kalibrasi Terakhir</Label>
              <Input id="eq-lastCal" type="date" {...register("lastCalibrationDate")} error={errors.lastCalibrationDate?.message} />
            </div>
            <div>
              <Label htmlFor="eq-nextCal">Kalibrasi Berikutnya</Label>
              <Input id="eq-nextCal" type="date" {...register("nextCalibrationDate")} error={errors.nextCalibrationDate?.message} />
              <p className="text-xs text-slate-400 mt-1">Reminder dihitung dari tanggal ini.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="eq-notes">Catatan</Label>
            <Textarea id="eq-notes" {...register("notes")} error={errors.notes?.message} rows={2} />
          </div>

          <div>
            <Label>Sertifikat Kalibrasi</Label>
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
