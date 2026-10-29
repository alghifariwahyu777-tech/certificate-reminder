"use client";

import { IconBox } from "@/components/ui/IconBox";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Trash2, FileBadge2, Award, FolderClock, Wrench } from "lucide-react";
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

type TrashedProject = {
  id: string;
  projectNumber: string;
  projectName: string;
  deletedAt: string;
  category: { name: string };
  clientName: string;
};

type TrashedEquipment = {
  id: string;
  name: string;
  assetNumber: string | null;
  deletedAt: string;
  category: { name: string };
  pic: { name: string };
};

/** Normalized shape so all four types render through the same list/restore/delete logic. */
type TrashItem = {
  id: string;
  kind: "CERTIFICATE" | "PERSONNEL_CERTIFICATION" | "PROJECT" | "EQUIPMENT";
  title: string;
  subtitle: string;
  deletedAt: string;
  detailHref: string | null;
};

const KIND_LABEL: Record<TrashItem["kind"], string> = {
  CERTIFICATE: "Sertifikat klien",
  PERSONNEL_CERTIFICATION: "Sertifikasi personil",
  PROJECT: "Project",
  EQUIPMENT: "Alat",
};

const KIND_ICON: Record<TrashItem["kind"], typeof FileBadge2> = {
  CERTIFICATE: ENTITY_ICON.certificate,
  PERSONNEL_CERTIFICATION: ENTITY_ICON.personnelCert,
  PROJECT: ENTITY_ICON.project,
  EQUIPMENT: ENTITY_ICON.equipment,
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
        subtitle: `${c.certificateNumber}, ${c.client.name}, ${c.category.name}`,
        deletedAt: c.deletedAt,
        detailHref: `/certificate/${c.id}`,
      }));

      const personnelItems: TrashItem[] = (data.personnelCertifications || []).map(
        (p: TrashedPersonnelCertification) => ({
          id: p.id,
          kind: "PERSONNEL_CERTIFICATION" as const,
          title: p.certificationName,
          subtitle: `${p.certificationNumber || "-"}, ${p.employee.name}, ${p.category.name}`,
          deletedAt: p.deletedAt,
          detailHref: `/personnel-certifications/${p.id}`,
        })
      );

      const projectItems: TrashItem[] = (data.projects || []).map((p: TrashedProject) => ({
        id: p.id,
        kind: "PROJECT" as const,
        title: p.projectName,
        subtitle: `${p.projectNumber}, ${p.clientName}, ${p.category.name}`,
        deletedAt: p.deletedAt,
        detailHref: `/projects/${p.id}`,
      }));

      const equipmentItems: TrashItem[] = (data.equipment || []).map((e: TrashedEquipment) => ({
        id: e.id,
        kind: "EQUIPMENT" as const,
        title: e.name,
        subtitle: `${e.assetNumber || "-"}, ${e.pic.name}, ${e.category.name}`,
        deletedAt: e.deletedAt,
        detailHref: `/equipment/${e.id}`,
      }));

      setItems(
        [...certificateItems, ...personnelItems, ...projectItems, ...equipmentItems].sort(
          (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
        )
      );
    } catch {
      showToast("Gagal memuat data Sampah.", "error");
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
        {loading ? "Memuat…" : `${items.length} item di Sampah (sertifikat, sertifikasi personil, project, dan alat)`}
      </p>

      <Card>
        {loading ? (
          <SkeletonListItems items={5} />
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <p className="text-sm">Sampah kosong. Tidak ada data yang dihapus.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                  <IconBox icon={Icon} />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-slate-500">{KIND_LABEL[item.kind]}</span>
                    {item.detailHref ? (
                      <Link href={item.detailHref} className="text-sm font-medium text-ink hover:text-accent">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Dihapus {formatDate(item.deletedAt)}</p>
                  </div>
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
                      Hapus permanen
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus permanen">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <strong className="text-ink dark:text-slate-100">{deleteTarget?.title}</strong> akan dihapus permanen
          beserta dokumennya. <strong>Tindakan ini tidak dapat dibatalkan.</strong>
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={deleting} onClick={handlePermanentDelete}>
            Hapus permanen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
