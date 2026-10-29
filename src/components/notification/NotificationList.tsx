"use client";

import { Segmented } from "@/components/ui/Segmented";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { Button } from "@/components/ui/Button";
import { SkeletonListItems } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDate } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type:
    | "EXPIRING_SOON"
    | "EXPIRED"
    | "APP_SUBMITTED"
    | "APP_REVISION_REQUIRED"
    | "APP_APPROVED"
    | "APP_CERTIFICATE_ISSUED"
    // project realisasi alerts (lib/project-alerts.ts)
    | "PROJECT_DEVIATION_CRITICAL"
    | "PROJECT_PROGRESS_STALE"
    | "PROJECT_TERM_DUE"
    | "PROJECT_INVOICE_OVERDUE";
  message: string;
  status: "NEW" | "READ" | "DONE";
  createdAt: string;
  certificate: { id: string; certificateName: string; certificateNumber: string } | null;
  personnelCertification: { id: string; certificationName: string; certificationNumber: string | null } | null;
  project: { id: string; projectName: string; projectNumber: string } | null;
  equipment: { id: string; name: string; assetNumber: string | null } | null;
  application: { id: string; applicationNumber: string } | null;
};

function entityIcon(n: NotificationItem) {
  if (n.certificate) return ENTITY_ICON.certificate;
  if (n.personnelCertification) return ENTITY_ICON.personnelCert;
  if (n.project) return ENTITY_ICON.project;
  if (n.equipment) return ENTITY_ICON.equipment;
  if (n.application) return ENTITY_ICON.application;
  return ENTITY_ICON.notification;
}

function iconFor(type: NotificationItem["type"]) {
  if (type === "EXPIRED") return { color: "bg-signal-expired" };
  if (type === "EXPIRING_SOON") return { color: "bg-signal-soonBar" };
  if (type === "PROJECT_DEVIATION_CRITICAL" || type === "PROJECT_INVOICE_OVERDUE") return { color: "bg-signal-expired" };
  if (type === "PROJECT_PROGRESS_STALE" || type === "PROJECT_TERM_DUE") return { color: "bg-signal-soonBar" };
  return { color: "bg-accent" };
}

function linkFor(n: NotificationItem) {
  if (n.certificate) return `/certificate/${n.certificate.id}`;
  if (n.personnelCertification) return `/personnel-certifications/${n.personnelCertification.id}`;
  if (n.project) return `/projects/${n.project.id}`;
  if (n.equipment) return `/equipment/${n.equipment.id}`;
  if (n.application) return `/applications/${n.application.id}`;
  return "/notifications";
}

function refFor(n: NotificationItem) {
  return (
    n.certificate?.certificateNumber ||
    n.personnelCertification?.certificationNumber ||
    n.project?.projectNumber ||
    n.equipment?.assetNumber ||
    n.application?.applicationNumber ||
    ""
  );
}

const TABS: { value: string; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "NEW", label: "Baru" },
  { value: "READ", label: "Sudah dibaca" },
  { value: "DONE", label: "Selesai ditindaklanjuti" },
];

export function NotificationList() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (tab) params.set("status", tab);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      showToast("Gagal memuat notifikasi.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function updateStatus(id: string, status: "READ" | "DONE") {
    setNotifications((prev) =>
      tab && status !== tab
        ? prev.filter((n) => n.id !== id)
        : prev.map((n) => (n.id === id ? { ...n, status } : n))
    );
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    showToast(status === "DONE" ? "Ditandai selesai ditindaklanjuti." : "Ditandai sudah dibaca.");
  }

  return (
    <div className="space-y-4">
      <Segmented value={tab} onChange={setTab} options={TABS.map((t) => [t.value, t.label] as const)} />

      <Card>
        {loading ? (
          <SkeletonListItems items={6} />
        ) : notifications.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada notifikasi pada kategori ini.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => {
              const { color } = iconFor(n.type);
              return (
                <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="relative">
                    <IconBox icon={entityIcon(n)} />
                    <span aria-hidden className={cn("absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900", color)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={linkFor(n)} className="text-sm text-ink hover:text-accent">
                      {n.message}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {refFor(n)}, {formatDate(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "stamp-badge",
                        n.status === "NEW" && "text-accent bg-accent/5 border-accent/20",
                        n.status === "READ" && "text-slate-500 bg-slate-100 border-slate-200",
                        n.status === "DONE" && "text-signal-active bg-signal-activeBg border-signal-activeBorder"
                      )}
                    >
                      {n.status === "NEW" ? "Baru" : n.status === "READ" ? "Dibaca" : "Selesai"}
                    </span>
                    {n.status !== "DONE" && (
                      <>
                        {n.status === "NEW" && (
                          <Button variant="outline" size="sm" onClick={() => updateStatus(n.id, "READ")}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => updateStatus(n.id, "DONE")}>
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
