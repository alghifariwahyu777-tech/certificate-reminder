"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, FolderKanban, X, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type CategoryItem = { id: string; name: string; certificateCount: number };

export function CategoryManager({
  initialCategories,
  canManage = true,
}: {
  initialCategories: CategoryItem[];
  canManage?: boolean;
}) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState(initialCategories);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<CategoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd() {
    setAddError(null);
    if (!newName.trim()) {
      setAddError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAddError(body.message);
        return;
      }
      setCategories((prev) =>
        [...prev, { id: body.category.id, name: body.category.name, certificateCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      showToast("Kategori berhasil ditambahkan.");
      setAddOpen(false);
      setNewName("");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(cat: CategoryItem) {
    setEditTarget(cat);
    setEditName(cat.name);
    setEditError(null);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setEditError(body.message);
        return;
      }
      setCategories((prev) =>
        prev
          .map((c) => (c.id === editTarget.id ? { ...c, name: body.category.name } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast("Kategori berhasil diperbarui.");
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
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.message || "Gagal menghapus kategori.");
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showToast("Kategori berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} kategori terdaftar</p>
        {canManage && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah Kategori
          </Button>
        )}
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {categories.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada kategori.</p>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-ink/5 text-ink flex items-center justify-center border border-ink/10">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{cat.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{cat.certificateCount} sertifikat</p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                    aria-label="Edit kategori"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(cat);
                      setDeleteError(null);
                    }}
                    className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                    aria-label="Hapus kategori"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah Kategori">
        <Label htmlFor="new-category">Nama Kategori</Label>
        <Input
          id="new-category"
          placeholder="Contoh: ISO, K3, Legal"
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

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Kategori">
        <Label htmlFor="edit-category">Nama Kategori</Label>
        <Input
          id="edit-category"
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

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Kategori">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus kategori <strong className="text-ink">{deleteTarget?.name}</strong>?
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
