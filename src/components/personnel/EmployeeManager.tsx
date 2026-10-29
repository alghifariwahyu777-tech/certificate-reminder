"use client";

import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { IconBox } from "@/components/ui/IconBox";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { filterGroupClass, toolbarActionsClass, toolbarClass } from "@/components/ui/Toolbar";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, UserSquare2, Search, X, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Notice } from "@/components/ui/Notice";

type EmployeeItem = {
  id: string;
  name: string;
  employeeId: string | null;
  position: string | null;
  departmentId: string | null;
  departmentName: string | null;
  email: string;
  isActive: boolean;
  certificationCount: number;
};

type FormState = {
  name: string;
  employeeId: string;
  position: string;
  departmentId: string;
  email: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = { name: "", employeeId: "", position: "", departmentId: "", email: "", isActive: true };

export function EmployeeManager({
  initialEmployees,
  departments,
  canManage = true,
}: {
  initialEmployees: EmployeeItem[];
  departments: { id: string; name: string }[];
  canManage?: boolean;
}) {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EmployeeItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.employeeId || "").toLowerCase().includes(q) ||
        (e.position || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(emp: EmployeeItem) {
    setEditTarget(emp);
    setForm({
      name: emp.name,
      employeeId: emp.employeeId || "",
      position: emp.position || "",
      departmentId: emp.departmentId || "",
      email: emp.email,
      isActive: emp.isActive,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Nama dan email wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const url = editTarget ? `/api/employees/${editTarget.id}` : "/api/employees";
      const res = await fetch(url, {
        method: editTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          employeeId: form.employeeId.trim() || undefined,
          position: form.position.trim() || undefined,
          departmentId: form.departmentId || undefined,
          email: form.email.trim(),
          isActive: form.isActive,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.message || "Gagal menyimpan data.");
        return;
      }

      const dept = departments.find((d) => d.id === body.employee.departmentId);
      const savedItem: EmployeeItem = {
        id: body.employee.id,
        name: body.employee.name,
        employeeId: body.employee.employeeId,
        position: body.employee.position,
        departmentId: body.employee.departmentId,
        departmentName: dept?.name || null,
        email: body.employee.email,
        isActive: body.employee.isActive,
        certificationCount: editTarget?.certificationCount || 0,
      };

      setEmployees((prev) =>
        editTarget
          ? prev.map((e) => (e.id === editTarget.id ? savedItem : e)).sort((a, b) => a.name.localeCompare(b.name))
          : [...prev, savedItem].sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast(editTarget ? "Personil berhasil diperbarui." : "Personil berhasil ditambahkan.");
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
      const res = await fetch(`/api/employees/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.message || "Gagal menghapus personil.");
        return;
      }
      setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      showToast("Personil berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={toolbarClass}>
        <div className={filterGroupClass}>
          <div>
            <SearchPopoverButton value={search} onChange={setSearch} label="Cari personil" placeholder="Nama, NIP, jabatan, atau email..." />
          </div>
        </div>
        {canManage && (
          <div className={toolbarActionsClass}>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Tambah personil
            </Button>
          </div>
        )}
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Belum ada personil yang cocok.</p>
          )}
          {filtered.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <IconBox icon={ENTITY_ICON.employee} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink truncate">{emp.name}</p>
                    {!emp.isActive && (
                      <span className="stamp-badge text-slate-500 bg-slate-100 border-slate-200 shrink-0">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {emp.position || "-"}
                    {emp.departmentName ? `, ${emp.departmentName}` : ""}, {emp.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  {emp.certificationCount} sertifikasi
                </span>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(emp)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                      aria-label="Ubah personil"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(emp);
                        setDeleteError(null);
                      }}
                      className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                      aria-label="Hapus personil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? "Ubah personil" : "Tambah personil"}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="emp-name">Nama lengkap</Label>
            <Input id="emp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="emp-id">NIP / ID pegawai</Label>
              <Input
                id="emp-id"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="emp-position">Jabatan</Label>
              <Input
                id="emp-position"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="emp-department">Divisi</Label>
            <Select
              id="emp-department"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">Tidak ditentukan</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@sucofindo.co.id"
            />
            <p className="text-xs text-slate-400 mt-1">Pengingat sertifikasi dikirim ke email ini.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-slate-300"
            />
            Personil aktif (nonaktifkan untuk menghentikan reminder tanpa menghapus data)
          </label>

          {formError && (
            <Notice tone="danger">
              {formError}
            </Notice>
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

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus personil">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus personil <strong className="text-ink">{deleteTarget?.name}</strong>?
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
