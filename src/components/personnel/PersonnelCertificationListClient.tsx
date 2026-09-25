"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Pencil, Trash2, FileSpreadsheet, X, ArrowUpDown } from "lucide-react";
import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { getCertificateStatus, STATUS_LABEL, STATUS_CLASSES, getDaysRemaining } from "@/lib/status";
import { formatDate } from "@/lib/utils";

type CertItem = {
  id: string;
  certificationName: string;
  certificationNumber: string | null;
  categoryId: string;
  categoryName: string;
  employeeName: string;
  departmentName: string | null;
  expiryDate: string;
  fileUrl: string | null;
};

export function PersonnelCertificationListClient({
  initialCertifications,
  categories,
  canManage = true,
}: {
  initialCertifications: CertItem[];
  categories: { id: string; name: string }[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortBy, setSortBy] = useState("expiryDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [items, setItems] = useState(initialCertifications);
  const [deleteTarget, setDeleteTarget] = useState<CertItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => current - 2 + i);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = items.filter((c) => {
      const matchesSearch =
        !q ||
        c.certificationName.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        (c.certificationNumber || "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || getCertificateStatus(c.expiryDate) === statusFilter;
      const matchesCategory = !categoryFilter || c.categoryId === categoryFilter;
      const matchesYear = !yearFilter || new Date(c.expiryDate).getFullYear() === Number(yearFilter);
      return matchesSearch && matchesStatus && matchesCategory && matchesYear;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (sortBy) {
        case "certificationName":
          return a.certificationName.localeCompare(b.certificationName) * dir;
        case "employeeName":
          return a.employeeName.localeCompare(b.employeeName) * dir;
        case "categoryName":
          return a.categoryName.localeCompare(b.categoryName) * dir;
        case "expiryDate":
        default:
          return (new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()) * dir;
      }
    });
    return result;
  }, [items, search, statusFilter, categoryFilter, yearFilter, sortBy, sortDir]);

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/personnel-certifications/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus sertifikasi.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      showToast("Sertifikasi berhasil dihapus.");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/personnel-certifications/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body.message || "Gagal menghapus sertifikasi terpilih.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      showToast(`${body.deletedCount} sertifikasi berhasil dihapus.`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div className="col-span-2 sm:col-span-1">
            <SearchPopoverButton
              value={search}
              onChange={setSearch}
              label="Cari Sertifikasi"
              placeholder="Nama, nomor, atau personil..."
            />
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </Select>
          <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="">Semua Tahun</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        {canManage && (
          <div className="flex gap-2 w-full lg:w-auto">
            <Link href="/personnel-certifications/import" className="flex-1 lg:flex-none">
              <Button variant="outline" className="whitespace-nowrap w-full">
                <FileSpreadsheet className="h-4 w-4" />
                Import Excel
              </Button>
            </Link>
            <Link href="/personnel-certifications/new" className="flex-1 lg:flex-none">
              <Button className="whitespace-nowrap w-full">
                <Plus className="h-4 w-4" />
                Tambah Sertifikasi
              </Button>
            </Link>
          </div>
        )}
      </div>

      {canManage && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-4 py-2.5">
          <span className="text-sm text-ink">
            <strong>{selectedIds.size}</strong> sertifikasi dipilih
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3.5 w-3.5" />
              Batal
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Terpilih
            </Button>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                {canManage && (
                  <th className="px-4 py-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                )}
                <th className="px-4 py-3 font-medium">
                  <SortHeader label="Sertifikasi" field="certificationName" current={sortBy} dir={sortDir} onToggle={toggleSort} />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader label="Personil" field="employeeName" current={sortBy} dir={sortDir} onToggle={toggleSort} />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader label="Kategori" field="categoryName" current={sortBy} dir={sortDir} onToggle={toggleSort} />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader label="Berakhir" field="expiryDate" current={sortBy} dir={sortDir} onToggle={toggleSort} />
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                    Belum ada sertifikasi personil yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const status = getCertificateStatus(c.expiryDate);
                  const days = getDaysRemaining(c.expiryDate);
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      {canManage && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{c.certificationName}</p>
                        {c.certificationNumber && (
                          <p className="text-xs text-slate-400 font-mono">{c.certificationNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.employeeName}
                        {c.departmentName && <span className="text-xs text-slate-400"> · {c.departmentName}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.categoryName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(c.expiryDate)}
                        <p className="text-xs text-slate-400">
                          {days >= 0 ? `${days} hari lagi` : `${Math.abs(days)} hari lalu`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`stamp-badge ${STATUS_CLASSES[status]}`}>{STATUS_LABEL[status]}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/personnel-certifications/${c.id}`}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                            aria-label="Lihat detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canManage && (
                            <>
                              <Link
                                href={`/personnel-certifications/${c.id}/edit`}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(c)}
                                className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                                aria-label="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Sertifikasi">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Apakah Anda yakin ingin menghapus sertifikasi{" "}
          <strong className="text-ink dark:text-slate-100">{deleteTarget?.certificationName}</strong> milik{" "}
          <strong className="text-ink dark:text-slate-100">{deleteTarget?.employeeName}</strong>? Data akan
          dipindahkan ke Trash dan bisa dipulihkan.
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

      <Modal isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Hapus Sertifikasi Terpilih">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Akan memindahkan <strong>{selectedIds.size}</strong> sertifikasi ke Trash. Data bisa dipulihkan
          nanti dari halaman Trash. Lanjutkan?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={bulkDeleting} onClick={confirmBulkDelete}>
            Hapus {selectedIds.size} Sertifikasi
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SortHeader({
  label,
  field,
  current,
  dir,
  onToggle,
}: {
  label: string;
  field: string;
  current: string;
  dir: "asc" | "desc";
  onToggle: (field: string) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onToggle(field)}
      className={`flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "text-accent" : "text-slate-300"} ${active && dir === "desc" ? "rotate-180" : ""}`} />
    </button>
  );
}
