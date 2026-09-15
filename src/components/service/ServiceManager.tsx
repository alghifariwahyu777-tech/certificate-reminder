"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Layers, Settings2, ShieldCheck, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { serviceSchema, type ServiceInput } from "@/lib/validations";

type ServiceItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  requiresAudit: boolean;
  requiresSurveillance: boolean;
  surveillanceCount: number | null;
  surveillanceIntervalMonths: number | null;
  estimatedProcessingDays: number | null;
  requirementCount: number;
  stageCount: number;
};

export function ServiceManager({
  initialServices,
  canManage = true,
}: {
  initialServices: ServiceItem[];
  canManage?: boolean;
}) {
  const { showToast } = useToast();
  const [services, setServices] = useState(initialServices);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceItem | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { isActive: true, requiresAudit: true, requiresSurveillance: false },
  });

  const requiresSurveillance = watch("requiresSurveillance");

  function openAdd() {
    setEditTarget(null);
    setServerError(null);
    reset({
      name: "",
      code: "",
      description: "",
      isActive: true,
      requiresAudit: true,
      requiresSurveillance: false,
      surveillanceCount: undefined,
      surveillanceIntervalMonths: undefined,
      estimatedProcessingDays: undefined,
    });
    setFormOpen(true);
  }

  function openEdit(service: ServiceItem) {
    setEditTarget(service);
    setServerError(null);
    reset({
      name: service.name,
      code: service.code,
      description: service.description || "",
      isActive: service.isActive,
      requiresAudit: service.requiresAudit,
      requiresSurveillance: service.requiresSurveillance,
      surveillanceCount: service.surveillanceCount ?? undefined,
      surveillanceIntervalMonths: service.surveillanceIntervalMonths ?? undefined,
      estimatedProcessingDays: service.estimatedProcessingDays ?? undefined,
    });
    setFormOpen(true);
  }

  async function onSubmit(data: ServiceInput) {
    setServerError(null);
    const isEdit = !!editTarget;
    const res = await fetch(isEdit ? `/api/services/${editTarget!.id}` : "/api/services", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      setServerError(body.message || "Gagal menyimpan layanan.");
      return;
    }

    if (isEdit) {
      setServices((prev) =>
        prev
          .map((s) => (s.id === editTarget!.id ? { ...s, ...body.service } : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast("Layanan berhasil diperbarui.");
    } else {
      setServices((prev) =>
        [...prev, { ...body.service, requirementCount: 0, stageCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      showToast("Layanan berhasil ditambahkan.");
    }
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/services/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.message || "Gagal menghapus layanan.");
        return;
      }
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast("Layanan berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{services.length} layanan terdaftar</p>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Tambah Layanan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.length === 0 && (
          <Card className="sm:col-span-2">
            <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada layanan terdaftar.</p>
          </Card>
        )}
        {services.map((service) => (
          <Card key={service.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded bg-ink/5 text-ink flex items-center justify-center border border-ink/10 shrink-0">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink truncate">{service.name}</p>
                    {!service.isActive && (
                      <span className="stamp-badge text-slate-500 bg-slate-100 border-slate-200">Nonaktif</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{service.code}</p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(service)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                    aria-label="Edit layanan"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(service);
                      setDeleteError(null);
                    }}
                    className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                    aria-label="Hapus layanan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {service.description && (
              <p className="text-xs text-slate-500 mt-3 leading-relaxed line-clamp-2">{service.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {service.requiresAudit && (
                <span className="stamp-badge text-accent bg-accent/5 border-accent/20">
                  <ShieldCheck className="h-3 w-3" /> Audit
                </span>
              )}
              {service.requiresSurveillance && (
                <span className="stamp-badge text-signal-soon bg-signal-soonBg border-signal-soonBorder">
                  <CalendarClock className="h-3 w-3" />
                  Surveillance {service.surveillanceCount}x / {service.surveillanceIntervalMonths}bln
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-mono">
                {service.requirementCount} dokumen · {service.stageCount} tahap
              </p>
              <Link
                href={`/services/${service.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-light"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Kelola Persyaratan & Workflow
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Edit Layanan" : "Tambah Layanan"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="svc-name">Nama Layanan</Label>
              <Input id="svc-name" error={errors.name?.message} {...register("name")} />
            </div>
            <div>
              <Label htmlFor="svc-code">Kode Layanan</Label>
              <Input id="svc-code" placeholder="ISO-9001" error={errors.code?.message} {...register("code")} />
            </div>
          </div>
          <div>
            <Label htmlFor="svc-desc">Deskripsi</Label>
            <Textarea id="svc-desc" rows={3} {...register("description")} />
          </div>
          <div>
            <Label htmlFor="svc-days">Estimasi Waktu Proses (hari)</Label>
            <Input
              id="svc-days"
              type="number"
              min={1}
              error={errors.estimatedProcessingDays?.message}
              {...register("estimatedProcessingDays")}
            />
          </div>

          <div className="space-y-2 rounded border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="rounded border-slate-300" {...register("isActive")} />
              Layanan aktif (tampil di katalog klien)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="rounded border-slate-300" {...register("requiresAudit")} />
              Membutuhkan audit
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="rounded border-slate-300" {...register("requiresSurveillance")} />
              Membutuhkan surveillance
            </label>
          </div>

          {requiresSurveillance && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="svc-sv-count">Jumlah Surveillance</Label>
                <Input
                  id="svc-sv-count"
                  type="number"
                  min={1}
                  error={errors.surveillanceCount?.message}
                  {...register("surveillanceCount")}
                />
              </div>
              <div>
                <Label htmlFor="svc-sv-interval">Interval (bulan)</Label>
                <Input
                  id="svc-sv-interval"
                  type="number"
                  min={1}
                  error={errors.surveillanceIntervalMonths?.message}
                  {...register("surveillanceIntervalMonths")}
                />
              </div>
            </div>
          )}

          {serverError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Layanan">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus layanan <strong className="text-ink">{deleteTarget?.name}</strong>?
          Seluruh persyaratan dokumen dan tahap workflow layanan ini akan ikut terhapus.
        </p>
        {deleteError && (
          <div className="mt-3 rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
            {deleteError}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
