"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type ClientUserItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export function ClientPortalUsersModal({
  clientId,
  clientName,
  isOpen,
  onClose,
}: {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<ClientUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClientUserItem | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ClientUserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/users`);
      const data = await res.json();
      setUsers(data.clientUsers || []);
    } catch {
      showToast("Gagal memuat akun portal.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clientId]);

  function openAdd() {
    setEditTarget(null);
    setName("");
    setEmail("");
    setPassword("");
    setIsActive(true);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(user: ClientUserItem) {
    setEditTarget(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setIsActive(user.isActive);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    setSaving(true);
    try {
      if (editTarget) {
        const res = await fetch(`/api/clients/${clientId}/users/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, isActive, password: password || undefined }),
        });
        const body = await res.json();
        if (!res.ok) {
          setFormError(body.message);
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? body.clientUser : u)));
        showToast("Akun portal berhasil diperbarui.");
      } else {
        const res = await fetch(`/api/clients/${clientId}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const body = await res.json();
        if (!res.ok) {
          setFormError(body.message);
          return;
        }
        setUsers((prev) => [...prev, body.clientUser]);
        showToast("Akun portal berhasil dibuat.");
      }
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus akun.", "error");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      showToast("Akun portal berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Akun Portal — ${clientName}`} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Akun ini dipakai klien untuk login ke Client Portal dan melihat sertifikatnya sendiri.
            </p>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </Button>
          </div>

          {loading ? (
            <Spinner />
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Belum ada akun portal untuk klien ini.</p>
          ) : (
            <div className="rounded border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink dark:text-slate-100 truncate">{u.name}</p>
                      {!u.isActive && (
                        <span className="stamp-badge text-signal-expired bg-signal-expiredBg border-signal-expiredBorder">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent"
                      aria-label="Edit akun"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                      aria-label="Hapus akun"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Edit Akun Portal" : "Tambah Akun Portal"}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="pu-name">Nama</Label>
            <Input id="pu-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pu-email">Email</Label>
            <Input
              id="pu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editTarget}
              className={editTarget ? "bg-slate-50 text-slate-400" : ""}
            />
          </div>
          <div>
            <Label htmlFor="pu-password">{editTarget ? "Password Baru (opsional)" : "Password"}</Label>
            <Input
              id="pu-password"
              type="password"
              placeholder={editTarget ? "Kosongkan jika tidak ingin mengubah" : ""}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {editTarget && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              Akun aktif
            </label>
          )}
          {editTarget && (
            <p className="text-xs text-slate-400">Bergabung sejak {formatDate(editTarget.createdAt)}</p>
          )}

          {formError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              <KeyRound className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Akun Portal">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Apakah Anda yakin ingin menghapus akun portal <strong>{deleteTarget?.name}</strong>? Klien ini tidak
          akan bisa login lagi.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
            Hapus
          </Button>
        </div>
      </Modal>
    </>
  );
}
