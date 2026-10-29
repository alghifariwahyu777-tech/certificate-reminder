"use client";

import { useState } from "react";
import { IconBox } from "@/components/ui/IconBox";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { Plus, Pencil, Trash2, Building, X, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Notice } from "@/components/ui/Notice";

type DepartmentItem = { id: string; name: string; certificateCount: number };

export function DepartmentManager({
  initialDepartments,
  canManage = true,
}: {
  initialDepartments: DepartmentItem[];
  canManage?: boolean;
}) {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState(initialDepartments);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<DepartmentItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DepartmentItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd() {
    setAddError(null);
    if (!newName.trim()) {
      setAddError("Nama divisi wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAddError(body.message);
        return;
      }
      setDepartments((prev) =>
        [...prev, { id: body.department.id, name: body.department.name, certificateCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      showToast("Divisi berhasil ditambahkan.");
      setAddOpen(false);
      setNewName("");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(dept: DepartmentItem) {
    setEditTarget(dept);
    setEditName(dept.name);
    setEditError(null);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError("Nama divisi wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/departments/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setEditError(body.message);
        return;
      }
      setDepartments((prev) =>
        prev
          .map((d) => (d.id === editTarget.id ? { ...d, name: body.department.name } : d))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast("Divisi berhasil diperbarui.");
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/departments/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.message || "Gagal menghapus divisi.");
        return;
      }
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      showToast("Divisi berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{departments.length} divisi terdaftar</p>
        {canManage && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah divisi
          </Button>
        )}
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {departments.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Belum ada divisi.</p>
          )}
          {departments.map((dept) => (
            <div key={dept.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <IconBox icon={ENTITY_ICON.department} />
                <div>
                  <p className="text-sm font-medium text-ink">{dept.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{dept.certificateCount} sertifikat</p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(dept)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                    aria-label="Ubah divisi"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(dept);
                      setDeleteError(null);
                    }}
                    className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                    aria-label="Hapus divisi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah divisi">
        <Label htmlFor="new-department">Nama divisi</Label>
        <Input
          id="new-department"
          placeholder="Contoh: HSE, Legal, Fasilitas"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          error={addError || undefined}
        />
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setAddOpen(false)}>
            <X className="h-4 w-4" />
            Batal
          </Button>
          <Button isLoading={saving} onClick={handleAdd}>
            <Check className="h-4 w-4" />
            Simpan
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Ubah divisi">
        <Label htmlFor="edit-department">Nama divisi</Label>
        <Input
          id="edit-department"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          error={editError || undefined}
        />
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setEditTarget(null)}>
            Batal
          </Button>
          <Button isLoading={saving} onClick={handleEdit}>
            Simpan
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus divisi">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus divisi <strong className="text-ink">{deleteTarget?.name}</strong>?
        </p>
        {deleteError && (
          <Notice tone="danger" className="mt-3">
            {deleteError}
          </Notice>
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
