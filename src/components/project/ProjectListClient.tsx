"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Eye, Pencil, Trash2, X } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { getDaysRemaining } from "@/lib/status";

type ProjectItem = {
  id: string;
  projectNumber: string;
  projectName: string;
  categoryName: string;
  clientName: string;
  pic: string;
  targetEndDate: string;
  status: "ONGOING" | "COMPLETED" | "CANCELLED";
  contractValue: string | null;
};

const STATUS_LABEL: Record<string, string> = { ONGOING: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
const STATUS_CLASS: Record<string, string> = {
  ONGOING: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-signal-activeBg text-signal-active border-signal-activeBorder",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

function formatRupiah(value: string | null) {
  if (!value) return "-";
  const num = Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export function ProjectListClient({
  initialProjects,
  categories,
  canManage = true,
}: {
  initialProjects: ProjectItem[];
  categories: { id: string; name: string }[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState(initialProjects);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      const matchesSearch =
        !q ||
        p.projectName.toLowerCase().includes(q) ||
        p.projectNumber.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.pic.toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || p.categoryName === categoryFilter;
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus project.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      showToast("Project dipindahkan ke Trash.");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/projects/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body.message || "Gagal menghapus project terpilih.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      showToast(`${body.deletedCount} project berhasil dihapus.`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama, nomor, klien, atau PIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="sm:w-48">
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
            <option value="">Semua Status</option>
            <option value="ONGOING">Berjalan</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
          </Select>
        </div>
        {canManage && (
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              Tambah Project
            </Button>
          </Link>
        )}
      </div>

      {canManage && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-4 py-2.5">
          <span className="text-sm text-ink">
            <strong>{selectedIds.size}</strong> project dipilih
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
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Klien</th>
                <th className="px-4 py-3 font-medium">PIC</th>
                <th className="px-4 py-3 font-medium">Target Selesai</th>
                <th className="px-4 py-3 font-medium">Nilai Kontrak</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="px-4 py-10 text-center text-slate-400">
                    Belum ada project yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const days = getDaysRemaining(p.targetEndDate);
                  return (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      {canManage && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{p.projectName}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.projectNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.categoryName}</td>
                      <td className="px-4 py-3 text-slate-600">{p.clientName}</td>
                      <td className="px-4 py-3 text-slate-600">{p.pic}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(p.targetEndDate)}
                        {p.status === "ONGOING" && (
                          <p className="text-xs text-slate-400">
                            {days >= 0 ? `${days} hari lagi` : `${Math.abs(days)} hari lalu`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{formatRupiah(p.contractValue)}</td>
                      <td className="px-4 py-3">
                        <span className={`stamp-badge ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/projects/${p.id}`}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                            aria-label="Lihat detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canManage && (
                            <>
                              <Link
                                href={`/projects/${p.id}/edit`}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(p)}
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

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Project">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Apakah Anda yakin ingin menghapus project{" "}
          <strong className="text-ink dark:text-slate-100">{deleteTarget?.projectName}</strong>? Data akan
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

      <Modal isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Hapus Project Terpilih">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Akan memindahkan <strong>{selectedIds.size}</strong> project ke Trash. Data bisa dipulihkan
          nanti dari halaman Trash. Lanjutkan?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={bulkDeleting} onClick={confirmBulkDelete}>
            Hapus {selectedIds.size} Project
          </Button>
        </div>
      </Modal>
    </div>
  );
}
