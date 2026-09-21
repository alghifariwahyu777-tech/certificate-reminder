"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Upload,
} from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { CategoryLite, ClientLite, DepartmentLite, CertificateWithCategory, Pagination } from "@/types/certificate";

const SORT_OPTIONS = [
  { value: "expiryDate", label: "Tanggal Expired" },
  { value: "issueDate", label: "Tanggal Terbit" },
  { value: "certificateName", label: "Nama" },
  { value: "certificateNumber", label: "Nomor Sertifikat" },
];

export function CertificateListClient({
  categories,
  clients,
  departments,
  canManage = true,
}: {
  categories: CategoryLite[];
  clients: ClientLite[];
  departments: DepartmentLite[];
  canManage?: boolean;
}) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [clientId, setClientId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [sortBy, setSortBy] = useState("expiryDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [certificates, setCertificates] = useState<CertificateWithCategory[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CertificateWithCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, clientId, departmentId, status, year]);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      categoryId,
      clientId,
      departmentId,
      status,
      year,
      sortBy,
      sortDir,
      page: String(page),
      pageSize: "10",
    });
    try {
      const res = await fetch(`/api/certificates?${params.toString()}`);
      const data = await res.json();
      setCertificates(data.certificates || []);
      setPagination(data.pagination || null);
    } catch {
      showToast("Gagal memuat data sertifikat.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryId, clientId, departmentId, status, year, sortBy, sortDir, page]);

  useEffect(() => {
    fetchCertificates();
    setSelectedIds(new Set());
  }, [fetchCertificates]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => current - 2 + i);
  }, []);

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
      prev.size === certificates.length ? new Set() : new Set(certificates.map((c) => c.id))
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/certificates/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus sertifikat.", "error");
      } else {
        showToast("Sertifikat berhasil dihapus.");
        setDeleteTarget(null);
        fetchCertificates();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/certificates/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body.message || "Gagal menghapus sertifikat terpilih.", "error");
      } else {
        showToast(`${body.deletedCount} sertifikat berhasil dihapus.`);
        setBulkDeleteOpen(false);
        setSelectedIds(new Set());
        fetchCertificates();
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 flex-1">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama, nomor, klien, atau PIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Semua Klien</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Semua Divisi</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </Select>
          <Select value={year} onChange={(e) => setYear(e.target.value)}>
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
            <Link href="/certificate/import" className="flex-1 lg:flex-none">
              <Button variant="outline" className="whitespace-nowrap w-full">
                <Upload className="h-4 w-4" />
                Import Excel
              </Button>
            </Link>
            <Link href="/certificate/add" className="flex-1 lg:flex-none">
              <Button className="whitespace-nowrap w-full">
                <Plus className="h-4 w-4" />
                Tambah Sertifikat
              </Button>
            </Link>
          </div>
        )}
      </div>

      {canManage && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-4 py-2.5">
          <span className="text-sm text-ink">
            <strong>{selectedIds.size}</strong> sertifikat dipilih
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
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={certificates.length > 0 && selectedIds.size === certificates.length}
                      onChange={toggleSelectAll}
                      aria-label="Pilih semua"
                      className="rounded border-slate-300"
                    />
                  </th>
                )}
                <th className="px-4 py-3 font-medium w-10">No</th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader label="Nomor" field="certificateNumber" current={sortBy} dir={sortDir} onToggle={toggleSort} />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader label="Nama Sertifikat" field="certificateName" current={sortBy} dir={sortDir} onToggle={toggleSort} />
                </th>
                <th className="px-4 py-3 font-medium">Klien</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader label="Expired" field="expiryDate" current={sortBy} dir={sortDir} onToggle={toggleSort} />
                </th>
                <th className="px-4 py-3 font-medium">PIC</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows columns={9} showCheckbox={canManage} />
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada sertifikat yang cocok dengan pencarian/filter.
                  </td>
                </tr>
              ) : (
                certificates.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 ${
                      selectedIds.has(c.id) ? "bg-accent/5" : ""
                    }`}
                  >
                    {canManage && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          aria-label={`Pilih ${c.certificateName}`}
                          className="rounded border-slate-300"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-400">
                      {((pagination?.page || 1) - 1) * (pagination?.pageSize || 10) + i + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.certificateNumber}</td>
                    <td className="px-4 py-3 font-medium text-ink">{c.certificateName}</td>
                    <td className="px-4 py-3 text-slate-600">{c.client.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.category.name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.expiryDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{c.pic}</td>
                    <td className="px-4 py-3">
                      <StatusBadge expiryDate={c.expiryDate} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/certificate/${c.id}`}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                          aria-label="Lihat detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canManage && (
                          <>
                            <Link
                              href={`/certificate/edit/${c.id}`}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Menampilkan {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} dari {pagination.total} sertifikat
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Sertifikat">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus sertifikat{" "}
          <strong className="text-ink">{deleteTarget?.certificateName}</strong>? Tindakan ini tidak dapat
          dibatalkan.
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

      <Modal isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Hapus Sertifikat Terpilih">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus <strong className="text-ink">{selectedIds.size} sertifikat</strong>{" "}
          yang dipilih? Dokumen yang sudah diunggah juga akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={bulkDeleting} onClick={confirmBulkDelete}>
            Hapus {selectedIds.size} Sertifikat
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
