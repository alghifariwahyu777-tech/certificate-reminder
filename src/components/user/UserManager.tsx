"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, ShieldCheck, Eye, UserCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export function UserManager({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: UserItem[];
}) {
  const { showToast } = useToast();
  const [users, setUsers] = useState(initialUsers);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const addForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "VIEWER" },
  });

  const editForm = useForm<UpdateUserInput>({ resolver: zodResolver(updateUserSchema) });

  function openAdd() {
    setServerError(null);
    addForm.reset({ name: "", email: "", password: "", role: "VIEWER" });
    setAddOpen(true);
  }

  async function onAdd(data: CreateUserInput) {
    setServerError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      setServerError(body.message || "Gagal menambahkan pengguna.");
      return;
    }
    setUsers((prev) => [...prev, body.user]);
    showToast("Pengguna berhasil ditambahkan.");
    setAddOpen(false);
  }

  function openEdit(user: UserItem) {
    setServerError(null);
    editForm.reset({ name: user.name, role: user.role as "ADMIN" | "VIEWER", isActive: user.isActive, password: "" });
    setEditTarget(user);
  }

  async function onEdit(data: UpdateUserInput) {
    if (!editTarget) return;
    setServerError(null);
    const payload = { ...data, password: data.password || undefined };
    const res = await fetch(`/api/users/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      setServerError(body.message || "Gagal memperbarui pengguna.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? body.user : u)));
    showToast("Pengguna berhasil diperbarui.");
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.message || "Gagal menghapus pengguna.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      showToast("Pengguna berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} pengguna terdaftar</p>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold font-mono shrink-0">
                  {user.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                    {user.id === currentUserId && (
                      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-mono">(Anda)</span>
                    )}
                    {!user.isActive && (
                      <span className="stamp-badge text-signal-expired bg-signal-expiredBg border-signal-expiredBorder">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`stamp-badge ${
                    user.role === "ADMIN"
                      ? "text-ink bg-ink/5 border-ink/10"
                      : "text-accent bg-accent/5 border-accent/20"
                  }`}
                >
                  {user.role === "ADMIN" ? <ShieldCheck className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {user.role === "ADMIN" ? "Administrator" : "Viewer"}
                </span>
                <button
                  onClick={() => openEdit(user)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                  aria-label="Edit pengguna"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setDeleteTarget(user);
                    setDeleteError(null);
                  }}
                  disabled={user.id === currentUserId}
                  className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Hapus pengguna"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <UserCircle2 className="h-3.5 w-3.5" />
        Administrator memiliki akses penuh. Viewer hanya dapat melihat data, mengunduh dokumen, dan melihat histori — tidak dapat menambah, mengubah, atau menghapus data.
      </p>

      {/* Add User Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah Pengguna">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="add-name">Nama</Label>
            <Input id="add-name" error={addForm.formState.errors.name?.message} {...addForm.register("name")} />
          </div>
          <div>
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              type="email"
              error={addForm.formState.errors.email?.message}
              {...addForm.register("email")}
            />
          </div>
          <div>
            <Label htmlFor="add-password">Password</Label>
            <Input
              id="add-password"
              type="password"
              error={addForm.formState.errors.password?.message}
              {...addForm.register("password")}
            />
          </div>
          <div>
            <Label htmlFor="add-role">Role</Label>
            <Select id="add-role" error={addForm.formState.errors.role?.message} {...addForm.register("role")}>
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Administrator</option>
            </Select>
          </div>
          {serverError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {serverError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={addForm.formState.isSubmitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Pengguna">
        <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="edit-name">Nama</Label>
            <Input id="edit-name" error={editForm.formState.errors.name?.message} {...editForm.register("name")} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={editTarget?.email || ""} disabled className="bg-slate-50 text-slate-400" />
          </div>
          <div>
            <Label htmlFor="edit-password">Password Baru (opsional)</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Kosongkan jika tidak ingin mengubah"
              error={editForm.formState.errors.password?.message}
              {...editForm.register("password")}
            />
          </div>
          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select
              id="edit-role"
              disabled={editTarget?.id === currentUserId}
              error={editForm.formState.errors.role?.message}
              {...editForm.register("role")}
            >
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Administrator</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              disabled={editTarget?.id === currentUserId}
              {...editForm.register("isActive")}
              className="rounded border-slate-300"
            />
            Akun aktif
          </label>
          {editTarget && (
            <p className="text-xs text-slate-400">Bergabung sejak {formatDate(editTarget.createdAt)}</p>
          )}
          {serverError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {serverError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={editForm.formState.isSubmitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Pengguna">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus pengguna <strong className="text-ink">{deleteTarget?.name}</strong>?
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
