"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Eye, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
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
  categoryName: string;
  employeeName: string;
  departmentName: string | null;
  expiryDate: string;
  fileUrl: string | null;
};

export function PersonnelCertificationListClient({
  initialCertifications,
  canManage = true,
}: {
  initialCertifications: CertItem[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState(initialCertifications);
  const [deleteTarget, setDeleteTarget] = useState<CertItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      const matchesSearch =
        !q ||
        c.certificationName.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        (c.certificationNumber || "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || getCertificateStatus(c.expiryDate) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama sertifikasi atau personil..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
            <option value="">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href="/personnel-certifications/import">
              <Button variant="outline">
                <FileSpreadsheet className="h-4 w-4" />
                Import Excel
              </Button>
            </Link>
            <Link href="/personnel-certifications/new">
              <Button>
                <Plus className="h-4 w-4" />
                Tambah Sertifikasi
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-medium">Sertifikasi</th>
                <th className="px-4 py-3 font-medium">Personil</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Berakhir</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Belum ada sertifikasi personil yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const status = getCertificateStatus(c.expiryDate);
                  const days = getDaysRemaining(c.expiryDate);
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
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
    </div>
  );
}
