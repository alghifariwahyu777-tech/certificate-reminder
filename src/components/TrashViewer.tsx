"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Trash2, FileBadge2, Award } from "lucide-react";
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

type TrashedPersonnelCertification = {
  id: string;
  certificationNumber: string | null;
  certificationName: string;
  deletedAt: string;
  category: { name: string };
  employee: { name: string };
};

/** Normalized shape so both types render through the same list/restore/delete logic. */
type TrashItem = {
  id: string;
  kind: "CERTIFICATE" | "PERSONNEL_CERTIFICATION";
  title: string;
  subtitle: string;
  deletedAt: string;
  detailHref: string | null;
};

export function TrashViewer() {
  const { showToast } = useToast();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchTrash() {
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      const data = await res.json();

      const certificateItems: TrashItem[] = (data.certificates || []).map((c: TrashedCertificate) => ({
        id: c.id,
        kind: "CERTIFICATE" as const,
        title: c.certificateName,
        subtitle: `${c.certificateNumber} · ${c.client.name} · ${c.category.name}`,
        deletedAt: c.deletedAt,
        detailHref: `/certificate/${c.id}`,
      }));

      const personnelItems: TrashItem[] = (data.personnelCertifications || []).map(
        (p: TrashedPersonnelCertification) => ({
          id: p.id,
          kind: "PERSONNEL_CERTIFICATION" as const,
          title: p.certificationName,
          subtitle: `${p.certificationNumber || "-"} · ${p.employee.name} · ${p.category.name}`,
          deletedAt: p.deletedAt,
          detailHref: null, // no standalone detail page for personnel certifications yet
        })
      );

      setItems(
        [...certificateItems, ...personnelItems].sort(
          (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
        )
      );
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

  async function handleRestore(item: TrashItem) {
    setRestoringId(item.id);
    try {
      const res = await fetch(`/api/trash/${item.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal memulihkan data.", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`"${item.title}" berhasil dipulihkan.`);
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
      showToast("Data dihapus permanen.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {loading ? "Memuat…" : `${items.length} item di Trash (sertifikat klien & sertifikasi personil)`}
      </p>

      <Card>
        {loading ? (
          <SkeletonListItems items={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
            <FileBadge2 className="h-8 w-8" />
            <p className="text-sm">Trash kosong — tidak ada data yang dihapus.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const Icon = item.kind === "CERTIFICATE" ? FileBadge2 : Award;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-[10px] font-mono uppercase tracking-wide text-slate-400">
                        {item.kind === "CERTIFICATE" ? "Sertifikat Klien" : "Sertifikasi Personil"}
                      </span>
                    </div>
                    {item.detailHref ? (
                      <Link href={item.detailHref} className="text-sm font-medium text-ink hover:text-accent">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                    )}
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{item.subtitle}</p>
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
              );
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Permanen">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <strong className="text-ink dark:text-slate-100">{deleteTarget?.title}</strong> akan dihapus permanen
          beserta dokumennya. <strong>Tindakan ini tidak dapat dibatalkan.</strong>
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
