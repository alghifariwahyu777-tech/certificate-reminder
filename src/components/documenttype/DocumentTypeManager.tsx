"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, FileType, X, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type DocumentTypeItem = { id: string; name: string; description: string | null; usageCount: number };

export function DocumentTypeManager({
  initialDocumentTypes,
  canManage = true,
}: {
  initialDocumentTypes: DocumentTypeItem[];
  canManage?: boolean;
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState(initialDocumentTypes);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DocumentTypeItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DocumentTypeItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setEditTarget(null);
    setName("");
    setDescription("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: DocumentTypeItem) {
    setEditTarget(item);
    setName(item.name);
    setDescription(item.description || "");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!name.trim()) {
      setFormError("Nama dokumen wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editTarget ? `/api/document-types/${editTarget.id}` : "/api/document-types", {
        method: editTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.message);
        return;
      }
      if (editTarget) {
        setItems((prev) =>
          prev
            .map((i) => (i.id === editTarget.id ? { ...i, ...body.documentType } : i))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        showToast("Jenis dokumen berhasil diperbarui.");
      } else {
        setItems((prev) =>
          [...prev, { ...body.documentType, usageCount: 0 }].sort((a, b) => a.name.localeCompare(b.name))
        );
        showToast("Jenis dokumen berhasil ditambahkan.");
      }
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/document-types/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.message || "Gagal menghapus.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      showToast("Jenis dokumen berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} jenis dokumen terdaftar</p>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Tambah Jenis Dokumen
          </Button>
        )}
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {items.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada jenis dokumen.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-ink/5 text-ink flex items-center justify-center border border-ink/10">
                  <FileType className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-slate-400">
                    {item.description ? `${item.description} · ` : ""}
                    <span className="font-mono">{item.usageCount} layanan</span>
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(item);
                      setDeleteError(null);
                    }}
                    className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? "Edit Jenis Dokumen" : "Tambah Jenis Dokumen"}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="dt-name">Nama</Label>
            <Input id="dt-name" placeholder="Contoh: NIB, Legal Document" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dt-desc">Deskripsi (opsional)</Label>
            <Textarea id="dt-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {formError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              <X className="h-4 w-4" />
              Batal
            </Button>
            <Button isLoading={saving} onClick={handleSave}>
              <Check className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Jenis Dokumen">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus <strong className="text-ink">{deleteTarget?.name}</strong>?
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
