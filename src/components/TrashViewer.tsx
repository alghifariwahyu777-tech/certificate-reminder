"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Trash2, FileBadge2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { SkeletonListItems } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";

type TrashedCertificate = {
  id: string;
  certificateNumber: string;
  certificateName: string;
  deletedAt: string;
  category: { name: string };
  client: { name: string };
};

export function TrashViewer() {
  const { showToast } = useToast();
  const [items, setItems] = useState<TrashedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedCertificate | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchTrash() {
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      const data = await res.json();
      setItems(data.certificates || []);
    } catch {
      showToast("Gagal memuat data Trash.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRestore(item: TrashedCertificate) {
    setRestoringId(item.id);
    try {
      const res = await fetch(`/api/trash/${item.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal memulihkan sertifikat.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`Sertifikat "${item.certificateName}" berhasil dipulihkan.`);
    } finally {
      setRestoringId(null);
    }
  }

  async function handlePermanentDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/trash/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus permanen.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      showToast("Sertifikat dihapus permanen.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {loading ? "Memuat…" : `${items.length} sertifikat di Trash`}
      </p>

      <Card>
        {loading ? (
          <SkeletonListItems items={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
            <FileBadge2 className="h-8 w-8" />
            <p className="text-sm">Trash kosong — tidak ada sertifikat yang dihapus.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <Link href={`/certificate/${item.id}`} className="text-sm font-medium text-ink hover:text-accent">
                    {item.certificateName}
                  </Link>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {item.certificateNumber} · {item.client.name} · {item.category.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Dihapus {formatDate(item.deletedAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={restoringId === item.id}
                    onClick={() => handleRestore(item)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Pulihkan
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Permanen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Permanen">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sertifikat <strong className="text-ink dark:text-slate-100">{deleteTarget?.certificateName}</strong>{" "}
          akan dihapus permanen beserta dokumennya. <strong>Tindakan ini tidak dapat dibatalkan.</strong>
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={deleting} onClick={handlePermanentDelete}>
            Hapus Permanen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
