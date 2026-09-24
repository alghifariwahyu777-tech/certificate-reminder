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
import { getCertificateStatus, STATUS_LABEL, STATUS_CLASSES, getDaysRemaining } from "@/lib/status";
import { formatDate } from "@/lib/utils";

type EquipmentItem = {
  id: string;
  name: string;
  assetNumber: string | null;
  brand: string | null;
  model: string | null;
  categoryName: string;
  picName: string;
  nextCalibrationDate: string;
};

export function EquipmentListClient({
  initialEquipment,
  categories,
  canManage = true,
}: {
  initialEquipment: EquipmentItem[];
  categories: { id: string; name: string }[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState(initialEquipment);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        (e.assetNumber || "").toLowerCase().includes(q) ||
        e.picName.toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || e.categoryName === categoryFilter;
      const matchesStatus = !statusFilter || getCertificateStatus(e.nextCalibrationDate) === statusFilter;
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
    setSelectedIds((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((e) => e.id))));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/equipment/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus alat.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      showToast("Alat dipindahkan ke Trash.");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/equipment/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body.message || "Gagal menghapus alat terpilih.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      showToast(`${body.deletedCount} alat berhasil dihapus.`);
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
              placeholder="Cari nama alat, nomor aset, atau PIC..."
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
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </div>
        {canManage && (
          <Link href="/equipment/new">
            <Button>
              <Plus className="h-4 w-4" />
              Tambah Alat
            </Button>
          </Link>
        )}
      </div>

      {canManage && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-4 py-2.5">
          <span className="text-sm text-ink">
            <strong>{selectedIds.size}</strong> alat dipilih
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
                <th className="px-4 py-3 font-medium">Alat</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">PIC</th>
                <th className="px-4 py-3 font-medium">Kalibrasi Berikutnya</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                    Belum ada alat yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const status = getCertificateStatus(e.nextCalibrationDate);
                  const days = getDaysRemaining(e.nextCalibrationDate);
                  return (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      {canManage && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(e.id)}
                            onChange={() => toggleSelect(e.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{e.name}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {[e.brand, e.model, e.assetNumber].filter(Boolean).join(" · ") || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.categoryName}</td>
                      <td className="px-4 py-3 text-slate-600">{e.picName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(e.nextCalibrationDate)}
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
                            href={`/equipment/${e.id}`}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                            aria-label="Lihat detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canManage && (
                            <>
                              <Link
                                href={`/equipment/${e.id}/edit`}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(e)}
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

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Alat">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Apakah Anda yakin ingin menghapus alat{" "}
          <strong className="text-ink dark:text-slate-100">{deleteTarget?.name}</strong>? Data akan dipindahkan
          ke Trash dan bisa dipulihkan.
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

      <Modal isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Hapus Alat Terpilih">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Akan memindahkan <strong>{selectedIds.size}</strong> alat ke Trash. Data bisa dipulihkan nanti dari
          halaman Trash. Lanjutkan?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={bulkDeleting} onClick={confirmBulkDelete}>
            Hapus {selectedIds.size} Alat
          </Button>
        </div>
      </Modal>
    </div>
  );
}
