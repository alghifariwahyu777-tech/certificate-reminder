"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Users2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type SupervisorItem = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  isActive: boolean;
};

export function SupervisorManager({
  initialSupervisors,
  canManage = true,
}: {
  initialSupervisors: SupervisorItem[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState(initialSupervisors);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupervisorItem | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SupervisorItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setEditTarget(null);
    setName("");
    setEmail("");
    setPosition("");
    setIsActive(true);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: SupervisorItem) {
    setEditTarget(item);
    setName(item.name);
    setEmail(item.email);
    setPosition(item.position || "");
    setIsActive(item.isActive);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!name.trim() || !email.trim()) {
      setFormError("Nama dan email wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const url = editTarget ? `/api/supervisors/${editTarget.id}` : "/api/supervisors";
      const res = await fetch(url, {
        method: editTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, position, isActive }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.message || "Gagal menyimpan data.");
        return;
      }
      if (editTarget) {
        setItems((prev) =>
          prev.map((i) => (i.id === editTarget.id ? { ...i, ...body.supervisor } : i))
        );
        showToast("Data atasan berhasil diperbarui.");
      } else {
        setItems((prev) => [...prev, body.supervisor]);
        showToast("Atasan berhasil ditambahkan.");
      }
      setFormOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/supervisors/${deleteTarget.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body.message || "Gagal menghapus atasan.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      showToast("Atasan berhasil dihapus.");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-accent/20 bg-accent/5 px-3 py-2.5 flex gap-2">
        <Users2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Setiap atasan berstatus <strong>Aktif</strong> di sini otomatis di-CC ke <strong>seluruh</strong>{" "}
          reminder — Sertifikat Klien, Sertifikasi Personil, Project, maupun Equipment — tanpa perlu
          dipilih satu-satu di setiap data. Kalau ada restrukturisasi, cukup nonaktifkan atau ganti
          data di sini; semua reminder otomatis ikut menyesuaikan mulai pengiriman berikutnya.
        </p>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Tambah Atasan
          </Button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Jabatan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-4 py-10 text-center text-slate-400">
                    Belum ada atasan yang terdaftar.
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{s.email}</td>
                    <td className="px-4 py-3 text-slate-600">{s.position || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "stamp-badge",
                          s.isActive
                            ? "bg-signal-activeBg text-signal-active border-signal-activeBorder"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        )}
                      >
                        {s.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                            aria-label="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? "Edit Atasan" : "Tambah Atasan"}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="sup-name">Nama</Label>
            <Input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sup-email">Email</Label>
            <Input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sup-position">Jabatan (opsional)</Label>
            <Input id="sup-position" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Aktif (muncul sebagai pilihan CC)
          </label>

          {formError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              <X className="h-4 w-4" />
              Batal
            </Button>
            <Button isLoading={saving} onClick={handleSave}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Atasan">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Apakah Anda yakin ingin menghapus atasan{" "}
          <strong className="text-ink dark:text-slate-100">{deleteTarget?.name}</strong>? Atasan ini akan
          berhenti di-CC pada reminder berikutnya.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={deleting} onClick={confirmDelete}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
